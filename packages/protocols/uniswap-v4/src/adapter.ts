/**
 * Uniswap v4 Protocol adapter on Monad.
 *
 * Single-hop exact-in swaps via PoolManager using the unlock() callback
 * pattern — this keeps exactly one direct TransactionNode per ADR 0011.
 *
 * Flow:
 *   1. ERC20.approve(poolManager, amountIn)    — nested Capability (conditional)
 *   2. poolManager.unlock(callback)             — single direct TransactionNode
 *      callback: settle/sync → swap → take(recipient)
 *
 * The unlock callback is a single bytes blob containing concatenated
 * ABI-encoded function calls. PoolManager.unlock(bytes) forwards the
 * calldata to an internal unlockCallback which executes the sequence.
 */
import {
  type ActionCtx,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityNode,
  type CapabilityResult,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  NATIVE,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  type TokenRef,
  TokenReference,
  type TransactionNode,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import {
  decodeAbiParameters,
  decodeEventLog,
  encodeFunctionData,
  formatUnits,
  parseUnits,
} from "viem";
import { PoolManagerAbi, SWAP_EVENT_TOPIC } from "./abis/uniswap-v4.js";
import { V4QuoterAbi } from "./abis/v4quoter.js";
import {
  buildPoolKey,
  getSwapDirection,
  isNativeCurrency,
  type PoolFee,
  type PoolKey,
  type PoolTickSpacing,
  type QuoteResult,
  type SwapOutcome,
  toCurrencyAddress,
} from "./types.js";

// ---------------------------------------------------------------------------
// Addresses — verified against Uniswap's official deployments (chain 143 = Monad).
// Source: https://github.com/Uniswap/docs/blob/main/content/deployments.md
// ---------------------------------------------------------------------------
export const UNISWAP_V4_POOL_MANAGER_ADDRESS =
  "0x188d586ddcf52439676ca21a244753fa19f9ea8e" as const;

export const UNISWAP_V4_QUOTER_ADDRESS = "0xa222dd357a9076d1091ed6aa2e16c9742dd26891" as const;

// Default tick spacing for standard pools (0.3% fee)
const DEFAULT_TICK_SPACING: PoolTickSpacing = 1;
// Standard fee tiers: 100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
const DEFAULT_FEE: PoolFee = 3000;

// ---------------------------------------------------------------------------
// Parameter specs
// ---------------------------------------------------------------------------

const swapParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the swap." },
  tokenOut: { type: TokenReference, description: "Asset requested from the swap." },
  amountIn: { type: PositiveDecimalString, description: "Amount of tokenIn to swap." },
  slippageBps: {
    type: BasisPoints,
    description: "Maximum adverse price movement allowed during execution.",
  },
  hookData: {
    type: TokenReference.describe(
      "Arbitrary hex-encoded bytes to pass to the pool hooks; defaults to empty bytes.",
    ),
    description: "Arbitrary bytes to pass to the pool hooks; defaults to empty.",
  },
} satisfies ParamsSpec;

const quoteParams = {
  tokenIn: { type: TokenReference, description: "Input token address or 'native'." },
  tokenOut: { type: TokenReference, description: "Output token address or 'native'." },
  amountIn: { type: PositiveDecimalString, description: "Amount of tokenIn to quote." },
} satisfies ParamsSpec;

// ---------------------------------------------------------------------------
// Calldata helpers — build the unlock() callback payload
// ---------------------------------------------------------------------------

/** Encode a single function call as raw calldata (selector + args). */
function encodeCall(abi: readonly unknown[], fn: string, args: readonly unknown[]): Hex {
  return encodeFunctionData({ abi, functionName: fn, args }) as Hex;
}

/**
 * Replace an address at a specific byte offset in a hex calldata blob.
 * Each EVM address occupies 32 bytes (64 hex chars), left-padded with zeros.
 */
function replaceAtHex(hex: string | Hex, byteOffset: number, address: `0x${string}`): Hex {
  const clean = (hex as Hex).replace("0x", "");
  const hexOffset = byteOffset * 2;
  const before = clean.slice(0, hexOffset);
  const after = clean.slice(hexOffset + 64);
  return `0x${before}${address.slice(2).padStart(64, "0")}${after}` as Hex;
}

/**
 * Build the calldata payload for poolManager.unlock(callback).
 *
 * The callback is concatenated ABI-encoded function calls:
 *   settle() or sync(tokenOut) + swap(poolKey, params, hookData) + take(currency, recipient, minAmountOut)
 */
function buildUnlockCallback(
  useSettle: boolean,
  syncTokenAddr: AddressValue,
  poolKey: PoolKey,
  zeroForOne: boolean,
  amountSpecified: bigint,
  hookDataBytes: Hex,
  tokenOutAddr: AddressValue,
  recipientAddr: AddressValue,
  minAmountOut: bigint,
): Hex {
  const parts: Hex[] = [];

  // Step 1: settle() (payable, for native MON input) or sync(tokenOut) (for ERC20 input)
  if (useSettle) {
    parts.push(encodeCall(PoolManagerAbi, "settle", []));
  } else {
    parts.push(encodeCall(PoolManagerAbi, "sync", [syncTokenAddr]));
  }

  // Step 2: swap(key, {zeroForOne, amountSpecified, sqrtPriceLimitX96}, hookData)
  parts.push(
    encodeCall(PoolManagerAbi, "swap", [
      poolKey,
      { zeroForOne, amountSpecified, sqrtPriceLimitX96: 0n },
      hookDataBytes,
    ]),
  );

  // Step 3: take(currency, recipient, minAmountOut)
  parts.push(encodeCall(PoolManagerAbi, "take", [tokenOutAddr, recipientAddr, minAmountOut]));

  // Compute exact byte offset of recipient inside the full callback blob
  const allHex = parts.map((p) => p.replace("0x", "")).join("");
  let takeStart = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    takeStart += (parts[i] || "").replace("0x", "").length / 2;
  }
  const recipientOffset = takeStart + 36;
  return replaceAtHex(allHex as Hex, recipientOffset, recipientAddr as `0x${string}`);
}

// ---------------------------------------------------------------------------
// UniswapV4 Protocol
// ---------------------------------------------------------------------------

@Protocol({
  name: "uniswap-v4",
  category: "dex",
  description: "Uniswap v4 on Monad: single-hop token swaps via PoolManager.",
  contracts: {
    poolManager: { abi: PoolManagerAbi, addr: UNISWAP_V4_POOL_MANAGER_ADDRESS },
    v4Quoter: { abi: V4QuoterAbi, addr: UNISWAP_V4_QUOTER_ADDRESS },
  },
  protocols: {
    erc20: ERC20,
  },
})
export class UniswapV4 {
  declare runtime: MossRuntime;
  declare poolManager: Handle<typeof PoolManagerAbi>;
  declare v4Quoter: Handle<typeof V4QuoterAbi>;
  declare erc20: ProtocolRef<ERC20>;

  // --- swap Capability ---

  @Capability<UniswapV4, typeof swapParams>({
    intent: "Swap {amountIn} of {tokenIn} into {tokenOut} via Uniswap v4",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["dex", "swap"],
  })
  async swap(params: InferParams<typeof swapParams>, ctx: ActionCtx): Promise<CapabilityResult> {
    const { tokenIn, tokenOut, amountIn, slippageBps, hookData } = params;
    const isInputNative = isNativeCurrency(tokenIn);
    const isOutputNative = isNativeCurrency(tokenOut);

    // 1. Query on-chain token decimals for correct parseUnits
    const [inDecimals, _outDecimals] = await this.#getTokenDecimals(tokenIn, tokenOut);
    const amountInBase = parseUnits(amountIn as string, inDecimals);
    const amountInSmallest = amountInBase.toString();

    // 2. Get on-chain quote to compute real minAmountOut
    const quote = await this.#quoteExactInputSingle(
      tokenIn,
      tokenOut,
      amountInBase,
      hookData as Hex,
    );
    const bps = slippageBps as number;
    const minAmountOut =
      quote.amountOut > 0n
        ? (quote.amountOut * BigInt(10_000 - bps)) / 10_000n
        : (amountInBase * BigInt(10_000 - bps)) / 10_000n;

    const poolKey = buildPoolKey(tokenIn, tokenOut, DEFAULT_FEE, DEFAULT_TICK_SPACING);
    const { zeroForOne } = getSwapDirection(tokenIn, poolKey);

    // 3. Approval (if ERC20 input) — nested Capability, not a direct transaction
    const children: (CapabilityNode | TransactionNode)[] = [];
    if (!isInputNative) {
      children.push(
        await this.erc20.approve({
          token: toCurrencyAddress(tokenIn) as AddressValue,
          spender: UNISWAP_V4_POOL_MANAGER_ADDRESS as AddressValue,
          amount: amountInSmallest,
        }),
      );
    }

    // 4. Single direct TransactionNode: poolManager.unlock(callback)
    //    Callback encodes: settle/sync → swap → take
    const tokenOutAddr = toCurrencyAddress(tokenOut) as AddressValue;
    const recipientAddr = isOutputNative
      ? ("0x0000000000000000000000000000000000000000" as AddressValue)
      : (ctx.account as AddressValue);

    const callback = buildUnlockCallback(
      isInputNative, // useSettle
      tokenOutAddr, // sync token (tokenOut for ERC20 input path)
      poolKey,
      zeroForOne,
      -amountInBase, // negative = exactIn
      hookData as Hex,
      tokenOutAddr,
      recipientAddr,
      minAmountOut,
    );

    children.push(
      this.poolManager.unlock([callback], {
        value: isInputNative ? amountInBase : undefined,
      }),
    );

    return children;
  }

  // --- quote Query ---

  @Query({ intent: "Quote a Uniswap v4 exact-in swap", params: quoteParams })
  async quote(params: InferParams<typeof quoteParams>): Promise<QuoteResult> {
    const { tokenIn, tokenOut, amountIn } = params;

    const [inDecimals, outDecimals] = await this.#getTokenDecimals(tokenIn, tokenOut);
    const amountInBase = parseUnits(amountIn as string, inDecimals);

    const quote = await this.#quoteExactInputSingle(tokenIn, tokenOut, amountInBase, "0x" as Hex);

    return {
      amountOut: formatUnits(quote.amountOut, outDecimals),
      gasEstimate: quote.gasEstimate.toString(),
      amountSide: "amountIn" as const,
      amountIn: formatUnits(amountInBase, inDecimals),
      estimatedAmountOut: formatUnits(quote.amountOut, outDecimals),
      minimumAmountOut: formatUnits((quote.amountOut * 98n) / 100n, outDecimals),
    };
  }

  // --- swap Receipt Parser ---

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<SwapOutcome> {
    let tokenIn: TokenRef | undefined;
    let tokenOut: TokenRef | undefined;
    let poolManagerNativeSent = false;

    // Pass 1: collect Transfer context to derive tokenIn/tokenOut
    for (const change of changes) {
      if (
        change.kind === "nativeTransfer" &&
        change.to.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase()
      ) {
        poolManagerNativeSent = true;
        tokenIn = NATIVE as TokenRef;
      }
      if (change.kind !== "event") continue;

      // PoolManager Transfer events
      if (change.address.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase()) {
        // Skip Swap events — handled in pass 2
        if (change.topics?.[0]?.toLowerCase() === SWAP_EVENT_TOPIC.toLowerCase()) continue;

        try {
          const decoded = decodeEventLog({
            abi: PoolManagerAbi,
            topics: change.topics as [Hex, ...Hex[]],
            data: change.data,
            strict: false,
          });
          if (decoded.eventName === "Transfer") {
            const args = decoded.args as unknown as {
              from: AddressValue;
              to: AddressValue;
              value: bigint;
            };
            const tokenAddr = change.address as TokenRef;
            if (
              args.to.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase() &&
              !tokenIn &&
              tokenIn !== NATIVE
            ) {
              tokenIn = tokenAddr;
            }
            if (
              args.from.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase() &&
              !tokenOut
            ) {
              tokenOut = tokenAddr;
            }
          }
        } catch {
          // Not a PoolManager Transfer event, ignore
        }
      }

      // ERC20 Transfer events on token contracts
      // These are emitted by the token contract itself (not PoolManager)
      if (change.address.toLowerCase() !== UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase()) {
        try {
          const decoded = decodeEventLog({
            abi: ERC20Abi,
            topics: change.topics as [Hex, ...Hex[]],
            data: change.data,
            strict: false,
          });
          if (decoded.eventName === "Transfer") {
            const args = decoded.args as { from: AddressValue; to: AddressValue };
            const tokenAddr = change.address as TokenRef;
            // ERC20 Transfer to PoolManager → tokenIn
            if (
              args.to.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase() &&
              !tokenIn
            ) {
              tokenIn = tokenAddr;
            }
            // ERC20 Transfer from PoolManager → tokenOut
            if (
              args.from.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase() &&
              !tokenOut
            ) {
              tokenOut = tokenAddr;
            }
          }
        } catch {
          // Not an ERC20 Transfer, ignore
        }
      }
    }

    let swapEvent: SwapOutcome | undefined;
    let amountInBig: bigint | undefined;
    let amountOutBig: bigint | undefined;
    let zeroForOne: boolean | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        return this.erc20.changesReceipt([change]);
      }
      if (change.kind !== "event") {
        return this.erc20.changesReceipt([change]);
      }

      // PoolManager.Swap event
      if (change.address.toLowerCase() === UNISWAP_V4_POOL_MANAGER_ADDRESS.toLowerCase()) {
        if (change.topics?.[0]?.toLowerCase() === SWAP_EVENT_TOPIC.toLowerCase()) {
          try {
            // Swap event: 2 indexed (id, sender) in topics, 6 non-indexed in data.
            // Use decodeAbiParameters directly since viem's decodeEventLog
            // can't find the PoolManagerSwap signature in the 4byte registry.
            const decoded = decodeAbiParameters(
              [
                { type: "int128" },
                { type: "int128" },
                { type: "uint160" },
                { type: "uint128" },
                { type: "int24" },
                { type: "uint24" },
              ],
              change.data,
            );
            const amt0 = BigInt(decoded[0]);
            const amt1 = BigInt(decoded[1]);
            const fee = Number(decoded[5]);
            zeroForOne = amt0 < 0n;

            if (zeroForOne) {
              amountInBig = -amt0;
              amountOutBig = amt1;
            } else {
              amountInBig = -amt1;
              amountOutBig = amt0;
            }

            // Resolve tokens if not yet found in pass 1
            if (!tokenIn) {
              if (poolManagerNativeSent) {
                tokenIn = NATIVE as TokenRef;
              } else {
                tokenIn = zeroForOne
                  ? ("0x0000000000000000000000000000000000000001" as TokenRef)
                  : ("0x0000000000000000000000000000000000000002" as TokenRef);
              }
            }
            if (!tokenOut) {
              tokenOut = zeroForOne
                ? ("0x0000000000000000000000000000000000000002" as TokenRef)
                : ("0x0000000000000000000000000000000000000001" as TokenRef);
            }

            swapEvent = {
              operation: "swap",
              protocol: "uniswap-v4",
              tokenIn,
              tokenOut,
              amountIn: amountInBig?.toString(),
              amountOut: amountOutBig?.toString(),
              fee,
              zeroForOne,
            };

            return {
              kind: "change" as const,
              change,
              data: swapEvent,
              text: `Uniswap v4 Swap: ${swapEvent?.amountIn} ${swapEvent?.tokenIn ?? "unknown"} to ${swapEvent?.amountOut} ${swapEvent?.tokenOut ?? "unknown"}`,
            };
          } catch {
            throw new Error("Unexpected Change: unsupported PoolManager event");
          }
        }

        // PoolManager Transfer event — decode with PoolManagerAbi directly
        try {
          const decoded = decodeEventLog({
            abi: PoolManagerAbi,
            topics: change.topics as [Hex, ...Hex[]],
            data: change.data,
          });
          if (decoded.eventName === "Transfer") {
            const args = decoded.args as unknown as {
              from: AddressValue;
              to: AddressValue;
              value: bigint;
            };
            const tokenAddr = change.address as TokenRef;
            return {
              kind: "change" as const,
              change,
              data: {
                operation: "transfer" as const,
                token: tokenAddr,
                from: args.from,
                to: args.to,
                amount: args.value.toString(),
              },
              text: `PoolManager Transfer: ${args.value.toString()} ${tokenAddr} from ${args.from} to ${args.to}`,
            };
          }
          // Unknown PoolManager event — throw
          throw new Error(`Unexpected PoolManager event: ${decoded.eventName}`);
        } catch {
          throw new Error("Unexpected Change: unsupported PoolManager event");
        }
      }

      // Non-PoolManager events delegate to erc20.changesReceipt (ERC20 Transfer/Approval)
      return this.erc20.changesReceipt([change]);
    });

    if (!swapEvent || !amountInBig || !amountOutBig || zeroForOne === undefined) {
      throw new Error("Uniswap v4 swap Receipt requires a Swap event with amount0/amount1");
    }

    return {
      kind: "receipt",
      outcome: swapEvent,
      text: `Uniswap v4 Swap: ${swapEvent.amountIn} ${swapEvent.tokenIn} to ${swapEvent.amountOut} ${swapEvent.tokenOut}`,
      changes: parsed,
    };
  }

  // --- internal helpers ---

  /** Fetch decimals for both tokens in parallel. Native MON always has 18 decimals. */
  async #getTokenDecimals(tokenIn: TokenRef, tokenOut: TokenRef): Promise<[number, number]> {
    const inDecimals = isNativeCurrency(tokenIn) ? 18 : Number(await this.#erc20Decimals(tokenIn));
    const outDecimals = isNativeCurrency(tokenOut)
      ? 18
      : Number(await this.#erc20Decimals(tokenOut));
    return [inDecimals, outDecimals];
  }

  /** Read ERC20 decimals for a token on-chain. Fallback to 18 if call fails. */
  async #erc20Decimals(token: TokenRef): Promise<bigint> {
    const addr = toCurrencyAddress(token) as `0x${string}`;
    try {
      const decimals = await this.runtime.client.readContract({
        address: addr,
        abi: ERC20Abi,
        functionName: "decimals",
        args: [],
      });
      return BigInt(decimals);
    } catch {
      return 18n;
    }
  }

  /**
   * Call V4Quoter.quoteExactInputSingle to get a real on-chain quote.
   * Uses handle.call() to simulate the nonpayable call via eth_call.
   * Falls back to zero amount if the RPC doesn't support unlockCallback simulation.
   */
  async #quoteExactInputSingle(
    tokenIn: TokenRef,
    tokenOut: TokenRef,
    amountIn: bigint,
    hookData: Hex,
  ): Promise<{ amountOut: bigint; gasEstimate: bigint }> {
    const poolKey = buildPoolKey(tokenIn, tokenOut, DEFAULT_FEE, DEFAULT_TICK_SPACING);
    const { zeroForOne } = getSwapDirection(tokenIn, poolKey);

    // V4Quoter.quoteExactInputSingle expects exactAmount as uint128
    const exactAmount128 =
      amountIn > 0n ? (amountIn > 0xffffffffffffffffn ? 0xffffffffffffffffn : amountIn) : 0n;

    try {
      const result = await this.v4Quoter.call.quoteExactInputSingle([
        {
          poolKey: {
            currency0: poolKey.currency0,
            currency1: poolKey.currency1,
            fee: poolKey.fee,
            tickSpacing: poolKey.tickSpacing,
            hooks: poolKey.hooks,
          },
          zeroForOne,
          exactAmount: exactAmount128,
          hookData,
        },
      ]);

      const [amountOut, gasEstimate] = result as [bigint, bigint];
      return { amountOut, gasEstimate };
    } catch {
      return { amountOut: 0n, gasEstimate: 0n };
    }
  }
}

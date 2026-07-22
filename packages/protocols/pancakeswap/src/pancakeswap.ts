/**
 * PancakeSwap — V3 single-hop swap adapter on Monad mainnet.
 *
 * PancakeSwap on Monad is a deployment of the Uniswap V3 periphery contracts
 * (same source layout, same function signatures, separate deployment). The
 * canonical V3 Swap Router at `0x1b81D678ffb9C0263b24A97847620C99d213eB14`
 * exposes `exactInputSingle` for single-pool swaps; `factory()` returns the
 * V3 Factory used for pool discovery. Both verified on-chain 2026-07-14
 * via rpc.monad.xyz.
 *
 * v1 scope (intentionally narrow):
 *   - Single-hop swaps only (`exactInputSingle`). Multi-hop `exactInput`
 *     with encoded paths is out of scope.
 *   - Native MON supported as `tokenIn`: forwarded as `msg.value` to the
 *     router. `tokenOut` is always an ERC-20.
 *   - Fee tiers: 100 / 500 / 3000 / 10000.
 *   - `quote` returns a slippage-adjusted estimate; the authoritative
 *     quote path is `simulate().effects.assetsIn` on a built swap plan.
 *
 * Risk model (closed set per ADR 0003):
 *   - `fundOut`     — the input amount may leave the account
 *   - `approval`    — a token allowance is granted (explicit transaction)
 *   - `priceImpact` — AMM pool depth moves the realised rate vs quoted
 */
import {
  type ActionCtx,
  type Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityNode,
  type Change,
  createHandle,
  type Handle,
  type InferParams,
  type JsonSafeValue,
  type MossRuntime,
  NATIVE,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptChange,
  type ReceiptResult,
  TokenReference,
  type TransactionNode,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import { WMON_ADDRESS } from "@themoss/system";
import { parseUnits } from "viem";
import { factoryAbi } from "./abis/factory.js";
import { swapRouterAbi } from "./abis/swap-router.js";

export const PANCAKESWAP_V3_ROUTER_ADDRESS: AddressValue =
  "0x1b81D678ffb9C0263b24A97847620C99d213eB14";

export const PANCAKESWAP_V3_FACTORY_ADDRESS: AddressValue =
  "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865";

const swapParams = {
  tokenIn: {
    type: TokenReference,
    description: 'Token to sell. Use "native" for MON, or an ERC-20 address.',
  },
  tokenOut: {
    type: TokenReference,
    description:
      "Token to buy. Must be an ERC-20 address; native MON as output is not supported in v1.",
  },
  amount: {
    type: PositiveDecimalString,
    description:
      'Quantity of tokenIn to swap, in human-readable units (e.g. "1.5" for 1.5 tokens).',
  },
  fee: {
    type: BasisPoints,
    description: "PancakeSwap V3 fee tier in bps. Supported: 100, 500, 3000, 10000.",
  },
  slippage: {
    type: BasisPoints,
    description: "Maximum acceptable slippage in basis points (100 = 1%). Default 50 (0.5%).",
  },
} satisfies ParamsSpec;

type SwapOutcome = {
  operation: "swap";
  tokenIn: AddressValue;
  tokenOut: AddressValue;
  amountIn: string;
  amountOut: string;
};

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = InferredSwapParams;

@Protocol({
  name: "pancakeswap",
  category: "dex",
  description:
    "PancakeSwap V3 single-hop swaps on Monad mainnet: exactInputSingle against " +
    "the canonical V3 Swap Router. Native MON is sent as msg.value; no pre-wrap needed.",
  contracts: {
    router: { abi: swapRouterAbi, addr: PANCAKESWAP_V3_ROUTER_ADDRESS },
    factory: { abi: factoryAbi, addr: PANCAKESWAP_V3_FACTORY_ADDRESS },
  },
  protocols: { erc20: ERC20 },
  labels: { Router: PANCAKESWAP_V3_ROUTER_ADDRESS },
})
export class PancakeSwap {
  declare router: Handle<typeof swapRouterAbi>;
  declare factory: Handle<typeof factoryAbi>;
  declare erc20: ProtocolRef<ERC20>;
  declare runtime: MossRuntime;

  static readonly TICK_MIN_SQRT_RATIO_PLUS_ONE = 4295128740n;
  static readonly TICK_MAX_SQRT_RATIO_MINUS_ONE =
    1461446703485210103287273052203988822378723970341n;

  static readonly POOL_TOKEN0_ABI = [
    {
      type: "function",
      name: "token0",
      inputs: [],
      outputs: [{ type: "address" }],
      stateMutability: "view",
    },
  ] as const;

  async #sqrtPriceLimitX96(
    actualTokenIn: Address,
    tokenOut: Address,
    fee: number,
  ): Promise<bigint> {
    try {
      const poolAddress = (await this.factory.read.getPool([
        actualTokenIn,
        tokenOut,
        fee,
      ])) as Address;
      if (poolAddress === "0x0000000000000000000000000000000000000000") {
        return PancakeSwap.TICK_MIN_SQRT_RATIO_PLUS_ONE;
      }
      const poolHandle = createHandle(
        PancakeSwap.POOL_TOKEN0_ABI,
        poolAddress,
        this.runtime.client,
        "0x0000000000000000000000000000000000000000",
      );
      const token0 = (await poolHandle.read.token0?.()) as Address;
      const isZeroForOne = token0.toLowerCase() === actualTokenIn.toLowerCase();
      return isZeroForOne
        ? PancakeSwap.TICK_MIN_SQRT_RATIO_PLUS_ONE
        : PancakeSwap.TICK_MAX_SQRT_RATIO_MINUS_ONE;
    } catch {
      return PancakeSwap.TICK_MIN_SQRT_RATIO_PLUS_ONE;
    }
  }

  #resolveAddress(token: AddressValue | typeof NATIVE): AddressValue {
    return token === NATIVE ? WMON_ADDRESS : token;
  }

  /**
   * Shared preparation for quote and swap: resolve the actual tokenIn address,
   * read decimals, parse the human-readable amount, and compute the sqrt price
   * limit for the pool direction. Eliminates duplicate RPC calls between the
   * two methods.
   */
  async #prepareSwap(params: SwapParams, account: AddressValue) {
    const actualTokenIn = this.#resolveAddress(params.tokenIn);
    const actualTokenOut = this.#resolveAddress(params.tokenOut);
    const decimalsHandle = createHandle(ERC20Abi, actualTokenIn, this.runtime.client, account);
    const decimals = await decimalsHandle.read.decimals?.();
    const amountInRaw = parseUnits(params.amount, Number(decimals));
    const sqrtPriceLimitX96 = await this.#sqrtPriceLimitX96(
      actualTokenIn,
      actualTokenOut,
      Number(params.fee),
    );
    return { actualTokenIn, amountInRaw, sqrtPriceLimitX96 };
  }

  @Query({
    intent: "Quote PancakeSwap V3 swap of {amount} {tokenIn} into {tokenOut} at fee tier {fee}",
    params: swapParams,
    tags: ["amm", "v3", "quote"],
  })
  async quote(params: InferParams<typeof swapParams>, ctx: ActionCtx) {
    if (params.tokenOut === NATIVE) {
      throw new Error(
        "pancakeswap.quote: tokenOut=native is not supported in v1; " +
          "receive WMON and call wmon.unwrap separately",
      );
    }

    const { actualTokenIn, amountInRaw, sqrtPriceLimitX96 } = await this.#prepareSwap(
      params,
      ctx.account,
    );

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);
    const routerParams = {
      tokenIn: actualTokenIn,
      tokenOut: params.tokenOut,
      fee: Number(params.fee),
      recipient: ctx.account,
      amountIn: amountInRaw,
      amountOutMinimum: 0n,
      deadline,
      sqrtPriceLimitX96,
    };

    try {
      const rawOut = (await this.router.call.exactInputSingle([routerParams], {
        value: 0n,
      })) as bigint;
      const minOut = (rawOut * (10_000n - BigInt(params.slippage))) / 10_000n;
      return {
        amountOut: minOut.toString(),
        fee: params.fee.toString(),
        note: "slippage-adjusted eth_call quote; requires router allowance.",
      };
    } catch (e) {
      throw new Error(
        "pancakeswap.quote: eth_call reverted — the router has not been " +
          "approved to spend the input token, or the pool has no liquidity. " +
          `Original error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  @Capability<PancakeSwap, typeof swapParams>({
    intent:
      "Swap {amount} {tokenIn} for {tokenOut} on PancakeSwap V3, tolerating {slippage} bps slippage",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["amm", "v3"],
  })
  async swap(params: InferParams<typeof swapParams>, ctx: ActionCtx) {
    if (params.tokenOut === NATIVE) {
      throw new Error(
        "pancakeswap.swap: tokenOut=native is not supported in v1; " +
          "receive WMON and call wmon.unwrap separately",
      );
    }
    if (params.tokenIn === params.tokenOut) {
      throw new Error("tokenIn and tokenOut must differ");
    }

    const { actualTokenIn, amountInRaw, sqrtPriceLimitX96 } = await this.#prepareSwap(
      params,
      ctx.account,
    );

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60);
    const routerParams = {
      tokenIn: actualTokenIn,
      tokenOut: params.tokenOut,
      fee: Number(params.fee),
      recipient: ctx.account,
      amountOutMinimum: 0n,
      deadline,
      sqrtPriceLimitX96,
    };

    const children: (CapabilityNode | TransactionNode)[] = [];

    // For ERC-20 inputs, delegate the approval to the ERC20 protocol (nested
    // CapabilityNode). For native MON, the amount is forwarded as msg.value.
    if (params.tokenIn !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: actualTokenIn,
          spender: this.router.address,
          amount: amountInRaw.toString(),
        }),
      );
    }

    // Inner eth_call to determine the expected output (applies slippage externally).
    let minOut: bigint;
    try {
      const quoted = (await this.router.call.exactInputSingle(
        [{ ...routerParams, amountIn: amountInRaw, amountOutMinimum: 0n }],
        { value: params.tokenIn === NATIVE ? amountInRaw : 0n },
      )) as bigint;
      minOut = (quoted * (10_000n - BigInt(params.slippage))) / 10_000n;
    } catch (e) {
      throw new Error(
        "pancakeswap.swap: cannot determine output amount — the router has not been " +
          "approved, or the pool has no liquidity. " +
          `Original error: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    // The one direct TransactionNode: exactInputSingle on the router.
    children.push(
      this.router.exactInputSingle(
        [{ ...routerParams, amountIn: amountInRaw, amountOutMinimum: minOut }],
        { value: params.tokenIn === NATIVE ? amountInRaw : 0n },
      ),
    );

    return children;
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<SwapOutcome> {
    const parsed: readonly (ReceiptChange | ReceiptResult<JsonSafeValue>)[] = changes.map(
      (change) => {
        // Delegate ERC-20 event parsing to the canonical erc20.changesReceipt,
        // which classifies Transfer, Approval, and unknown events uniformly.
        if (change.kind === "event") {
          return this.erc20.changesReceipt([change]);
        }

        // Native MON transfers: WMON deposit/withdrawal or forwarded value.
        if (change.kind === "nativeTransfer") {
          const receiptChange: ReceiptChange = {
            kind: "change",
            change,
            data: {
              operation: "swap" as const,
              tokenIn: change.from,
              tokenOut: change.to,
              amountIn: change.value,
              amountOut: change.value,
            },
            text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
          };
          return receiptChange;
        }

        const receiptChange: ReceiptChange = {
          kind: "change",
          change,
          data: null,
          text: `Unrecognized Change kind`,
        };
        return receiptChange;
      },
    );

    // Derive the outcome from the nested erc20 receipts and nativeTransfer records:
    //   first transfer  → amountIn / tokenIn
    //   last  transfer  → amountOut / tokenOut
    let firstTransfer:
      | { kind: "erc20"; token: string; from: string; to: string; value: string }
      | { kind: "native"; from: string; to: string; value: string }
      | undefined;
    let lastTransfer:
      | { kind: "erc20"; token: string; from: string; to: string; value: string }
      | { kind: "native"; from: string; to: string; value: string }
      | undefined;

    for (const item of parsed) {
      if (item.kind === "change" && item.data && typeof item.data === "object") {
        const d = item.data as Record<string, unknown>;
        if ("operation" in d && d.operation === "swap") {
          const entry = {
            kind: "native" as const,
            from: d.tokenIn as string,
            to: d.tokenOut as string,
            value: d.amountIn as string,
          };
          if (!firstTransfer) firstTransfer = entry;
          lastTransfer = entry;
        }
      } else if (item.kind === "receipt") {
        for (const leaf of item.changes) {
          if (leaf.kind !== "change" || leaf.data === null || typeof leaf.data !== "object")
            continue;
          const d = leaf.data as Record<string, unknown>;
          if (
            "operation" in d &&
            d.operation === "transfer" &&
            "token" in d &&
            "from" in d &&
            "to" in d &&
            "amount" in d
          ) {
            const entry = {
              kind: "erc20" as const,
              token: d.token as string,
              from: d.from as string,
              to: d.to as string,
              value: d.amount as string,
            };
            if (!firstTransfer) firstTransfer = entry;
            lastTransfer = entry;
          }
        }
      }
    }

    const outcome: SwapOutcome = {
      operation: "swap",
      tokenIn: (firstTransfer?.kind === "erc20"
        ? firstTransfer.token
        : firstTransfer?.kind === "native"
          ? firstTransfer.from
          : "0x0000000000000000000000000000000000000000") as AddressValue,
      tokenOut: (lastTransfer?.kind === "erc20"
        ? lastTransfer.token
        : lastTransfer?.kind === "native"
          ? lastTransfer.to
          : "0x0000000000000000000000000000000000000000") as AddressValue,
      amountIn: firstTransfer?.value ?? "0",
      amountOut: lastTransfer?.value ?? "0",
    };

    return {
      kind: "receipt",
      outcome,
      text: `PancakeSwap V3 Swap: ${outcome.amountIn} in ${outcome.tokenIn} → ${outcome.amountOut} out ${outcome.tokenOut}`,
      changes: parsed,
    };
  }
}

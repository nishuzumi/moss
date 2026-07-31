/**
 * Uniswap v4 exact-in single-hop swaps on Monad mainnet.
 *
 * Swaps execute through the Universal Router's V4_SWAP command (0x10) with
 * the action sequence SWAP_EXACT_IN_SINGLE (0x06), SETTLE_ALL (0x0c),
 * TAKE_ALL (0x0f). Quotes come from the canonical V4Quoter via eth_call.
 * Native MON is a first-class v4 currency: address(0) in the PoolKey, sent
 * as msg.value on the way in and received directly from the PoolManager on
 * the way out. No WMON wrap or unwrap is involved.
 *
 * Pool discovery is dynamic and fully on-chain: v4 pools have no factory
 * enumeration, so the adapter quotes the token pair across the canonical
 * hookless fee tiers (100/1, 500/10, 3000/60, 10000/200) and selects the
 * best exact-input quote. A tier whose pool is not initialized reverts in
 * the quoter and drops out. An Agent cannot supply a pool id, fee tier, or
 * quote to `swap`; Capability construction repeats the quoting against
 * current state (same rule as ADR 0012 for Kuru).
 *
 * ERC-20 input settles through Permit2, the only pull path the Universal
 * Router supports. Moss excludes signature flows (SECURITY.md), so the
 * adapter uses Permit2's PLAIN on-chain `approve` transaction: a nested
 * ERC-20 approval grants Permit2 exactly amountIn, and a nested
 * `permit2Approve` Capability grants the router a Permit2 allowance for
 * exactly amountIn that expires with the swap deadline. No token ever
 * rests in a shared contract between transactions.
 *
 * Risk model (closed set per ADR 0003):
 *   - `fundOut`     — the input amount leaves the account
 *   - `approval`    — ERC-20 input grants two exact-amount allowances
 *   - `priceImpact` — AMM pool depth moves the realised rate vs quoted
 */
import {
  type ActionCtx,
  Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityNode,
  type CapabilityResult,
  type Change,
  createHandle,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  NATIVE,
  type Nestable,
  nestable,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  type SelfRef,
  type TokenRef,
  TokenReference,
  type TransactionNode,
  UnsignedIntegerString,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodePacked,
  formatUnits,
  getAddress,
  parseUnits,
} from "viem";
import { Permit2Abi, PoolManagerAbi, UniversalRouterAbi, V4QuoterAbi } from "./abis/uniswap.js";
import type {
  FeeTier,
  Permit2ApprovalOutcome,
  PoolKey,
  PreparedSwap,
  UniswapQuote,
  UniswapSwapOutcome,
} from "./types.js";

// Official Uniswap v4 deployments on Monad mainnet (chain 143).
// Source: Uniswap deployment record, `Uniswap/docs` content/protocols/v4/
// deployments.mdx, "Monad: 143" (retrieved 2026-07-28); also listed in
// moss issue #5. The live test pins each deployed runtime bytecode hash
// (abis.json) and verifies the quoter's poolManager() wiring on-chain.
export const UNISWAP_V4_ROUTER_ADDRESS: AddressValue = "0x0D97Dc33264bfC1c226207428A79b26757fb9dc3";
export const UNISWAP_V4_QUOTER_ADDRESS: AddressValue = "0xa222Dd357A9076d1091Ed6Aa2e16C9742dD26891";
export const UNISWAP_V4_POOL_MANAGER_ADDRESS: AddressValue =
  "0x188d586Ddcf52439676Ca21A244753fA19F9Ea8e";
// Canonical Permit2 singleton (same address on every chain).
// Source: https://github.com/Uniswap/permit2 and the deployment record above.
export const PERMIT2_ADDRESS: AddressValue = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/** Native MON is currency address(0) in Uniswap v4 PoolKeys. */
const V4_NATIVE = "0x0000000000000000000000000000000000000000" as const;
/** Hookless canonical pools: the hooks field is address(0). */
const NO_HOOKS = V4_NATIVE;

// Universal Router command and v4 action bytes. Origin: vendored
// @uniswap/universal-router@2.0.0 contracts/libraries/Commands.sol
// (V4_SWAP = 0x10) and its pinned v4-periphery Actions.sol
// (SWAP_EXACT_IN_SINGLE = 0x06, SETTLE_ALL = 0x0c, TAKE_ALL = 0x0f).
const COMMAND_V4_SWAP = 0x10;
const ACTION_SWAP_EXACT_IN_SINGLE = 0x06;
const ACTION_SETTLE_ALL = 0x0c;
const ACTION_TAKE_ALL = 0x0f;

/**
 * Canonical hookless fee tiers, in pips (hundredths of a basis point),
 * paired with the tick spacings the Uniswap interface deploys them with.
 * v4 allows arbitrary fee/spacing/hook combinations; this adapter curates
 * the four canonical hookless tiers and verifies each candidate against
 * chain state by quoting it.
 */
export const UNISWAP_V4_FEE_TIERS: readonly FeeTier[] = [
  { fee: 100, tickSpacing: 1 },
  { fee: 500, tickSpacing: 10 },
  { fee: 3000, tickSpacing: 60 },
  { fee: 10000, tickSpacing: 200 },
];

const DEFAULT_SLIPPAGE_BPS = 50;
/** Universal Router deadline window; matches the Uniswap interface default. */
const SWAP_DEADLINE_SECONDS = 1200;
const MAX_UINT128 = (1n << 128n) - 1n;
const MAX_UINT160 = (1n << 160n) - 1n;
const MAX_UINT48 = (1n << 48n) - 1n;

function boundedUnsignedIntegerString(max: bigint, description: string) {
  return UnsignedIntegerString.refine((value) => {
    try {
      return BigInt(value) <= max;
    } catch {
      return false;
    }
  }, `Expected an integer no greater than ${max}.`).describe(description);
}

const UniswapSlippage = BasisPoints.min(1)
  .max(5_000)
  .describe("An integer basis-point count from 1 through 5000; 1 bps equals 0.01%.");

const swapParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the swap." },
  tokenOut: { type: TokenReference, description: "Asset requested from the swap." },
  amountIn: {
    type: PositiveDecimalString,
    description: "Fixed input quantity in the input asset's display units.",
  },
  slippage: {
    type: UniswapSlippage.default(DEFAULT_SLIPPAGE_BPS),
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

// Permit2 packs its allowance into uint160 and its expiration into uint48,
// so both are narrower than a plain unsigned integer string.
const Uint160String = boundedUnsignedIntegerString(
  MAX_UINT160,
  "A base-10 uint160 integer string, from 0 through 2^160 - 1.",
);
const Uint48String = boundedUnsignedIntegerString(
  MAX_UINT48,
  "A base-10 uint48 integer string, from 0 through 2^48 - 1.",
);

const permit2ApproveParams = {
  token: {
    type: Address,
    description: "ERC-20 asset whose Permit2 allowance is granted to the Universal Router.",
  },
  amount: {
    type: Uint160String,
    description: "Allowance in the token's smallest unit; use 0 to revoke it.",
  },
  expiration: {
    type: Uint48String,
    description: "Unix timestamp in seconds after which the allowance expires.",
  },
} satisfies ParamsSpec;

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = Omit<InferredSwapParams, "slippage"> &
  Partial<Pick<InferredSwapParams, "slippage">>;
type Permit2ApproveParams = InferParams<typeof permit2ApproveParams>;

@Protocol({
  name: "uniswap",
  category: "dex",
  description:
    "Uniswap v4 exact-in single-hop swaps through the Universal Router over the best " +
    "canonical fee tier, with native MON as a first-class v4 currency.",
  contracts: {
    router: { abi: UniversalRouterAbi, addr: UNISWAP_V4_ROUTER_ADDRESS },
    quoter: { abi: V4QuoterAbi, addr: UNISWAP_V4_QUOTER_ADDRESS },
    permit2: { abi: Permit2Abi, addr: PERMIT2_ADDRESS },
  },
  labels: {
    UniversalRouter: UNISWAP_V4_ROUTER_ADDRESS,
    V4Quoter: UNISWAP_V4_QUOTER_ADDRESS,
    PoolManager: UNISWAP_V4_POOL_MANAGER_ADDRESS,
    Permit2: PERMIT2_ADDRESS,
  },
  protocols: { erc20: ERC20 },
})
export class Uniswap {
  declare runtime: MossRuntime;
  declare router: Handle<typeof UniversalRouterAbi>;
  declare quoter: Handle<typeof V4QuoterAbi>;
  declare permit2: Handle<typeof Permit2Abi>;
  declare erc20: ProtocolRef<ERC20>;
  /** Core-injected reference to this Protocol's own nestable Capabilities. */
  declare self: SelfRef<Uniswap, "permit2Approve">;

  @Query({
    intent: "Quote swapping {amountIn} of {tokenIn} into {tokenOut} on Uniswap v4",
    params: swapParams,
    tags: ["amm", "v4", "quote"],
  })
  async quote(params: SwapParams, ctx: ActionCtx): Promise<UniswapQuote> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    const outputDecimals = await this.#decimalsOf(params.tokenOut, ctx.account);
    return {
      amountIn: formatUnits(prepared.amountIn, prepared.inputDecimals),
      estimatedAmountOut: formatUnits(prepared.quotedAmountOut, outputDecimals),
      minimumAmountOut: formatUnits(prepared.minimumAmountOut, outputDecimals),
      feeTier: prepared.poolKey.fee,
      tickSpacing: prepared.poolKey.tickSpacing,
      path: [params.tokenIn, params.tokenOut],
    };
  }

  @Capability<Uniswap, typeof swapParams>({
    intent: "Swap {amountIn} of {tokenIn} into {tokenOut} on the best Uniswap v4 fee tier",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["amm", "v4"],
  })
  async swap(params: SwapParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    // Host clock, not chain time. A host running far behind produces a
    // deadline already in the past, which surfaces as a simulation revert.
    const deadline = BigInt(Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SECONDS);
    const children: (CapabilityNode | TransactionNode)[] = [];

    if (params.tokenIn !== NATIVE) {
      // The Universal Router pulls ERC-20 input exclusively through Permit2.
      // Two plain approvals, both for exactly amountIn: token -> Permit2,
      // then Permit2 -> router with the swap deadline as expiration.
      // No signature/permit message is involved (SECURITY.md).
      children.push(
        await this.erc20.approve({
          token: params.tokenIn,
          spender: PERMIT2_ADDRESS,
          amount: prepared.amountIn.toString(),
        }),
        await this.self.permit2Approve({
          token: params.tokenIn,
          amount: prepared.amountIn.toString(),
          expiration: deadline.toString(),
        }),
      );
    }

    const currencyIn = toV4Currency(params.tokenIn);
    const currencyOut = toV4Currency(params.tokenOut);
    const actions = encodePacked(
      ["uint8", "uint8", "uint8"],
      [ACTION_SWAP_EXACT_IN_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL],
    );
    // IV4Router.ExactInputSingleParams as pinned by the deployed router
    // (universal-router 2.0.0): poolKey, zeroForOne, amountIn uint128,
    // amountOutMinimum uint128, hookData bytes.
    const swapAction = encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            {
              name: "poolKey",
              type: "tuple",
              components: [
                { name: "currency0", type: "address" },
                { name: "currency1", type: "address" },
                { name: "fee", type: "uint24" },
                { name: "tickSpacing", type: "int24" },
                { name: "hooks", type: "address" },
              ],
            },
            { name: "zeroForOne", type: "bool" },
            { name: "amountIn", type: "uint128" },
            { name: "amountOutMinimum", type: "uint128" },
            { name: "hookData", type: "bytes" },
          ],
        },
      ],
      [
        {
          poolKey: prepared.poolKey,
          zeroForOne: prepared.zeroForOne,
          amountIn: prepared.amountIn,
          amountOutMinimum: prepared.minimumAmountOut,
          hookData: "0x",
        },
      ],
    );
    const settleAll = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [currencyIn, prepared.amountIn],
    );
    const takeAll = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [currencyOut, prepared.minimumAmountOut],
    );
    const v4Input = encodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes[]" }],
      [actions, [swapAction, settleAll, takeAll]],
    );

    children.push(
      this.router.execute([encodePacked(["uint8"], [COMMAND_V4_SWAP]), [v4Input], deadline], {
        value: params.tokenIn === NATIVE ? prepared.amountIn : 0n,
      }),
    );
    return children;
  }

  @Capability<Uniswap, typeof permit2ApproveParams>({
    intent: "Grant the Uniswap Universal Router a Permit2 allowance of {amount} for {token}",
    verb: "approve",
    params: permit2ApproveParams,
    receipt: "permit2ApproveReceipt",
    risk: ["approval"],
    tags: ["permit2", "allowance"],
  })
  permit2Approve(params: Permit2ApproveParams): Nestable<TransactionNode[]> {
    // Both bounds are enforced by the declared parameter types. `nestable`
    // declares this Capability nestable through `self`, which is how `swap`
    // reaches it for ERC-20 input.
    return nestable([
      this.permit2.approve([
        params.token,
        UNISWAP_V4_ROUTER_ADDRESS,
        BigInt(params.amount),
        Number(params.expiration),
      ]),
    ]);
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<UniswapSwapOutcome> {
    let swapEvent:
      | { sender: AddressValue; amountIn: bigint; amountOut: bigint; fee: number }
      | undefined;
    let input: { token: TokenRef; amount: bigint } | undefined;
    let output: { token: TokenRef; amount: bigint; recipient: AddressValue } | undefined;

    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        const value = BigInt(change.value);
        if (sameAddress(change.to, UNISWAP_V4_POOL_MANAGER_ADDRESS)) {
          if (input) throw new Error("Uniswap swap settled its input more than once");
          input = { token: NATIVE, amount: value };
        } else if (sameAddress(change.from, UNISWAP_V4_POOL_MANAGER_ADDRESS)) {
          if (output) throw new Error("Uniswap swap took its output more than once");
          output = { token: NATIVE, amount: value, recipient: change.to };
        } else if (!sameAddress(change.to, UNISWAP_V4_ROUTER_ADDRESS)) {
          throw new Error(
            `Unexpected Change: native transfer to ${change.to} is not part of a Uniswap swap`,
          );
        }
        return this.erc20.changesReceipt([change]);
      }

      if (sameAddress(change.address, UNISWAP_V4_POOL_MANAGER_ADDRESS)) {
        const event = decodePoolManagerEvent(change);
        if (event.eventName !== "Swap") {
          throw new Error(`Unexpected Change: PoolManager emitted ${event.eventName}`);
        }
        if (swapEvent) throw new Error("Uniswap swap emitted multiple Swap events");
        if (!sameAddress(event.args.sender, UNISWAP_V4_ROUTER_ADDRESS)) {
          throw new Error("Uniswap Receipt Swap sender is not the Universal Router");
        }
        const { amount0, amount1 } = event.args;
        // v4 sign convention: deltas are from the swapper's perspective, so
        // the negative side is the input owed and the positive side is the
        // output received. Exactly one of each for a single-hop swap.
        if (amount0 >= 0n === amount1 >= 0n || amount0 === 0n || amount1 === 0n) {
          throw new Error("Uniswap Swap event amounts do not describe an exact-in swap");
        }
        swapEvent = {
          sender: event.args.sender,
          amountIn: amount0 < 0n ? -amount0 : -amount1,
          amountOut: amount0 > 0n ? amount0 : amount1,
          fee: event.args.fee,
        };
        const data = {
          event: "Swap",
          poolId: event.args.id,
          sender: event.args.sender,
          amount0: amount0.toString(),
          amount1: amount1.toString(),
          fee: event.args.fee,
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `Uniswap v4 Swap: ${swapEvent.amountIn} in, ${swapEvent.amountOut} out at fee tier ${data.fee} by ${data.sender}`,
        };
      }

      const receipt = this.erc20.changesReceipt([change]);
      const [outcome] = receipt.outcome;
      if (outcome?.operation === "transfer" && outcome.token !== NATIVE) {
        const amount = BigInt(outcome.amount);
        if (sameAddress(outcome.to, UNISWAP_V4_POOL_MANAGER_ADDRESS)) {
          if (input) throw new Error("Uniswap swap settled its input more than once");
          input = { token: outcome.token, amount };
        } else if (sameAddress(outcome.from, UNISWAP_V4_POOL_MANAGER_ADDRESS)) {
          if (output) throw new Error("Uniswap swap took its output more than once");
          output = { token: outcome.token, amount, recipient: outcome.to };
        } else {
          throw new Error(
            `Unexpected Change: ${outcome.token} transfer does not touch the PoolManager`,
          );
        }
      }
      return receipt;
    });

    if (!swapEvent) throw new Error("Uniswap swap Receipt requires the PoolManager Swap event");
    if (!input || input.amount !== swapEvent.amountIn) {
      throw new Error("Uniswap swap input settlement does not match the Swap event");
    }
    if (!output || output.amount !== swapEvent.amountOut) {
      throw new Error("Uniswap swap output settlement does not match the Swap event");
    }
    const outcome: UniswapSwapOutcome = {
      operation: "swap",
      protocol: "uniswap",
      recipient: getAddress(output.recipient),
      tokenIn: input.token === NATIVE ? NATIVE : getAddress(input.token),
      tokenOut: output.token === NATIVE ? NATIVE : getAddress(output.token),
      amountIn: input.amount.toString(),
      amountOut: output.amount.toString(),
      fee: swapEvent.fee,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Uniswap v4 Swap: ${outcome.amountIn} ${outcome.tokenIn} to ${outcome.amountOut} ${outcome.tokenOut} for ${outcome.recipient}`,
      changes: parsed,
    };
  }

  @Receipt()
  permit2ApproveReceipt(changes: readonly Change[]): ReceiptResult<Permit2ApprovalOutcome> {
    let approval: Permit2ApprovalOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind !== "event" || !sameAddress(change.address, PERMIT2_ADDRESS)) {
        throw new Error("Unexpected Change: Permit2 approval expects one Permit2 event");
      }
      let event: ReturnType<typeof decodeEventLog<typeof Permit2Abi>>;
      try {
        event = decodeEventLog({
          abi: Permit2Abi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: Permit2 emitted an unsupported event");
      }
      if (event.eventName !== "Approval") {
        throw new Error(`Unexpected Change: Permit2 emitted ${event.eventName}`);
      }
      if (approval) throw new Error("Permit2 approval emitted multiple Approval events");
      if (!sameAddress(event.args.spender, UNISWAP_V4_ROUTER_ADDRESS)) {
        throw new Error("Permit2 Approval spender is not the Universal Router");
      }
      approval = {
        operation: "approve",
        token: event.args.token,
        owner: event.args.owner,
        spender: event.args.spender,
        amount: event.args.amount.toString(),
        expiration: event.args.expiration.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: approval,
        text: `Permit2 Approval: ${approval.owner} approved ${approval.spender} for ${approval.amount} ${approval.token} until ${approval.expiration}`,
      };
    });
    if (!approval) throw new Error("Permit2 approval Receipt requires its Approval event");
    return {
      kind: "receipt",
      outcome: approval,
      text: `Permit2 Approval: ${approval.amount} ${approval.token} for ${approval.spender} until ${approval.expiration}`,
      changes: parsed,
    };
  }

  async #prepareSwap(params: SwapParams, account: AddressValue): Promise<PreparedSwap> {
    if (sameToken(params.tokenIn, params.tokenOut)) {
      throw new ParameterError("tokenIn and tokenOut must differ");
    }
    const currencyIn = toV4Currency(params.tokenIn);
    const currencyOut = toV4Currency(params.tokenOut);
    const zeroForOne = currencyIn.toLowerCase() < currencyOut.toLowerCase();
    const [currency0, currency1] = zeroForOne
      ? [currencyIn, currencyOut]
      : [currencyOut, currencyIn];

    const decimals = await this.#decimalsOf(params.tokenIn, account);
    const amountIn = parseUnits(params.amountIn, decimals);
    if (amountIn > MAX_UINT128) throw new ParameterError("amountIn exceeds uint128");

    const quoted = await Promise.allSettled(
      UNISWAP_V4_FEE_TIERS.map(async (tier) => {
        const poolKey: PoolKey = {
          currency0,
          currency1,
          fee: tier.fee,
          tickSpacing: tier.tickSpacing,
          hooks: NO_HOOKS,
        };
        const [amountOut] = await this.quoter.call.quoteExactInputSingle([
          { poolKey, zeroForOne, exactAmount: amountIn, hookData: "0x" },
        ]);
        return { poolKey, amountOut };
      }),
    );
    const candidates = quoted.flatMap((result) =>
      result.status === "fulfilled" && result.value.amountOut > 0n ? [result.value] : [],
    );
    const [first] = candidates;
    if (!first) {
      throw new Error(
        "no initialized Uniswap v4 pool quotes this pair across the canonical fee tiers",
      );
    }
    const best = candidates.reduce((left, right) =>
      right.amountOut > left.amountOut ? right : left,
    );
    // Registry-parsed params always carry the Zod default (pinned by the
    // quote test); the fallback covers typed direct callers, whose SwapParams
    // surface keeps slippage optional like the other DEX adapters.
    const slippage = BigInt(params.slippage ?? DEFAULT_SLIPPAGE_BPS);
    const minimumAmountOut = (best.amountOut * (10_000n - slippage)) / 10_000n;
    if (minimumAmountOut === 0n) {
      throw new Error("Uniswap v4 quote is too small to protect with the requested slippage");
    }
    return {
      poolKey: best.poolKey,
      zeroForOne,
      amountIn,
      quotedAmountOut: best.amountOut,
      minimumAmountOut,
      inputDecimals: decimals,
    };
  }

  async #decimalsOf(token: TokenRef, account: AddressValue): Promise<number> {
    if (token === NATIVE) return 18;
    const handle = createHandle(ERC20Abi, token, this.runtime.client, account);
    return Number(await handle.read.decimals());
  }
}

function toV4Currency(token: TokenRef): AddressValue {
  return token === NATIVE ? V4_NATIVE : token;
}

function sameToken(left: TokenRef, right: TokenRef): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function decodePoolManagerEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: PoolManagerAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error("Unexpected Change: PoolManager emitted an unsupported event");
  }
}

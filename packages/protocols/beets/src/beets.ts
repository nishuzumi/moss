/**
 * Beets 鈥?Balancer V3 DEX adapter on Monad mainnet.
 *
 * The canonical Balancer v3 Router at `0x9dA18982鈥?e017c` executes
 * single-pool swaps and liquidity changes; the Vault (`0xbA133333鈥?9bA9`) is
 * the settlement and event surface, and the VaultExtension
 * (`0x0E8B0765鈥9A9`) hosts the pool view reads. All three addresses come
 * from the balancer-deployments repository (see abis-src/VENDOR.json) and are
 * pinned on-chain by the e2e suite.
 *
 * v1 scope (intentionally narrow, mirrors the Balancer v3 Router v2 surface):
 *   - Single-pool swaps only: `swapSingleTokenExactIn` / `swapSingleTokenExactOut`.
 *   - Native MON supported on both sides: `wethIsEth` makes the Router wrap
 *     (input) or unwrap (output) automatically 鈥?no pre-wrap needed.
 *   - Liquidity: single-token `addLiquidityUnbalanced` and single-token
 *     `removeLiquiditySingleTokenExactIn`.
 *   - Quoting uses the Router's `querySwap*` / `queryAddLiquidity*` /
 *     `queryRemoveLiquidity*` view calls, executed as an eth_call from the
 *     zero address: the Vault's `quote` path reverts non-static callers
 *     (`NotStaticCall`), and the simulated rate is independent of the sender.
 *   - Router deadlines are timestamps: the adapter stamps `now + 10 minutes`
 *     at plan time (Balancer reverts once `block.timestamp > deadline`).
 *
 * Risk model (closed set per ADR 0003):
 *   - `fundOut`     鈥?input amounts leave the account
 *   - `approval`    鈥?a Router allowance is granted (explicit transaction)
 *   - `priceImpact` 鈥?pool depth moves the realised rate vs quoted
 */
import {
  type ActionCtx,
  Address,
  type AddressValue,
  BasisPoints,
  Capability,
  type CapabilityResult,
  type Change,
  createHandle,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  NATIVE,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  type TokenRef,
  TokenReference,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import { WMON_ADDRESS } from "@themoss/system";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import {
  BeetsRouterAbi,
  BeetsVaultAbi,
  BeetsVaultExplorerAbi,
  BeetsVaultExtensionAbi,
} from "./abis/beets.js";
import type { BeetsLiquidityOutcome, BeetsSwapOutcome, BeetsSwapQuote } from "./types.js";

// Canonical Balancer v3 deployment on Monad mainnet, from
// balancer/balancer-deployments (pinned commit c1c3038a 鈥?see VENDOR.json).
// Verified on-chain 2026-07-29 via rpc.monad.xyz: all three are plain
// (non-proxy) contracts, and the Router's getVault() returns the Vault below.
export const BEETS_ROUTER_ADDRESS: AddressValue = "0x9dA18982a33FD0c7051B19F0d7C76F2d5E7e017c";
export const BEETS_VAULT_ADDRESS: AddressValue = "0xbA1333333333a1BA1108E8412f11850A5C319bA9";
export const BEETS_VAULT_EXTENSION_ADDRESS: AddressValue =
  "0x0E8B07657D719B86e06bF0806D6729e3D528C9A9";
export const BEETS_VAULT_EXPLORER_ADDRESS: AddressValue =
  "0x043A2daD730d585C44FB79D2614F295D2d625412";

// Balancer v3's Router quote views revert with `NotStaticCall` when executed
// as an eth_call from a non-zero address (the Vault's quote path inspects the
// simulation context, not the quote's sender argument).
const QUERY_ACCOUNT: AddressValue = "0x0000000000000000000000000000000000000000";

const DEFAULT_SLIPPAGE_BPS = 50;
const DEFAULT_DEADLINE_SECONDS = 600;

const OptionalHumanTokenAmount = PositiveDecimalString.optional().describe(
  'An optional positive base-10 decimal amount in a token\'s display units, such as "1" or "1.5".',
);
const BeetsSlippage = BasisPoints.min(50)
  .max(5_000)
  .describe("An integer basis-point count from 50 through 5000; 1 bps equals 0.01%.");

const swapParams = {
  pool: {
    type: Address,
    description: "Address of the Balancer v3 pool that holds both tokens.",
  },
  tokenIn: { type: TokenReference, description: 'Asset offered to the swap; "native" for MON.' },
  tokenOut: {
    type: TokenReference,
    description: 'Asset requested from the swap; "native" for MON.',
  },
  amountIn: {
    type: OptionalHumanTokenAmount,
    description: "Fixed input quantity; omit when amountOut is supplied.",
  },
  amountOut: {
    type: OptionalHumanTokenAmount,
    description: "Minimum output quantity; omit when amountIn is supplied.",
  },
  slippage: {
    type: BeetsSlippage.default(DEFAULT_SLIPPAGE_BPS),
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

const addLiquidityParams = {
  pool: {
    type: Address,
    description: "Address of the Balancer v3 pool receiving liquidity.",
  },
  tokenIn: { type: TokenReference, description: 'Asset deposited; "native" for MON.' },
  amountIn: {
    type: PositiveDecimalString,
    description: "Human-readable token amount to deposit, in display units.",
  },
  slippage: {
    type: BeetsSlippage.default(DEFAULT_SLIPPAGE_BPS),
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

const removeLiquidityParams = {
  pool: {
    type: Address,
    description: "Address of the Balancer v3 pool withdrawing liquidity.",
  },
  tokenOut: { type: TokenReference, description: 'Asset withdrawn; "native" for MON.' },
  bptAmountIn: {
    type: PositiveDecimalString,
    description: "Human-readable BPT amount to redeem, in display units.",
  },
  slippage: {
    type: BeetsSlippage.default(DEFAULT_SLIPPAGE_BPS),
    description: "Maximum adverse movement allowed between quoting and execution.",
  },
} satisfies ParamsSpec;

const poolParams = {
  pool: { type: Address, description: "Address of the Balancer v3 pool to inspect." },
} satisfies ParamsSpec;

type InferredSwapParams = InferParams<typeof swapParams>;
type SwapParams = Omit<InferredSwapParams, "amountIn" | "amountOut" | "slippage"> &
  Partial<Pick<InferredSwapParams, "amountIn" | "amountOut" | "slippage">>;
type BeetsSwapParams = Pick<SwapParams, "pool" | "tokenIn" | "tokenOut" | "slippage"> & {
  slippage?: InferredSwapParams["slippage"];
} & ({ amountIn: string; amountOut?: never } | { amountIn?: never; amountOut: string });

type InferredAddParams = InferParams<typeof addLiquidityParams>;
type AddParams = InferredAddParams;

type InferredRemoveParams = InferParams<typeof removeLiquidityParams>;
type RemoveParams = InferredRemoveParams;

type PreparedSwap = {
  side: "amountIn" | "amountOut";
  pool: AddressValue;
  tokenIn: AddressValue;
  tokenOut: AddressValue;
  inputDecimals: number;
  outputDecimals: number;
  /** amountIn side: the exact input sent; amountOut side: the slippage-headroom input sent. */
  executionAmountIn: bigint;
  /** amountIn side: raw quoted output; amountOut side: the exact requested output. */
  estimatedAmountOut: bigint;
  /** amountIn side: slippage-adjusted minimum output; amountOut side: the exact requested output. */
  minimumAmountOut: bigint;
  /** amountOut side: raw quoted required input (pre-headroom). */
  estimatedAmountIn: bigint;
  wethIsEth: boolean;
  nativeIn: boolean;
};

type PreparedAddLiquidity = {
  pool: AddressValue;
  tokenIn: AddressValue;
  amountIn: bigint;
  exactAmountsIn: readonly bigint[];
  estimatedBptOut: bigint;
  minBptAmountOut: bigint;
  wethIsEth: boolean;
  nativeIn: boolean;
};

type PreparedRemoveLiquidity = {
  pool: AddressValue;
  tokenOut: AddressValue;
  bptAmountIn: bigint;
  estimatedAmountOut: bigint;
  minimumAmountOut: bigint;
  wethIsEth: boolean;
};

@Protocol({
  name: "beets",
  category: "dex",
  description:
    "Beets Balancer v3 single-pool swaps and liquidity on Monad mainnet, " +
    "executed through the canonical Router with native MON wrap/unwrap support.",
  contracts: {
    router: { abi: BeetsRouterAbi, addr: BEETS_ROUTER_ADDRESS },
    vault: { abi: BeetsVaultAbi, addr: BEETS_VAULT_ADDRESS },
    vaultExtension: { abi: BeetsVaultExtensionAbi, addr: BEETS_VAULT_EXTENSION_ADDRESS },
  },
  protocols: { erc20: ERC20 },
  labels: { Router: BEETS_ROUTER_ADDRESS, Vault: BEETS_VAULT_ADDRESS },
})
export class Beets {
  declare runtime: MossRuntime;
  declare router: Handle<typeof BeetsRouterAbi>;
  declare vault: Handle<typeof BeetsVaultAbi>;
  declare vaultExtension: Handle<typeof BeetsVaultExtensionAbi>;
  declare erc20: ProtocolRef<ERC20>;

  quote(params: BeetsSwapParams, ctx: ActionCtx): Promise<BeetsSwapQuote>;
  @Query({
    intent: "Quote a Beets swap of {tokenIn} to {tokenOut} in pool {pool}",
    params: swapParams,
    tags: ["amm", "balancer", "quote"],
  })
  async quote(params: SwapParams, ctx: ActionCtx): Promise<BeetsSwapQuote> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    if (prepared.side === "amountIn") {
      return {
        pool: prepared.pool,
        amountSide: "amountIn",
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: formatUnits(prepared.executionAmountIn, prepared.inputDecimals),
        estimatedAmountOut: formatUnits(prepared.estimatedAmountOut, prepared.outputDecimals),
        minimumAmountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
      };
    }
    return {
      pool: prepared.pool,
      amountSide: "amountOut",
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      estimatedAmountIn: formatUnits(prepared.estimatedAmountIn, prepared.inputDecimals),
      maximumAmountIn: formatUnits(prepared.executionAmountIn, prepared.inputDecimals),
      amountOut: formatUnits(prepared.minimumAmountOut, prepared.outputDecimals),
    };
  }

  swap(params: BeetsSwapParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Beets, typeof swapParams>({
    intent:
      "Swap {tokenIn} for {tokenOut} in Beets pool {pool}, tolerating {slippage} bps slippage",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["amm", "balancer", "single-pool"],
  })
  async swap(params: SwapParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareSwap(params, ctx.account);
    const deadline = deadlineTimestamp();
    const children = [];
    if (params.tokenIn !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: prepared.tokenIn,
          spender: this.router.address,
          amount: prepared.executionAmountIn.toString(),
        }),
      );
    }
    children.push(
      prepared.side === "amountIn"
        ? this.router.swapSingleTokenExactIn(
            [
              prepared.pool,
              prepared.tokenIn,
              prepared.tokenOut,
              prepared.executionAmountIn,
              prepared.minimumAmountOut,
              deadline,
              prepared.wethIsEth,
              "0x",
            ],
            { value: prepared.nativeIn ? prepared.executionAmountIn : 0n },
          )
        : this.router.swapSingleTokenExactOut(
            [
              prepared.pool,
              prepared.tokenIn,
              prepared.tokenOut,
              prepared.minimumAmountOut,
              prepared.executionAmountIn,
              deadline,
              prepared.wethIsEth,
              "0x",
            ],
            { value: prepared.nativeIn ? prepared.executionAmountIn : 0n },
          ),
    );
    return children;
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<BeetsSwapOutcome> {
    let swap: BeetsSwapOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer" || !sameAddress(change.address, BEETS_VAULT_ADDRESS)) {
        return this.erc20.changesReceipt([change]);
      }
      const event = decodeBeetsEvent(BeetsVaultAbi, change);
      if (event.eventName !== "Swap") {
        throw new Error(`Unexpected Change: Beets Vault emitted ${event.eventName}`);
      }
      if (swap) throw new Error("Beets swap emitted multiple Vault Swap events");
      const tokenIn = wethNormalize(event.args.tokenIn, event.args.amountIn, changes);
      const tokenOut = wethNormalize(event.args.tokenOut, event.args.amountOut, changes);
      swap = {
        operation: "swap",
        pool: event.args.pool,
        tokenIn,
        tokenOut,
        amountIn: event.args.amountIn.toString(),
        amountOut: event.args.amountOut.toString(),
        swapFeePercentage: event.args.swapFeePercentage.toString(),
        swapFeeAmount: event.args.swapFeeAmount.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: swap,
        text: `Beets Swap: ${swap.amountIn} ${swap.tokenIn} to ${swap.amountOut} ${swap.tokenOut} in pool ${swap.pool}`,
      };
    });
    if (!swap) throw new Error("Beets swap Receipt requires a Vault Swap event");
    return {
      kind: "receipt",
      outcome: swap,
      text: `Beets Swap: ${swap.amountIn} ${swap.tokenIn} to ${swap.amountOut} ${swap.tokenOut} in pool ${swap.pool}`,
      changes: parsed,
    };
  }

  quoteAddLiquidity(params: AddParams, ctx: ActionCtx): Promise<object>;
  @Query({
    intent: "Quote a Beets single-token add of {amountIn} {tokenIn} into pool {pool}",
    params: addLiquidityParams,
    tags: ["amm", "balancer", "liquidity", "quote"],
  })
  async quoteAddLiquidity(params: AddParams, ctx: ActionCtx) {
    const prepared = await this.#prepareAddLiquidity(params, ctx.account);
    return {
      pool: prepared.pool,
      tokenIn: params.tokenIn,
      amountIn: params.amountIn,
      estimatedBptOut: prepared.estimatedBptOut.toString(),
      minimumBptOut: prepared.minBptAmountOut.toString(),
    };
  }

  addLiquidity(params: AddParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Beets, typeof addLiquidityParams>({
    intent: "Add {amountIn} {tokenIn} to Beets pool {pool}, tolerating {slippage} bps slippage",
    verb: "supply",
    params: addLiquidityParams,
    receipt: "addLiquidityReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["amm", "balancer", "liquidity"],
  })
  async addLiquidity(params: AddParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareAddLiquidity(params, ctx.account);
    const children = [];
    if (params.tokenIn !== NATIVE) {
      children.push(
        await this.erc20.approve({
          token: prepared.tokenIn,
          spender: this.router.address,
          amount: prepared.amountIn.toString(),
        }),
      );
    }
    children.push(
      this.router.addLiquidityUnbalanced(
        [
          prepared.pool,
          prepared.exactAmountsIn,
          prepared.minBptAmountOut,
          prepared.wethIsEth,
          "0x",
        ],
        { value: prepared.nativeIn ? prepared.amountIn : 0n },
      ),
    );
    return children;
  }

  @Receipt()
  addLiquidityReceipt(changes: readonly Change[]): ReceiptResult<BeetsLiquidityOutcome> {
    let added: BeetsLiquidityOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer" || !sameAddress(change.address, BEETS_VAULT_ADDRESS)) {
        return this.erc20.changesReceipt([change]);
      }
      const event = decodeBeetsEvent(BeetsVaultAbi, change);
      if (event.eventName !== "LiquidityAdded") {
        throw new Error(`Unexpected Change: Beets Vault emitted ${event.eventName}`);
      }
      if (added) throw new Error("Beets add emitted multiple Vault LiquidityAdded events");
      added = {
        operation: "addLiquidity",
        pool: event.args.pool,
        provider: event.args.liquidityProvider,
        kind: Number(event.args.kind),
        amounts: event.args.amountsAddedRaw.map(String),
        swapFees: event.args.swapFeeAmountsRaw.map(String),
        totalBptSupply: event.args.totalSupply.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: added,
        text: `Beets Add Liquidity: ${added.amounts.length} token amounts into pool ${added.pool} by ${added.provider}`,
      };
    });
    if (!added) throw new Error("Beets add Receipt requires a Vault LiquidityAdded event");
    return {
      kind: "receipt",
      outcome: added,
      text: `Beets Add Liquidity: ${added.amounts.length} token amounts into pool ${added.pool} by ${added.provider}`,
      changes: parsed,
    };
  }

  quoteRemoveLiquidity(params: RemoveParams, ctx: ActionCtx): Promise<object>;
  @Query({
    intent: "Quote a Beets single-token removal of {bptAmountIn} BPT from pool {pool}",
    params: removeLiquidityParams,
    tags: ["amm", "balancer", "liquidity", "quote"],
  })
  async quoteRemoveLiquidity(params: RemoveParams, ctx: ActionCtx) {
    const prepared = await this.#prepareRemoveLiquidity(params, ctx.account);
    return {
      pool: prepared.pool,
      tokenOut: params.tokenOut,
      bptAmountIn: params.bptAmountIn,
      estimatedAmountOut: prepared.estimatedAmountOut.toString(),
      minimumAmountOut: prepared.minimumAmountOut.toString(),
    };
  }

  removeLiquidity(params: RemoveParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Beets, typeof removeLiquidityParams>({
    intent:
      "Remove {bptAmountIn} BPT from Beets pool {pool} for {tokenOut}, tolerating {slippage} bps slippage",
    verb: "withdraw",
    params: removeLiquidityParams,
    receipt: "removeLiquidityReceipt",
    risk: ["fundOut", "priceImpact"],
    tags: ["amm", "balancer", "liquidity"],
  })
  async removeLiquidity(params: RemoveParams, ctx: ActionCtx): Promise<CapabilityResult> {
    const prepared = await this.#prepareRemoveLiquidity(params, ctx.account);
    return [
      this.router.removeLiquiditySingleTokenExactIn(
        [
          prepared.pool,
          prepared.bptAmountIn,
          prepared.tokenOut,
          prepared.minimumAmountOut,
          prepared.wethIsEth,
          "0x",
        ],
        {},
      ),
    ];
  }

  @Receipt()
  removeLiquidityReceipt(changes: readonly Change[]): ReceiptResult<BeetsLiquidityOutcome> {
    let removed: BeetsLiquidityOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer" || !sameAddress(change.address, BEETS_VAULT_ADDRESS)) {
        return this.erc20.changesReceipt([change]);
      }
      const event = decodeBeetsEvent(BeetsVaultAbi, change);
      if (event.eventName !== "LiquidityRemoved") {
        throw new Error(`Unexpected Change: Beets Vault emitted ${event.eventName}`);
      }
      if (removed) throw new Error("Beets remove emitted multiple Vault LiquidityRemoved events");
      removed = {
        operation: "removeLiquidity",
        pool: event.args.pool,
        provider: event.args.liquidityProvider,
        kind: Number(event.args.kind),
        amounts: event.args.amountsRemovedRaw.map(String),
        swapFees: event.args.swapFeeAmountsRaw.map(String),
        totalBptSupply: event.args.totalSupply.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: removed,
        text: `Beets Remove Liquidity: ${removed.amounts.length} token amounts from pool ${removed.pool} by ${removed.provider}`,
      };
    });
    if (!removed) throw new Error("Beets remove Receipt requires a Vault LiquidityRemoved event");
    return {
      kind: "receipt",
      outcome: removed,
      text: `Beets Remove Liquidity: ${removed.amounts.length} token amounts from pool ${removed.pool} by ${removed.provider}`,
      changes: parsed,
    };
  }

  @Query({
    intent: "Inspect Beets pool {pool}: tokens, raw balances, and static swap fee",
    params: poolParams,
    tags: ["amm", "balancer", "pool"],
  })
  async pool(params: InferParams<typeof poolParams>, ctx: ActionCtx) {
    const explorer = this.#vaultExplorer(ctx.account);
    const [tokens, , balancesRaw] = await explorer.read.getPoolTokenInfo([params.pool]);
    const staticSwapFeePercentage = await explorer.read.getStaticSwapFeePercentage([params.pool]);
    return {
      pool: params.pool,
      tokens,
      balancesRaw: balancesRaw.map(String),
      staticSwapFeePercentage: staticSwapFeePercentage.toString(),
    };
  }

  async #prepareSwap(params: SwapParams, account: AddressValue): Promise<PreparedSwap> {
    const tokenIn = resolvedToken(params.tokenIn);
    const tokenOut = resolvedToken(params.tokenOut);
    if (sameAddress(tokenIn, tokenOut)) {
      throw new ParameterError("tokenIn and tokenOut must differ");
    }
    const poolTokens = await this.#poolTokens(params.pool, account);
    if (!poolTokens.some((token) => sameAddress(token, tokenIn))) {
      throw new ParameterError(`tokenIn is not a token of pool ${params.pool}`);
    }
    if (!poolTokens.some((token) => sameAddress(token, tokenOut))) {
      throw new ParameterError(`tokenOut is not a token of pool ${params.pool}`);
    }
    const inputDecimals = await this.#decimals(tokenIn, account);
    const outputDecimals = await this.#decimals(tokenOut, account);
    const side = amountSide(params);
    const slippage = BigInt(params.slippage ?? DEFAULT_SLIPPAGE_BPS);
    const wethIsEth = params.tokenIn === NATIVE || params.tokenOut === NATIVE;

    if (side.kind === "amountIn") {
      const amountIn = parseUnits(side.amount, inputDecimals);
      const estimated = (await this.router.call.querySwapSingleTokenExactIn(
        [params.pool, tokenIn, tokenOut, amountIn, account, "0x"],
        { from: QUERY_ACCOUNT },
      )) as bigint;
      const minimumAmountOut = (estimated * (10_000n - slippage)) / 10_000n;
      return {
        side: "amountIn",
        pool: params.pool,
        tokenIn,
        tokenOut,
        inputDecimals,
        outputDecimals,
        executionAmountIn: amountIn,
        estimatedAmountOut: estimated,
        minimumAmountOut,
        estimatedAmountIn: amountIn,
        wethIsEth,
        nativeIn: params.tokenIn === NATIVE,
      };
    }

    const amountOut = parseUnits(side.amount, outputDecimals);
    const required = (await this.router.call.querySwapSingleTokenExactOut(
      [params.pool, tokenIn, tokenOut, amountOut, account, "0x"],
      { from: QUERY_ACCOUNT },
    )) as bigint;
    const executionAmountIn = (required * (10_000n + slippage) + 9_999n) / 10_000n;
    return {
      side: "amountOut",
      pool: params.pool,
      tokenIn,
      tokenOut,
      inputDecimals,
      outputDecimals,
      executionAmountIn,
      estimatedAmountOut: amountOut,
      minimumAmountOut: amountOut,
      estimatedAmountIn: required,
      wethIsEth,
      nativeIn: params.tokenIn === NATIVE,
    };
  }

  async #prepareAddLiquidity(
    params: AddParams,
    account: AddressValue,
  ): Promise<PreparedAddLiquidity> {
    const tokenIn = resolvedToken(params.tokenIn);
    const poolTokens = await this.#poolTokens(params.pool, account);
    const index = poolTokens.findIndex((token) => sameAddress(token, tokenIn));
    if (index < 0) throw new ParameterError(`tokenIn is not a token of pool ${params.pool}`);
    const decimals = await this.#decimals(tokenIn, account);
    const amountIn = parseUnits(params.amountIn, decimals);
    const exactAmountsIn = poolTokens.map((_token, i) => (i === index ? amountIn : 0n));
    const quoted = (await this.router.call.queryAddLiquidityUnbalanced(
      [params.pool, exactAmountsIn, account, "0x"],
      { from: QUERY_ACCOUNT },
    )) as bigint;
    const minBptAmountOut = (quoted * (10_000n - BigInt(params.slippage))) / 10_000n;
    return {
      pool: params.pool,
      tokenIn,
      amountIn,
      exactAmountsIn,
      estimatedBptOut: quoted,
      minBptAmountOut,
      wethIsEth: params.tokenIn === NATIVE,
      nativeIn: params.tokenIn === NATIVE,
    };
  }

  async #prepareRemoveLiquidity(
    params: RemoveParams,
    account: AddressValue,
  ): Promise<PreparedRemoveLiquidity> {
    const tokenOut = resolvedToken(params.tokenOut);
    const poolTokens = await this.#poolTokens(params.pool, account);
    if (!poolTokens.some((token) => sameAddress(token, tokenOut))) {
      throw new ParameterError(`tokenOut is not a token of pool ${params.pool}`);
    }
    const bptDecimals = await this.#decimals(params.pool, account);
    const bptAmountIn = parseUnits(params.bptAmountIn, bptDecimals);
    const quoted = (await this.router.call.queryRemoveLiquiditySingleTokenExactIn(
      [params.pool, bptAmountIn, tokenOut, account, "0x"],
      { from: QUERY_ACCOUNT },
    )) as bigint;
    const minimumAmountOut = (quoted * (10_000n - BigInt(params.slippage))) / 10_000n;
    return {
      pool: params.pool,
      tokenOut,
      bptAmountIn,
      estimatedAmountOut: quoted,
      minimumAmountOut,
      wethIsEth: params.tokenOut === NATIVE,
    };
  }

  async #poolTokens(pool: AddressValue, account: AddressValue): Promise<readonly AddressValue[]> {
    return this.#vaultExplorer(account).read.getPoolTokens([pool]);
  }

  #vaultExplorer(account: AddressValue): Handle<typeof BeetsVaultExplorerAbi> {
    return createHandle(
      BeetsVaultExplorerAbi,
      BEETS_VAULT_EXPLORER_ADDRESS,
      this.runtime.client,
      account,
    );
  }

  async #decimals(token: AddressValue, account: AddressValue): Promise<number> {
    const handle = createHandle(ERC20Abi, token, this.runtime.client, account);
    const decimals = await handle.read.decimals();
    if (decimals > 255n) throw new Error(`token ${token} reports invalid decimals`);
    return Number(decimals);
  }
}

function deadlineTimestamp(): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + DEFAULT_DEADLINE_SECONDS);
}

function resolvedToken(token: TokenRef): AddressValue {
  return token === NATIVE ? WMON_ADDRESS : token;
}

function amountSide(params: SwapParams) {
  if (params.amountIn !== undefined && params.amountOut === undefined) {
    return { kind: "amountIn", amount: params.amountIn } as const;
  }
  if (params.amountOut !== undefined && params.amountIn === undefined) {
    return { kind: "amountOut", amount: params.amountOut } as const;
  }
  throw new ParameterError("provide exactly one of amountIn or amountOut");
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function wethNormalize(token: AddressValue, amount: bigint, changes: readonly Change[]): TokenRef {
  if (!sameAddress(token, WMON_ADDRESS)) return token;
  const nativeMatch = changes.some(
    (change) => change.kind === "nativeTransfer" && change.value === amount.toString(),
  );
  return nativeMatch ? NATIVE : token;
}

function tryDecodeBeetsEvent<TAbi extends typeof BeetsVaultAbi>(
  abi: TAbi,
  change: Extract<Change, { kind: "event" }>,
) {
  try {
    return decodeEventLog({
      abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

function decodeBeetsEvent<TAbi extends typeof BeetsVaultAbi>(
  abi: TAbi,
  change: Extract<Change, { kind: "event" }>,
) {
  const event = tryDecodeBeetsEvent(abi, change);
  if (!event)
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported Beets event`);
  return event;
}

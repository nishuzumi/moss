/**
 * Kuru — Monad-native fully on-chain CLOB (central limit order book) DEX.
 *
 * A market-order swap here is verb `swap` like on any AMM — the user pays A
 * and receives B — but the mechanics differ (ADR 0003: `clob` goes in tags,
 * not in a new verb):
 *
 *   - Quoting: there is no pool formula. The exact fill is obtained by
 *     eth_call-simulating the market order itself (`handle.call.*`), the same
 *     technique Kuru's own SDK uses. The returned amount is net of fees.
 *   - Execution: through the KuruRouter's `anyToAnySwap`, which routes over
 *     one or more markets. v1 supports single-hop swaps on a curated catalog
 *     of verified markets.
 *   - Native MON: Kuru markets denominate raw native MON as address(0) —
 *     WMON plays no role. Moss's NATIVE sentinel maps to/from that.
 *
 * All addresses verified on-chain 2026-07-06/07 against rpc.monad.xyz; ABI
 * provenance is documented in ./abis/kuru.ts (ADR 0007).
 */
import {
  type Address,
  Capability,
  type DecodedEvent,
  Event,
  type Handle,
  NATIVE,
  type ObserveCtx,
  Protocol,
  plan,
  Query,
  slippageBps,
  type TokenRef,
  type TxStep,
  token,
  tokenAmount,
} from "@themoss/core";
import { approveStep } from "@themoss/erc";
import { knownTokenAddress } from "@themoss/system";
import { KuruOrderbookAbi, KuruRouterAbi } from "./abis/kuru.js";

export const KURU_ROUTER_ADDRESS: Address = "0xd651346d7c789536ebf06dc72aE3C8502cd695CC";
// Token addresses come from the system token data (single source of truth).
export const USDC_ADDRESS: Address = knownTokenAddress("USDC");
export const AUSD_ADDRESS: Address = knownTokenAddress("AUSD");

/** Kuru denominates native MON as the zero address. */
const KURU_NATIVE: Address = "0x0000000000000000000000000000000000000000";
const toKuru = (t: TokenRef): Address => (t === NATIVE ? KURU_NATIVE : t);

/**
 * Curated verified markets. Kuru has no on-chain market enumeration; entries
 * are validated against the market's own getMarketParams() at first use, so
 * catalog rot fails loudly instead of building wrong transactions.
 */
interface MarketEntry {
  handle: "monUsdc" | "monAusd";
  label: string;
  base: TokenRef;
  quote: Address;
}

const MARKETS: MarketEntry[] = [
  { handle: "monUsdc", label: "MON/USDC", base: NATIVE, quote: USDC_ADDRESS },
  { handle: "monAusd", label: "MON/AUSD", base: NATIVE, quote: AUSD_ADDRESS },
];

interface MarketParams {
  pricePrecision: bigint;
  sizePrecision: bigint;
  baseAsset: Address;
  baseDecimals: bigint;
  quoteAsset: Address;
  quoteDecimals: bigint;
}

const sameToken = (a: TokenRef, b: TokenRef) => a.toLowerCase() === b.toLowerCase();

@Protocol({
  name: "kuru",
  category: "dex",
  description:
    "Kuru: Monad-native on-chain orderbook (CLOB) DEX. Market-order swaps over verified markets via the KuruRouter.",
  contracts: {
    router: { abi: KuruRouterAbi, addr: KURU_ROUTER_ADDRESS },
    monUsdc: {
      abi: KuruOrderbookAbi,
      addr: "0x065C9d28E428A0db40191a54d33d5b7c71a9C394",
    },
    monAusd: {
      abi: KuruOrderbookAbi,
      addr: "0x131a2e70a5b31a517a74b8c567149bc294470da9",
    },
  },
})
export class Kuru {
  declare router: Handle<typeof KuruRouterAbi>;
  declare monUsdc: Handle<typeof KuruOrderbookAbi>;
  declare monAusd: Handle<typeof KuruOrderbookAbi>;

  #params = new Map<string, MarketParams>();

  /** Find the market for a pair and whether the swap is a buy (quote → base). */
  async #resolve(tokenIn: TokenRef, tokenOut: TokenRef) {
    const entry = MARKETS.find(
      (m) =>
        (sameToken(tokenIn, m.base) && sameToken(tokenOut, m.quote)) ||
        (sameToken(tokenIn, m.quote) && sameToken(tokenOut, m.base)),
    );
    if (!entry) {
      const pairs = MARKETS.map((m) => m.label).join(", ");
      throw new Error(`no verified Kuru market for this pair (supported: ${pairs})`);
    }
    const market = this[entry.handle];
    const params = await this.#marketParams(entry, market);
    // Buying means spending the quote asset to receive the base asset.
    const isBuy = sameToken(tokenIn, entry.quote);
    return { entry, market, params, isBuy };
  }

  async #marketParams(entry: MarketEntry, market: Handle<typeof KuruOrderbookAbi>) {
    let params = this.#params.get(entry.handle);
    if (!params) {
      const [pricePrecision, sizePrecision, baseAsset, baseDecimals, quoteAsset, quoteDecimals] =
        await market.read.getMarketParams();
      params = {
        pricePrecision: BigInt(pricePrecision),
        sizePrecision,
        baseAsset: baseAsset as Address,
        baseDecimals,
        quoteAsset: quoteAsset as Address,
        quoteDecimals,
      };
      // Kuru contracts are upgradeable; verify the catalog against reality.
      if (
        !sameToken(params.baseAsset, toKuru(entry.base)) ||
        !sameToken(params.quoteAsset, entry.quote)
      ) {
        throw new Error(`Kuru market catalog is stale for ${entry.label}; refusing to build`);
      }
      this.#params.set(entry.handle, params);
    }
    return params;
  }

  /**
   * Exact expected fill for a market order, by simulating it via eth_call —
   * Kuru sizes market orders in precision units, not token decimals:
   * buys in `quote × pricePrecision`, sells in `base × sizePrecision`.
   */
  async #quoteFill(
    market: Handle<typeof KuruOrderbookAbi>,
    params: MarketParams,
    isBuy: boolean,
    amountIn: bigint,
  ): Promise<bigint> {
    if (isBuy) {
      const quoteSize = (amountIn * params.pricePrecision) / 10n ** params.quoteDecimals;
      if (quoteSize <= 0n) throw new Error("amount is below the market's price precision");
      return (await market.call.placeAndExecuteMarketBuy([quoteSize, 0n, false, false])) as bigint;
    }
    const size = (amountIn * params.sizePrecision) / 10n ** params.baseDecimals;
    if (size <= 0n) throw new Error("amount is below the market's size precision");
    return (await market.call.placeAndExecuteMarketSell([size, 0n, false, false])) as bigint;
  }

  @Query({
    intent: "Quote a market-order swap of {amount} {tokenIn} into {tokenOut} on Kuru",
    params: {
      tokenIn: token,
      tokenOut: token,
      amount: tokenAmount("tokenIn"),
    },
    tags: ["clob", "orderbook", "quote"],
  })
  async quote({
    tokenIn,
    tokenOut,
    amount,
  }: {
    tokenIn: TokenRef;
    tokenOut: TokenRef;
    amount: bigint;
  }) {
    const { entry, market, params, isBuy } = await this.#resolve(tokenIn, tokenOut);
    const amountOut = await this.#quoteFill(market, params, isBuy, amount);
    return {
      market: entry.label,
      direction: isBuy ? "buy" : "sell",
      amountIn: amount.toString(),
      amountOut: amountOut.toString(),
      note: "amountOut is the simulated net fill at current book depth; it moves with the book",
    };
  }

  @Capability({
    intent:
      "Swap {amount} {tokenIn} into {tokenOut} at market on Kuru, tolerating {slippage} bps slippage",
    verb: "swap",
    params: {
      tokenIn: token,
      tokenOut: token,
      amount: tokenAmount("tokenIn"),
      slippage: slippageBps(100),
    },
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["clob", "orderbook"],
    // The on-chain receipt: simulation must surface the swapResult
    // observation, or CONFIRMATION_MISSING warns (ADR 0008).
    confirms: ["swapResult"],
  })
  async swap({
    tokenIn,
    tokenOut,
    amount,
    slippage,
  }: {
    tokenIn: TokenRef;
    tokenOut: TokenRef;
    amount: bigint;
    slippage: number;
  }) {
    const { market, params, isBuy } = await this.#resolve(tokenIn, tokenOut);
    const quoted = await this.#quoteFill(market, params, isBuy, amount);
    const minOut = (quoted * (10_000n - BigInt(slippage))) / 10_000n;
    if (minOut <= 0n) throw new Error("quoted fill is zero — amount too small for this book");

    const nativeIn = tokenIn === NATIVE;
    const steps: TxStep[] = [];
    if (!nativeIn) {
      // ERC-20 input: the router pulls via transferFrom — approve exactly the
      // input amount (encoding from the standards layer). The step is tagged,
      // so the approval expectation is auto-declared by plan().
      steps.push(approveStep(tokenIn as Address, this.router.address, amount));
    }
    steps.push(
      this.router.anyToAnySwap(
        [[market.address], [isBuy], [nativeIn], toKuru(tokenIn), toKuru(tokenOut), amount, minOut],
        { value: nativeIn ? amount : 0n },
      ),
    );

    return plan(steps, {
      out: [{ token: tokenIn, amountMax: amount }],
      in: [{ token: tokenOut, amountMin: minOut }],
    });
  }

  /** Dealer: seed ctx.shared with the fill count (one order = N Trade events). */
  countFills(events: DecodedEvent[], ctx: ObserveCtx): void {
    ctx.shared.fills = events.filter((e) => e.name === "Trade").length;
  }

  @Event<Kuru>({
    events: {
      router: ["KuruRouterSwap"],
      monUsdc: ["Trade"],
      monAusd: ["Trade"],
    },
    dealer: "countFills",
    intent: "Swapped {amountIn} {tokenIn} into {amountOut} {tokenOut} on Kuru ({fills} fills)",
  })
  async swapResult(events: DecodedEvent[], ctx: ObserveCtx) {
    const swap = events.find((e) => e.name === "KuruRouterSwap");
    if (!swap) return null;
    // Router event amounts are in native token units; render them human.
    const args = swap.args as {
      debitToken: Address;
      creditToken: Address;
      amountIn: bigint;
      amountOut: bigint;
    };
    const fromKuru = (a: Address): TokenRef => (a.toLowerCase() === KURU_NATIVE ? NATIVE : a);
    const tokenIn = await ctx.token(fromKuru(args.debitToken));
    const tokenOut = await ctx.token(fromKuru(args.creditToken));
    return {
      tokenIn: tokenIn.symbol,
      amountIn: tokenIn.format(args.amountIn),
      tokenOut: tokenOut.symbol,
      amountOut: tokenOut.format(args.amountOut),
      fills: Number(ctx.shared.fills ?? 0),
    };
  }

  @Query({
    intent: "List the verified Kuru markets this adapter can trade on",
    params: {},
    tags: ["clob", "orderbook"],
  })
  async markets() {
    return MARKETS.map((m) => ({
      market: this[m.handle].address,
      label: m.label,
      base: m.base,
      quote: m.quote,
    }));
  }
}

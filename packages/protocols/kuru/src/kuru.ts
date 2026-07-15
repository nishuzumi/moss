import {
  BasisPoints,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
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
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { AUSD_ADDRESS, USDC_ADDRESS } from "@themoss/system";
import { decodeEventLog, parseUnits } from "viem";
import { KuruOrderbookAbi, KuruRouterAbi } from "./abis/kuru.js";

// Official mainnet router and markets:
// https://docs.kuru.io/contracts/Contract-addresses (retrieved 2026-07-15).
// The live Kuru test verifies deployed bytecode and market parameters.
export const KURU_ROUTER_ADDRESS = "0xd651346d7c789536ebf06dc72aE3C8502cd695CC" as const;
const MON_USDC_ADDRESS = "0x065C9d28E428A0db40191a54d33d5b7c71a9C394" as const;
const MON_AUSD_ADDRESS = "0x131a2e70a5b31a517a74b8c567149bc294470da9" as const;
const KURU_NATIVE = "0x0000000000000000000000000000000000000000" as const;

const swapParams = {
  tokenIn: { type: TokenReference, description: "Asset offered to the swap." },
  tokenOut: { type: TokenReference, description: "Asset requested from the swap." },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of tokenIn offered to the selected market.",
  },
  slippage: {
    type: BasisPoints.default(50),
    description: "Maximum output reduction from the current quote; 50 means 0.5%.",
  },
} satisfies ParamsSpec;

const quoteParams = {
  tokenIn: swapParams.tokenIn,
  tokenOut: swapParams.tokenOut,
  amount: swapParams.amount,
} satisfies ParamsSpec;

type MarketHandle = "monUsdc" | "monAusd";
type MarketEntry = {
  handle: MarketHandle;
  label: string;
  base: TokenRef;
  quote: Exclude<TokenRef, typeof NATIVE>;
};

const MARKETS: readonly MarketEntry[] = [
  { handle: "monUsdc", label: "MON/USDC", base: NATIVE, quote: USDC_ADDRESS },
  { handle: "monAusd", label: "MON/AUSD", base: NATIVE, quote: AUSD_ADDRESS },
];

type MarketParams = {
  pricePrecision: bigint;
  sizePrecision: bigint;
  baseAsset: Exclude<TokenRef, typeof NATIVE>;
  baseDecimals: bigint;
  quoteAsset: Exclude<TokenRef, typeof NATIVE>;
  quoteDecimals: bigint;
};

export type KuruSwapOutcome = {
  operation: "swap";
  protocol: "kuru";
  sender: Exclude<TokenRef, typeof NATIVE>;
  tokenIn: TokenRef;
  tokenOut: TokenRef;
  amountIn: string;
  amountOut: string;
  fills: number;
};

const sameToken = (left: TokenRef, right: TokenRef) => left.toLowerCase() === right.toLowerCase();
const toKuru = (token: TokenRef) => (token === NATIVE ? KURU_NATIVE : token);
const fromKuru = (token: Exclude<TokenRef, typeof NATIVE>): TokenRef =>
  token.toLowerCase() === KURU_NATIVE ? NATIVE : token;

@Protocol({
  name: "kuru",
  category: "dex",
  description: "Kuru on-chain orderbook market swaps over verified Monad markets.",
  contracts: {
    router: { abi: KuruRouterAbi, addr: KURU_ROUTER_ADDRESS },
    monUsdc: { abi: KuruOrderbookAbi, addr: MON_USDC_ADDRESS },
    monAusd: { abi: KuruOrderbookAbi, addr: MON_AUSD_ADDRESS },
  },
  protocols: { erc20: ERC20 },
})
export class Kuru {
  declare router: Handle<typeof KuruRouterAbi>;
  declare monUsdc: Handle<typeof KuruOrderbookAbi>;
  declare monAusd: Handle<typeof KuruOrderbookAbi>;
  declare erc20: ProtocolRef<ERC20>;

  @Query({ intent: "Quote a Kuru market swap", params: quoteParams, tags: ["clob", "quote"] })
  async quote(params: InferParams<typeof quoteParams>) {
    const resolved = await this.#resolve(params.tokenIn, params.tokenOut);
    const amountIn = parseUnits(params.amount, resolved.inputDecimals);
    const amountOut = await this.#quoteFill(resolved, amountIn);
    return {
      market: resolved.entry.label,
      direction: resolved.isBuy ? "buy" : "sell",
      amountIn: amountIn.toString(),
      amountOut: amountOut.toString(),
    };
  }

  @Capability<Kuru, typeof swapParams>({
    intent: "Swap tokens through a Kuru market",
    verb: "swap",
    params: swapParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval", "priceImpact"],
    tags: ["clob", "orderbook"],
  })
  async swap(params: InferParams<typeof swapParams>) {
    const resolved = await this.#resolve(params.tokenIn, params.tokenOut);
    const amountIn = parseUnits(params.amount, resolved.inputDecimals);
    const quoted = await this.#quoteFill(resolved, amountIn);
    const minOut = (quoted * (10_000n - BigInt(params.slippage))) / 10_000n;
    if (minOut <= 0n) throw new Error("quoted Kuru output is zero");

    const nativeIn = params.tokenIn === NATIVE;
    const children = [];
    if (!nativeIn) {
      children.push(
        await this.erc20.approve({
          token: params.tokenIn,
          spender: this.router.address,
          amount: amountIn.toString(),
        }),
      );
    }
    children.push(
      this.router.anyToAnySwap(
        [
          [resolved.market.address],
          [resolved.isBuy],
          [nativeIn],
          toKuru(params.tokenIn),
          toKuru(params.tokenOut),
          amountIn,
          minOut,
        ],
        { value: nativeIn ? amountIn : 0n },
      ),
    );
    return children;
  }

  @Query({
    intent: "List Kuru markets supported by this Protocol",
    params: {},
    tags: ["clob", "orderbook"],
  })
  async markets() {
    return MARKETS.map((market) => ({
      market: this[market.handle].address,
      label: market.label,
      base: market.base,
      quote: market.quote,
    }));
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): ReceiptResult<KuruSwapOutcome> {
    let swap: KuruSwapOutcome | undefined;
    let fills = 0;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      if (sameAddress(change.address, KURU_ROUTER_ADDRESS)) {
        const event = decodeKuruEvent(KuruRouterAbi, change);
        if (event.eventName !== "KuruRouterSwap") {
          throw new Error(`Unexpected Change: Kuru router emitted ${event.eventName}`);
        }
        if (swap) throw new Error("Kuru swap emitted multiple KuruRouterSwap events");
        swap = {
          operation: "swap",
          protocol: "kuru",
          sender: event.args.msgSender,
          tokenIn: fromKuru(event.args.debitToken),
          tokenOut: fromKuru(event.args.creditToken),
          amountIn: event.args.amountIn.toString(),
          amountOut: event.args.amountOut.toString(),
          fills: 0,
        };
        const text = `Kuru Swap: ${swap.amountIn} ${swap.tokenIn} to ${swap.amountOut} ${swap.tokenOut} by ${swap.sender}`;
        return { kind: "change" as const, change, data: swap, text };
      }
      if (
        sameAddress(change.address, MON_USDC_ADDRESS) ||
        sameAddress(change.address, MON_AUSD_ADDRESS)
      ) {
        const event = decodeKuruEvent(KuruOrderbookAbi, change);
        if (event.eventName !== "Trade") {
          throw new Error(`Unexpected Change: Kuru market emitted ${event.eventName}`);
        }
        fills += 1;
        const data = {
          operation: "fill",
          market: change.address,
          orderId: event.args.orderId.toString(),
          maker: event.args.makerAddress,
          taker: event.args.takerAddress,
          price: event.args.price.toString(),
          size: event.args.filledSize.toString(),
        } as const;
        return {
          kind: "change" as const,
          change,
          data,
          text: `Kuru Trade: ${data.size} at ${data.price} on ${data.market}`,
        };
      }
      return this.erc20.changesReceipt([change]);
    });
    if (!swap) throw new Error("Kuru swap Receipt requires KuruRouterSwap");
    swap.fills = fills;
    return {
      kind: "receipt",
      outcome: swap,
      text: `Kuru Swap: ${swap.amountIn} ${swap.tokenIn} to ${swap.amountOut} ${swap.tokenOut} across ${fills} fill${fills === 1 ? "" : "s"}`,
      changes: parsed,
    };
  }

  async #resolve(tokenIn: TokenRef, tokenOut: TokenRef) {
    const entry = MARKETS.find(
      (market) =>
        (sameToken(tokenIn, market.base) && sameToken(tokenOut, market.quote)) ||
        (sameToken(tokenIn, market.quote) && sameToken(tokenOut, market.base)),
    );
    if (!entry) throw new Error("no verified Kuru market for this token pair");
    const market = this[entry.handle];
    const params = await this.#marketParams(entry, market);
    const isBuy = sameToken(tokenIn, entry.quote);
    const inputDecimals = Number(isBuy ? params.quoteDecimals : params.baseDecimals);
    return { entry, market, params, isBuy, inputDecimals };
  }

  async #marketParams(entry: MarketEntry, market: Handle<typeof KuruOrderbookAbi>) {
    const [pricePrecision, sizePrecision, baseAsset, baseDecimals, quoteAsset, quoteDecimals] =
      await market.read.getMarketParams();
    const params = {
      pricePrecision: BigInt(pricePrecision),
      sizePrecision,
      baseAsset,
      baseDecimals,
      quoteAsset,
      quoteDecimals,
    };
    if (
      !sameToken(params.baseAsset, toKuru(entry.base)) ||
      !sameToken(params.quoteAsset, entry.quote)
    ) {
      throw new Error(`Kuru market address does not match ${entry.label}`);
    }
    return params;
  }

  async #quoteFill(
    resolved: { market: Handle<typeof KuruOrderbookAbi>; params: MarketParams; isBuy: boolean },
    amountIn: bigint,
  ) {
    if (resolved.isBuy) {
      const size =
        (amountIn * resolved.params.pricePrecision) / 10n ** resolved.params.quoteDecimals;
      if (size <= 0n) throw new Error("amount is below Kuru price precision");
      return resolved.market.call.placeAndExecuteMarketBuy([size, 0n, false, false]);
    }
    const size = (amountIn * resolved.params.sizePrecision) / 10n ** resolved.params.baseDecimals;
    if (size <= 0n) throw new Error("amount is below Kuru size precision");
    return resolved.market.call.placeAndExecuteMarketSell(
      [size, 0n, false, false],
      sameToken(resolved.params.baseAsset, KURU_NATIVE)
        ? { value: amountIn, balance: amountIn }
        : {},
    );
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function decodeKuruEvent<TAbi extends typeof KuruRouterAbi | typeof KuruOrderbookAbi>(
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
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported Kuru event`);
  }
}

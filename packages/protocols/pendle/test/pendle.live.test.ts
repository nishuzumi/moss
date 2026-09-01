import {
  type Address,
  type CapabilityNode,
  createRuntime,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { createTraceSimulator, type StateOverrides } from "@themoss/simulator";
import { encodeAbiParameters, formatUnits, getAddress, keccak256, parseUnits, toHex } from "viem";
import { beforeAll, describe, expect, it } from "vitest";
import { discoverPendleMarkets } from "../src/market-discovery.js";
import { Pendle } from "../src/pendle.js";
import type { PendleSwapOutcome, VerifiedMarket } from "../src/types.js";

const ZERO_ACCOUNT = getAddress("0x0000000000000000000000000000000000000000");
const TEST_ACCOUNT = getAddress("0x71bB63F1A3b94729874FE961B5cD3209CFD45A03");
// Later-dated USDat market; the 2026-08-27 fixture no longer has a stable fee-bearing sell path.
const TEST_MARKET = getAddress("0x88C5D8A908834E44B421CB67aEc9A931782f9538");
const ERC20_BALANCES_MAPPING_SLOT = 0n;
const USDAT_TEST_ACCOUNT_BALANCE_SLOT =
  "0x013b2304f519dd3bb551ca27c60cd907fb8619e5c0a5ef31cfdca85be2b9552c";
// These are currently demonstrated fee-bearing amounts. Pendle's dust floor is market-state
// dependent, so live simulations retain ABI-derived Router diagnostics instead of hardcoding it.
const SWAP_AMOUNT = "0.1";
const SELL_FUND_AMOUNT = "0.1";
const SELL_AMOUNT = "0.05";
// Quotes nonzero, but its net LP fee rounds to zero on TEST_MARKET.
const DUST_AMOUNT = 5n;

// Both swap directions use a fixed caller with an ERC-20 balance storage override. This keeps the
// live gate deterministic while preserving real current market, quote, Router, and Receipt behavior.
describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle protocol on Monad mainnet", () => {
  let runtime: MossRuntime;
  let registry: Registry;
  let market: VerifiedMarket;

  beforeAll(async () => {
    runtime = await createRuntime();
    registry = new Registry(runtime).use(Pendle);
    const result = await discoverPendleMarkets(runtime);
    const current = result.verified.find(
      ({ market: candidate }) => candidate.market === TEST_MARKET,
    );
    if (!current)
      throw new Error(`fixed live-test market ${TEST_MARKET} is not a current candidate`);
    market = current.market;
  }, 180_000);

  it("swaps underlying into PT with an exhaustive typed Receipt", {
    timeout: 240_000,
  }, async () => {
    const capability = await registry.action("pendle", "swap", TEST_ACCOUNT, {
      market: market.market,
      tokenIn: market.underlying,
      tokenOut: market.pt,
      amountIn: SWAP_AMOUNT,
      slippageBps: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const result = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
      resolveContract: (protocol, target) => registry.resolveContract(protocol, target),
      stateOverrides: balanceOverride(
        market.underlying,
        TEST_ACCOUNT,
        parseUnits(SWAP_AMOUNT, market.decimals.underlying),
        USDAT_TEST_ACCOUNT_BALANCE_SLOT,
      ),
    }).simulate(capability);

    expect(result.halted).toBeUndefined();
    const swap = result.results.at(-1);
    expect(swap?.reverted).toBe(false);
    expect(swap?.warnings).toEqual([]);
    expect(swap?.gas).not.toBeNull();
    const outcome = swap?.receipt?.outcome as PendleSwapOutcome;
    expect(outcome).toMatchObject({
      operation: "swap",
      protocol: "pendle",
      direction: "buy-pt",
      market: market.market,
      token: market.underlying,
      receiver: TEST_ACCOUNT,
    });
    expect(BigInt(outcome.amountOut)).toBeGreaterThan(0n);
    console.info(`[Pendle buy-pt] ${JSON.stringify(outcome)}`);
  });

  it("sells PT back into underlying with an exhaustive typed Receipt", {
    timeout: 300_000,
  }, async () => {
    const buy = await registry.action("pendle", "swap", TEST_ACCOUNT, {
      market: market.market,
      tokenIn: market.underlying,
      tokenOut: market.pt,
      amountIn: SELL_FUND_AMOUNT,
      slippageBps: 50,
    });
    const sell = await registry.action("pendle", "swap", TEST_ACCOUNT, {
      market: market.market,
      tokenIn: market.pt,
      tokenOut: market.underlying,
      amountIn: SELL_AMOUNT,
      slippageBps: 50,
    });
    if (buy.kind !== "capability" || sell.kind !== "capability") {
      throw new Error("expected two swap capabilities");
    }
    // Nest the sell under the buy so the tree stays valid (each capability owns exactly one direct
    // transaction). Flattening yields buy-approve, buy-swap, sell-approve, sell-swap in order, and
    // the accumulated-state simulation funds the sell from the PT the buy produced.
    const root: CapabilityNode = { ...buy, children: [...buy.children, sell] };

    const result = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
      resolveContract: (protocol, target) => registry.resolveContract(protocol, target),
      stateOverrides: balanceOverride(
        market.underlying,
        TEST_ACCOUNT,
        parseUnits(SELL_FUND_AMOUNT, market.decimals.underlying),
        USDAT_TEST_ACCOUNT_BALANCE_SLOT,
      ),
    }).simulate(root);

    expect(result.halted).toBeUndefined();
    const swap = result.results.at(-1);
    expect(swap?.reverted).toBe(false);
    expect(swap?.warnings).toEqual([]);
    expect(swap?.gas).not.toBeNull();
    const outcome = swap?.receipt?.outcome as PendleSwapOutcome;
    expect(outcome).toMatchObject({
      operation: "swap",
      protocol: "pendle",
      direction: "sell-pt",
      market: market.market,
      token: market.underlying,
      receiver: TEST_ACCOUNT,
    });
    expect(BigInt(outcome.amountOut)).toBeGreaterThan(0n);
    console.info(`[Pendle sell-pt] ${JSON.stringify(outcome)}`);
  });

  it("reports MarketZeroNetLPFee dust reverts explicitly", { timeout: 240_000 }, async () => {
    const dustAmount = formatUnits(DUST_AMOUNT, market.decimals.pt);
    const capability = await registry.action("pendle", "swap", TEST_ACCOUNT, {
      market: market.market,
      tokenIn: market.pt,
      tokenOut: market.underlying,
      amountIn: dustAmount,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const result = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
      stateOverrides: balanceOverride(market.pt, TEST_ACCOUNT, DUST_AMOUNT),
      resolveContract: (protocol, target) => registry.resolveContract(protocol, target),
    }).simulate(capability);

    expect(result.results.at(-1)?.warnings).toEqual([
      {
        code: "REVERTED",
        message:
          "transaction reverted: MarketZeroNetLPFee(): swap amount too small: this market's LP fee rounds to zero",
      },
    ]);
  });

  it("lists verified markets with inferred APY provenance", { timeout: 120_000 }, async () => {
    const result = await registry.action("pendle", "markets", ZERO_ACCOUNT, {});
    if (result.kind !== "query") throw new Error("expected a query result");
    const listed = result.data as ReadonlyArray<{
      market: string;
      apyProvenance: { kind: string };
    }>;
    expect(listed.length).toBeGreaterThan(0);
    expect(listed.find((entry) => entry.market === market.market)?.apyProvenance.kind).toBe(
      "inferred",
    );
  });

  it("quotes both swap directions in display units bounded by minOut", {
    timeout: 120_000,
  }, async () => {
    const buy = await quote(market.underlying, market.pt);
    expect(buy.direction).toBe("buy-pt");
    expect(Number(buy.minOut)).toBeLessThanOrEqual(Number(buy.estimatedOut));
    expect(Number(buy.estimatedOut)).toBeGreaterThan(0);

    const sell = await quote(market.pt, market.underlying);
    expect(sell.direction).toBe("sell-pt");
    expect(Number(sell.minOut)).toBeLessThanOrEqual(Number(sell.estimatedOut));
    expect(Number(sell.estimatedOut)).toBeGreaterThan(0);
  });

  async function quote(
    tokenIn: Address,
    tokenOut: Address,
  ): Promise<{ direction: string; estimatedOut: string; minOut: string }> {
    const result = await registry.action("pendle", "quote", ZERO_ACCOUNT, {
      market: market.market,
      tokenIn,
      tokenOut,
      amountIn: "1",
      slippageBps: 50,
    });
    if (result.kind !== "query") throw new Error("expected a query result");
    return result.data as { direction: string; estimatedOut: string; minOut: string };
  }
});

function balanceOverride(
  token: Address,
  owner: Address,
  amount: bigint,
  knownSlot?: `0x${string}`,
): StateOverrides {
  const slot =
    knownSlot ??
    keccak256(
      encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }],
        [owner, ERC20_BALANCES_MAPPING_SLOT],
      ),
    );
  return {
    [token]: {
      stateDiff: {
        [slot]: toHex(amount, { size: 32 }),
      },
    },
  };
}

import { type Address, type MossRuntime, Registry } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime } from "@themoss/system";
import { getAddress, parseAbiItem, parseUnits } from "viem";
import { beforeAll, describe, expect, it } from "vitest";
import { PENDLE_ROUTER_ADDRESS } from "../src/addresses.js";
import { discoverPendleMarkets } from "../src/market-discovery.js";
import { Pendle } from "../src/pendle.js";
import type { PendleSwapOutcome, VerifiedMarket } from "../src/types.js";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
// Monad's public RPC caps eth_getLogs at a 100-block range, so holders are found by paging backward.
const LOG_PAGE_BLOCKS = 100n;
const MAX_LOG_PAGES = 400n;
const ZERO_ACCOUNT = getAddress("0x0000000000000000000000000000000000000000");
// A small amount keeps neutral-holder discovery robust: far more addresses hold >= 0.01 than >= 1.
const SWAP_AMOUNT = "0.01";

// The buy direction exercises the full registered swap through simulation against a neutral
// underlying holder. Selling PT is covered by the sell-quote here plus the offline receipt/builder
// unit tests, because neutral PT holders are too sparse on this young chain to simulate reliably.
describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Pendle protocol on Monad mainnet", () => {
  let runtime: MossRuntime;
  let registry: Registry;
  let market: VerifiedMarket;

  beforeAll(async () => {
    runtime = await monadRuntime();
    registry = new Registry(runtime).use(Pendle);
    const result = await discoverPendleMarkets(runtime);
    const first = result.verified[0]?.market;
    if (!first) throw new Error("no verified Pendle market available for simulation");
    market = first;
  }, 180_000);

  it("swaps underlying into PT with an exhaustive typed Receipt", {
    timeout: 240_000,
  }, async () => {
    const holder = await findHolder(market.underlying, market.decimals.underlying);
    const capability = await registry.action("pendle", "swap", holder, {
      market: market.market,
      tokenIn: market.underlying,
      tokenOut: market.pt,
      amountIn: SWAP_AMOUNT,
      slippageBps: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected a Capability");

    const result = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
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
      receiver: holder,
    });
    expect(BigInt(outcome.amountOut)).toBeGreaterThan(0n);
    console.info(`[Pendle buy-pt] ${JSON.stringify(outcome)}`);
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

  async function findHolder(token: Address, decimals: number): Promise<Address> {
    const exclude = new Set(
      [
        market.market,
        market.sy,
        market.pt,
        market.yt,
        market.underlying,
        PENDLE_ROUTER_ADDRESS,
      ].map((address) => address.toLowerCase()),
    );
    const minAmount = parseUnits(SWAP_AMOUNT, decimals);
    const seen = new Set<string>();
    let toBlock = await runtime.client.getBlockNumber();
    for (let page = 0n; page < MAX_LOG_PAGES; page++) {
      const fromBlock = toBlock > LOG_PAGE_BLOCKS ? toBlock - LOG_PAGE_BLOCKS + 1n : 0n;
      const logs = await runtime.client.getLogs({
        address: token,
        event: TRANSFER_EVENT,
        fromBlock,
        toBlock,
      });
      for (const log of logs.reverse()) {
        const to = log.args.to;
        if (!to) continue;
        const key = to.toLowerCase();
        if (exclude.has(key) || seen.has(key)) continue;
        seen.add(key);
        if ((await balanceOf(token, to)) >= minAmount) return getAddress(to);
      }
      if (fromBlock === 0n) break;
      toBlock = fromBlock - 1n;
    }
    throw new Error(`no neutral holder of ${token} with balance >= ${minAmount} found`);
  }

  function balanceOf(token: Address, owner: Address): Promise<bigint> {
    return runtime.client.readContract({
      address: token,
      abi: ERC20Abi,
      functionName: "balanceOf",
      args: [owner],
    }) as Promise<bigint>;
  }
});

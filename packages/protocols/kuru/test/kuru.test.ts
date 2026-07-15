import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  NATIVE,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { AUSD_ADDRESS, monadRuntime, USDC_ADDRESS } from "@themoss/system";
import {
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  getAddress,
} from "viem";
import { describe, expect, it } from "vitest";
import { KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS, Kuru } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const MON_USDC_ADDRESS = "0x065C9d28E428A0db40191a54d33d5b7c71a9C394";
const MON_AUSD_ADDRESS = getAddress("0x131a2e70a5b31a517a74b8c567149bc294470da9");

function offlineRegistry() {
  const client = {
    readContract: async ({ address, functionName }: { address: string; functionName: string }) => {
      if (functionName !== "getMarketParams") throw new Error(`unexpected read ${functionName}`);
      return [
        100_000n,
        1_000_000n,
        "0x0000000000000000000000000000000000000000",
        18n,
        address.toLowerCase() === MON_AUSD_ADDRESS.toLowerCase() ? AUSD_ADDRESS : USDC_ADDRESS,
        6n,
      ];
    },
    call: async ({ account, data }: { account: string; data: Hex }) => {
      const decoded = decodeFunctionData({ abi: KuruOrderbookAbi, data });
      if (
        decoded.functionName !== "placeAndExecuteMarketBuy" &&
        decoded.functionName !== "placeAndExecuteMarketSell"
      ) {
        throw new Error(`unexpected call ${decoded.functionName}`);
      }
      if (
        decoded.functionName === "placeAndExecuteMarketBuy" &&
        account.toLowerCase() !== "0x0000000000000000000000000000000000000000"
      ) {
        throw new Error("Kuru market-buy quote must use the zero-address preview sender");
      }
      return {
        data: encodeFunctionResult({
          abi: KuruOrderbookAbi,
          functionName: decoded.functionName,
          result: decoded.functionName === "placeAndExecuteMarketBuy" ? 10n ** 18n : 2_000_000n,
        }),
      };
    },
  } as unknown as MossRuntime["client"];
  return new Registry({ rpcUrl: "http://offline", client }).use(Kuru);
}

describe("Kuru", () => {
  it("loads Zod parameter descriptions and defaults slippage to 0.5%", async () => {
    const registry = offlineRegistry();
    const [loaded] = registry.load([{ protocol: "kuru", method: "swap" }]);
    expect(loaded?.params.slippage).toMatchObject({
      description: expect.stringContaining("50 means 0.5%"),
      type: { default: 50 },
    });
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(capability.params).toMatchObject({ slippage: 50 });
    expect(flattenCapabilityTree(capability)).toHaveLength(1);
  });

  it("represents an ERC-20 approval as a nested Capability before the swap", async () => {
    const capability = await offlineRegistry().action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: NATIVE,
      amount: "1.5",
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    expect(capability.children[0]).toMatchObject({
      kind: "capability",
      protocol: "erc20",
      method: "approve",
      receipt: "approveReceipt",
    });
    const executable = flattenCapabilityTree(capability);
    expect(executable).toHaveLength(2);
    const [approval, swap] = executable;
    if (!approval || !swap) throw new Error("missing Kuru transactions");
    expect(decodeFunctionData({ abi: ERC20Abi, data: approval.transaction.data })).toMatchObject({
      functionName: "approve",
      args: [KURU_ROUTER_ADDRESS, 1_500_000n],
    });
    expect(
      decodeFunctionData({ abi: KuruRouterAbi, data: swap.transaction.data }).functionName,
    ).toBe("anyToAnySwap");
  });

  it("routes USDC through MON into AUSD in one Kuru transaction", async () => {
    const capability = await offlineRegistry().action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amount: "1.5",
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const executable = flattenCapabilityTree(capability);
    expect(executable).toHaveLength(2);
    const swap = executable[1];
    if (!swap) throw new Error("missing Kuru swap transaction");
    expect(decodeFunctionData({ abi: KuruRouterAbi, data: swap.transaction.data })).toEqual({
      functionName: "anyToAnySwap",
      args: [
        [MON_USDC_ADDRESS, MON_AUSD_ADDRESS],
        [true, false],
        [false, true],
        USDC_ADDRESS,
        AUSD_ADDRESS,
        1_500_000n,
        1_990_000n,
      ],
    });
  });

  it("keeps nested ERC and Kuru changes in their exact input order", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amount: "1",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: KURU_ROUTER_ADDRESS,
      value: "1000000000000000000",
    } satisfies Change;
    const trade = eventChange(
      MON_USDC_ADDRESS,
      KuruOrderbookAbi,
      "Trade",
      [1n, ACCOUNT, false, 10n, 0n, KURU_ROUTER_ADDRESS, ACCOUNT, 20n],
      ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"],
    );
    const router = eventChange(
      KURU_ROUTER_ADDRESS,
      KuruRouterAbi,
      "KuruRouterSwap",
      [ACCOUNT, "0x0000000000000000000000000000000000000000", USDC_ADDRESS, 10n ** 18n, 900_000n],
      ["address", "address", "address", "uint256", "uint256"],
    );
    const receipt = registry.parseReceipt(capability, [native, trade, router]);
    expect(receipt.outcome).toMatchObject({
      operation: "swap",
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amountOut: "900000",
      fills: 1,
    });
    expect(receipt.changes.map(firstChange)).toEqual([native, trade, router]);
  });

  it("matches an ordered USDC to MON to AUSD Receipt path", async () => {
    const registry = offlineRegistry();
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      amount: "1.5",
    });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const usdcToMon = eventChange(
      MON_USDC_ADDRESS,
      KuruOrderbookAbi,
      "Trade",
      [1n, ACCOUNT, true, 10n, 0n, KURU_ROUTER_ADDRESS, ACCOUNT, 20n],
      ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"],
    );
    const monToAusd = eventChange(
      MON_AUSD_ADDRESS,
      KuruOrderbookAbi,
      "Trade",
      [2n, ACCOUNT, false, 11n, 0n, KURU_ROUTER_ADDRESS, ACCOUNT, 21n],
      ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"],
    );
    const router = eventChange(
      KURU_ROUTER_ADDRESS,
      KuruRouterAbi,
      "KuruRouterSwap",
      [ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_500_000n, 1_990_000n],
      ["address", "address", "address", "uint256", "uint256"],
    );

    const receipt = registry.parseReceipt(capability, [usdcToMon, monToAusd, router]);
    expect(receipt.outcome).toMatchObject({
      tokenIn: USDC_ADDRESS,
      tokenOut: AUSD_ADDRESS,
      path: [USDC_ADDRESS, NATIVE, AUSD_ADDRESS],
      fills: 2,
    });
    expect(receipt.changes.map(firstChange)).toEqual([usdcToMon, monToAusd, router]);
    expect(() => registry.parseReceipt(capability, [monToAusd, usdcToMon, router])).toThrow(
      "Kuru Receipt route",
    );
    const wrongDirection = eventChange(
      MON_AUSD_ADDRESS,
      KuruOrderbookAbi,
      "Trade",
      [2n, ACCOUNT, true, 11n, 0n, KURU_ROUTER_ADDRESS, ACCOUNT, 21n],
      ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"],
    );
    expect(() => registry.parseReceipt(capability, [usdcToMon, wrongDirection, router])).toThrow(
      "Kuru Receipt Trade direction",
    );
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Kuru mainnet constants", () => {
  it("point to deployed contracts and markets with the documented assets", {
    timeout: 60_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Kuru);
    const listed = await registry.action("kuru", "markets", ACCOUNT, {});
    if (listed.kind !== "query") throw new Error("expected market Query");
    const markets = listed.data as readonly {
      market: `0x${string}`;
      base: string;
      quote: string;
    }[];
    expect(markets).toHaveLength(2);
    expect(markets.map(({ base, quote }) => [base, quote])).toContainEqual([NATIVE, USDC_ADDRESS]);
    for (const address of [KURU_ROUTER_ADDRESS, ...markets.map(({ market }) => market)]) {
      expect((await runtime.client.getCode({ address }))?.length).toBeGreaterThan(2);
    }
  });

  it("simulates a native swap into an exhaustive typed Receipt", { timeout: 180_000 }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(Kuru);
    const capability = await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
      amount: "1",
      slippage: 50,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toMatchObject({
      operation: "swap",
      protocol: "kuru",
      tokenIn: NATIVE,
      tokenOut: USDC_ADDRESS,
    });
  });
});

function firstChange(entry: ReceiptResult["changes"][number]): Change {
  if (entry.kind === "change") return entry.change;
  const [child] = entry.changes;
  if (child?.kind !== "change") throw new Error("expected one nested ReceiptChange");
  return child.change;
}

function eventChange(
  address: `0x${string}`,
  abi: typeof KuruRouterAbi | typeof KuruOrderbookAbi,
  eventName: "Trade" | "KuruRouterSwap",
  values: readonly unknown[],
  types: readonly string[],
): Change {
  return {
    kind: "event",
    address,
    topics: encodeEventTopics({ abi, eventName } as never) as readonly Hex[],
    data: encodeAbiParameters(types.map((type) => ({ type })) as never, values as never),
  };
}

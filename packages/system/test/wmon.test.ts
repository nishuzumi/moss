import {
  type Change,
  flattenCapabilityTree,
  type Hex,
  type MossRuntime,
  Registry,
} from "@themoss/core";
import { ERC20Abi, WETH9Abi } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import { AUSD_ADDRESS, monadRuntime, USDC_ADDRESS, WMON, WMON_ADDRESS } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

function depositChange(amount: bigint): Change {
  return {
    kind: "event",
    address: WMON_ADDRESS,
    topics: encodeEventTopics({
      abi: WETH9Abi,
      eventName: "Deposit",
      args: { dst: ACCOUNT },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

describe("WMON", () => {
  it("registers directly and builds one transaction per operation", async () => {
    const registry = new Registry(runtime).use(WMON);
    const wrap = await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" });
    if (wrap.kind !== "capability") throw new Error("expected capability");
    expect(flattenCapabilityTree(wrap)[0]?.transaction).toMatchObject({
      to: WMON_ADDRESS,
      data: "0xd0e30db0",
      value: "0x14d1120d7b160000",
    });

    const unwrap = await registry.action("wmon", "unwrap", ACCOUNT, { amount: "1.5" });
    if (unwrap.kind !== "capability") throw new Error("expected capability");
    const [unwrapTransaction] = flattenCapabilityTree(unwrap);
    if (!unwrapTransaction) throw new Error("missing unwrap transaction");
    expect(
      decodeFunctionData({
        abi: WETH9Abi,
        data: unwrapTransaction.transaction.data,
      }),
    ).toEqual({ functionName: "withdraw", args: [1_500_000_000_000_000_000n] });
  });

  it("matches the WMON Deposit to the ordered native transfer", async () => {
    const registry = new Registry(runtime).use(WMON);
    const capability = await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" });
    if (capability.kind !== "capability") throw new Error("expected capability");
    const native = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: WMON_ADDRESS,
      value: "1500000000000000000",
    } satisfies Change;
    const deposit = depositChange(1_500_000_000_000_000_000n);
    const receipt = registry.parseReceipt(capability, [native, deposit]);
    expect(receipt.outcome).toEqual({
      operation: "wrap",
      account: ACCOUNT,
      amount: "1500000000000000000",
    });
    expect(receipt.changes).toEqual([
      expect.objectContaining({ kind: "change", change: native }),
      expect.objectContaining({ kind: "change", change: deposit }),
    ]);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Monad official token constants", () => {
  it("have deployed bytecode and the documented metadata", { timeout: 60_000 }, async () => {
    const { client } = await monadRuntime();
    const tokens = [
      { address: WMON_ADDRESS, symbol: "WMON", decimals: 18 },
      { address: USDC_ADDRESS, symbol: "USDC", decimals: 6 },
      { address: AUSD_ADDRESS, symbol: "AUSD", decimals: 6 },
    ] as const;
    for (const token of tokens) {
      const [bytecode, symbol, decimals] = await Promise.all([
        client.getCode({ address: token.address }),
        client.readContract({ address: token.address, abi: ERC20Abi, functionName: "symbol" }),
        client.readContract({ address: token.address, abi: ERC20Abi, functionName: "decimals" }),
      ]);
      expect(bytecode?.length).toBeGreaterThan(2);
      expect(symbol).toBe(token.symbol);
      expect(Number(decimals)).toBe(token.decimals);
    }
  });

  it("simulates a wrap with exhaustive ordered Receipt coverage", {
    timeout: 120_000,
  }, async () => {
    const runtime = await monadRuntime();
    const registry = new Registry(runtime).use(WMON);
    const capability = await registry.action("wmon", "wrap", ACCOUNT, { amount: "0.25" });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    const outcome = await createTraceSimulator(runtime, {
      receipt: (node, changes) => registry.parseReceipt(node, changes),
    }).simulate(capability);
    expect(outcome.halted).toBeUndefined();
    expect(outcome.results[0]?.warnings).toEqual([]);
    expect(outcome.results[0]?.receipt?.outcome).toEqual({
      operation: "wrap",
      account: ACCOUNT,
      amount: "250000000000000000",
    });
  });
});

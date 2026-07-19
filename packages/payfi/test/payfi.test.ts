import { flattenCapabilityTree, type MossRuntime, Registry, type TokenRef } from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeFunctionData, getAddress, parseUnits } from "viem";
import { describe, expect, it } from "vitest";
import { PayFi, resetDailySpent } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const RECIPIENT = getAddress("0x1111111111111111111111111111111111111111");
const USDC: TokenRef = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" as TokenRef;

function registry() {
  const runtime: MossRuntime = {
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "decimals") return 6;
        throw new Error(`unexpected read ${functionName}`);
      },
    } as unknown as MossRuntime["client"],
  };
  return new Registry(runtime).use(ERC20).use(PayFi);
}

function ierc20Abi() {
  return [
    {
      name: "transfer",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
    },
  ] as const;
}

describe("PayFi", () => {
  it("registers with ERC-20 dependency and exposes transfer + checkRisk", async () => {
    resetDailySpent();
    const reg = registry();
    const methods = reg.discover();
    expect(methods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ protocol: "payfi", method: "transfer", kind: "capability" }),
        expect.objectContaining({ protocol: "payfi", method: "checkRisk", kind: "query" }),
      ]),
    );
  });

  it("builds a secure USDC transfer through ERC-20 delegation", async () => {
    resetDailySpent();
    const reg = registry();
    const result = await reg.action("payfi", "transfer", ACCOUNT, {
      token: USDC,
      to: RECIPIENT,
      amount: parseUnits("10", 6).toString(),
    });

    if (result.kind !== "capability") throw new Error("expected capability");
    const [tx] = flattenCapabilityTree(result);
    if (!tx) throw new Error("missing transaction");

    expect(tx.transaction.to?.toLowerCase()).toBe(USDC.toLowerCase());
    expect(decodeFunctionData({ abi: ierc20Abi(), data: tx.transaction.data })).toEqual({
      functionName: "transfer",
      args: [RECIPIENT, parseUnits("10", 6)],
    });
  });

  it("blocks a transfer that exceeds the single-tx cap", async () => {
    resetDailySpent();
    const reg = registry();
    await expect(
      reg.action("payfi", "transfer", ACCOUNT, {
        token: USDC,
        to: RECIPIENT,
        amount: parseUnits("99999", 6).toString(),
      }),
    ).rejects.toThrow(/single-tx cap/);
  });

  it("enforces daily spending cap across transfers", async () => {
    resetDailySpent();
    const reg = registry();

    // 5 × 900 = 4500 USDC (each under 1000 single-tx cap, total under 5000)
    for (let i = 0; i < 5; i++) {
      await reg.action("payfi", "transfer", ACCOUNT, {
        token: USDC,
        to: RECIPIENT,
        amount: parseUnits("900", 6).toString(),
      });
    }

    // 6th: 900 USDC (4500 + 900 = 5400 > 5000 daily cap)
    await expect(
      reg.action("payfi", "transfer", ACCOUNT, {
        token: USDC,
        to: RECIPIENT,
        amount: parseUnits("900", 6).toString(),
      }),
    ).rejects.toThrow(/Daily spending cap/);
  });
});

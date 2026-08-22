import { type Change, type Hex, NATIVE, type ReceiptResult, Registry } from "@themoss/core";
import { ERC20Abi, WETH9Abi } from "@themoss/erc";
import { AUSD_ADDRESS, USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import { encodeAbiParameters, encodeEventTopics, getAddress, type PublicClient } from "viem";
import { describe, expect, it, vi } from "vitest";
import { pancakeV2PairAbi } from "../src/abis/v2-pair.js";
import { PANCAKESWAP_V2_ROUTER_ADDRESS, PancakeSwapV2 } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const PAIR = getAddress("0x1111111111111111111111111111111111111111");
const AMOUNT = 10n ** 18n;
// The Protocol declares `labels: { Router: ..., Factory: ... }`, so Receipt label
// rendering replaces the raw Router address with this Package label in text.
const ROUTER_LABEL = "Package(Pancakeswap V2:Router)";

/** Mirrors mcp-server's `receiptTexts`: the exact ordered leaf-text projection Agents read. */
function receiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : receiptTexts(entry),
  );
}

function offlineRegistry() {
  const client = {
    readContract: vi.fn(
      async ({ functionName, args }: { functionName: string; args?: readonly unknown[] }) => {
        if (functionName === "decimals") return 6;
        if (functionName === "name") return "Mock token";
        if (functionName === "symbol") return "MOCK";
        const path = args?.[1] as readonly `0x${string}`[] | undefined;
        const amount = (args?.[0] as bigint | undefined) ?? 0n;
        if (!path) throw new Error(`unexpected read ${functionName}`);
        if (functionName === "getAmountsOut") return [amount, 20_000n];
        throw new Error(`unexpected read ${functionName}`);
      },
    ),
  } as unknown as PublicClient;
  return new Registry({ rpcUrl: "http://offline", client }).use(PancakeSwapV2);
}

async function swapCapability(
  registry: Registry,
  tokenIn: `0x${string}` | typeof NATIVE,
  tokenOut: `0x${string}` | typeof NATIVE,
) {
  const capability = await registry.action("pancakeswap-v2", "swap", ACCOUNT, {
    tokenIn,
    tokenOut,
    amountIn: "1",
  });
  if (capability.kind !== "capability") throw new Error("expected Capability");
  return capability;
}

function nativeChange(from: `0x${string}`, to: `0x${string}`, value: bigint): Change {
  return { kind: "nativeTransfer", from, to, value: value.toString() };
}

function transferChange(
  token: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: token,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from, to },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function syncChange(pair: `0x${string}`, reserve0: bigint, reserve1: bigint): Change {
  return {
    kind: "event",
    address: pair,
    topics: encodeEventTopics({ abi: pancakeV2PairAbi, eventName: "Sync" }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint112" }, { type: "uint112" }], [reserve0, reserve1]),
  };
}

function swapChange(
  pair: `0x${string}`,
  amount0In: bigint,
  amount1In: bigint,
  amount0Out: bigint,
  amount1Out: bigint,
  to: `0x${string}`,
): Change {
  return {
    kind: "event",
    address: pair,
    topics: encodeEventTopics({
      abi: pancakeV2PairAbi,
      eventName: "Swap",
      args: { sender: PANCAKESWAP_V2_ROUTER_ADDRESS, to },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [amount0In, amount1In, amount0Out, amount1Out],
    ),
  };
}

function wethChange(
  eventName: "Deposit" | "Withdrawal",
  account: `0x${string}`,
  amount: bigint,
): Change {
  return {
    kind: "event",
    address: WMON_ADDRESS,
    topics: encodeEventTopics({
      abi: WETH9Abi,
      eventName,
      args: eventName === "Deposit" ? { dst: account } : { src: account },
    } as never) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

describe("PancakeSwap v2 Receipt text projections", () => {
  it("locks the exact leaf text for a WMON Deposit Change", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry, NATIVE, USDC_ADDRESS);
    const changes = [
      nativeChange(ACCOUNT, PANCAKESWAP_V2_ROUTER_ADDRESS, AMOUNT),
      nativeChange(PANCAKESWAP_V2_ROUTER_ADDRESS, WMON_ADDRESS, AMOUNT),
      wethChange("Deposit", PANCAKESWAP_V2_ROUTER_ADDRESS, AMOUNT),
      transferChange(WMON_ADDRESS, PANCAKESWAP_V2_ROUTER_ADDRESS, PAIR, AMOUNT),
      transferChange(USDC_ADDRESS, PAIR, ACCOUNT, 20_000n),
      syncChange(PAIR, AMOUNT, 20_000n),
      swapChange(PAIR, AMOUNT, 0n, 0n, 20_000n, ACCOUNT),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes[2]).toMatchObject({
      kind: "change",
      text: `WMON Deposit: ${AMOUNT} for ${ROUTER_LABEL}`,
    });
  });

  it("locks the exact leaf text for a WMON Withdrawal Change", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry, USDC_ADDRESS, NATIVE);
    const amountOut = 2n * AMOUNT;
    const changes = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(WMON_ADDRESS, PAIR, PANCAKESWAP_V2_ROUTER_ADDRESS, amountOut),
      syncChange(PAIR, 1_000_000n, amountOut),
      swapChange(PAIR, 1_000_000n, 0n, 0n, amountOut, PANCAKESWAP_V2_ROUTER_ADDRESS),
      nativeChange(WMON_ADDRESS, PANCAKESWAP_V2_ROUTER_ADDRESS, amountOut),
      wethChange("Withdrawal", PANCAKESWAP_V2_ROUTER_ADDRESS, amountOut),
      nativeChange(PANCAKESWAP_V2_ROUTER_ADDRESS, ACCOUNT, amountOut),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes[5]).toMatchObject({
      kind: "change",
      text: `WMON Withdrawal: ${amountOut} for ${ROUTER_LABEL}`,
    });
  });

  it("locks the exact leaf text for Sync and Swap Pair Changes, and the top-level Receipt text", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry, USDC_ADDRESS, AUSD_ADDRESS);
    const changes = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(AUSD_ADDRESS, PAIR, ACCOUNT, 20_000n),
      syncChange(PAIR, 10_000_000n, 20_000_000n),
      swapChange(PAIR, 1_000_000n, 0n, 0n, 20_000n, ACCOUNT),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes[2]).toMatchObject({
      kind: "change",
      text: `PancakeSwap Sync: reserves 10000000/20000000 at ${PAIR}`,
    });
    expect(receipt.changes[3]).toMatchObject({
      kind: "change",
      text: `PancakeSwap Pair Swap: 1000000 in and 20000 out at ${PAIR}`,
    });
    expect(receipt.text).toBe(
      `PancakeSwap Swap: 1000000 ${USDC_ADDRESS} to 20000 ${AUSD_ADDRESS} for ${ACCOUNT}`,
    );
  });

  it("locks the exact ordered leaf-text sequence for a direct-pair swap flow", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry, USDC_ADDRESS, AUSD_ADDRESS);
    const changes = [
      transferChange(USDC_ADDRESS, ACCOUNT, PAIR, 1_000_000n),
      transferChange(AUSD_ADDRESS, PAIR, ACCOUNT, 20_000n),
      syncChange(PAIR, 10_000_000n, 20_000_000n),
      swapChange(PAIR, 1_000_000n, 0n, 0n, 20_000n, ACCOUNT),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receiptTexts(receipt)).toEqual([
      `ERC20 Transfer: 1000000 ${USDC_ADDRESS} from ${ACCOUNT} to ${PAIR}`,
      `ERC20 Transfer: 20000 ${AUSD_ADDRESS} from ${PAIR} to ${ACCOUNT}`,
      `PancakeSwap Sync: reserves 10000000/20000000 at ${PAIR}`,
      `PancakeSwap Pair Swap: 1000000 in and 20000 out at ${PAIR}`,
    ]);
  });
});

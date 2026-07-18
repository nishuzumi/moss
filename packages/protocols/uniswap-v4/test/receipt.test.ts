import {
  type CapabilityNode,
  type Change,
  type Hex,
  type MossRuntime,
  NATIVE,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";
import { decodeAbiParameters, encodeAbiParameters, encodeEventTopics } from "viem";
import { describe, expect, it } from "vitest";
import { SWAP_EVENT_TOPIC } from "../src/abis/uniswap-v4.js";
import { UNISWAP_V4_POOL_MANAGER_ADDRESS, UniswapV4 } from "../src/index.js";
import type { SwapOutcome } from "../src/types.js";

const ACCOUNT = "0xcccccccccccccccccccccccccccccccccccccccc" as const;

function makeEvent(
  address: `0x${string}`,
  topics: readonly Hex[],
  data: Hex,
): Extract<Change, { kind: "event" }> {
  return {
    kind: "event" as const,
    address,
    topics: topics as [Hex, ...Hex[]],
    data,
  };
}

function makeNativeTransfer(
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
): Extract<Change, { kind: "nativeTransfer" }> {
  return {
    kind: "nativeTransfer" as const,
    from,
    to,
    value: value.toString(),
  };
}

/**
 * Create a valid Swap event Change.
 *
 * PoolManager Swap ABI:
 *   indexed:  id (bytes32), sender (address)
 *   non-indexed: amount0 (int128), amount1 (int128),
 *                sqrtPriceX96 (uint160), liquidity (uint128),
 *                tick (int24), fee (uint24)
 *
 * Topics: [SWAP_EVENT_TOPIC, id, sender]  (3 total)
 * Data:   non-indexed params only (6 params)
 *
 * We use the hardcoded SWAP_EVENT_TOPIC directly (not encodeEventTopics)
 * because viem's encodeEventTopics may produce a different hash due to
 * ABI ordering differences.
 */
function makeSwapEvent(amount0: bigint, amount1: bigint, fee: number): Change {
  const poolId = "0x0000000000000000000000000000000000000000000000000000000000000001";
  const sender = "0x0000000000000000000000000000000000000002";

  // Use the exact SWAP_EVENT_TOPIC constant — matches the one in adapter.ts
  const topics: [Hex, Hex, Hex] = [SWAP_EVENT_TOPIC, poolId as Hex, sender as Hex];

  // Data: non-indexed params only
  const data = encodeAbiParameters(
    [
      { type: "int128" },
      { type: "int128" },
      { type: "uint160" },
      { type: "uint128" },
      { type: "int24" },
      { type: "uint24" },
    ],
    [amount0, amount1, 0n, 0n, 0, fee],
  );

  // Verify: decode data directly
  const decoded = decodeAbiParameters(
    [
      { type: "int128" },
      { type: "int128" },
      { type: "uint160" },
      { type: "uint128" },
      { type: "int24" },
      { type: "uint24" },
    ],
    data,
  );
  expect(decoded[0]).toBe(amount0);
  expect(decoded[1]).toBe(amount1);
  expect(decoded[5]).toBe(fee);

  return makeEvent(UNISWAP_V4_POOL_MANAGER_ADDRESS as `0x${string}`, topics, data);
}

function makeTransferEvent(
  token: `0x${string}`,
  from: `0x${string}`,
  to: `0x${string}`,
  value: bigint,
): Change {
  const topics = encodeEventTopics({
    abi: ERC20Abi,
    eventName: "Transfer",
    args: { from, to },
  }) as [Hex, ...Hex[]];
  const data = encodeAbiParameters([{ type: "uint256" }], [value]);
  return makeEvent(token, topics, data as Hex);
}

describe("Uniswap v4 swapReceipt", () => {
  function makeMockRuntime(): MossRuntime {
    return {
      rpcUrl: "http://offline",
      client: {} as MossRuntime["client"],
    };
  }

  function makeCapabilityNode(): CapabilityNode {
    return {
      kind: "capability",
      protocol: "uniswap-v4",
      method: "swap",
      receipt: "swapReceipt",
      params: {
        tokenIn: NATIVE,
        tokenOut: USDC_ADDRESS,
        amountIn: "1",
        slippageBps: 50,
        hookData: "0x",
      },
      children: [
        {
          kind: "transaction",
          transaction: {
            from: ACCOUNT,
            to: UNISWAP_V4_POOL_MANAGER_ADDRESS,
            data: "0x12345678" as Hex,
            value: "0x0de0b6b3a7640000" as Hex,
          },
        },
      ],
    };
  }

  it("parses a native-to-ERC20 swap receipt correctly", () => {
    const registry = new Registry(makeMockRuntime()).use(UniswapV4);
    const capability = makeCapabilityNode();

    const nativeTransfer = makeNativeTransfer(
      ACCOUNT,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      1_000_000_000_000_000_000n,
    );
    const swapEvent = makeSwapEvent(-1_000_000_000_000_000_000n, 980_000_000n, 3000);
    const usdcTransfer = makeTransferEvent(
      USDC_ADDRESS as `0x${string}`,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      ACCOUNT,
      980_000_000n,
    );

    const changes = [nativeTransfer, usdcTransfer, swapEvent] as const;
    const receipt = registry.parseReceipt(capability, changes) as ReceiptResult<SwapOutcome>;

    expect(receipt.outcome.operation).toBe("swap");
    expect(receipt.outcome.protocol).toBe("uniswap-v4");
    expect(receipt.outcome.tokenOut).toBe(USDC_ADDRESS);
    expect(receipt.outcome.zeroForOne).toBe(true);
    expect(receipt.changes.length).toBe(3);
  });

  it("throws when no Swap event is present", () => {
    const registry = new Registry(makeMockRuntime()).use(UniswapV4);
    const capability = makeCapabilityNode();

    const changes = [
      makeTransferEvent(
        "0x1111111111111111111111111111111111111111" as `0x${string}`,
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
        ACCOUNT,
        100n,
      ),
    ] as const;

    expect(() => registry.parseReceipt(capability, changes)).toThrow("requires a Swap event");
  });

  it("delegates nativeTransfer to erc20.changesReceipt", () => {
    const registry = new Registry(makeMockRuntime()).use(UniswapV4);
    const capability = makeCapabilityNode();

    const nativeTransfer = makeNativeTransfer(
      ACCOUNT,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      1_000_000_000_000_000_000n,
    );
    const swapEvent = makeSwapEvent(-1_000_000_000_000_000_000n, 980_000_000n, 3000);
    const usdcTransfer = makeTransferEvent(
      USDC_ADDRESS as `0x${string}`,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      ACCOUNT,
      980_000_000n,
    );

    const changes = [nativeTransfer, usdcTransfer, swapEvent] as const;
    const receipt = registry.parseReceipt(capability, changes) as ReceiptResult<SwapOutcome>;

    const nativeReceipt = receipt.changes[0];
    expect(nativeReceipt?.kind).toBe("receipt");
    expect(receipt.outcome.operation).toBe("swap");
  });

  it("handles ERC20-to-ERC20 swap (no native transfer)", () => {
    const registry = new Registry(makeMockRuntime()).use(UniswapV4);
    const capability = makeCapabilityNode();

    // ERC20 → ERC20: amount0 > 0, amount1 < 0 (zeroForOne = false)
    const swapEvent = makeSwapEvent(1_000_000_000n, -980_000n, 3000);
    const usdcTransfer = makeTransferEvent(
      USDC_ADDRESS as `0x${string}`,
      ACCOUNT,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      1_000_000_000n,
    );
    const wmonTransfer = makeTransferEvent(
      "0x0000000000000000000000000000000000000001" as `0x${string}`,
      UNISWAP_V4_POOL_MANAGER_ADDRESS,
      ACCOUNT,
      980_000n,
    );

    const changes = [usdcTransfer, swapEvent, wmonTransfer] as const;
    const receipt = registry.parseReceipt(capability, changes) as ReceiptResult<SwapOutcome>;

    expect(receipt.outcome.operation).toBe("swap");
    expect(receipt.outcome.protocol).toBe("uniswap-v4");
    expect(receipt.outcome.zeroForOne).toBe(false);
    expect(receipt.changes.length).toBe(3);
  });
});

describe.skipIf(!!process.env.MOSS_SKIP_E2E)("Uniswap v4 mainnet", () => {
  it("has deployed PoolManager bytecode", { timeout: 30_000 }, async () => {
    const runtime = await monadRuntime();
    const code = await runtime.client.getCode({ address: UNISWAP_V4_POOL_MANAGER_ADDRESS });
    expect(code?.length).toBeGreaterThan(2);
  });
});

import {
  type Change,
  type Hex,
  type MossRuntime,
  NATIVE,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { AUSD_ADDRESS, USDC_ADDRESS } from "@themoss/system";
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, getAddress } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KuruOrderbookAbi, KuruRouterAbi } from "../src/abis/kuru.js";
import { KURU_ROUTER_ADDRESS, Kuru } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const DIRECT_USDC_AUSD = getAddress("0x4444444444444444444444444444444444444444");

/** Mirrors mcp-server's `receiptTexts`: the exact ordered leaf-text projection Agents read. */
function receiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : receiptTexts(entry),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Kuru Receipt text projections", () => {
  it("locks the exact leaf text for a KuruRouterSwap Change", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);
    const trade = tradeChange(DIRECT_USDC_AUSD, 1n);

    const receipt = registry.parseReceipt(capability, [trade, router]);
    expect(receipt.changes[1]).toMatchObject({
      kind: "change",
      text: `Kuru Swap: 1000000 ${USDC_ADDRESS} to 1200000 ${AUSD_ADDRESS} by ${ACCOUNT}`,
    });
  });

  it("locks the exact leaf text for a Trade Change", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const trade = tradeChange(DIRECT_USDC_AUSD, 7n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    const receipt = registry.parseReceipt(capability, [trade, router]);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `Trade Event: 20 at 10 emitted by ${DIRECT_USDC_AUSD}`,
    });
  });

  it("delegates a native-MON Change to erc20.changesReceipt, using the NATIVE sentinel", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const native: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: DIRECT_USDC_AUSD,
      value: "1000000000000000000",
    };
    const trade = tradeChange(DIRECT_USDC_AUSD, 1n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    const receipt = registry.parseReceipt(capability, [native, trade, router]);
    expect(receipt.changes[0]).toMatchObject({
      kind: "receipt",
      changes: [
        {
          kind: "change",
          text: `ERC20 Transfer: 1000000000000000000 ${NATIVE} from ${ACCOUNT} to ${DIRECT_USDC_AUSD}`,
        },
      ],
    });
  });

  it("locks the top-level swap Receipt text format and the exact ordered leaf-text sequence", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const trade = tradeChange(DIRECT_USDC_AUSD, 3n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    const receipt = registry.parseReceipt(capability, [trade, router]);
    expect(receipt.text).toBe(
      `Kuru Swap: 1000000 ${USDC_ADDRESS} to 1200000 ${AUSD_ADDRESS}; 1 Trade event observed`,
    );
    expect(receiptTexts(receipt)).toEqual([
      `Trade Event: 20 at 10 emitted by ${DIRECT_USDC_AUSD}`,
      `Kuru Swap: 1000000 ${USDC_ADDRESS} to 1200000 ${AUSD_ADDRESS} by ${ACCOUNT}`,
    ]);
  });

  it("pluralizes the trailing Trade-event count in the top-level text for multiple Trades", async () => {
    const { registry } = offlineRegistry();
    const capability = await swapCapability(registry);
    const firstTrade = tradeChange(DIRECT_USDC_AUSD, 3n);
    const secondTrade = tradeChange(DIRECT_USDC_AUSD, 4n);
    const router = routerSwapChange(ACCOUNT, USDC_ADDRESS, AUSD_ADDRESS, 1_000_000n, 1_200_000n);

    const receipt = registry.parseReceipt(capability, [firstTrade, secondTrade, router]);
    expect(receipt.text).toBe(
      `Kuru Swap: 1000000 ${USDC_ADDRESS} to 1200000 ${AUSD_ADDRESS}; 2 Trade events observed`,
    );
  });
});

async function swapCapability(registry: Registry) {
  const capability = await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: USDC_ADDRESS,
    tokenOut: AUSD_ADDRESS,
    amountIn: "1",
  });
  if (capability.kind !== "capability") throw new Error("expected capability");
  return capability;
}

function offlineRegistry() {
  const market = {
    address: DIRECT_USDC_AUSD,
    base: USDC_ADDRESS,
    quote: AUSD_ADDRESS,
    baseDecimals: 6,
    quoteDecimals: 6,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            data: [{ market: market.address, baseasset: market.base, quoteasset: market.quote }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    ),
  );
  const client = {
    readContract: async ({
      functionName,
      args,
    }: {
      functionName: string;
      args: readonly unknown[];
    }) => {
      if (functionName !== "verifiedMarket") throw new Error(`unexpected read ${functionName}`);
      if (String(args[0]).toLowerCase() !== market.address.toLowerCase()) {
        throw new Error(`unknown market ${String(args[0])}`);
      }
      return [
        10 ** market.quoteDecimals,
        10n ** BigInt(market.baseDecimals),
        market.base,
        BigInt(market.baseDecimals),
        market.quote,
        BigInt(market.quoteDecimals),
        0,
        0n,
        0n,
        0n,
        0n,
      ];
    },
    call: async ({ data }: { data: Hex }) => {
      const decoded = decodeFunctionData({ abi: KuruOrderbookAbi, data });
      const size = decoded.args[0] as bigint;
      return { data: encodeAbiParameters([{ type: "uint256" }], [size]) };
    },
  } as unknown as MossRuntime["client"];
  return { registry: new Registry({ rpcUrl: "http://offline", client }).use(Kuru) };
}

function tradeChange(address: `0x${string}`, orderId: bigint): Change {
  return eventChange(
    address,
    KuruOrderbookAbi,
    "Trade",
    [orderId, ACCOUNT, false, 10n, 0n, KURU_ROUTER_ADDRESS, ACCOUNT, 20n],
    ["uint40", "address", "bool", "uint256", "uint96", "address", "address", "uint96"],
  );
}

function routerSwapChange(
  sender: `0x${string}`,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
  amountIn: bigint,
  amountOut: bigint,
): Change {
  return eventChange(
    KURU_ROUTER_ADDRESS,
    KuruRouterAbi,
    "KuruRouterSwap",
    [sender, tokenIn, tokenOut, amountIn, amountOut],
    ["address", "address", "address", "uint256", "uint256"],
  );
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

import { type Change, type MossRuntime, type ReceiptResult, Registry } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { encodeAbiParameters, encodeEventTopics, getAddress, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { PANCAKESWAP_V3_ROUTER_ADDRESS, PancakeSwap } from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const TOKEN_A = getAddress("0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa");
const TOKEN_B = getAddress("0xBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBbBb");
// The Protocol declares `labels: { Router: PANCAKESWAP_V3_ROUTER_ADDRESS }`, so Receipt
// label rendering replaces the raw Router address with this Package label in text.
const ROUTER_LABEL = "Package(Pancakeswap:Router)";

/** Mirrors mcp-server's `receiptTexts`: the exact ordered leaf-text projection Agents read. */
function receiptTexts(receipt: ReceiptResult): string[] {
  return receipt.changes.flatMap((entry) =>
    entry.kind === "change" ? [entry.text] : receiptTexts(entry),
  );
}

function erc20Transfer(token: string, from: string, to: string, amount: bigint): Change {
  return {
    kind: "event",
    address: token as `0x${string}`,
    topics: encodeEventTopics({
      abi: ERC20Abi,
      eventName: "Transfer",
      args: { from: from as `0x${string}`, to: to as `0x${string}` },
    }) as readonly Hex[],
    data: encodeAbiParameters([{ type: "uint256" }], [amount]),
  };
}

function offlineRegistry() {
  return new Registry({
    rpcUrl: "http://offline",
    client: {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "decimals") return 18;
        if (functionName === "getPool") return "0x63e48B725540A3Db24ACF6682a29f877808C53F2";
        if (functionName === "token0") return TOKEN_A;
        throw new Error(`unexpected readContract ${functionName}`);
      },
      call: async () => ({
        data: encodeAbiParameters([{ type: "uint256" }], [900_000_000_000_000_000n]),
      }),
    } as unknown as MossRuntime["client"],
  }).use(PancakeSwap);
}

async function swapCapability(registry: Registry) {
  const capability = await registry.action("pancakeswap", "swap", ACCOUNT, {
    tokenIn: TOKEN_A,
    tokenOut: TOKEN_B,
    amount: "1",
    fee: 3000,
    slippage: 50,
  });
  if (capability.kind !== "capability") throw new Error("expected capability");
  return capability;
}

describe("PancakeSwap V3 Receipt text projections", () => {
  it("locks the exact leaf text for a native MON transfer Change", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry);
    const change: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: PANCAKESWAP_V3_ROUTER_ADDRESS,
      value: "500000000000000000",
    };
    const receipt = registry.parseReceipt(capability, [change]);
    expect(receipt.changes[0]).toMatchObject({
      kind: "change",
      text: `Native MON Transfer: 500000000000000000 from ${ACCOUNT} to ${ROUTER_LABEL}`,
    });
  });

  it("delegates ERC-20 Transfer Changes to erc20.changesReceipt for their leaf text", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry);
    const changes = [
      erc20Transfer(TOKEN_A, ACCOUNT, PANCAKESWAP_V3_ROUTER_ADDRESS, 1_000_000_000_000_000_000n),
      erc20Transfer(TOKEN_B, PANCAKESWAP_V3_ROUTER_ADDRESS, ACCOUNT, 900_000_000_000_000_000n),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.changes[0]).toMatchObject({
      kind: "receipt",
      changes: [
        {
          kind: "change",
          text: `ERC20 Transfer: 1000000000000000000 ${TOKEN_A} from ${ACCOUNT} to ${ROUTER_LABEL}`,
        },
      ],
    });
    expect(receipt.changes[1]).toMatchObject({
      kind: "receipt",
      changes: [
        {
          kind: "change",
          text: `ERC20 Transfer: 900000000000000000 ${TOKEN_B} from ${ROUTER_LABEL} to ${ACCOUNT}`,
        },
      ],
    });
  });

  it("locks the top-level swap Receipt text format and the exact ordered leaf-text sequence", async () => {
    const registry = offlineRegistry();
    const capability = await swapCapability(registry);
    const changes = [
      erc20Transfer(TOKEN_A, ACCOUNT, PANCAKESWAP_V3_ROUTER_ADDRESS, 1_000_000_000_000_000_000n),
      erc20Transfer(TOKEN_B, PANCAKESWAP_V3_ROUTER_ADDRESS, ACCOUNT, 900_000_000_000_000_000n),
    ];
    const receipt = registry.parseReceipt(capability, changes);
    expect(receipt.text).toBe(
      `PancakeSwap V3 Swap: 1000000000000000000 in ${TOKEN_A} → 900000000000000000 out ${TOKEN_B}`,
    );
    expect(receiptTexts(receipt)).toEqual([
      `ERC20 Transfer: 1000000000000000000 ${TOKEN_A} from ${ACCOUNT} to ${ROUTER_LABEL}`,
      `ERC20 Transfer: 900000000000000000 ${TOKEN_B} from ${ROUTER_LABEL} to ${ACCOUNT}`,
    ]);
  });
});

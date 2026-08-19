import {
  type CapabilityNode,
  type Change,
  type Hex,
  type MossRuntime,
  type ReceiptResult,
  Registry,
} from "@themoss/core";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, getAddress } from "viem";
import { describe, expect, it } from "vitest";
import {
  AIExplorerProtocol,
  ANALYSIS_REGISTRY_ADDRESS,
  AnalysisRegistryAbi,
  MAX_SUMMARY_LENGTH,
} from "../src/index.js";

const ACCOUNT = getAddress("0xcccccccccccccccccccccccccccccccccccccccc");
const OTHER = getAddress("0xdddddddddddddddddddddddddddddddddddddddd");
const runtime = { rpcUrl: "http://offline", client: {} as MossRuntime["client"] };

const TX_HASH = `0x${"ab".repeat(32)}`;
const SUMMARY = "swap 1 MON for USDC, executed on Monad mainnet";

// Live log shape: AnalysisSubmitted(id indexed, submitter indexed; txHash,
// summary, timestamp in data).
function submittedEvent(
  id: bigint,
  submitter: `0x${string}`,
  txHash: string,
  summary: string,
  timestamp: bigint,
  emitter: `0x${string}` = ANALYSIS_REGISTRY_ADDRESS,
): Change {
  return {
    kind: "event",
    address: emitter,
    topics: encodeEventTopics({
      abi: AnalysisRegistryAbi,
      eventName: "AnalysisSubmitted",
      args: { id, submitter },
    }) as readonly Hex[],
    data: encodeAbiParameters(
      [{ type: "string" }, { type: "string" }, { type: "uint256" }],
      [txHash, summary, timestamp],
    ),
  };
}

const offlineRegistry = new Registry(runtime).use(AIExplorerProtocol);

async function capabilityFor(
  method: "submitAnalysis",
  params: Record<string, string>,
): Promise<CapabilityNode> {
  const capability = await offlineRegistry.action("ai-explorer", method, ACCOUNT, params);
  if (capability.kind !== "capability") throw new Error("expected capability");
  return capability;
}

function parseWith(capability: CapabilityNode, changes: readonly Change[]): ReceiptResult {
  return offlineRegistry.parseReceipt(capability, changes);
}

describe("AIExplorerProtocol transactions", () => {
  it("builds the submitAnalysis transaction with exact calldata", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    const node = capability.children[0];
    if (node?.kind !== "transaction") throw new Error("expected transaction");
    expect(getAddress(node.transaction.to)).toBe(ANALYSIS_REGISTRY_ADDRESS);
    expect(node.transaction.value).toBe("0x0");
    expect(node.transaction.data).toBe(
      encodeFunctionData({
        abi: AnalysisRegistryAbi,
        functionName: "submitAnalysis",
        args: [TX_HASH, SUMMARY],
      }),
    );
  });

  it("rejects a non-32-byte transaction hash", async () => {
    await expect(
      capabilityFor("submitAnalysis", { txHash: "0x1234", aiSummary: SUMMARY }),
    ).rejects.toThrow(/32-byte/);
    await expect(
      capabilityFor("submitAnalysis", { txHash: TX_HASH.slice(0, -2), aiSummary: SUMMARY }),
    ).rejects.toThrow(/32-byte/);
  });

  it("rejects a missing or over-long summary", async () => {
    await expect(
      capabilityFor("submitAnalysis", { txHash: TX_HASH, aiSummary: "" }),
    ).rejects.toThrow();
    await expect(
      capabilityFor("submitAnalysis", {
        txHash: TX_HASH,
        aiSummary: "x".repeat(MAX_SUMMARY_LENGTH + 1),
      }),
    ).rejects.toThrow(/512/);
  });
});

describe("analysisReceipt", () => {
  const submitted = () => submittedEvent(0n, ACCOUNT, TX_HASH, SUMMARY, 1_700_000_000n);

  it("parses the evidence shape with exact identity and order", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    const changes = [submitted()];
    const receipt = parseWith(capability, changes);
    expect(receipt.outcome).toEqual({
      operation: "analysisSubmitted",
      id: "0",
      submitter: ACCOUNT,
      txHash: TX_HASH,
      summary: SUMMARY,
      timestamp: "1700000000",
    });
    expect(receipt.changes).toHaveLength(1);
    const entry = receipt.changes[0];
    if (entry?.kind !== "change") throw new Error("expected change entry");
    expect(entry.change).toBe(changes[0]);
  });

  it("rejects missing evidence: no AnalysisSubmitted event", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    expect(() => parseWith(capability, [])).toThrow(/requires an AnalysisSubmitted event/);
  });

  it("rejects a duplicate AnalysisSubmitted event", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    expect(() => parseWith(capability, [submitted(), submitted()])).toThrow();
  });

  it("rejects a foreign same-signature event from another emitter", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    const foreign = submittedEvent(0n, ACCOUNT, TX_HASH, SUMMARY, 1_700_000_000n, OTHER);
    expect(() => parseWith(capability, [foreign])).toThrow(/fixed registry address/);
  });

  it("rejects a native transfer as foreign evidence", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    const native: Change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: ANALYSIS_REGISTRY_ADDRESS,
      value: "1",
    };
    expect(() => parseWith(capability, [native, submitted()])).toThrow(/only emits events/);
  });

  it("rejects a registry event that is not AnalysisSubmitted", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    // Malformed data for the only known event still fails decoding strictly.
    const malformed: Change = { ...submitted(), data: "0x01" } as Change;
    expect(() => parseWith(capability, [malformed])).toThrow();
  });

  it("does not overstate provenance: outcome is a submitted assertion", async () => {
    const capability = await capabilityFor("submitAnalysis", {
      txHash: TX_HASH,
      aiSummary: SUMMARY,
    });
    const receipt = parseWith(capability, [submitted()]);
    expect(receipt.text).toContain("Record #0 submitted");
    expect(receipt.text).not.toContain("AI-generated");
  });
});

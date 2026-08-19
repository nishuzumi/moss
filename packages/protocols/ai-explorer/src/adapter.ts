import {
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { z } from "zod/v4";
import { AnalysisRegistryAbi } from "./abis/analysis-registry.js";

/**
 * AnalysisRegistry on Monad.
 *
 * Current deployment is Monad Testnet (10143):
 *   0x82344C1BD7720cfddbD5aec33E99571DC6628EA5
 * — bytecode-verified against the pinned Foundry artifact
 * (github.com/Chichuzxy/ai-monad-explorer@8757c1a613e3fde9678c1eab892502ba7e199dc8),
 * see test/abis.test.ts.
 *
 * NOT deployed on Monad mainnet (143) yet. Moss Runtime only accepts
 * mainnet RPCs, so this package MUST NOT ship until a reviewed mainnet
 * deployment exists; update this constant at that point. There is
 * deliberately no chain map or testnet escape hatch here.
 */
export const ANALYSIS_REGISTRY_ADDRESS: AddressValue = "0x82344C1BD7720cfddbD5aec33E99571DC6628EA5";

/**
 * Practical bound for the stored summary. The contract itself accepts
 * arbitrary-length strings; the adapter rejects anything longer so a
 * single record cannot blow past a sane evidence size.
 */
export const MAX_SUMMARY_LENGTH = 512;

// The contract stores whatever string the caller passed. The adapter can
// only vouch that a record was submitted — never that the hash exists or
// that the text was AI-generated or trustworthy (ADR 0003 tool/gasOnly).
const TransactionHash = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Expected an exact 32-byte 0x transaction hash.")
  .describe("A transaction hash: exactly 32 bytes as a 0x-prefixed hex string.");

const AiSummary = z
  .string()
  .min(1)
  .max(MAX_SUMMARY_LENGTH)
  .describe(
    "The text to store with the record (any provenance the caller chooses to attach; capped at 512 chars).",
  );

const submitParams = {
  txHash: {
    type: TransactionHash,
    description: "The transaction hash this record is about (exact 32 bytes, 0x-prefixed).",
  },
  aiSummary: {
    type: AiSummary,
    description: "The text to store with the record (max 512 chars).",
  },
} satisfies ParamsSpec;

const queryParams = {
  id: {
    type: UnsignedIntegerString,
    description: "Analysis record ID (non-negative integer string).",
  },
} satisfies ParamsSpec;

type AnalysisOutcome = {
  operation: "analysisSubmitted";
  id: string;
  submitter: AddressValue;
  txHash: string;
  summary: string;
  timestamp: string;
};

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

@Protocol({
  name: "ai-explorer",
  category: "tool",
  description:
    "On-chain analysis registry: submit a caller-supplied assertion about a transaction hash, and read stored records.",
  contracts: {
    registry: {
      abi: AnalysisRegistryAbi,
      addr: ANALYSIS_REGISTRY_ADDRESS,
    },
  },
  labels: { Registry: ANALYSIS_REGISTRY_ADDRESS },
})
export class AIExplorerProtocol {
  declare registry: Handle<typeof AnalysisRegistryAbi>;

  @Capability<AIExplorerProtocol, typeof submitParams>({
    intent: "Submit an assertion about transaction {txHash} to the registry",
    verb: "submit",
    params: submitParams,
    receipt: "analysisReceipt",
    risk: ["gasOnly"],
    tags: ["ai", "analysis", "monad", "registry"],
  })
  async submitAnalysis(params: InferParams<typeof submitParams>) {
    return [this.registry.submitAnalysis([params.txHash, params.aiSummary])];
  }

  @Query({
    intent: "Read a stored analysis record by its ID",
    params: queryParams,
  })
  async getAnalysis(params: InferParams<typeof queryParams>) {
    const result = await this.registry.read.getAnalysis([BigInt(params.id)]);
    return {
      id: params.id,
      submitter: result.submitter,
      txHash: result.txHash,
      aiSummary: result.aiSummary,
      timestamp: result.timestamp.toString(),
    };
  }

  @Query({
    intent: "Read the total number of stored analysis records",
    params: {},
  })
  async totalAnalyses() {
    const total = await this.registry.read.totalAnalyses();
    return { total: total.toString() };
  }

  // Only decodes events actually emitted by the fixed registry address.
  // A same-signature event from any other emitter is not evidence and is
  // rejected (foreign event). The registry is a pure-storage contract, so
  // native transfers are also rejected.
  @Receipt()
  analysisReceipt(changes: readonly Change[]): ReceiptResult<AnalysisOutcome> {
    let event: AnalysisOutcome | undefined;

    const parsed = changes.map((change): ReceiptResult["changes"][number] => {
      if (change.kind !== "event") {
        throw new Error("Unexpected Change: AI Explorer only emits events");
      }
      if (!sameAddress(change.address, ANALYSIS_REGISTRY_ADDRESS)) {
        throw new Error(
          "Unexpected Change: AnalysisSubmitted must come from the fixed registry address",
        );
      }

      let decoded: ReturnType<typeof decodeEventLog<typeof AnalysisRegistryAbi>>;
      try {
        decoded = decodeEventLog({
          abi: AnalysisRegistryAbi,
          topics: change.topics as [`0x${string}`, ...`0x${string}`[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported registry event");
      }
      if (decoded.eventName !== "AnalysisSubmitted" || event) {
        throw new Error(`Unexpected Change: registry emitted ${decoded.eventName}`);
      }
      event = {
        operation: "analysisSubmitted",
        id: decoded.args.id.toString(),
        submitter: decoded.args.submitter as AddressValue,
        txHash: decoded.args.txHash as string,
        summary: decoded.args.summary as string,
        timestamp: decoded.args.timestamp.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: event,
        text: `Record #${event.id}: assertion about ${event.txHash} (summary ${event.summary.length} chars)`,
      };
    });

    if (!event) {
      throw new Error("AI Explorer receipt requires an AnalysisSubmitted event");
    }
    return {
      kind: "receipt",
      outcome: event,
      text: `Record #${event.id} submitted by ${event.submitter}`,
      changes: parsed,
    };
  }
}

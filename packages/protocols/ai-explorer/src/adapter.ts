import {
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { AnalysisRegistryAbi } from "./abis/analysisRegistry.js";

// AnalysisRegistry contract on Monad
// NOTE: Currently deployed on Monad Testnet (10143).
// For mainnet (143) use, redeploy and update this address.
export const ANALYSIS_REGISTRY_ADDRESS: AddressValue =
  "0x82344C1BD7720cfddbD5aec33E99571DC6628EA5";

const submitParams = {
  txHash: {
    type: String as any,
    description: "Transaction hash to analyze (0x-prefixed hex string)",
  },
  aiSummary: {
    type: String as any,
    description: "AI-generated analysis summary of the transaction",
  },
} satisfies ParamsSpec;

const queryParams = {
  id: {
    type: String as any,
    description: "Analysis ID (numeric string)",
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

@Protocol({
  name: "ai-explorer",
  category: "tool",
  description:
    "AI-powered Monad transaction analysis registry — submit and query AI-generated transaction analyses on-chain",
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
    intent: "Submit an AI-generated transaction analysis to the on-chain registry",
    verb: "submit",
    params: submitParams,
    receipt: "analysisReceipt",
    risk: ["gasOnly"],
    tags: ["ai", "analysis", "monad"],
  })
  async submitAnalysis(params: InferParams<typeof submitParams>) {
    return [
      this.registry.submitAnalysis([params.txHash as string, params.aiSummary as string]),
    ];
  }

  @Query({
    intent: "Read an AI analysis record by its ID",
    params: queryParams,
  })
  async getAnalysis(params: InferParams<typeof queryParams>) {
    const result = await this.registry.read.getAnalysis([
      BigInt(params.id as string),
    ]);
    return {
      id: params.id,
      submitter: result.submitter,
      txHash: result.txHash,
      aiSummary: result.aiSummary,
      timestamp: result.timestamp.toString(),
    };
  }

  @Query({
    intent: "Read the total number of analyses submitted",
  })
  async totalAnalyses() {
    const total = await this.registry.read.totalAnalyses([]);
    return { total: total.toString() };
  }

  @Receipt()
  analysisReceipt(changes: readonly Change[]): ReceiptResult<AnalysisOutcome> {
    let event: AnalysisOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind !== "event") {
        throw new Error("Unexpected Change: AI Explorer only emits events");
      }
      let decoded: ReturnType<typeof decodeEventLog<typeof AnalysisRegistryAbi>>;
      try {
        decoded = decodeEventLog({
          abi: AnalysisRegistryAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported AI Explorer event");
      }
      if (decoded.eventName !== "AnalysisSubmitted" || event) {
        throw new Error(
          `Unexpected Change: AI Explorer emitted ${decoded.eventName}`
        );
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
        text: `AI Analysis #${event.id}: ${event.summary.substring(0, 80)}...`,
      };
    });
    if (!event) {
      throw new Error("AI Explorer receipt requires an AnalysisSubmitted event");
    }
    return {
      kind: "receipt",
      outcome: event,
      text: `AI Analysis #${event.id} submitted by ${event.submitter}`,
      changes: parsed,
    };
  }
}

// Compile-time contract fixture (never executed; typechecked via tsconfig).
// Valid usage must compile with the intended inferred types and invalid usage
// must be rejected — see the repo type-safety rules and the _template fixture.
import type { AIExplorerProtocol } from "../src/index.js";

declare const explorer: AIExplorerProtocol;

const TX_HASH = `0x${"ab".repeat(32)}`;

// --- Positive: valid parameter inference ---

void explorer.submitAnalysis({ txHash: TX_HASH, aiSummary: "swap 1 MON for USDC" });

// --- Positive: Receipt outcome inference ---

explorer.analysisReceipt([]).outcome.operation satisfies "analysisSubmitted";
explorer.analysisReceipt([]).outcome.id satisfies string;
explorer.analysisReceipt([]).outcome.submitter satisfies string;
explorer.analysisReceipt([]).outcome.txHash satisfies string;
explorer.analysisReceipt([]).outcome.summary satisfies string;
explorer.analysisReceipt([]).outcome.timestamp satisfies string;

// --- Negative: invalid usage is rejected ---

// @ts-expect-error txHash must be a string, not a number
void explorer.submitAnalysis({ txHash: 123, aiSummary: "x" });

// @ts-expect-error aiSummary is required
void explorer.submitAnalysis({ txHash: TX_HASH });

// @ts-expect-error aiSummary must be a string, not a number
void explorer.submitAnalysis({ txHash: TX_HASH, aiSummary: 42 });

// @ts-expect-error outcome is analysisSubmitted, not another operation
explorer.analysisReceipt([]).outcome.operation satisfies "stake";

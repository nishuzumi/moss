/** Agent-side local-fork flow. No key enters Moss. */
import { writeFileSync } from "node:fs";
import {
  alignCapabilityParams,
  alignReceiptOutcome,
  assertAlignment,
  type IntentFieldExpectation,
} from "@themoss/agent";
import { createRuntime, NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { USDC_ADDRESS } from "@themoss/system";
import { parseUnits } from "viem";
import { devAccount, FORK_RPC_URL } from "./dev-wallet.js";

const outputPath = process.argv[2] ?? "verified-capability.json";
const runtime = await createRuntime({ rpcUrl: FORK_RPC_URL });
const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

const intent = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amountIn: "1",
  slippage: 50,
} as const;

const [operation] = registry.load([{ protocol: "kuru", method: "swap" }]);
console.log("loaded", operation);
const capability = await registry.action("kuru", "swap", devAccount.address, intent);
if (capability.kind !== "capability") throw new Error("expected a Capability");
// Agent safety rule 6: prove the built Capability preserved the recorded intent.
const paramExpectations: readonly IntentFieldExpectation[] = [
  { path: "tokenIn", expected: intent.tokenIn },
  { path: "tokenOut", expected: intent.tokenOut },
  { path: "amountIn", expected: intent.amountIn },
  { path: "slippage", expected: intent.slippage },
];
assertAlignment(alignCapabilityParams(capability, paramExpectations));

const simulation = await simulator.simulate(capability);
if (simulation.halted || simulation.results.some(({ warnings }) => warnings.length > 0)) {
  console.error(JSON.stringify(simulation, null, 2));
  throw new Error("simulation warning: stop before the signer boundary");
}
const finalResult = simulation.results.at(-1);
if (finalResult?.protocol !== "kuru" || finalResult.method !== "swap" || !finalResult.receipt) {
  throw new Error("simulation did not finish with the requested Kuru Capability");
}
const finalReceipt = finalResult.receipt;
// Agent safety rule 6: prove the simulated Receipt outcome matches the recorded intent.
const outcomeExpectations: readonly IntentFieldExpectation[] = [
  { path: "operation", expected: "swap" },
  { path: "protocol", expected: "kuru" },
  { path: "sender", expected: devAccount.address },
  { path: "tokenIn", expected: intent.tokenIn },
  { path: "tokenOut", expected: intent.tokenOut },
  { path: "amountIn", expected: parseUnits(intent.amountIn, 18).toString() },
  {
    path: "amountOut",
    predicate: (value) => typeof value === "string" && BigInt(value) > 0n,
    description: "amountOut > 0",
  },
];
assertAlignment(alignReceiptOutcome(finalReceipt, outcomeExpectations));
console.log("verified", finalReceipt.text);
writeFileSync(outputPath, `${JSON.stringify(capability, null, 2)}\n`);
console.log(`wrote ${outputPath}; review it before running wallet send`);

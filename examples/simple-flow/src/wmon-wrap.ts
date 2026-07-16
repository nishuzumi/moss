/** discover → load → action → simulate for one WMON Capability. */
import { Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime } from "@themoss/system";

const ACCOUNT = (process.env.MOSS_ACCOUNT ??
  "0xcccccccccccccccccccccccccccccccccccccccc") as `0x${string}`;
const runtime = await monadRuntime({
  ...(process.env.MOSS_RPC_URL ? { rpcUrl: process.env.MOSS_RPC_URL } : {}),
});
const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

console.log("1. discover", registry.discover({ verb: "wrap" }));
console.log("2. load", registry.load([{ protocol: "wmon", method: "wrap" }]));

const capability = await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" });
if (capability.kind !== "capability") throw new Error("expected a Capability");
console.log("3. action", capability);

const outcome = await simulator.simulate(capability);
console.log("4. simulate", JSON.stringify(outcome, null, 2));
if (outcome.halted || outcome.results.some(({ warnings }) => warnings.length > 0)) {
  console.error("Warnings present. Stop; do not sign.");
  process.exitCode = 1;
} else {
  for (const result of outcome.results) console.log(result.receipt?.text);
  console.log("Compare the ordered Receipts with the user's intent before signing.");
}

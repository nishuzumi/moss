/**
 * The canonical Moss flow, end to end, against Monad mainnet — with ZERO
 * funds and ZERO keys. Moss never signs and never sends; everything up to
 * and including simulation is free.
 *
 *   discover → load → action (build Plan) → simulate → reconcile
 *
 * Run:  pnpm --filter @themoss/example-simple-flow wrap
 */
import { type Plan, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";

const ACCOUNT = (process.env.MOSS_ACCOUNT ??
  "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC") as `0x${string}`;

const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
const registry = new Registry(runtime);
for (const manifest of [systemManifest, ercManifest, kuruManifest]) registry.use(manifest);
const simulator = createTraceSimulator(runtime);

// 1. discover — what can wrap funds around here?
const found = registry.discover({ verb: "wrap" });
console.log("1. discover(verb: wrap) →", found);

// 2. load — how do I call it correctly?
const [stub] = registry.load([{ protocol: "wmon", method: "wrap" }]);
console.log("\n2. load →", stub);

// 3. action — build the Plan. Note the human-readable amount: semantic types
//    scale it; agents never touch base units.
const plan = (await registry.action("wmon", "wrap", ACCOUNT, { amount: "1.5" })) as Plan;
console.log("\n3. action → Plan");
console.log("   intent:  ", plan.intent);
console.log("   risk:    ", plan.declaredRisk.join(", "));
console.log("   expects: ", JSON.stringify(plan.expects));
console.log("   txs:     ", plan.txs);

// 4. simulate — the gate that turns "declared" into "verified".
const { results } = await simulator.simulate([plan]);
const [result] = results;
console.log("\n4. simulate →");
console.log("   reverted:", result?.reverted);
console.log("   effects: ", JSON.stringify(result?.effects, null, 2));
console.log("   warnings:", result?.warnings);

// 5. the rule every agent must follow:
if (result && result.warnings.length === 0) {
  console.log("\n✓ No warnings — the unsigned txs may be handed to a wallet for review.");
} else {
  console.log("\n✗ Warnings present — STOP. Never hand these txs to a signer.");
  process.exitCode = 1;
}

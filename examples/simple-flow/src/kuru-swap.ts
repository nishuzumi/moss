/**
 * Cross-plan composition on a live orderbook: sell 1 MON into USDC on Kuru,
 * then spend half of that (simulated!) USDC back into MON — two Plans
 * simulated as one chain, each reconciled against its own declared expects.
 *
 * The USDC spent by plan 2 exists only inside the simulation: this is the
 * primitive that portfolio-rebalancing agents build on.
 *
 * Run:  pnpm --filter @themoss/example-simple-flow swap
 */
import { type Plan, type QueryResult, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { formatUnits } from "viem";

const ACCOUNT = (process.env.MOSS_ACCOUNT ??
  "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC") as `0x${string}`;

const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
const registry = new Registry(runtime);
for (const manifest of [systemManifest, ercManifest, kuruManifest]) registry.use(manifest);
// observer wires the @Event observation plane: protocol-authored receipts.
const simulator = createTraceSimulator(runtime, { observer: registry.observer() });

// 0. A read-only quote first — queries return data, not transactions.
const quote = (await registry.action("kuru", "quote", ACCOUNT, {
  tokenIn: "MON",
  tokenOut: "USDC",
  amount: "1",
})) as QueryResult;
console.log("0. quote(1 MON → USDC) →", quote.data);

// 1. Plan A: market-sell 1 native MON into USDC.
const sell = (await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: "MON",
  tokenOut: "USDC",
  amount: "1",
})) as Plan;
console.log("\n1. Plan A:", sell.intent);
console.log("   expects:", JSON.stringify(sell.expects));

// 2. Plan B: spend half the quoted USDC back into MON (approve + swap).
const minUsdc = BigInt(sell.expects.in?.[0]?.amountMin ?? "0");
const half = formatUnits(minUsdc / 2n, 6);
const buy = (await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: "USDC",
  tokenOut: "MON",
  amount: half,
})) as Plan;
console.log("\n2. Plan B:", buy.intent);
console.log("   txs:", buy.txs.length, "(approve + swap — the approval is auto-declared)");

// 3. Simulate both as one chain; each Plan reconciles independently.
const { results, halted } = await simulator.simulate([sell, buy]);
console.log("\n3. simulate([A, B]) →", halted ? `HALTED: ${halted.reason}` : "completed");
for (const [i, r] of results.entries()) {
  console.log(`\n   Plan ${i === 0 ? "A" : "B"} (${r.intent})`);
  console.log("   effects: ", JSON.stringify(r.effects));
  console.log("   warnings:", r.warnings);
}

const clean = !halted && results.every((r) => r.warnings.length === 0);
console.log(
  clean
    ? "\n✓ Both plans verified against live orderbook state — safe to hand to a wallet."
    : "\n✗ Warnings present — STOP. Never hand these txs to a signer.",
);
if (!clean) process.exitCode = 1;

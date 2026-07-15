/** Quote, build, and simulate one Kuru swap Capability. */
import { NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";

const ACCOUNT = (process.env.MOSS_ACCOUNT ??
  "0xcccccccccccccccccccccccccccccccccccccccc") as `0x${string}`;
const runtime = await monadRuntime({
  ...(process.env.MOSS_RPC_URL ? { rpcUrl: process.env.MOSS_RPC_URL } : {}),
});
const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

const quote = await registry.action("kuru", "quote", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amount: "1",
});
if (quote.kind !== "query") throw new Error("expected a Query result");
console.log("quote", quote.data);

const capability = await registry.action("kuru", "swap", ACCOUNT, {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amount: "1",
  slippage: 50,
});
if (capability.kind !== "capability") throw new Error("expected a Capability");
console.log("capability", capability);

const outcome = await simulator.simulate(capability);
console.log("simulation", JSON.stringify(outcome, null, 2));
if (outcome.halted || outcome.results.some(({ warnings }) => warnings.length > 0)) {
  console.error("Warnings present. Stop; do not sign.");
  process.exitCode = 1;
} else {
  for (const result of outcome.results) console.log(result.receipt?.text);
  console.log("Compare every Receipt with the requested MON-to-USDC swap before signing.");
}

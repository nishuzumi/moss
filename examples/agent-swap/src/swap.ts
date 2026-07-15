/** Agent-side local-fork flow. No key enters Moss. */
import { writeFileSync } from "node:fs";
import { type JsonSafeValue, NATIVE, Registry, type TokenRef } from "@themoss/core";
import * as erc from "@themoss/erc";
import type { KuruSwapOutcome } from "@themoss/protocol-kuru";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { monadRuntime, USDC_ADDRESS } from "@themoss/system";
import { isAddress, parseUnits } from "viem";
import { devAccount, FORK_RPC_URL } from "./dev-wallet.js";

const outputPath = process.argv[2] ?? "verified-capability.json";
const runtime = await monadRuntime({ rpcUrl: FORK_RPC_URL });
const registry = new Registry(runtime).use(system, erc, kuru);
const simulator = createTraceSimulator(runtime, {
  receipt: (capability, changes) => registry.parseReceipt(capability, changes),
});

const intent = {
  tokenIn: NATIVE,
  tokenOut: USDC_ADDRESS,
  amount: "1",
  slippage: 50,
} as const;

const [operation] = registry.load([{ protocol: "kuru", method: "swap" }]);
console.log("loaded", operation);
const capability = await registry.action("kuru", "swap", devAccount.address, intent);
if (capability.kind !== "capability") throw new Error("expected a Capability");
assertCapabilityParams(capability.params);

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
const outcome = parseKuruSwapOutcome(finalReceipt.outcome);
if (
  outcome.sender.toLowerCase() !== devAccount.address.toLowerCase() ||
  outcome.tokenIn !== intent.tokenIn ||
  outcome.tokenOut.toLowerCase() !== intent.tokenOut.toLowerCase() ||
  outcome.amountIn !== parseUnits(intent.amount, 18).toString() ||
  BigInt(outcome.amountOut) <= 0n
) {
  throw new Error("structured Receipt outcome does not match the requested Kuru swap");
}
console.log("verified", finalReceipt.text);
writeFileSync(outputPath, `${JSON.stringify(capability, null, 2)}\n`);
console.log(`wrote ${outputPath}; review it before running wallet send`);

function assertCapabilityParams(value: JsonSafeValue): void {
  if (!isJsonRecord(value)) {
    throw new Error("Kuru Capability params are not an object");
  }
  if (
    value.tokenIn !== intent.tokenIn ||
    value.tokenOut !== intent.tokenOut ||
    value.amount !== intent.amount ||
    value.slippage !== intent.slippage
  ) {
    throw new Error("Kuru Capability params do not preserve the requested intent");
  }
}

function isTokenRef(value: JsonSafeValue | undefined): value is TokenRef {
  return value === NATIVE || (typeof value === "string" && isAddress(value, { strict: false }));
}

function isTokenPath(value: JsonSafeValue | undefined): value is readonly TokenRef[] {
  return Array.isArray(value) && value.every(isTokenRef);
}

function isJsonRecord(value: JsonSafeValue): value is { readonly [key: string]: JsonSafeValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseKuruSwapOutcome(value: JsonSafeValue): KuruSwapOutcome {
  if (!isJsonRecord(value)) {
    throw new Error("Kuru Receipt outcome is not an object");
  }
  if (
    value.operation !== "swap" ||
    value.protocol !== "kuru" ||
    typeof value.sender !== "string" ||
    !isAddress(value.sender, { strict: false }) ||
    !isTokenRef(value.tokenIn) ||
    !isTokenRef(value.tokenOut) ||
    typeof value.amountIn !== "string" ||
    typeof value.amountOut !== "string" ||
    typeof value.fills !== "number" ||
    !Number.isInteger(value.fills) ||
    value.fills < 0 ||
    !isTokenPath(value.path)
  ) {
    throw new Error("Kuru Receipt outcome has an invalid shape");
  }
  return {
    operation: "swap",
    protocol: "kuru",
    sender: value.sender,
    tokenIn: value.tokenIn,
    tokenOut: value.tokenOut,
    amountIn: value.amountIn,
    amountOut: value.amountOut,
    fills: value.fills,
    path: value.path,
  };
}

import { type Plan, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { log, formatAmount, formatWarning } from "./utils/logger.js";
import { formatUnits } from "viem";
import { handleError, validateAmount } from "./utils/error-handler.js";
import { parseArgs, getAmount, getAccount } from "./utils/args.js";

const args = parseArgs();
const AMOUNT = getAmount(args, "1");
const ACCOUNT = (getAccount(args) as `0x${string}`);

log.section("Moss Demo: Combined Flow");
log.info(`Parameters: amount=${AMOUNT} MON, account=${ACCOUNT.slice(0, 10)}...`);
log.info("Flow: MON → USDC → MON (two-step swap)");
log.divider();

try {
  validateAmount(AMOUNT);

  const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
  const registry = new Registry(runtime);
  for (const manifest of [systemManifest, ercManifest, kuruManifest])
    registry.use(manifest);
  const simulator = createTraceSimulator(runtime);

  log.step(1, `Plan A: Swap ${AMOUNT} MON → USDC...`);
  const swapPlan = (await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: "MON",
    tokenOut: "USDC",
    amount: AMOUNT,
  })) as Plan;
  log.info(`Intent: ${swapPlan.intent}`);
  log.info(`Transactions: ${swapPlan.txs.length}`);

  log.step(2, "Simulating Plan A to get USDC output...");
  const { results: swapResults, halted: swapHalted } = await simulator.simulate([swapPlan]);

  if (swapHalted) {
    log.error(`Simulation halted: ${swapHalted.reason}`);
    process.exit(1);
  }

  const swapResult = swapResults[0]!;
  const minUsdc = BigInt(swapResult.effects.assetsOut[0]?.amount ?? "0");
  const halfUsdc = formatUnits(minUsdc / 2n, 6);

  log.step(3, `Plan B: Swap half USDC → MON (${halfUsdc})...`);
  const swapBackPlan = (await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: "USDC",
    tokenOut: "MON",
    amount: halfUsdc,
  })) as Plan;
  log.info(`Intent: ${swapBackPlan.intent}`);
  log.info(`Transactions: ${swapBackPlan.txs.length}`);

  log.step(4, "Simulating Plan B...");
  const { results: swapBackResults, halted: swapBackHalted } = await simulator.simulate([swapBackPlan]);

  if (swapBackHalted) {
    log.error(`Simulation halted: ${swapBackHalted.reason}`);
    process.exit(1);
  }

  const swapBackResult = swapBackResults[0]!;

  log.table([
    {
      plan: "A",
      description: "MON→USDC",
      intent: swapResult.intent,
      reverted: swapResult.reverted ? "Yes" : "No",
      assetsOut: swapResult.effects.assetsOut
        .map((a) => `${formatAmount(a.amount)} ${a.token}`)
        .join(", "),
      assetsIn: swapResult.effects.assetsIn
        .map((a) => `${formatAmount(a.amount)} ${a.token}`)
        .join(", "),
      warnings: swapResult.warnings.length === 0 ? "None" : `${swapResult.warnings.length} warning(s)`,
    },
    {
      plan: "B",
      description: "USDC→MON",
      intent: swapBackResult.intent,
      reverted: swapBackResult.reverted ? "Yes" : "No",
      assetsOut: swapBackResult.effects.assetsOut
        .map((a) => `${formatAmount(a.amount)} ${a.token}`)
        .join(", "),
      assetsIn: swapBackResult.effects.assetsIn
        .map((a) => `${formatAmount(a.amount)} ${a.token}`)
        .join(", "),
      warnings: swapBackResult.warnings.length === 0 ? "None" : `${swapBackResult.warnings.length} warning(s)`,
    },
  ]);

  const clean = !swapResult.reverted && swapResult.warnings.length === 0 && !swapBackResult.reverted && swapBackResult.warnings.length === 0;

  if (clean) {
    log.section("SUCCESS");
    log.success("All plans verified — safe to hand to a wallet.");
    log.info("This demonstrates how agents can compose multi-step workflows safely.");
    log.divider();
  } else {
    log.section("WARNING");
    log.warning("Warnings present — STOP. Never hand these txs to a signer.");
    if (swapResult.warnings.length > 0) {
      log.warning("Plan A (MON→USDC):");
      for (const warning of swapResult.warnings) {
        log.warning(`  - ${formatWarning(warning)}`);
      }
    }
    if (swapBackResult.warnings.length > 0) {
      log.warning("Plan B (USDC→MON):");
      for (const warning of swapBackResult.warnings) {
        log.warning(`  - ${formatWarning(warning)}`);
      }
    }
    log.divider();
    process.exit(1);
  }
} catch (error) {
  handleError(error, "Combined Flow Demo Failed");
}

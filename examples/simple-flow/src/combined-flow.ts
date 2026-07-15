import { type Plan, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { log, formatAmount, formatWarning } from "./utils/logger.js";
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
  const simulator = createTraceSimulator(runtime, { observer: registry.observer() });

  log.step(1, `Plan A: Swap ${AMOUNT} MON → USDC...`);
  const swapPlan = (await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: "MON",
    tokenOut: "USDC",
    amount: AMOUNT,
  })) as Plan;
  log.info(`Intent: ${swapPlan.intent}`);
  log.info(`Transactions: ${swapPlan.txs.length}`);

  log.step(2, `Plan B: Swap half USDC → MON...`);
  const minUsdc = swapPlan.expects.in?.[0]?.amountMin ?? "0";
  const halfUsdc = formatAmount(minUsdc, 6);
  const swapBackPlan = (await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: "USDC",
    tokenOut: "MON",
    amount: halfUsdc,
  })) as Plan;
  log.info(`Intent: ${swapBackPlan.intent}`);
  log.info(`Transactions: ${swapBackPlan.txs.length}`);

  log.step(3, "Simulating both plans as one chain...");
  const { results, halted } = await simulator.simulate([swapPlan, swapBackPlan]);

  if (halted) {
    log.error(`Simulation halted: ${halted.reason}`);
    process.exit(1);
  }

  const planNames = ["A", "B"];
  const planDescriptions = ["MON→USDC", "USDC→MON"];

  for (const [i, r] of results.entries()) {
    log.table([
      {
        plan: planNames[i] ?? String(i),
        description: planDescriptions[i] ?? "",
        intent: r.intent,
        reverted: r.reverted ? "Yes" : "No",
        assetsOut: r.effects.assetsOut
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        assetsIn: r.effects.assetsIn
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        warnings: r.warnings.length === 0 ? "None" : `${r.warnings.length} warning(s)`,
      },
    ]);
  }

  const clean = results.every((r) => !r.reverted && r.warnings.length === 0);

  if (clean) {
    log.section("SUCCESS");
    log.success("All plans verified — safe to hand to a wallet.");
    log.info("This demonstrates how agents can compose multi-step workflows safely.");
    log.divider();
  } else {
    log.section("WARNING");
    log.warning("Warnings present — STOP. Never hand these txs to a signer.");
    for (const [i, r] of results.entries()) {
      if (r.warnings.length > 0) {
        log.warning(`Plan ${planNames[i]} (${planDescriptions[i]}):`);
        for (const warning of r.warnings) {
          log.warning(`  - ${formatWarning(warning)}`);
        }
      }
    }
    log.divider();
    process.exit(1);
  }
} catch (error) {
  handleError(error, "Combined Flow Demo Failed");
}

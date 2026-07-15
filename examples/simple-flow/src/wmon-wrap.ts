import { type Plan, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { log, formatAmount } from "./utils/logger.js";
import { handleError, validateAmount } from "./utils/error-handler.js";
import { parseArgs, getAmount, getAccount } from "./utils/args.js";

const args = parseArgs();
const AMOUNT = getAmount(args, "1.5");
const ACCOUNT = (getAccount(args) as `0x${string}`);

log.section("Moss Demo: WMON Wrap");
log.info(`Parameters: amount=${AMOUNT}, account=${ACCOUNT.slice(0, 10)}...`);
log.divider();

try {
  validateAmount(AMOUNT);
  const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
  const registry = new Registry(runtime);
  for (const manifest of [systemManifest, ercManifest, kuruManifest])
    registry.use(manifest);
  const simulator = createTraceSimulator(runtime);

  log.step(1, "Discovering wrap capabilities...");
  const found = registry.discover({ verb: "wrap" });
  if (found.length === 0) {
    log.error("No wrap capability found");
    process.exit(1);
  }
  log.table(found.map((f) => ({ protocol: f.protocol, method: f.method, summary: f.summary })));

  log.step(2, "Loading wmon.wrap capability...");
  const stubs = registry.load([{ protocol: "wmon", method: "wrap" }]);
  const stub = stubs[0];
  if (!stub) {
    log.error("Failed to load wmon.wrap capability");
    process.exit(1);
  }
  log.table([
    {
      intent: stub.intent,
      risk: stub.risk.join(", "),
      params: Object.keys(stub.params).join(", "),
    },
  ]);

  log.step(3, `Building Plan: Wrap ${AMOUNT} MON into WMON...`);
  const plan = (await registry.action("wmon", "wrap", ACCOUNT, {
    amount: AMOUNT,
  })) as Plan;
  log.info(`Intent: ${plan.intent}`);
  log.info(`Risk: ${plan.declaredRisk.join(", ")}`);
  log.info(`Expects: ${JSON.stringify(plan.expects, null, 2)}`);
  log.info(`Transactions: ${plan.txs.length}`);
  for (const tx of plan.txs) {
    log.info(`  - To: ${tx.to} (value: ${formatAmount(tx.value ?? "0")} MON)`);
  }

  log.step(4, "Simulating on Monad mainnet...");
  const { results } = await simulator.simulate([plan]);
  const [result] = results;

  if (!result) {
    log.error("No simulation result returned");
    process.exit(1);
  }

  log.table([
    {
      reverted: result.reverted ? "Yes" : "No",
      assetsOut: result.effects.assetsOut
        .map((a) => `${formatAmount(a.amount)} ${a.token}`)
        .join(", "),
      assetsIn: result.effects.assetsIn
        .map((a) => `${formatAmount(a.amount)} ${a.token}`)
        .join(", "),
      warnings: result.warnings.length === 0 ? "None" : `${result.warnings.length} warning(s)`,
    },
  ]);

  if (result.reverted) {
    log.error("Transaction reverted during simulation");
    process.exit(1);
  }

  if (result.warnings.length === 0) {
    log.section("SUCCESS");
    log.success("No warnings detected — the unsigned txs may be handed to a wallet for review.");
    log.divider();
  } else {
    log.section("WARNING");
    log.warning("Warnings present — STOP. Never hand these txs to a signer.");
    for (const warning of result.warnings) {
      log.warning(`  - ${warning}`);
    }
    log.divider();
    process.exit(1);
  }
} catch (error) {
  handleError(error, "WMON Wrap Demo Failed");
}

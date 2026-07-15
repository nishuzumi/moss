import { type Plan, type QueryResult, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { kuruManifest } from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";
import { formatUnits } from "viem";
import { log, formatAmount } from "./utils/logger.js";
import { handleError, validateAmount, validateToken } from "./utils/error-handler.js";
import { parseArgs, getAmount, getTokenIn, getTokenOut, getAccount } from "./utils/args.js";

const args = parseArgs();
const AMOUNT = getAmount(args, "1");
const TOKEN_IN = getTokenIn(args, "MON");
const TOKEN_OUT = getTokenOut(args, "USDC");
const ACCOUNT = (getAccount(args) as `0x${string}`);

log.section("Moss Demo: Kuru Swap");
log.info(
  `Parameters: amount=${AMOUNT} ${TOKEN_IN}, tokenIn=${TOKEN_IN}, tokenOut=${TOKEN_OUT}, account=${ACCOUNT.slice(0, 10)}...`,
);
log.divider();

try {
  validateAmount(AMOUNT);
  validateToken(TOKEN_IN);
  validateToken(TOKEN_OUT);

  const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
  const registry = new Registry(runtime);
  for (const manifest of [systemManifest, ercManifest, kuruManifest])
    registry.use(manifest);
  const simulator = createTraceSimulator(runtime, { observer: registry.observer() });

  log.step(0, `Getting quote: ${AMOUNT} ${TOKEN_IN} → ${TOKEN_OUT}...`);
  const quote = (await registry.action("kuru", "quote", ACCOUNT, {
    tokenIn: TOKEN_IN,
    tokenOut: TOKEN_OUT,
    amount: AMOUNT,
  })) as QueryResult;
  const quoteData = quote.data as { amountOut?: string; slippage?: string };
  log.table([
    {
      tokenIn: `${AMOUNT} ${TOKEN_IN}`,
      tokenOut: `${formatAmount(quoteData.amountOut ?? "0", TOKEN_OUT === "USDC" || TOKEN_OUT === "AUSD" ? 6 : 18)} ${TOKEN_OUT}`,
      slippage: `${quoteData.slippage ?? "unknown"}%`,
    },
  ]);

  log.step(1, `Building Plan A: Sell ${AMOUNT} ${TOKEN_IN} for ${TOKEN_OUT}...`);
  const sell = (await registry.action("kuru", "swap", ACCOUNT, {
    tokenIn: TOKEN_IN,
    tokenOut: TOKEN_OUT,
    amount: AMOUNT,
  })) as Plan;
  log.info(`Intent: ${sell.intent}`);
  log.info(`Expects: ${JSON.stringify(sell.expects, null, 2)}`);

  log.step(2, `Building Plan B: Buy back half in ${TOKEN_IN}...`);
  const minTokenOut = BigInt(sell.expects.in?.[0]?.amountMin ?? "0");
  const usdcLikeTokens = ["USDC", "AUSD"];
  const decimals = usdcLikeTokens.includes(TOKEN_OUT) ? 6 : 18;
  const half = formatUnits(minTokenOut / 2n, decimals);

  if (parseFloat(half) <= 0) {
    log.warning("Output amount too small for Plan B, skipping...");
    log.step(3, "Simulating Plan A only...");
    const { results, halted } = await simulator.simulate([sell]);

    if (halted) {
      log.error(`Simulation halted: ${halted.reason}`);
      process.exit(1);
    }

    for (const [i, r] of results.entries()) {
      log.table([
        {
          plan: "A",
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
      log.success("Plan A verified against live orderbook state — safe to hand to a wallet.");
      log.divider();
    } else {
      log.section("WARNING");
      log.warning("Warnings present — STOP. Never hand these txs to a signer.");
      for (const [i, r] of results.entries()) {
        if (r.warnings.length > 0) {
          log.warning(`Plan ${i === 0 ? "A" : "B"}:`);
          for (const warning of r.warnings) {
            log.warning(`  - ${warning}`);
          }
        }
      }
      log.divider();
      process.exit(1);
    }
  } else {
    const buy = (await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: TOKEN_OUT,
      tokenOut: TOKEN_IN,
      amount: half,
    })) as Plan;
    log.info(`Intent: ${buy.intent}`);
    log.info(`Transactions: ${buy.txs.length} (approve + swap)`);

    log.step(3, "Simulating both plans as one chain...");
    const { results, halted } = await simulator.simulate([sell, buy]);

    if (halted) {
      log.error(`Simulation halted: ${halted.reason}`);
      process.exit(1);
    }

    for (const [i, r] of results.entries()) {
      log.table([
        {
          plan: i === 0 ? "A" : "B",
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
      log.success("Both plans verified against live orderbook state — safe to hand to a wallet.");
      log.divider();
    } else {
      log.section("WARNING");
      log.warning("Warnings present — STOP. Never hand these txs to a signer.");
      for (const [i, r] of results.entries()) {
        if (r.warnings.length > 0) {
          log.warning(`Plan ${i === 0 ? "A" : "B"}:`);
          for (const warning of r.warnings) {
            log.warning(`  - ${warning}`);
          }
        }
      }
      log.divider();
      process.exit(1);
    }
  }
} catch (error) {
  handleError(error, "Kuru Swap Demo Failed");
}

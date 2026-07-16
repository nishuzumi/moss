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
  const simulator = createTraceSimulator(runtime);

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

  log.step(2, "Simulating Plan A to get output amount...");
  const { results: sellResults, halted: sellHalted } = await simulator.simulate([sell]);

  if (sellHalted) {
    log.error(`Simulation halted: ${sellHalted.reason}`);
    process.exit(1);
  }

  const sellResult = sellResults[0]!;
  const minTokenOut = BigInt(sellResult.effects.assetsOut[0]?.amount ?? "0");
  const usdcLikeTokens = ["USDC", "AUSD"];
  const decimals = usdcLikeTokens.includes(TOKEN_OUT) ? 6 : 18;
  const half = formatUnits(minTokenOut / 2n, decimals);

  if (parseFloat(half) <= 0) {
    log.warning("Output amount too small for Plan B, skipping...");
    log.step(3, "Displaying Plan A result...");
    log.table([
      {
        plan: "A",
        intent: sellResult.intent,
        reverted: sellResult.reverted ? "Yes" : "No",
        assetsOut: sellResult.effects.assetsOut
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        assetsIn: sellResult.effects.assetsIn
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        warnings: sellResult.warnings.length === 0 ? "None" : `${sellResult.warnings.length} warning(s)`,
      },
    ]);

    if (!sellResult.reverted && sellResult.warnings.length === 0) {
      log.section("SUCCESS");
      log.success("Plan A verified against live orderbook state — safe to hand to a wallet.");
      log.divider();
    } else {
      log.section("WARNING");
      log.warning("Warnings present — STOP. Never hand these txs to a signer.");
      for (const warning of sellResult.warnings) {
        log.warning(`  - ${warning}`);
      }
      log.divider();
      process.exit(1);
    }
  } else {
    log.step(3, `Building Plan B: Buy back half in ${TOKEN_IN}...`);
    const buy = (await registry.action("kuru", "swap", ACCOUNT, {
      tokenIn: TOKEN_OUT,
      tokenOut: TOKEN_IN,
      amount: half,
    })) as Plan;
    log.info(`Intent: ${buy.intent}`);
    log.info(`Transactions: ${buy.txs.length} (approve + swap)`);

    log.step(4, "Simulating Plan B...");
    const { results: buyResults, halted: buyHalted } = await simulator.simulate([buy]);

    if (buyHalted) {
      log.error(`Simulation halted: ${buyHalted.reason}`);
      process.exit(1);
    }

    const buyResult = buyResults[0]!;

    log.step(5, "Displaying both plans results...");
    log.table([
      {
        plan: "A",
        intent: sellResult.intent,
        reverted: sellResult.reverted ? "Yes" : "No",
        assetsOut: sellResult.effects.assetsOut
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        assetsIn: sellResult.effects.assetsIn
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        warnings: sellResult.warnings.length === 0 ? "None" : `${sellResult.warnings.length} warning(s)`,
      },
      {
        plan: "B",
        intent: buyResult.intent,
        reverted: buyResult.reverted ? "Yes" : "No",
        assetsOut: buyResult.effects.assetsOut
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        assetsIn: buyResult.effects.assetsIn
          .map((a) => `${formatAmount(a.amount)} ${a.token}`)
          .join(", "),
        warnings: buyResult.warnings.length === 0 ? "None" : `${buyResult.warnings.length} warning(s)`,
      },
    ]);

    const clean = !sellResult.reverted && sellResult.warnings.length === 0 && !buyResult.reverted && buyResult.warnings.length === 0;

    if (clean) {
      log.section("SUCCESS");
      log.success("Both plans verified against live orderbook state — safe to hand to a wallet.");
      log.divider();
    } else {
      log.section("WARNING");
      log.warning("Warnings present — STOP. Never hand these txs to a signer.");
      if (sellResult.warnings.length > 0) {
        log.warning("Plan A:");
        for (const warning of sellResult.warnings) {
          log.warning(`  - ${warning}`);
        }
      }
      if (buyResult.warnings.length > 0) {
        log.warning("Plan B:");
        for (const warning of buyResult.warnings) {
          log.warning(`  - ${warning}`);
        }
      }
      log.divider();
      process.exit(1);
    }
  }
} catch (error) {
  handleError(error, "Kuru Swap Demo Failed");
}

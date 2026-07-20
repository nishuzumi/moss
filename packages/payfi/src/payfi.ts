import {
  type ActionCtx,
  Address,
  Capability,
  type CapabilityResult,
  type Change,
  type InferParams,
  type MossRuntime,
  NATIVE,
  type ParamsSpec,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  TokenReference,
  transaction,
  UnsignedIntegerString,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { encodeFunctionData } from "viem";

// ── Security rules ─────────────────────────────────────────

const MAX_SINGLE_TX_USDC = 1_000_000_000n; // $1,000
const MAX_DAILY_USDC = 5_000_000_000n; // $5,000
const BLACKLISTED: string[] = [];

let dailySpent = 0n;

// ── Params ──────────────────────────────────────────────────

const transferParams = {
  token: {
    type: TokenReference,
    description: "Stablecoin token to pay with (e.g. USDC).",
  },
  to: { type: Address, description: "Recipient of the payment." },
  amount: {
    type: UnsignedIntegerString,
    description: "Payment amount in the token's smallest unit (e.g. 6-decimal USDC raw units).",
  },
  reason: {
    type: UnsignedIntegerString.optional().describe(
      'An optional payment reason for logging, such as "1" (data report) or "2" (API quota).',
    ),
    description: "Optional payment-reason code for audit logging.",
  },
} satisfies ParamsSpec;

const riskParams = {
  token: {
    type: TokenReference,
    description: "Token to check.",
  },
  to: { type: Address, description: "Recipient address to evaluate." },
  amount: {
    type: UnsignedIntegerString,
    description: "Payment amount in token smallest units.",
  },
} satisfies ParamsSpec;

// ── Types ───────────────────────────────────────────────────

export type PayFiRiskLevel = "none" | "low" | "high" | "critical";

export interface PayFiRiskReport {
  safe: boolean;
  level: PayFiRiskLevel;
  blacklist: boolean;
  amountOk: boolean;
  dailyOk: boolean;
  summary: string;
  recommendation: string;
}

// ── Security engine ─────────────────────────────────────────

function checkRisk(to: string, amount: bigint): PayFiRiskReport {
  const blacklist = !BLACKLISTED.some((a) => a.toLowerCase() === to.toLowerCase());
  const amountOk = amount <= MAX_SINGLE_TX_USDC;
  const dailyOk = dailySpent + amount <= MAX_DAILY_USDC;

  if (!blacklist) {
    return {
      safe: false,
      level: "critical",
      blacklist: false,
      amountOk,
      dailyOk,
      summary: "Address is in the payment blacklist.",
      recommendation: "Transaction blocked. Do not override.",
    };
  }
  if (!amountOk) {
    return {
      safe: false,
      level: "high",
      blacklist: true,
      amountOk: false,
      dailyOk,
      summary: `Amount exceeds single-tx cap (${MAX_SINGLE_TX_USDC}).`,
      recommendation: "Reduce the amount or manually confirm.",
    };
  }
  if (!dailyOk) {
    return {
      safe: false,
      level: "high",
      blacklist: true,
      amountOk: true,
      dailyOk: false,
      summary: `Daily spending cap (${MAX_DAILY_USDC}) would be exceeded.`,
      recommendation: "Wait until tomorrow or raise the cap.",
    };
  }

  dailySpent += amount;
  return {
    safe: true,
    level: "none",
    blacklist: true,
    amountOk: true,
    dailyOk: true,
    summary: "All security checks passed.",
    recommendation: "Transaction is safe to execute.",
  };
}

export function resetDailySpent(): void {
  dailySpent = 0n;
}

// ── Protocol ────────────────────────────────────────────────

@Protocol({
  name: "payfi",
  category: "token",
  description: "PayFi — secure stablecoin payments with pre-flight risk checks.",
  contracts: {},
  protocols: { erc20: ERC20 },
})
export class PayFi {
  declare runtime: MossRuntime;
  declare erc20: ProtocolRef<ERC20>;

  // ── Capability: secure transfer ─────────────────────────

  @Capability({
    intent: "Send a secure stablecoin payment with automatic pre-flight risk checks",
    verb: "transfer",
    params: transferParams,
    receipt: "transferReceipt",
    risk: ["fundOut"],
    tags: ["payment", "security"],
  })
  async transfer(
    params: InferParams<typeof transferParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const risk = checkRisk(params.to, BigInt(params.amount));

    if (!risk.safe) {
      throw new Error(
        `PayFi risk check failed [${risk.level}]: ${risk.summary} ${risk.recommendation}`,
      );
    }

    const amount = BigInt(params.amount);
    const data = encodeFunctionData({
      abi: [
        {
          name: "transfer",
          type: "function",
          stateMutability: "nonpayable",
          inputs: [
            { name: "recipient", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ] as const,
      functionName: "transfer",
      args: [params.to as `0x${string}`, amount],
    });
    const tx =
      params.token === NATIVE
        ? transaction(ctx.account, params.to, { value: amount })
        : transaction(ctx.account, params.token as `0x${string}`, { data });

    return [tx];
  }

  // ── Query: risk check only ──────────────────────────────

  @Query({
    intent: "Run a pre-flight risk check on a payment without executing it",
    params: riskParams,
    tags: ["security", "audit"],
  })
  async checkRisk(
    params: InferParams<typeof riskParams>,
    _ctx: ActionCtx,
  ): Promise<PayFiRiskReport> {
    return checkRisk(params.to, BigInt(params.amount));
  }

  // ── Receipt: delegate to ERC-20 ─────────────────────────

  @Receipt()
  transferReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "transfer" }> {
    return this.erc20.transferReceipt(changes);
  }
}

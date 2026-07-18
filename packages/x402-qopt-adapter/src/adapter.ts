import { hashQuboProblem } from "./hash.js";
import { decodePaymentRequired, decodePaymentResponse } from "./headers.js";
import { validatePaymentPolicy } from "./policy.js";
import { validateQuboProblem } from "./qubo.js";
import { selectExactRequirement } from "./requirements.js";
import {
  type PaidQOptResponse,
  type PaymentPolicy,
  type PaymentQuote,
  paymentPolicySchema,
  type QuboProblem,
  qoptResultSchema,
} from "./types.js";

export class QOptX402Adapter {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async quote(
    endpoint: string,
    problemInput: unknown,
    policyInput: PaymentPolicy,
  ): Promise<PaymentQuote> {
    const problem = validateQuboProblem(problemInput);
    const policy = paymentPolicySchema.parse(policyInput);
    const problemHash = hashQuboProblem(problem);

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        problem,
        problemHash,
      }),
    });

    if (response.status !== 402) {
      throw new Error(`Expected HTTP 402, received ${response.status}`);
    }

    const header = response.headers.get("PAYMENT-REQUIRED");

    if (!header) {
      throw new Error("HTTP 402 response is missing PAYMENT-REQUIRED");
    }

    const decoded = decodePaymentRequired(header);
    const requirement = selectExactRequirement(decoded);

    validatePaymentPolicy(requirement, policy);

    return {
      requirement,
      problemHash,
      rawPaymentRequired: header,
    };
  }

  async submitPaid(
    endpoint: string,
    problemInput: QuboProblem,
    quote: PaymentQuote,
    paymentSignature: string,
  ): Promise<PaidQOptResponse> {
    if (!paymentSignature.trim()) {
      throw new Error("PAYMENT-SIGNATURE is required");
    }

    const problem = validateQuboProblem(problemInput);
    const currentHash = hashQuboProblem(problem);

    if (currentHash !== quote.problemHash) {
      throw new Error("QUBO problem does not match the quoted problem hash");
    }

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "PAYMENT-SIGNATURE": paymentSignature,
      },
      body: JSON.stringify({
        problem,
        problemHash: currentHash,
      }),
    });

    if (!response.ok) {
      throw new Error(`Paid request failed with HTTP ${response.status}`);
    }

    const result = qoptResultSchema.parse(await response.json());
    const paymentResponseHeader = response.headers.get("PAYMENT-RESPONSE");

    return {
      result,
      paymentResponse: paymentResponseHeader
        ? decodePaymentResponse(paymentResponseHeader)
        : undefined,
    };
  }
}

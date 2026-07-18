import { type PaymentRequirement, paymentRequirementSchema } from "./types.js";

type PaymentRequiredEnvelope = {
  x402Version?: number;
  accepts?: unknown[];
  resource?: {
    url?: string;
    description?: string;
    mimeType?: string;
  };
};

export function selectExactRequirement(decoded: unknown): PaymentRequirement {
  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid PAYMENT-REQUIRED object");
  }

  const envelope = decoded as PaymentRequiredEnvelope;

  if (envelope.x402Version !== 2) {
    throw new Error("Only x402 V2 is supported");
  }

  if (!Array.isArray(envelope.accepts)) {
    throw new Error("PAYMENT-REQUIRED has no accepts array");
  }

  const exact = envelope.accepts.find((item) => {
    return (
      item !== null && typeof item === "object" && (item as { scheme?: unknown }).scheme === "exact"
    );
  });

  if (!exact) {
    throw new Error("No supported exact payment requirement");
  }

  return paymentRequirementSchema.parse({
    ...(exact as Record<string, unknown>),
    resource: (exact as { resource?: string }).resource ?? envelope.resource?.url,
  });
}

import type { PaymentPolicy, PaymentRequirement } from "./types.js";

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

export function validatePaymentPolicy(
  requirement: PaymentRequirement,
  policy: PaymentPolicy,
): void {
  let amount: bigint;

  try {
    amount = BigInt(requirement.amount);
  } catch {
    throw new Error("Payment amount is not an integer string");
  }

  if (amount > policy.maxAmount) {
    throw new Error(`Payment exceeds approved budget: ${amount} > ${policy.maxAmount}`);
  }

  if (requirement.network !== policy.expectedNetwork) {
    throw new Error(`Unexpected network: ${requirement.network}`);
  }

  if (normalizeAddress(requirement.asset) !== normalizeAddress(policy.expectedAsset)) {
    throw new Error(`Unexpected payment asset: ${requirement.asset}`);
  }

  if (
    policy.expectedPayTo &&
    normalizeAddress(requirement.payTo) !== normalizeAddress(policy.expectedPayTo)
  ) {
    throw new Error(`Unexpected payment recipient: ${requirement.payTo}`);
  }

  if (policy.expectedResource && requirement.resource !== policy.expectedResource) {
    throw new Error(`Unexpected paid resource: ${requirement.resource}`);
  }
}

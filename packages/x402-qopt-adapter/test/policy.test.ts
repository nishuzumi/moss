import { describe, expect, it } from "vitest";

import { validatePaymentPolicy } from "../src/policy.js";
import type { PaymentPolicy, PaymentRequirement } from "../src/types.js";

const requirement: PaymentRequirement = {
  scheme: "exact",
  network: "eip155:143",
  amount: "1000",
  asset: "0x0000000000000000000000000000000000000002",
  payTo: "0x0000000000000000000000000000000000000003",
  resource: "http://localhost:4021/optimize/qubo",
};

const policy: PaymentPolicy = {
  maxAmount: 1000n,
  expectedNetwork: "eip155:143",
  expectedAsset: "0x0000000000000000000000000000000000000002",
  expectedPayTo: "0x0000000000000000000000000000000000000003",
  expectedResource: "http://localhost:4021/optimize/qubo",
};

describe("validatePaymentPolicy", () => {
  it("accepts amount below budget", () => {
    validatePaymentPolicy({ ...requirement, amount: "999" }, policy);
  });

  it("accepts amount equal to budget", () => {
    validatePaymentPolicy(requirement, policy);
  });

  it("rejects amount above budget", () => {
    expect(() => validatePaymentPolicy({ ...requirement, amount: "1001" }, policy)).toThrow(
      "Payment exceeds approved budget",
    );
  });

  it("rejects network mismatch", () => {
    expect(() => validatePaymentPolicy({ ...requirement, network: "eip155:1" }, policy)).toThrow(
      "Unexpected network",
    );
  });

  it("rejects asset mismatch", () => {
    expect(() =>
      validatePaymentPolicy(
        {
          ...requirement,
          asset: "0x0000000000000000000000000000000000000009",
        },
        policy,
      ),
    ).toThrow("Unexpected payment asset");
  });

  it("rejects recipient mismatch", () => {
    expect(() =>
      validatePaymentPolicy(
        {
          ...requirement,
          payTo: "0x0000000000000000000000000000000000000010",
        },
        policy,
      ),
    ).toThrow("Unexpected payment recipient");
  });

  it("rejects resource mismatch", () => {
    expect(() =>
      validatePaymentPolicy(
        {
          ...requirement,
          resource: "http://localhost:4021/other",
        },
        policy,
      ),
    ).toThrow("Unexpected paid resource");
  });
});

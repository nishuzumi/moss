import { z } from "zod";

export const quboProblemSchema = z.object({
  matrix: z.array(z.array(z.number().finite())).min(1).max(16),
});

export type QuboProblem = z.infer<typeof quboProblemSchema>;

export const paymentPolicySchema = z.object({
  maxAmount: z.bigint().nonnegative(),
  expectedNetwork: z.string().min(1),
  expectedAsset: z.string().min(1),
  expectedPayTo: z.string().optional(),
  expectedResource: z.string().optional(),
});

export type PaymentPolicy = z.infer<typeof paymentPolicySchema>;

export const paymentRequirementSchema = z.object({
  scheme: z.string(),
  network: z.string(),
  amount: z.string(),
  asset: z.string(),
  payTo: z.string(),
  resource: z.string().optional(),
  maxTimeoutSeconds: z.number().int().positive().optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
});

export type PaymentRequirement = z.infer<typeof paymentRequirementSchema>;

export const qoptResultSchema = z.object({
  jobId: z.string(),
  status: z.enum(["completed", "failed"]),
  solution: z.array(z.union([z.literal(0), z.literal(1)])),
  objectiveValue: z.number(),
  classicalObjective: z.number(),
  optimalityGap: z.number(),
  backend: z.string(),
  backendType: z.enum([
    "mock-quantum-simulator",
    "local-quantum-simulator",
    "remote-quantum-simulator",
    "physical-qpu",
    "hybrid-quantum-classical",
  ]),
});

export type QOptResult = z.infer<typeof qoptResultSchema>;

export interface PaymentQuote {
  requirement: PaymentRequirement;
  problemHash: string;
  rawPaymentRequired: string;
}

export interface PaidQOptResponse {
  result: QOptResult;
  paymentResponse?: unknown;
}

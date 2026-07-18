import { describe, expect, it, vi } from "vitest";

import { QOptX402Adapter } from "../src/adapter.js";
import { encodeBase64Json } from "../src/headers.js";
import type { PaymentPolicy } from "../src/types.js";

const endpoint = "http://localhost:4021/optimize/qubo";
const problem = {
  matrix: [
    [1, -2],
    [-2, 4],
  ],
};

const policy: PaymentPolicy = {
  maxAmount: 2000n,
  expectedNetwork: "eip155:143",
  expectedAsset: "0x0000000000000000000000000000000000000002",
  expectedPayTo: "0x0000000000000000000000000000000000000003",
  expectedResource: endpoint,
};

function makeJsonResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(headers ?? {}),
    },
  });
}

describe("QOptX402Adapter", () => {
  it("rejects non-402 quote responses", async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(makeJsonResponse(200, { ok: true }));
    const adapter = new QOptX402Adapter(mockFetch);

    await expect(adapter.quote(endpoint, problem, policy)).rejects.toThrow("Expected HTTP 402");
  });

  it("rejects 402 without PAYMENT-REQUIRED header", async () => {
    const mockFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(makeJsonResponse(402, { error: "required" }));
    const adapter = new QOptX402Adapter(mockFetch);

    await expect(adapter.quote(endpoint, problem, policy)).rejects.toThrow(
      "missing PAYMENT-REQUIRED",
    );
  });

  it("rejects unsupported x402 version", async () => {
    const paymentRequired = encodeBase64Json({
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: policy.expectedNetwork,
          amount: "1000",
          asset: policy.expectedAsset,
          payTo: policy.expectedPayTo,
          resource: endpoint,
        },
      ],
    });
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      makeJsonResponse(
        402,
        { error: "required" },
        {
          "PAYMENT-REQUIRED": paymentRequired,
        },
      ),
    );
    const adapter = new QOptX402Adapter(mockFetch);

    await expect(adapter.quote(endpoint, problem, policy)).rejects.toThrow(
      "Only x402 V2 is supported",
    );
  });

  it("rejects non-exact payment schemes", async () => {
    const paymentRequired = encodeBase64Json({
      x402Version: 2,
      accepts: [
        {
          scheme: "something-else",
        },
      ],
    });
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      makeJsonResponse(
        402,
        { error: "required" },
        {
          "PAYMENT-REQUIRED": paymentRequired,
        },
      ),
    );
    const adapter = new QOptX402Adapter(mockFetch);

    await expect(adapter.quote(endpoint, problem, policy)).rejects.toThrow(
      "No supported exact payment requirement",
    );
  });

  it("rejects changed problem between quote and submit", async () => {
    const paymentRequired = encodeBase64Json({
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: policy.expectedNetwork,
          amount: "1000",
          asset: policy.expectedAsset,
          payTo: policy.expectedPayTo,
          resource: endpoint,
        },
      ],
    });
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      makeJsonResponse(
        402,
        { error: "required" },
        {
          "PAYMENT-REQUIRED": paymentRequired,
        },
      ),
    );
    const adapter = new QOptX402Adapter(mockFetch);
    const quote = await adapter.quote(endpoint, problem, policy);

    await expect(
      adapter.submitPaid(
        endpoint,
        {
          matrix: [
            [1, -2],
            [-2, 5],
          ],
        },
        quote,
        "demo-payment-signature",
      ),
    ).rejects.toThrow("does not match the quoted problem hash");
  });

  it("rejects empty PAYMENT-SIGNATURE", async () => {
    const paymentRequired = encodeBase64Json({
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: policy.expectedNetwork,
          amount: "1000",
          asset: policy.expectedAsset,
          payTo: policy.expectedPayTo,
          resource: endpoint,
        },
      ],
    });
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      makeJsonResponse(
        402,
        { error: "required" },
        {
          "PAYMENT-REQUIRED": paymentRequired,
        },
      ),
    );
    const adapter = new QOptX402Adapter(mockFetch);
    const quote = await adapter.quote(endpoint, problem, policy);

    await expect(adapter.submitPaid(endpoint, problem, quote, "   ")).rejects.toThrow(
      "PAYMENT-SIGNATURE is required",
    );
  });

  it("parses optimization result and payment response", async () => {
    const paymentRequired = encodeBase64Json({
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: policy.expectedNetwork,
          amount: "1000",
          asset: policy.expectedAsset,
          payTo: policy.expectedPayTo,
          resource: endpoint,
        },
      ],
    });
    const paymentResponse = encodeBase64Json({
      success: true,
      transaction: "offline-demo",
      network: policy.expectedNetwork,
    });
    const mockFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        makeJsonResponse(
          402,
          { error: "required" },
          {
            "PAYMENT-REQUIRED": paymentRequired,
          },
        ),
      )
      .mockResolvedValueOnce(
        makeJsonResponse(
          200,
          {
            jobId: "job-1",
            status: "completed",
            solution: [1, 0],
            objectiveValue: -2,
            classicalObjective: -2,
            optimalityGap: 0,
            backend: "offline-qopt-demo",
            backendType: "mock-quantum-simulator",
          },
          {
            "PAYMENT-RESPONSE": paymentResponse,
          },
        ),
      );
    const adapter = new QOptX402Adapter(mockFetch);
    const quote = await adapter.quote(endpoint, problem, policy);
    const paid = await adapter.submitPaid(endpoint, problem, quote, "demo-payment-signature");

    expect(paid.result.status).toBe("completed");
    expect(paid.result.backendType).toBe("mock-quantum-simulator");
    expect(paid.paymentResponse).toEqual({
      success: true,
      transaction: "offline-demo",
      network: policy.expectedNetwork,
    });
  });
});

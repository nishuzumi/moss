import { describe, expect, it } from "vitest";

import { decodePaymentRequired, decodePaymentResponse, encodeBase64Json } from "../src/headers.js";

describe("headers", () => {
  it("encodes and decodes valid base64 json", () => {
    const encoded = encodeBase64Json({ hello: "world", count: 1 });
    const decoded = decodePaymentRequired(encoded);

    expect(decoded).toEqual({ hello: "world", count: 1 });
  });

  it("rejects invalid base64 payload", () => {
    expect(() => decodePaymentRequired("%%%not-base64%%%")).toThrow(
      "Invalid Base64-encoded x402 JSON header",
    );
  });

  it("rejects invalid json payload", () => {
    const invalidJson = Buffer.from("not-json", "utf8").toString("base64");

    expect(() => decodePaymentRequired(invalidJson)).toThrow(
      "Invalid Base64-encoded x402 JSON header",
    );
  });

  it("parses payment response header", () => {
    const encoded = encodeBase64Json({ success: true, tx: "0xabc" });

    expect(decodePaymentResponse(encoded)).toEqual({
      success: true,
      tx: "0xabc",
    });
  });
});

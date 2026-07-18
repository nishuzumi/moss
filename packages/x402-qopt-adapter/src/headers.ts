function decodeBase64Json(value: string): unknown {
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    throw new Error("Invalid Base64-encoded x402 JSON header");
  }
}

export function encodeBase64Json(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

export function decodePaymentRequired(value: string): unknown {
  return decodeBase64Json(value);
}

export function decodePaymentResponse(value: string): unknown {
  return decodeBase64Json(value);
}

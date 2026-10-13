import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Hex, keccak256 } from "viem";
import { describe, expect, it } from "vitest";
import { generate, generateState } from "../scripts/abis.js";
import { REVIEWED_ORDERBOOK_CODE_HASH, REVIEWED_ORDERBOOK_PROXY_HASH } from "../src/deployment.js";
import { requiredOrderbookSurface } from "./required-surface.js";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// The provenance chain, enforced: the committed generated TS must be exactly
// what the deterministic generator derives from the committed abis-src/.
// Fails on: hand-edits to src/abis/kuru.ts, generator edits without
// `pnpm gen:abis`, abis-src/ edits without regeneration.
describe("abi provenance chain", () => {
  it("src/abis/kuru.ts derives byte-for-byte from abis-src/", () => {
    const committed = readFileSync(join(packageRoot, "src", "abis", "kuru.ts"), "utf8");
    expect(committed).toBe(generate(packageRoot));
  });
});

describe("state ABI provenance", () => {
  it("retains the complete official artifact and derives its full OrderBook export", () => {
    const vendor = JSON.parse(
      readFileSync(join(packageRoot, "abis-src/ts-sdk/VENDOR.json"), "utf8"),
    );
    expect(vendor.commit).toMatch(/^[0-9a-f]{40}$/);
    const source = readFileSync(join(packageRoot, "abis-src/ts-sdk", vendor.file));
    expect(createHash("sha256").update(source).digest("hex")).toBe(vendor.fileSha256);
    expect(readFileSync(join(packageRoot, "src/abis/kuru-state.ts"), "utf8")).toBe(
      generateState(packageRoot),
    );
  });
});

it("records the reviewed runtime and every required trading/Receipt selector or topic", () => {
  const code = readFileSync(
    join(packageRoot, "test/fixtures/orderbook-runtime.hex"),
    "utf8",
  ).trim() as Hex;
  expect(keccak256(code)).toBe(REVIEWED_ORDERBOOK_CODE_HASH);
  for (const item of requiredOrderbookSurface) expect(code, item.name).toContain(item.hex);
});

it("records the reviewed delegation proxy runtime", () => {
  const code = readFileSync(
    join(packageRoot, "test/fixtures/orderbook-proxy.hex"),
    "utf8",
  ).trim() as Hex;
  expect(keccak256(code)).toBe(REVIEWED_ORDERBOOK_PROXY_HASH);
});

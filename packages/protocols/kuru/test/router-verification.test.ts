import { readFileSync } from "node:fs";
import { fetchAbi } from "@themoss/abi-tools";
import { type Hex, keccak256 } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVIEWED_ROUTER,
  type RouterVerification,
  verifyRouter,
} from "../scripts/verify-router.js";
import { KuruRouterAbi } from "../src/abis/kuru.js";
import { requiredRouterSurface } from "./required-surface.js";

vi.mock("@themoss/abi-tools", async (original) => ({
  ...(await original<typeof import("@themoss/abi-tools")>()),
  fetchAbi: vi.fn(),
}));

const router: RouterVerification = JSON.parse(
  readFileSync(new URL("../abis.json", import.meta.url), "utf8"),
).router;
const code = {
  proxy: readFileSync(
    new URL("./fixtures/orderbook-proxy.hex", import.meta.url),
    "utf8",
  ).trim() as Hex,
  implementation: readFileSync(
    new URL("./fixtures/router-runtime.hex", import.meta.url),
    "utf8",
  ).trim() as Hex,
};

beforeEach(() => {
  vi.mocked(fetchAbi).mockReset();
});

describe("explicit Router verification", () => {
  it("binds the reviewed deployment to complete runtime fingerprints and required surface", async () => {
    expect(router.verification).toBe("deployment-evidence");
    expect(keccak256(code.proxy)).toBe(REVIEWED_ROUTER.proxyCodeHash);
    expect(keccak256(code.implementation)).toBe(REVIEWED_ROUTER.implementationCodeHash);
    for (const item of requiredRouterSurface)
      expect(code.implementation, item.name).toContain(item.hex);
    await expect(verifyRouter(router, code, undefined)).resolves.toBeUndefined();
    expect(fetchAbi).not.toHaveBeenCalled();
  });

  it.each([
    "proxy",
    "implementation",
  ] as const)("rejects %s bytecode drift or missing code", async (field) => {
    for (const value of [undefined, "0x", `${code[field]}00`] as const) {
      await expect(verifyRouter(router, { ...code, [field]: value }, undefined)).rejects.toThrow(
        "runtime changed",
      );
    }
    expect(fetchAbi).not.toHaveBeenCalled();
  });

  it.each([
    "proxy",
    "implementation",
  ] as const)("rejects an unreviewed %s address in evidence mode", async (field) => {
    await expect(
      verifyRouter(
        { ...router, [field]: "0x0000000000000000000000000000000000000001" },
        code,
        undefined,
      ),
    ).rejects.toThrow("reviewed Router addresses");
    expect(fetchAbi).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "auto",
    "deployment",
    "EXPLORER",
  ])("rejects unknown mode %j", async (verification) => {
    await expect(verifyRouter({ ...router, verification }, code, "unused")).rejects.toThrow(
      "Unknown Router verification mode",
    );
    expect(fetchAbi).not.toHaveBeenCalled();
  });

  it("requires an explorer key even when the runtime has reviewed fingerprints", async () => {
    await expect(
      verifyRouter({ ...router, verification: "explorer" }, code, undefined),
    ).rejects.toThrow("MONADSCAN_API_KEY");
    expect(fetchAbi).not.toHaveBeenCalled();
  });

  it("retains full explorer comparison for an explicitly selected other deployment", async () => {
    vi.mocked(fetchAbi).mockResolvedValue([...KuruRouterAbi]);
    const other = {
      ...router,
      verification: "explorer",
      implementation: "0x0000000000000000000000000000000000000001" as const,
    };
    await expect(verifyRouter(other, code, "test-key")).resolves.toBeUndefined();
    expect(fetchAbi).toHaveBeenCalledWith(other.implementation, "test-key");
  });

  it("does not fall back when explorer retrieval fails", async () => {
    const error = new Error("unverified source / provider failure");
    vi.mocked(fetchAbi).mockRejectedValue(error);
    await expect(
      verifyRouter({ ...router, verification: "explorer" }, code, "test-key"),
    ).rejects.toThrow(error);
  });

  it("does not fall back when the explorer ABI differs", async () => {
    vi.mocked(fetchAbi).mockResolvedValue([]);
    await expect(
      verifyRouter({ ...router, verification: "explorer" }, code, "test-key"),
    ).rejects.toThrow("Router ABI mismatch");
  });
});

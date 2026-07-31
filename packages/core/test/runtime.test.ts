import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntime, defaultRpcUrl, PUBLIC_RPC_URL } from "../src/runtime.js";

const ORIGINAL_RPC_URL = process.env.MOSS_RPC_URL;

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_RPC_URL === undefined) delete process.env.MOSS_RPC_URL;
  else process.env.MOSS_RPC_URL = ORIGINAL_RPC_URL;
});

function mockChainId(chainId: number) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const request = JSON.parse(String(init?.body)) as { id: number };
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: request.id, result: `0x${chainId.toString(16)}` }),
      { headers: { "content-type": "application/json" } },
    );
  });
}

describe("createRuntime", () => {
  it("accepts Monad mainnet chain ID 143", async () => {
    mockChainId(143);
    await expect(createRuntime({ rpcUrl: "http://rpc.test" })).resolves.toMatchObject({
      rpcUrl: "http://rpc.test",
    });
  });

  it("rejects every other chain ID", async () => {
    mockChainId(1);
    await expect(createRuntime({ rpcUrl: "http://rpc.test" })).rejects.toThrow(
      "requires Monad mainnet chain ID 143; RPC reported 1",
    );
  });

  it("applies the default endpoint when no argument is given", async () => {
    mockChainId(143);
    process.env.MOSS_RPC_URL = "http://configured.test";
    await expect(createRuntime()).resolves.toMatchObject({ rpcUrl: "http://configured.test" });
  });
});

describe("defaultRpcUrl", () => {
  it("uses MOSS_RPC_URL when it names an endpoint", () => {
    process.env.MOSS_RPC_URL = "https://rpc.private.test/key";
    expect(defaultRpcUrl()).toBe("https://rpc.private.test/key");
  });

  it("reads the variable per call, not once at module load", () => {
    process.env.MOSS_RPC_URL = "https://first.test";
    expect(defaultRpcUrl()).toBe("https://first.test");
    process.env.MOSS_RPC_URL = "https://second.test";
    expect(defaultRpcUrl()).toBe("https://second.test");
  });

  it("uses the public endpoint when MOSS_RPC_URL is unset", () => {
    delete process.env.MOSS_RPC_URL;
    expect(defaultRpcUrl()).toBe(PUBLIC_RPC_URL);
  });

  // A workflow forwarding a secret sets this to "" wherever the secret is
  // unavailable, which is every fork pull request.
  it.each(["", "   "])("treats a blank MOSS_RPC_URL (%j) as unset", (blank) => {
    process.env.MOSS_RPC_URL = blank;
    expect(defaultRpcUrl()).toBe(PUBLIC_RPC_URL);
  });

  // Falling back here would hide the mistake behind a transport error later.
  it.each([
    "undefined",
    "null",
    "https://",
    "rpc.monad.xyz",
  ])("rejects a non-blank MOSS_RPC_URL that is not a URL (%j)", (bad) => {
    process.env.MOSS_RPC_URL = bad;
    expect(() => defaultRpcUrl()).toThrow(`MOSS_RPC_URL is not a URL: ${bad}`);
  });

  it("rejects a URL that is not http or https", () => {
    process.env.MOSS_RPC_URL = "ws://rpc.test";
    expect(() => defaultRpcUrl()).toThrow("MOSS_RPC_URL must be http or https, got ws:");
  });
});

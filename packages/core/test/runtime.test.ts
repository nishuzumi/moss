import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntime, DEFAULT_RPC_URL, PUBLIC_RPC_URL } from "../src/runtime.js";

afterEach(() => vi.restoreAllMocks());

/**
 * Re-imports the module so the `DEFAULT_RPC_URL` computed at load time reflects
 * `MOSS_RPC_URL` as given here.
 */
async function resolveDefault(value: string | undefined) {
  const previous = process.env.MOSS_RPC_URL;
  if (value === undefined) delete process.env.MOSS_RPC_URL;
  else process.env.MOSS_RPC_URL = value;
  vi.resetModules();
  try {
    const fresh = await import("../src/runtime.js");
    return fresh.DEFAULT_RPC_URL;
  } finally {
    if (previous === undefined) delete process.env.MOSS_RPC_URL;
    else process.env.MOSS_RPC_URL = previous;
  }
}

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

  // Asserted against DEFAULT_RPC_URL rather than the public endpoint, because CI
  // sets MOSS_RPC_URL and the point here is only that the default is applied.
  it("falls back to the resolved default when no argument is given", async () => {
    mockChainId(143);
    await expect(createRuntime()).resolves.toMatchObject({ rpcUrl: DEFAULT_RPC_URL });
  });
});

describe("DEFAULT_RPC_URL", () => {
  it("uses MOSS_RPC_URL when it names an endpoint", async () => {
    await expect(resolveDefault("https://rpc.private.test/key")).resolves.toBe(
      "https://rpc.private.test/key",
    );
  });

  it("uses the public endpoint when MOSS_RPC_URL is unset", async () => {
    await expect(resolveDefault(undefined)).resolves.toBe(PUBLIC_RPC_URL);
  });

  // A workflow forwarding a secret sets this to "" wherever the secret is
  // unavailable, which is every fork pull request.
  it.each(["", "   "])("treats a blank MOSS_RPC_URL (%j) as unset", async (blank) => {
    await expect(resolveDefault(blank)).resolves.toBe(PUBLIC_RPC_URL);
  });
});

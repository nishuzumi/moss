import { afterEach, describe, expect, it, vi } from "vitest";
import { createRuntime } from "../src/runtime.js";

afterEach(() => vi.restoreAllMocks());

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
});

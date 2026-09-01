import { describe, expect, it } from "vitest";
import { FetchAbiError, fetchAbi, isAbi, redactSecret } from "../src/fetch-abi.js";
import { ABI, ADDRESS, ENCODED_SPECIAL_KEY, KEY, response, SPECIAL_KEY } from "./helpers.js";

const okBody = { status: "1", message: "OK", result: JSON.stringify(ABI) };

function fetchStub(body: unknown, status = 200): typeof fetch {
  return async () => response(body, status);
}

async function kindOf(promise: Promise<unknown>): Promise<FetchAbiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(FetchAbiError);
    return error as FetchAbiError;
  }
  throw new Error("expected fetchAbi to reject");
}

describe("fetchAbi", () => {
  it("calls the official Etherscan V2 endpoint and returns the parsed ABI", async () => {
    let requestUrl = "";
    const abi = await fetchAbi(ADDRESS, KEY, {
      fetch: async (input) => {
        requestUrl = String(input);
        return response(okBody);
      },
    });

    expect(abi).toEqual(ABI);
    const url = new URL(requestUrl);
    expect(url.origin + url.pathname).toBe("https://api.etherscan.io/v2/api");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      chainid: "143",
      module: "contract",
      action: "getabi",
      address: ADDRESS,
      apikey: KEY,
    });
  });

  it("rejects invalid input before any network request", async () => {
    for (const [address, key] of [
      ["not-an-address", KEY],
      [ADDRESS, ""],
    ] as const) {
      let fetched = false;
      const error = await kindOf(
        fetchAbi(address, key, {
          fetch: async () => {
            fetched = true;
            return response(okBody);
          },
        }),
      );
      expect(error.kind).toBe("invalid-input");
      expect(fetched).toBe(false);
    }
  });

  it("classifies network and HTTP failures", async () => {
    const network = await kindOf(
      fetchAbi(ADDRESS, KEY, {
        fetch: async () => {
          throw new Error("offline");
        },
      }),
    );
    expect(network.kind).toBe("network");
    expect(network.message).toMatch(/network failure.*offline/);

    const http = await kindOf(fetchAbi(ADDRESS, KEY, { fetch: fetchStub("unavailable", 503) }));
    expect(http.kind).toBe("http");
    expect(http.message).toMatch(/HTTP 503/);
  });

  it.each([
    [
      "API refusal",
      { status: "0", message: "NOTOK", result: "Contract source code not verified" },
      "api-refused",
      /Contract source code not verified/,
    ],
    ["non-JSON body", "not json", "invalid-response", /non-JSON body/],
    ["null envelope", null, "invalid-response", /invalid API envelope/],
    ["array envelope", [1], "invalid-response", /invalid API envelope/],
    ["envelope without status", {}, "invalid-response", /invalid API envelope/],
    [
      "numeric status",
      { status: 0, message: "NOTOK", result: "x" },
      "invalid-response",
      /invalid API envelope/,
    ],
    [
      "non-string result",
      { status: "1", message: "OK", result: [] },
      "invalid-response",
      /non-string result/,
    ],
    [
      "malformed ABI JSON",
      { status: "1", message: "OK", result: "{x" },
      "invalid-response",
      /malformed ABI JSON/,
    ],
    [
      "non-array ABI",
      { status: "1", message: "OK", result: JSON.stringify({ type: "function" }) },
      "invalid-response",
      /is not an ABI array/,
    ],
    [
      "invalid ABI item",
      { status: "1", message: "OK", result: JSON.stringify([{ type: "function", name: "f" }]) },
      "invalid-response",
      /invalid ABI item/,
    ],
  ])("rejects %s", async (_name, body, kind, message) => {
    const error = await kindOf(fetchAbi(ADDRESS, KEY, { fetch: fetchStub(body) }));
    expect(error.kind).toBe(kind);
    expect(error.message).toMatch(message);
  });

  it("redacts raw and URL-encoded API keys from every failure", async () => {
    const failures = [
      fetchAbi(ADDRESS, SPECIAL_KEY, {
        fetch: async () => {
          throw new Error(`request failed for apikey=${ENCODED_SPECIAL_KEY} (${SPECIAL_KEY})`);
        },
      }),
      fetchAbi(ADDRESS, SPECIAL_KEY, {
        fetch: fetchStub({ status: "0", message: "NOTOK", result: `bad key ${SPECIAL_KEY}` }),
      }),
    ];
    for (const failure of failures) {
      const error = await kindOf(failure);
      expect(error.message).not.toContain(SPECIAL_KEY);
      expect(error.message).not.toContain(ENCODED_SPECIAL_KEY);
      expect(error.message).toContain("[REDACTED]");
    }
  });
});

describe("isAbi", () => {
  it("accepts the standard item kinds with their declared optional members", () => {
    expect(
      isAbi([
        ...ABI,
        {
          type: "event",
          name: "Transfer",
          anonymous: false,
          inputs: [{ name: "from", type: "address", indexed: true }],
        },
        { type: "error", name: "Denied", inputs: [{ type: "address" }] },
        { type: "constructor", stateMutability: "nonpayable", inputs: [] },
        { type: "fallback", stateMutability: "payable", payable: true, inputs: [] },
        { type: "receive", stateMutability: "payable" },
        {
          type: "function",
          name: "nested",
          stateMutability: "view",
          constant: true,
          gas: 30000,
          inputs: [{ type: "tuple", components: [{ type: "uint256", internalType: "uint256" }] }],
          outputs: [],
        },
      ]),
    ).toBe(true);
  });

  it.each([
    ["function without stateMutability or parameters", { type: "function", name: "f" }],
    [
      "legacy function without stateMutability",
      { type: "function", name: "f", inputs: [], outputs: [], constant: true, payable: false },
    ],
    [
      "function with a non-numeric gas",
      { type: "function", name: "f", inputs: [], outputs: [], stateMutability: "view", gas: "1" },
    ],
    ["view constructor", { type: "constructor", stateMutability: "view", inputs: [] }],
    ["pure fallback", { type: "fallback", stateMutability: "pure" }],
    ["nonpayable receive", { type: "receive", stateMutability: "nonpayable" }],
    [
      "fallback with parameters",
      { type: "fallback", stateMutability: "payable", inputs: [{ type: "bytes" }] },
    ],
    [
      "event with a non-boolean indexed flag",
      { type: "event", name: "E", inputs: [{ type: "address", indexed: "yes" }] },
    ],
    [
      "parameter with a non-string name",
      { type: "error", name: "E", inputs: [{ type: "address", name: 5 }] },
    ],
    ["unknown item kind", { type: "mystery" }],
    ["string item", "function f()"],
  ])("rejects %s", (_name, item) => {
    expect(isAbi([item])).toBe(false);
  });

  it("rejects non-arrays", () => {
    expect(isAbi({})).toBe(false);
  });
});

describe("redactSecret", () => {
  it("replaces raw and encoded forms and tolerates an empty secret", () => {
    expect(redactSecret(`x ${SPECIAL_KEY} y ${ENCODED_SPECIAL_KEY}`, SPECIAL_KEY)).toBe(
      "x [REDACTED] y [REDACTED]",
    );
    expect(redactSecret("unchanged", "")).toBe("unchanged");
  });

  it("covers keys whose two URL encodings differ and regex special characters", () => {
    const key = "se cret+key$[";
    const percentEncoded = encodeURIComponent(key); // se%20cret%2Bkey%24%5B
    const formEncoded = new URLSearchParams({ s: key }).toString().slice("s=".length); // se+cret%2Bkey%24%5B
    expect(percentEncoded).not.toBe(formEncoded);
    const redacted = redactSecret(`a ${key} b ${percentEncoded} c ${formEncoded}`, key);
    expect(redacted).not.toContain(key);
    expect(redacted).not.toContain(percentEncoded);
    expect(redacted).not.toContain(formEncoded);
    expect(redacted).toBe("a [REDACTED] b [REDACTED] c [REDACTED]");
  });
});

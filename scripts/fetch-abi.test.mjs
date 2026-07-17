import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "./fetch-abi.mjs";

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const KEY = "secret-monadscan-key";
const NOW = new Date("2026-07-17T00:00:00.000Z");
const SAMPLE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
];

test("fetches a verified ABI and emits deterministic TypeScript to stdout", async () => {
  const calls = [];
  const result = await run({
    fetchImpl: async (url) => {
      calls.push(url);
      return ok({ status: "1", message: "OK", result: JSON.stringify(SAMPLE_ABI) });
    },
  });

  assert.equal(result.code, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /ABI origin: explorer \(ADR 0007\)/);
  assert.match(result.stdout, new RegExp(`https://monadscan.com/address/${ADDRESS}`));
  assert.match(result.stdout, /Etherscan API V2 Get Contract ABI, chainid 143/);
  assert.match(result.stdout, /retrieved: 2026-07-17/);
  assert.match(result.stdout, /export const KuruRouterAbi = \[/);
  assert.match(result.stdout, /"balanceOf"/);
  assert.match(result.stdout, / as const;\n$/);

  const url = calls[0];
  assert.equal(url.origin + url.pathname, "https://api.etherscan.io/v2/api");
  assert.equal(url.searchParams.get("chainid"), "143");
  assert.equal(url.searchParams.get("module"), "contract");
  assert.equal(url.searchParams.get("action"), "getabi");
  assert.equal(url.searchParams.get("address"), ADDRESS);
  assert.equal(url.searchParams.get("apikey"), KEY);
});

test("rejects an invalid address before making a network request", async () => {
  let called = false;
  const result = await run({
    argv: ["0xabc", "KuruRouter"],
    fetchImpl: async () => {
      called = true;
      return ok({});
    },
  });
  assert.equal(called, false);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /20-byte/);
});

test("rejects an invalid export base name before making a network request", async () => {
  let called = false;
  const result = await run({
    argv: [ADDRESS, "123Router"],
    fetchImpl: async () => {
      called = true;
      return ok({});
    },
  });
  assert.equal(called, false);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /valid TypeScript identifier/);
});

test("requires MONADSCAN_API_KEY", async () => {
  const result = await run({ env: {}, fetchImpl: async () => ok({}) });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /missing MONADSCAN_API_KEY/);
});

test("reports HTTP failures without leaking the API key", async () => {
  const result = await run({
    fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }),
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /HTTP 500/);
  assert.doesNotMatch(result.stderr, new RegExp(KEY));
});

test("reports API failure envelopes without emitting TypeScript", async () => {
  const result = await run({
    fetchImpl: async () => ok({ status: "0", message: "NOTOK", result: "Missing/Invalid API Key" }),
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /did not return a verified ABI/);
});

test("rejects malformed ABI JSON", async () => {
  const result = await run({
    fetchImpl: async () => ok({ status: "1", message: "OK", result: "not json" }),
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /not valid JSON/);
});

test("rejects ABI results that are not arrays", async () => {
  const result = await run({
    fetchImpl: async () => ok({ status: "1", message: "OK", result: JSON.stringify({}) }),
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /ABI array/);
});

test("redacts the API key from network error messages", async () => {
  const result = await run({
    fetchImpl: async () => {
      throw new Error(`request failed with ${KEY}`);
    },
  });
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /\[REDACTED\]/);
  assert.doesNotMatch(result.stderr, new RegExp(KEY));
});

async function run({
  argv = [ADDRESS, "KuruRouter"],
  env = { MONADSCAN_API_KEY: KEY },
  fetchImpl,
} = {}) {
  let stdout = "";
  let stderr = "";
  const code = await runCli({
    argv,
    env,
    fetchImpl,
    now: NOW,
    stdout: { write: (chunk) => (stdout += chunk) },
    stderr: { write: (chunk) => (stderr += chunk) },
  });
  return { code, stdout, stderr };
}

function ok(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

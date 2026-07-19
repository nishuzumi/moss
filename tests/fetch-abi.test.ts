/**
 * Tests for scripts/fetch-abi-logic.mjs.
 *
 * The CLI behaviour is a thin wrapper around the exported `run(argv, env, deps)`.
 * Tests exercise `run` directly with dependency injection (mocked `fetch` and
 * in-memory sinks for stdout / stderr) so no real network access or real API
 * key is needed — CI remains deterministic, per the testing decisions in #28.
 */
import { describe, expect, it, vi } from "vitest";
import {
  EXIT_API,
  EXIT_INPUT,
  EXIT_OK,
  fetchABI,
  formatABI,
  formatProxyWarning,
  looksLikeProxyAbi,
  run,
  validateAddress,
  validateExportName,
} from "../scripts/fetch-abi-logic.mjs";

const TEST_ADDRESS = "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A";
const TEST_KEY = "test-monadscan-api-key-DO-NOT-USE";

/** Build an in-memory sink that records every write. */
function makeSink(): { write: (s: string) => boolean; text: () => string } {
  const chunks: string[] = [];
  return {
    write(chunk: string) {
      chunks.push(chunk);
      return true;
    },
    text() {
      return chunks.join("");
    },
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function successEnvelope(abi: unknown): unknown {
  return { status: "1", message: "OK", result: JSON.stringify(abi) };
}

function failureEnvelope(message: string, result: unknown = null): unknown {
  return { status: "0", message, result };
}

const SAMPLE_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
];

/** Minimal EIP-1967 proxy ABI (constructor + Upgraded event + errors + fallback). */
const PROXY_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "implementation", type: "address" },
      { name: "admin_", type: "address" },
      { name: "data", type: "bytes" },
    ],
    stateMutability: "payable",
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [{ name: "implementation", type: "address", indexed: true }],
    anonymous: false,
  },
  {
    type: "error",
    name: "ERC1967InvalidImplementation",
    inputs: [{ name: "implementation", type: "address" }],
  },
  {
    type: "error",
    name: "AddressEmptyCode",
    inputs: [{ name: "target", type: "address" }],
  },
  { type: "fallback", stateMutability: "payable" },
];

describe("validateAddress", () => {
  it("accepts lowercase 20-byte hex", () => {
    expect(() => validateAddress("0x1234567890123456789012345678901234567890")).not.toThrow();
  });
  it("accepts checksummed mixed-case", () => {
    expect(() => validateAddress(TEST_ADDRESS)).not.toThrow();
  });
  it("rejects missing 0x prefix", () => {
    expect(() => validateAddress("1234567890123456789012345678901234567890")).toThrow(
      /address must match/,
    );
  });
  it("rejects wrong length", () => {
    expect(() => validateAddress("0x1234")).toThrow(/address must match/);
  });
  it("rejects non-string", () => {
    expect(() => validateAddress(undefined as unknown as string)).toThrow(/address must match/);
  });
});

describe("validateExportName", () => {
  it("accepts valid identifier", () => {
    expect(() => validateExportName("KuruRouter")).not.toThrow();
  });
  it("accepts _ and $ prefixes", () => {
    expect(() => validateExportName("_private")).not.toThrow();
    expect(() => validateExportName("$dollar")).not.toThrow();
  });
  it("rejects leading digit", () => {
    expect(() => validateExportName("123abc")).toThrow(/exportName/);
  });
  it("rejects special chars", () => {
    expect(() => validateExportName("foo-bar")).toThrow(/exportName/);
  });
});

describe("fetchABI (low-level)", () => {
  it("returns the parsed ABI array on success", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope(SAMPLE_ABI)));
    const abi = await fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch);
    expect(abi).toEqual(SAMPLE_ABI);
    expect(Array.isArray(abi)).toBe(true);
  });

  it("sends chainid=143, module=contract, action=getabi to Etherscan V2", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope([])));
    await fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch);
    const calledUrl = fetchImpl.mock.calls[0][0] as URL;
    expect(calledUrl.toString()).toContain("https://api.etherscan.io/v2/api");
    expect(calledUrl.searchParams.get("chainid")).toBe("143");
    expect(calledUrl.searchParams.get("module")).toBe("contract");
    expect(calledUrl.searchParams.get("action")).toBe("getabi");
    expect(calledUrl.searchParams.get("address")).toBe(TEST_ADDRESS);
    expect(calledUrl.searchParams.get("apikey")).toBe(TEST_KEY);
  });

  it("honors the baseOverride parameter (MONADSCAN_API_URL)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope([])));
    await fetchABI(
      TEST_ADDRESS,
      TEST_KEY,
      fetchImpl as unknown as typeof fetch,
      "http://localhost:9999/api",
    );
    const calledUrl = fetchImpl.mock.calls[0][0] as URL;
    expect(calledUrl.origin).toBe("http://localhost:9999");
  });

  it("throws HTTP error on non-2xx", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, "upstream blew up"));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/HTTP 503/);
  });

  it("throws a network-failure error that does not contain the URL or key", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.etherscan.io"));
    let err: Error | undefined;
    try {
      await fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch);
    } catch (e) {
      err = e as Error;
    }
    expect(err?.message).toMatch(/network failure/);
    expect(err?.message).not.toContain(TEST_KEY);
    expect(err?.message).not.toContain("apikey=");
  });

  it("throws on non-JSON body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("not json", { status: 200 }));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/non-JSON body/);
  });

  it("throws on API envelope failure (unverified contract)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, failureEnvelope("Contract source code not verified")));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/Contract source code not verified/);
  });

  it("throws on API envelope failure with NOTOK rate-limit message", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, failureEnvelope("NOTOK", "rate limit exceeded")));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/rate limit exceeded/);
  });

  it("throws when result is not a string (object returned directly)", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: "1", message: "OK", result: SAMPLE_ABI }));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/non-string 'result'/);
  });

  it("throws on malformed result JSON", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: "1", message: "OK", result: "{not json" }));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/malformed JSON/);
  });

  it("throws when result parses to a non-array", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, successEnvelope({ not: "array" })));
    await expect(
      fetchABI(TEST_ADDRESS, TEST_KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow(/expected an ABI array/);
  });
});

describe("formatABI", () => {
  it("produces the explorer-origin header + `as const` export", () => {
    const out = formatABI(SAMPLE_ABI, "Test", TEST_ADDRESS, "2026-07-14");
    expect(out).toContain("// GENERATED FILE — do not edit by hand.");
    expect(out).toContain("// ABI origin: explorer (ADR 0007)");
    expect(out).toContain(`//   source:    https://monadscan.com/address/${TEST_ADDRESS}`);
    expect(out).toContain(
      "//   endpoint:  Etherscan V2 (chainid=143, module=contract, action=getabi)",
    );
    expect(out).toContain("//   retrieved: 2026-07-14 (UTC)");
    expect(out).toContain("export const TestAbi =");
    expect(out).toContain("as const;");
    expect(out).toContain('"transfer"');
    expect(out.trimEnd().endsWith("as const;")).toBe(true);
  });

  it("emits an empty ABI as `[]`", () => {
    const out = formatABI([], "Empty", TEST_ADDRESS, "2026-07-14");
    expect(out).toContain("export const EmptyAbi = [] as const;");
  });

  it("is deterministic for identical input", () => {
    const a = formatABI(SAMPLE_ABI, "T", TEST_ADDRESS, "2026-07-14");
    const b = formatABI(SAMPLE_ABI, "T", TEST_ADDRESS, "2026-07-14");
    expect(a).toBe(b);
  });
});

describe("looksLikeProxyAbi", () => {
  it("returns true for a minimal EIP-1967 proxy ABI (0 functions + Upgraded + fallback)", () => {
    expect(looksLikeProxyAbi(PROXY_ABI)).toBe(true);
  });

  it("returns false for a normal protocol ABI with functions", () => {
    expect(looksLikeProxyAbi(SAMPLE_ABI)).toBe(false);
  });

  it("returns false for an empty ABI", () => {
    expect(looksLikeProxyAbi([])).toBe(false);
  });

  it("returns false when there is an Upgraded event but no fallback", () => {
    const noFallback = PROXY_ABI.filter((e) => e.type !== "fallback");
    expect(looksLikeProxyAbi(noFallback)).toBe(false);
  });

  it("returns false when there is a fallback but no Upgraded event", () => {
    const noUpgraded = PROXY_ABI.filter((e) => !(e.type === "event" && e.name === "Upgraded"));
    expect(looksLikeProxyAbi(noUpgraded)).toBe(false);
  });

  it("returns true even with 1 function (edge case: proxy with upgradeTo)", () => {
    const proxyWithFn = [
      ...PROXY_ABI,
      {
        type: "function",
        name: "upgradeTo",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
      },
    ];
    expect(looksLikeProxyAbi(proxyWithFn)).toBe(true);
  });

  it("returns false when many functions are present even with Upgraded + fallback", () => {
    const manyFns = [
      ...PROXY_ABI,
      ...Array.from({ length: 5 }, (_, i) => ({
        type: "function",
        name: `fn${i}`,
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
      })),
    ];
    expect(looksLikeProxyAbi(manyFns)).toBe(false);
  });
});

describe("formatProxyWarning", () => {
  it("produces a friendly, terminal-friendly message with actionable steps", () => {
    const msg = formatProxyWarning(TEST_ADDRESS, "KuruRouter", PROXY_ABI);
    expect(msg).toContain("warning: this looks like a proxy contract's own ABI");
    expect(msg).toContain(TEST_ADDRESS);
    expect(msg).toContain("0 functions");
    expect(msg).toContain("Upgraded");
    expect(msg).toContain("cast implementation");
    expect(msg).toContain("KuruRouter");
    expect(msg).toContain("implementation-address");
  });

  it("keeps every line within 80 columns for terminal display", () => {
    const msg = formatProxyWarning(TEST_ADDRESS, "KuruRouter", PROXY_ABI);
    for (const line of msg.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(80);
    }
  });

  it("does not include the API key", () => {
    const msg = formatProxyWarning(TEST_ADDRESS, "KuruRouter", PROXY_ABI);
    expect(msg).not.toContain(TEST_KEY);
  });
});

describe("run() — CLI behavior", () => {
  it("emits origin-stamped TS on stdout for a verified contract; stderr empty; exit 0", async () => {
    const stdout = makeSink();
    const stderr = makeSink();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope(SAMPLE_ABI)));
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout,
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_OK);
    expect(stderr.text()).toBe("");
    const out = stdout.text();
    expect(out).toContain("// ABI origin: explorer (ADR 0007)");
    expect(out).toContain(`//   source:    https://monadscan.com/address/${TEST_ADDRESS}`);
    expect(out).toContain(
      "//   endpoint:  Etherscan V2 (chainid=143, module=contract, action=getabi)",
    );
    expect(out).toContain("export const wmonAbi =");
    expect(out).toContain('"transfer"');
    expect(out.trimEnd().endsWith("as const;")).toBe(true);
  });

  it("forwards chainid/module/action/address/apikey to the API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope([])));
    await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr: makeSink(),
      },
    );
    const u = fetchImpl.mock.calls[0][0] as URL;
    expect(u.searchParams.get("chainid")).toBe("143");
    expect(u.searchParams.get("module")).toBe("contract");
    expect(u.searchParams.get("action")).toBe("getabi");
    expect(u.searchParams.get("address")).toBe(TEST_ADDRESS);
    expect(u.searchParams.get("apikey")).toBe(TEST_KEY);
  });

  it("honors MONADSCAN_API_URL override", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope([])));
    await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY, MONADSCAN_API_URL: "http://localhost:9999/api" },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr: makeSink(),
      },
    );
    const u = fetchImpl.mock.calls[0][0] as URL;
    expect(u.origin).toBe("http://localhost:9999");
  });

  it("pins the retrieved date with --date YYYY-MM-DD", async () => {
    const stdout = makeSink();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope([])));
    const r = await run(
      [TEST_ADDRESS, "wmon", "--date", "2026-07-14"],
      { MONADSCAN_API_KEY: TEST_KEY },
      { fetch: fetchImpl as unknown as typeof fetch, stdout, stderr: makeSink() },
    );
    expect(r.exitCode).toBe(EXIT_OK);
    expect(stdout.text()).toContain("//   retrieved: 2026-07-14 (UTC)");
  });

  it("rejects an invalid --date value with exit 1", async () => {
    const stderr = makeSink();
    const r = await run(
      [TEST_ADDRESS, "wmon", "--date", "2026/07/15"],
      { MONADSCAN_API_KEY: TEST_KEY },
      { stdout: makeSink(), stderr },
    );
    expect(r.exitCode).toBe(EXIT_INPUT);
    expect(stderr.text()).toContain("--date expects YYYY-MM-DD");
  });

  it("prints help and exits 0 when -h is passed", async () => {
    const stdout = makeSink();
    const r = await run(["-h"], {}, { stdout, stderr: makeSink() });
    expect(r.exitCode).toBe(EXIT_OK);
    expect(stdout.text()).toContain("Usage:");
    expect(stdout.text()).toContain("--date YYYY-MM-DD");
  });

  it("prints help and exits 0 when --help is passed", async () => {
    const stdout = makeSink();
    const r = await run(["--help"], {}, { stdout, stderr: makeSink() });
    expect(r.exitCode).toBe(EXIT_OK);
    expect(stdout.text()).toContain("Usage:");
  });

  it("rejects a non-address positional arg with exit 1", async () => {
    const stderr = makeSink();
    const r = await run(
      ["not-an-address", "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_INPUT);
    expect(stderr.text()).toContain("address must match");
  });

  it("rejects a non-TS-identifier export name with exit 1", async () => {
    const stderr = makeSink();
    const r = await run(
      [TEST_ADDRESS, "1bad-name"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_INPUT);
    expect(stderr.text()).toContain("exportName must be a valid TS identifier");
  });

  it("rejects when fewer than 2 positional args are given with exit 1", async () => {
    const stderr = makeSink();
    const r = await run(
      [TEST_ADDRESS],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_INPUT);
    expect(stderr.text()).toContain("expected 2 positional args");
  });

  it("rejects unknown flags with exit 1", async () => {
    const stderr = makeSink();
    const r = await run(
      [TEST_ADDRESS, "wmon", "--bogus"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_INPUT);
    expect(stderr.text()).toContain("unknown flag: --bogus");
  });

  it("rejects when MONADSCAN_API_KEY is unset with exit 1 and actionable message", async () => {
    const stderr = makeSink();
    const r = await run([TEST_ADDRESS, "wmon"], {}, { stdout: makeSink(), stderr });
    expect(r.exitCode).toBe(EXIT_INPUT);
    expect(stderr.text()).toContain("MONADSCAN_API_KEY is not set");
    expect(stderr.text()).toContain("https://info.monadscan.com/myapikey/");
  });

  it("reports HTTP failure with exit 2", async () => {
    const stderr = makeSink();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(503, "upstream"));
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_API);
    expect(stderr.text()).toContain("HTTP 503");
  });

  it("reports API envelope failure with exit 2", async () => {
    const stderr = makeSink();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, failureEnvelope("NOTOK", "Contract source code not verified")),
      );
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_API);
    expect(stderr.text()).toContain("Contract source code not verified");
  });

  it("reports malformed JSON with exit 2", async () => {
    const stderr = makeSink();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { status: "1", message: "OK", result: "{not json" }));
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_API);
    expect(stderr.text()).toContain("malformed JSON");
  });

  it("reports a non-array result with exit 2", async () => {
    const stderr = makeSink();
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, successEnvelope({ not: "array" })));
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_API);
    expect(stderr.text()).toContain("expected an ABI array");
  });

  it("reports a network failure with exit 2", async () => {
    const stderr = makeSink();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND"));
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout: makeSink(),
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_API);
    expect(stderr.text()).toContain("network failure");
  });

  it("never emits the API key in stdout or stderr across every error path", async () => {
    // Force every error path to fire and assert the key value never leaks.
    const paths: {
      name: string;
      argv: string[];
      env: NodeJS.ProcessEnv;
      mock?: () => Promise<Response>;
    }[] = [
      {
        name: "bad address",
        argv: ["not-an-address", "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
      },
      { name: "bad name", argv: [TEST_ADDRESS, "1bad"], env: { MONADSCAN_API_KEY: TEST_KEY } },
      { name: "missing key", argv: [TEST_ADDRESS, "wmon"], env: {} },
      {
        name: "unknown flag",
        argv: [TEST_ADDRESS, "wmon", "--bogus"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
      },
      {
        name: "bad --date",
        argv: [TEST_ADDRESS, "wmon", "--date", "x"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
      },
      {
        name: "HTTP 503",
        argv: [TEST_ADDRESS, "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
        mock: () => Promise.resolve(jsonResponse(503, "err")),
      },
      {
        name: "API envelope failure",
        argv: [TEST_ADDRESS, "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
        mock: () => Promise.resolve(jsonResponse(200, failureEnvelope("NOTOK", "rate limit"))),
      },
      {
        name: "malformed JSON",
        argv: [TEST_ADDRESS, "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
        mock: () =>
          Promise.resolve(jsonResponse(200, { status: "1", message: "OK", result: "{bad" })),
      },
      {
        name: "non-array result",
        argv: [TEST_ADDRESS, "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
        mock: () => Promise.resolve(jsonResponse(200, successEnvelope({ not: "array" }))),
      },
      {
        name: "network failure",
        argv: [TEST_ADDRESS, "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
        mock: () => Promise.reject(new Error(`ENOTFOUND key=${TEST_KEY} leaked?`)),
      },
      {
        name: "non-JSON body",
        argv: [TEST_ADDRESS, "wmon"],
        env: { MONADSCAN_API_KEY: TEST_KEY },
        mock: () => Promise.resolve(new Response("not json", { status: 200 })),
      },
    ];

    for (const p of paths) {
      const stdout = makeSink();
      const stderr = makeSink();
      const fetchImpl = p.mock ? (vi.fn(p.mock) as unknown as typeof fetch) : undefined;
      await run(p.argv, p.env, { fetch: fetchImpl, stdout, stderr });
      const combined = `${stdout.text()}${stderr.text()}`;
      expect(combined).not.toContain(TEST_KEY);
    }
  });

  it("success path also does not leak the key", async () => {
    const stdout = makeSink();
    const stderr = makeSink();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope(SAMPLE_ABI)));
    await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout,
        stderr,
      },
    );
    expect(`${stdout.text()}${stderr.text()}`).not.toContain(TEST_KEY);
  });

  it("warns on stderr when the fetched ABI looks like a proxy, but still emits the ABI to stdout with exit 0", async () => {
    const stdout = makeSink();
    const stderr = makeSink();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope(PROXY_ABI)));
    const r = await run(
      [TEST_ADDRESS, "KuruRouter"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout,
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_OK);
    // ABI is still emitted to stdout — the warning is non-blocking
    const out = stdout.text();
    expect(out).toContain("export const KuruRouterAbi =");
    expect(out).toContain('"Upgraded"');
    // Warning goes to stderr, not stdout
    const err = stderr.text();
    expect(err).toContain("warning: this looks like a proxy contract's own ABI");
    expect(err).toContain("cast implementation");
    expect(err).toContain(TEST_ADDRESS);
    expect(err).toContain("KuruRouter");
    // stdout must not contain the warning
    expect(out).not.toContain("warning");
  });

  it("does not warn when the ABI is a normal protocol ABI", async () => {
    const stdout = makeSink();
    const stderr = makeSink();
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, successEnvelope(SAMPLE_ABI)));
    const r = await run(
      [TEST_ADDRESS, "wmon"],
      { MONADSCAN_API_KEY: TEST_KEY },
      {
        fetch: fetchImpl as unknown as typeof fetch,
        stdout,
        stderr,
      },
    );
    expect(r.exitCode).toBe(EXIT_OK);
    expect(stderr.text()).toBe("");
  });
});

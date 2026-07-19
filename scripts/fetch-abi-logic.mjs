/**
 * Core logic for the fetch-abi CLI tool.
 *
 * Implements the `explorer` ABI origin tier per ADR 0007 by calling the
 * official Etherscan V2 `getabi` endpoint with Monad mainnet chainid=143.
 *
 * Plain JavaScript (.mjs) so the CLI runs with the stock Node runtime —
 * no --experimental-strip-types, no root "type": "module", no new deps.
 *
 * The exported `run(argv, env, deps)` is pure: it returns a RunResult and
 * writes only to the injected `deps.stdout` / `deps.stderr`. The CLI
 * wrapper in fetch-abi.mjs calls `run()` and translates `exitCode` into
 * `process.exit`. Tests import `run()` directly with in-memory sinks
 * and a mocked `fetch`, so no real network and no real key are needed.
 */

const API_BASE = "https://api.etherscan.io/v2/api";
const CHAIN_ID = "143";
const MONADSCAN_CONTRACT_URL = "https://monadscan.com/address";

/** Exit codes: 0 success, 1 user/input error, 2 API/network error. */
export const EXIT_OK = 0;
export const EXIT_INPUT = 1;
export const EXIT_API = 2;

const USAGE = "Usage: pnpm fetch-abi <address> <exportName> [--date YYYY-MM-DD]";

const HELP = [
  "Fetch a verified contract ABI from Monadscan and emit it as a",
  "typed `export const <name>Abi = [...] as const` declaration.",
  "",
  USAGE,
  "",
  "Options:",
  "  --date YYYY-MM-DD  Pin the retrieval date in the header for a clean diff",
  "  -h, --help         Show this help",
  "",
  "Environment:",
  "  MONADSCAN_API_KEY   Required. Get one at https://info.monadscan.com/myapikey/",
  "  MONADSCAN_API_URL   Optional. Override the API base (defaults to Etherscan V2)",
  "",
  "Output:",
  "  stdout  generated TypeScript (success only)",
  "  stderr  diagnostics only (never the API key)",
  "",
  "Exit codes:",
  "  0  success",
  "  1  input error (bad address, bad name, missing key, ...)",
  "  2  API or network error",
  "",
  "Proxy contracts:",
  "  For EIP-1967 proxies, pass the IMPLEMENTATION address, not the proxy.",
  "  Monadscan's getabi returns the proxy's own minimal ABI (constructor +",
  "  `Upgraded` event + delegate fallback) for a proxy address, which is",
  "  useless for encoding calldata. Find the implementation via:",
  "    cast implementation <proxy-address>           # foundry",
  "    Monadscan 'Read as Proxy' tab                 # web UI",
  "  This tool does not merge proxy + implementation ABIs (issue #28 scope).",
  "",
  "Examples:",
  "  pnpm fetch-abi 0x3bd359C1...11e433A wmon",
  "  pnpm fetch-abi 0x1b81D678...213eB14 swapRouter02 --date 2026-07-14",
].join("\n");

/**
 * Strip the API key value from a string. Applied only to messages that
 * could plausibly contain the authenticated request URL — namely the
 * network-failure path in fetchABI, where the underlying fetch error
 * may embed the URL (key included). We never apply it to validation or
 * usage messages, because those are constructed solely from user input
 * and a short key (e.g. "x" in tests) would mangle normal words.
 */
function redactUrlAndKey(message, key) {
  if (!key) return message;
  // Replace any occurrence of the key value, then any URL that carries it.
  return message.split(key).join("[REDACTED]");
}

/** Validate a 20-byte hexadecimal contract address. */
export function validateAddress(addr) {
  if (typeof addr !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    throw new Error(`address must match ^0x[0-9a-fA-F]{40}$, got '${addr}'`);
  }
}

/** Validate a TypeScript export identifier. */
export function validateExportName(name) {
  if (typeof name !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
    throw new Error(`exportName must be a valid TS identifier, got '${name}'`);
  }
}

/** Build the authenticated Etherscan V2 request URL. */
function buildApiUrl(address, apiKey, baseOverride) {
  const base = baseOverride ?? API_BASE;
  const url = new URL(base);
  url.searchParams.set("chainid", CHAIN_ID);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey);
  return url;
}

/**
 * Low-level fetch. Exposed for unit tests that want to exercise the
 * network boundary directly. The CLI path goes through `run()` instead.
 *
 * @param {string} address - 20-byte hex contract address
 * @param {string} apiKey - MONADSCAN_API_KEY
 * @param {typeof fetch} [fetchImpl] - injectable fetch
 * @param {string} [baseOverride] - optional API base override
 * @returns {Promise<unknown[]>} parsed ABI array
 */
export async function fetchABI(address, apiKey, fetchImpl = fetch, baseOverride) {
  const url = buildApiUrl(address, apiKey, baseOverride);

  let res;
  try {
    res = await fetchImpl(url, { headers: { accept: "application/json" } });
  } catch (e) {
    // The underlying fetch error may embed the request URL (which carries
    // the key). Drop the original message entirely and emit a clean one.
    const reason = e instanceof Error ? e.message : String(e);
    throw new Error(
      `network failure fetching ABI for ${address}: ${redactUrlAndKey(reason, apiKey)}`,
    );
  }

  if (!res.ok) {
    throw new Error(`Monadscan API returned HTTP ${res.status} ${res.statusText} for ${address}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`Monadscan returned non-JSON body for ${address}`);
  }

  if (body.status !== "1") {
    const reason =
      body.message === "NOTOK"
        ? String(body.result ?? "unknown error")
        : (body.message ?? "unknown");
    throw new Error(
      `Monadscan API refused the request for ${address}: ${reason} (status="${body.status}")`,
    );
  }

  if (typeof body.result !== "string") {
    throw new Error(
      `Monadscan response for ${address} has a non-string 'result' field; expected a JSON-encoded ABI string`,
    );
  }

  let abi;
  try {
    abi = JSON.parse(body.result);
  } catch {
    throw new Error(`Monadscan returned malformed JSON for ${address}`);
  }

  if (!Array.isArray(abi)) {
    throw new Error(
      `Monadscan response for ${address} parsed to ${typeof abi}, expected an ABI array`,
    );
  }

  return abi;
}

/** Format the explorer-origin header per ADR 0007. */
export function formatHeader(address, retrievedDate) {
  return [
    "// GENERATED FILE — do not edit by hand.",
    "//   fetched via: pnpm fetch-abi",
    "// ABI origin: explorer (ADR 0007)",
    `//   source:    ${MONADSCAN_CONTRACT_URL}/${address}`,
    `//   endpoint:  Etherscan V2 (chainid=${CHAIN_ID}, module=contract, action=getabi)`,
    `//   retrieved: ${retrievedDate} (UTC)`,
    "",
  ].join("\n");
}

/** Format the full TypeScript output (header + `as const` export). */
export function formatABI(abi, exportName, address, retrievedDate) {
  return `${formatHeader(address, retrievedDate)}export const ${exportName}Abi = ${JSON.stringify(abi, null, 2)} as const;\n`;
}

/**
 * Heuristic: does this ABI look like an EIP-1967 proxy's own minimal ABI
 * rather than a usable implementation ABI? The proxy ABI is useless for
 * encoding calldata, so we warn the user when we detect it.
 *
 * Signal: very few functions + an `Upgraded` event + a fallback entry.
 * A real protocol ABI has many functions; an `Upgraded` event outside a
 * proxy context is extremely rare.
 */
export function looksLikeProxyAbi(abi) {
  const fns = abi.filter((e) => e?.type === "function");
  const hasUpgraded = abi.some((e) => e?.type === "event" && e?.name === "Upgraded");
  const hasFallback = abi.some((e) => e?.type === "fallback" || e?.type === "receive");
  return fns.length <= 1 && hasUpgraded && hasFallback;
}

/**
 * Format a friendly, terminal-friendly proxy-detection warning.
 * Written to stderr (non-blocking — the ABI is still emitted to stdout).
 */
export function formatProxyWarning(address, exportName, abi) {
  const fnCount = abi.filter((e) => e?.type === "function").length;
  const eventNames = abi
    .filter((e) => e?.type === "event")
    .map((e) => e.name)
    .filter(Boolean);
  const eventsStr = eventNames.length > 0 ? ` (${eventNames.join(", ")})` : "";
  return [
    "fetch-abi: warning: this looks like a proxy contract's own ABI",
    "",
    `  The ABI for ${address} has ${fnCount} function${fnCount === 1 ? "" : "s"},`,
    `  ${eventNames.length} event${eventNames.length === 1 ? "" : "s"}${eventsStr}, and a fallback entry`,
    "  — typical of an EIP-1967 proxy. This ABI cannot be used to encode calldata.",
    "",
    "  To get the implementation ABI instead:",
    "    1. Find the implementation address:",
    `       cast implementation ${address}`,
    "    2. Re-run fetch-abi with that address:",
    `       pnpm fetch-abi <implementation-address> ${exportName}`,
    "",
  ].join("\n");
}

/**
 * Parse argv into a positional {address, exportName} + optional --date.
 * Returns either { ok: true, ... } or { ok: false, message }.
 * Help flag is signalled via { ok: true, help: true }.
 */
function parseArgs(argv) {
  const positional = [];
  let dateOverride = null;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") {
      return { ok: true, help: true };
    }
    if (a === "--date") {
      const v = argv[++i];
      if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return { ok: false, message: `--date expects YYYY-MM-DD, got '${v ?? ""}'` };
      }
      dateOverride = v;
      continue;
    }
    if (a.startsWith("--")) {
      return { ok: false, message: `unknown flag: ${a}` };
    }
    positional.push(a);
  }

  if (positional.length !== 2) {
    return { ok: false, message: `expected 2 positional args, got ${positional.length}. ${USAGE}` };
  }

  const [address, exportName] = positional;
  try {
    validateAddress(address);
  } catch (err) {
    return { ok: false, message: err.message };
  }
  try {
    validateExportName(exportName);
  } catch (err) {
    return { ok: false, message: err.message };
  }

  return { ok: true, address, exportName, dateOverride };
}

/**
 * @typedef {Object} RunResult
 * @property {0|1|2} exitCode
 * @property {string} [stdout]
 * @property {string} [stderr]
 */

/**
 * Pure, testable runner. Returns instead of exiting. The CLI wrapper
 * translates `exitCode` into `process.exit`.
 *
 * @param {string[]} argv - arguments after the program name
 * @param {NodeJS.ProcessEnv} env - environment (reads MONADSCAN_API_KEY, MONADSCAN_API_URL)
 * @param {{ fetch?: typeof fetch, stdout?: { write: (s: string) => void }, stderr?: { write: (s: string) => void } }} [deps]
 * @returns {Promise<RunResult>}
 */
export async function run(argv, env, deps = {}) {
  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const out = deps.stdout ?? process.stdout;
  const err = deps.stderr ?? process.stderr;
  const writeErr = (msg) => err.write(`fetch-abi: ${msg}\n`);

  const key = env?.MONADSCAN_API_KEY;
  const apiBase = env?.MONADSCAN_API_URL;

  const parsed = parseArgs(argv);
  if (!parsed.ok) {
    // Validation/usage messages are built only from user input — never
    // redact them, since a short key (e.g. "x" in tests) would mangle
    // normal words like "exportName" or "expected".
    writeErr(parsed.message);
    return { exitCode: EXIT_INPUT, stderr: parsed.message };
  }

  if (parsed.help) {
    out.write(`${HELP}\n`);
    return { exitCode: EXIT_OK, stdout: `${HELP}\n` };
  }

  if (!key) {
    const msg =
      "MONADSCAN_API_KEY is not set. Get one at https://info.monadscan.com/myapikey/ and export it before running this command.";
    writeErr(msg);
    return { exitCode: EXIT_INPUT, stderr: msg };
  }

  const { address, exportName, dateOverride } = parsed;

  let abi;
  try {
    abi = await fetchABI(address, key, fetchImpl, apiBase);
  } catch (e) {
    // fetchABI already redacts any key leakage from the network layer;
    // its messages are safe to emit verbatim.
    const msg = e instanceof Error ? e.message : String(e);
    writeErr(msg);
    return { exitCode: EXIT_API, stderr: msg };
  }

  const retrievedDate = dateOverride ?? new Date().toISOString().slice(0, 10);
  const body = formatABI(abi, exportName, address, retrievedDate);
  out.write(body);

  // Non-blocking heuristic: warn if the fetched ABI looks like a proxy's
  // own minimal ABI. The ABI is still emitted to stdout (exit 0); the
  // warning goes to stderr so it doesn't corrupt the redirected output.
  let warning;
  if (looksLikeProxyAbi(abi)) {
    warning = formatProxyWarning(address, exportName, abi);
    err.write(warning);
  }

  return { exitCode: EXIT_OK, stdout: body, stderr: warning };
}

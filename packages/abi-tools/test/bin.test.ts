import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ABI, ADDRESS, ENCODED_SPECIAL_KEY, KEY, SPECIAL_KEY } from "./helpers.js";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const binPath = fileURLToPath(new URL("../src/bin.ts", import.meta.url));

// These process-level tests stub fetch inside the child; they never touch the
// network and must not be gated by MOSS_SKIP_E2E.
function callBin(
  args: string[],
  options: { body?: unknown; error?: string; key?: string; status?: number } = {},
) {
  const body = options.body ?? { status: "1", message: "OK", result: JSON.stringify(ABI) };
  const source = options.error
    ? `globalThis.fetch = async () => { throw new Error(${JSON.stringify(options.error)}); };`
    : `globalThis.fetch = async () => new Response(${JSON.stringify(
        typeof body === "string" ? body : JSON.stringify(body),
      )}, { status: ${options.status ?? 200} });`;
  const env: NodeJS.ProcessEnv = { ...process.env, MONADSCAN_API_KEY: options.key ?? KEY };
  if (options.key === "") delete env.MONADSCAN_API_KEY;
  return spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      `data:text/javascript,${encodeURIComponent(source)}`,
      binPath,
      ...args,
    ],
    { encoding: "utf8", env, cwd: packageRoot },
  );
}

describe("bin", () => {
  it("writes TypeScript to stdout and exits 0 on success", () => {
    const result = callBin([ADDRESS, "wmon"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/export const wmonAbi =/);
  });

  it("reports a missing key on stderr and exits 1", () => {
    const result = callBin([ADDRESS, "wmon"], { key: "" });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/MONADSCAN_API_KEY is not set/);
  });

  it("reports an API refusal on stderr and exits 2", () => {
    const result = callBin([ADDRESS, "wmon"], {
      body: { status: "0", message: "NOTOK", result: "Contract source code not verified" },
    });
    expect(result.status).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/Contract source code not verified/);
  });

  it("redacts the encoded API key from process stderr", () => {
    const result = callBin([ADDRESS, "wmon"], {
      key: SPECIAL_KEY,
      error: `https://api.etherscan.io/v2/api?apikey=${ENCODED_SPECIAL_KEY}`,
    });
    expect(result.status).toBe(2);
    expect(result.stderr).not.toContain(SPECIAL_KEY);
    expect(result.stderr).not.toContain(ENCODED_SPECIAL_KEY);
  });
});

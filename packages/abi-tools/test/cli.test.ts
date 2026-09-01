import { describe, expect, it } from "vitest";
import { type RunResult, run } from "../src/cli.js";
import { ABI, ADDRESS, ENCODED_SPECIAL_KEY, KEY, NOW, response, SPECIAL_KEY } from "./helpers.js";

function call(
  args: string[],
  env: NodeJS.ProcessEnv = { MONADSCAN_API_KEY: KEY },
  fetchImpl: typeof fetch = async () =>
    response({ status: "1", message: "OK", result: JSON.stringify(ABI) }),
): Promise<RunResult> {
  return run(args, env, { fetch: fetchImpl, now: () => NOW });
}

describe("run", () => {
  it("emits the full typed explorer ABI on stdout", async () => {
    const result = await call([ADDRESS, "wmon"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/ABI origin: explorer \(ADR 0007\)/);
    expect(result.stdout).toMatch(
      new RegExp(`Source: +https://monadscan\\.com/address/${ADDRESS}`),
    );
    expect(result.stdout).toMatch(/Retrieved: 2026-07-19 \(UTC\)/);
    expect(result.stdout).toContain(JSON.stringify(ABI, null, 2));
    expect(result.stdout.endsWith(" as const;\n")).toBe(true);
    expect(result.stdout).toContain("export const wmonAbi =");
  });

  it.each([
    ["address", ["not-an-address", "wmon"], "address must be a 20-byte hex value"],
    ["export name", [ADDRESS, "1bad-name"], "exportName must be a TypeScript identifier"],
    ["argument count", [ADDRESS], "Usage:"],
    ["extra arguments", [ADDRESS, "wmon", "extra"], "Usage:"],
  ])("rejects invalid %s before fetching", async (_name, args, message) => {
    let fetched = false;
    const result = await call(args, undefined, async () => {
      fetched = true;
      return response({});
    });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(new RegExp(message));
    expect(fetched).toBe(false);
  });

  it("reports a missing API key", async () => {
    const result = await call([ADDRESS, "wmon"], {});
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/MONADSCAN_API_KEY is not set/);
  });

  it.each([
    [
      "network failure",
      async (): Promise<Response> => Promise.reject(new Error("offline")),
      /network failure.*offline/,
    ],
    ["HTTP failure", async (): Promise<Response> => response("unavailable", 503), /HTTP 503/],
    [
      "API refusal",
      async (): Promise<Response> =>
        response({ status: "0", message: "NOTOK", result: "Contract source code not verified" }),
      /Contract source code not verified/,
    ],
    [
      "malformed ABI",
      async (): Promise<Response> => response({ status: "1", message: "OK", result: "{x" }),
      /malformed ABI JSON/,
    ],
  ])("maps %s to exit code 2 without emitting TypeScript", async (_name, fetchImpl, message) => {
    const result = await call([ADDRESS, "wmon"], undefined, fetchImpl);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(message);
  });

  it("redacts raw and URL-encoded API keys from failures", async () => {
    const result = await call([ADDRESS, "wmon"], { MONADSCAN_API_KEY: SPECIAL_KEY }, async () => {
      throw new Error(`request failed for apikey=${ENCODED_SPECIAL_KEY} (${SPECIAL_KEY})`);
    });
    expect(result.exitCode).toBe(2);
    expect(result.stdout).not.toContain(SPECIAL_KEY);
    expect(result.stderr).not.toContain(SPECIAL_KEY);
    expect(result.stderr).not.toContain(ENCODED_SPECIAL_KEY);
    expect(result.stderr).toMatch(/\[REDACTED\]/);
  });

  it("prints help without an API key", async () => {
    const result = await call(["--help"], {});
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toMatch(/Usage: pnpm fetch-abi/);
    expect(result.stdout).toMatch(/MONADSCAN_API_KEY/);
  });
});

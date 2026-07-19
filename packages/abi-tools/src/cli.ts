import { ADDRESS_PATTERN, FetchAbiError, fetchAbi, redactSecret } from "./fetch-abi.js";
import { renderAbiModule } from "./render.js";

const USAGE = "Usage: pnpm fetch-abi <address> <exportName>";
const HELP = `${USAGE}

Fetch a verified Monad mainnet ABI from Etherscan V2 and print typed TypeScript.

Environment:
  MONADSCAN_API_KEY  Required Etherscan API key
`;
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export interface RunResult {
  exitCode: 0 | 1 | 2;
  stdout: string;
  stderr: string;
}

export interface RunDependencies {
  fetch?: typeof globalThis.fetch;
  now?: () => Date;
}

function failure(exitCode: 1 | 2, message: string): RunResult {
  return { exitCode, stdout: "", stderr: `fetch-abi: ${message}\n` };
}

/**
 * Thin CLI adapter over {@link fetchAbi}: argv parsing, MONADSCAN_API_KEY,
 * exit-code mapping, API-key redaction, TypeScript on stdout and diagnostics
 * on stderr. All ABI mechanics live in the library.
 */
export async function run(
  argv: string[],
  env: NodeJS.ProcessEnv,
  dependencies: RunDependencies = {},
): Promise<RunResult> {
  if (argv.includes("-h") || argv.includes("--help")) {
    return { exitCode: 0, stdout: HELP, stderr: "" };
  }

  if (argv.length !== 2) return failure(1, USAGE);
  const [address, exportName] = argv as [string, string];
  if (!ADDRESS_PATTERN.test(address)) return failure(1, "address must be a 20-byte hex value");
  if (!IDENTIFIER_PATTERN.test(exportName)) {
    return failure(1, "exportName must be a TypeScript identifier");
  }

  const key = env.MONADSCAN_API_KEY;
  if (!key) {
    return failure(
      1,
      "MONADSCAN_API_KEY is not set; create one at https://info.monadscan.com/myapikey/ and export it.",
    );
  }

  try {
    const abi = await fetchAbi(address, key, { fetch: dependencies.fetch });
    const retrievedAt = dependencies.now?.() ?? new Date();
    return {
      exitCode: 0,
      stdout: renderAbiModule({ exportName, address, abi, retrievedAt }),
      stderr: "",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = error instanceof FetchAbiError && error.kind === "invalid-input" ? 1 : 2;
    return failure(exitCode, redactSecret(message, key));
  }
}

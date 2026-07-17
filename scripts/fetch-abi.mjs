import { fileURLToPath } from "node:url";

const ENDPOINT = "https://api.etherscan.io/v2/api";
const MONAD_CHAIN_ID = "143";
const API_KEY_ENV = "MONADSCAN_API_KEY";
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const EXPORT_BASE_RE = /^[A-Za-z_$][0-9A-Za-z_$]*$/;

export async function runCli({
  argv = process.argv.slice(2),
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  try {
    const output = await fetchAbiModule({ argv, env, fetchImpl, now });
    stdout.write(output);
    return 0;
  } catch (error) {
    stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

export async function fetchAbiModule({ argv, env, fetchImpl, now }) {
  const { address, exportBaseName } = parseArgs(argv);
  const apiKey = env[API_KEY_ENV];
  if (!apiKey) {
    throw new Error(`missing ${API_KEY_ENV}; create a Monadscan/Etherscan API key first`);
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("global fetch is unavailable; Node 22+ is required");
  }

  const abi = await fetchContractAbi({ address, apiKey, fetchImpl });
  return formatAbiModule({
    abi,
    address,
    exportName: `${exportBaseName}Abi`,
    retrievedDate: now.toISOString().slice(0, 10),
  });
}

export function parseArgs(argv) {
  if (argv.length !== 2) {
    throw new Error("usage: pnpm fetch:abi <contractAddress> <exportBaseName>");
  }
  const [rawAddress, rawExportBaseName] = argv;
  if (!ADDRESS_RE.test(rawAddress ?? "")) {
    throw new Error("contractAddress must be a 20-byte 0x-prefixed hexadecimal address");
  }
  if (!EXPORT_BASE_RE.test(rawExportBaseName ?? "")) {
    throw new Error("exportBaseName must be a valid TypeScript identifier, such as KuruRouter");
  }
  return {
    address: rawAddress.toLowerCase(),
    exportBaseName: rawExportBaseName,
  };
}

async function fetchContractAbi({ address, apiKey, fetchImpl }) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("chainid", MONAD_CHAIN_ID);
  url.searchParams.set("module", "contract");
  url.searchParams.set("action", "getabi");
  url.searchParams.set("address", address);
  url.searchParams.set("apikey", apiKey);

  let response;
  try {
    response = await fetchImpl(url);
  } catch (error) {
    throw new Error(`failed to reach Monadscan ABI endpoint: ${redact(String(error), apiKey)}`);
  }
  if (!response?.ok) {
    throw new Error(`Monadscan ABI endpoint returned HTTP ${response?.status ?? "unknown"}`);
  }

  let envelope;
  try {
    envelope = await response.json();
  } catch (error) {
    throw new Error(
      `Monadscan ABI endpoint returned invalid JSON: ${redact(String(error), apiKey)}`,
    );
  }
  if (envelope?.status !== "1" || typeof envelope.result !== "string") {
    const message = envelope?.message ? ` (${envelope.message})` : "";
    throw new Error(`Monadscan ABI endpoint did not return a verified ABI${message}`);
  }

  let abi;
  try {
    abi = JSON.parse(envelope.result);
  } catch (error) {
    throw new Error(`Monadscan ABI result is not valid JSON: ${redact(String(error), apiKey)}`);
  }
  if (!Array.isArray(abi)) {
    throw new Error("Monadscan ABI result must parse to an ABI array");
  }
  return abi;
}

export function formatAbiModule({ abi, address, exportName, retrievedDate }) {
  return `// GENERATED FILE - do not edit by hand.
//   regenerate from Monadscan: pnpm fetch:abi ${address} ${exportName.replace(/Abi$/, "")}
// ABI origin: explorer (ADR 0007)
//   source:    https://monadscan.com/address/${address}
//   endpoint:  Etherscan API V2 Get Contract ABI, chainid ${MONAD_CHAIN_ID}
//   retrieved: ${retrievedDate}

export const ${exportName} = ${JSON.stringify(abi, null, 2)} as const;
`;
}

function redact(message, secret) {
  return secret ? message.split(secret).join("[REDACTED]") : message;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await runCli();
}

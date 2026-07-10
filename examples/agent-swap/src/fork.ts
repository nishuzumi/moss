/**
 * Idempotent local-mainnet setup: ensure a Monad Foundry anvil is forking
 * Monad mainnet on 127.0.0.1:8545, then fund the demo wallet with 1,000,000
 * MON via anvil_setBalance. Safe to run any number of times.
 *
 * Requires the Monad flavor of Foundry (Monad gas model + opcode pricing):
 *   curl -L https://foundry.category.xyz | bash && foundryup --network monad
 *
 * Run:  pnpm --filter @themoss/example-agent-swap fork
 */
import { spawn, spawnSync } from "node:child_process";
import { openSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MONAD_CHAIN_ID } from "@themoss/system";
import { formatEther } from "viem";
import { devAccount, FORK_RPC_URL, rpc } from "./dev-wallet.js";

const UPSTREAM = "https://rpc.monad.xyz";
const FUND_WEI = 1_000_000n * 10n ** 18n; // 1,000,000 MON

async function chainIdAt(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: AbortSignal.timeout(2_000),
    });
    const body = (await res.json()) as { result?: string };
    return body.result ? Number(body.result) : null;
  } catch {
    return null;
  }
}

function requireMonadAnvil(): void {
  const probe = spawnSync("anvil", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    console.error(
      "anvil not found. This example needs the Monad flavor of Foundry:\n" +
        "  curl -L https://foundry.category.xyz | bash\n" +
        "  foundryup --network monad",
    );
    process.exit(1);
  }
  if (!probe.stdout.includes("monad")) {
    console.error(
      `Found upstream anvil (${probe.stdout.trim().split("\n")[0]}), but this example needs ` +
        "the Monad build (Monad gas model, opcode pricing, precompiles):\n" +
        "  foundryup --network monad",
    );
    process.exit(1);
  }
}

const running = await chainIdAt(FORK_RPC_URL);
if (running !== null && running !== MONAD_CHAIN_ID) {
  console.error(
    `Something else is listening on ${FORK_RPC_URL} (chain id ${running}, expected ` +
      `${MONAD_CHAIN_ID}). Stop it or free the port, then rerun.`,
  );
  process.exit(1);
}

if (running === null) {
  requireMonadAnvil();
  const log = join(tmpdir(), "moss-agent-swap-anvil.log");
  const fd = openSync(log, "a");
  const child = spawn("anvil", ["--fork-url", UPSTREAM, "--port", "8545"], {
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  child.unref();
  console.log(`starting anvil --fork-url ${UPSTREAM} (pid ${child.pid}, log ${log}) ...`);

  const deadline = Date.now() + 60_000;
  while ((await chainIdAt(FORK_RPC_URL)) !== MONAD_CHAIN_ID) {
    if (Date.now() > deadline) {
      console.error(`anvil did not come up within 60s — see ${log}`);
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
} else {
  console.log(`fork already running at ${FORK_RPC_URL}`);
}

await rpc("anvil_setBalance", [devAccount.address, `0x${FUND_WEI.toString(16)}`]);

const block = Number(await rpc<string>("eth_blockNumber"));
const balance = BigInt(await rpc<string>("eth_getBalance", [devAccount.address, "latest"]));
console.log(
  `fork ready: chain ${MONAD_CHAIN_ID} @ block ${block} — wallet ${devAccount.address} ` +
    `holds ${formatEther(balance)} MON`,
);

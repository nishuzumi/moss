/** Local-fork signer. It accepts only a validated Capability tree from the Agent example. */
import { readFileSync } from "node:fs";
import { type CapabilityNode, flattenCapabilityTree, NATIVE, Registry } from "@themoss/core";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import { createTraceSimulator } from "@themoss/simulator";
import * as system from "@themoss/system";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http } from "viem";
import { devAccount, FORK_RPC_URL, rpc } from "./dev-wallet.js";

const { AUSD_ADDRESS, MONAD_CHAIN_ID, USDC_ADDRESS, WMON_ADDRESS } = system;
const chainId = Number(await rpc<string>("eth_chainId"));
if (chainId !== MONAD_CHAIN_ID) throw new Error(`wallet requires Monad chain ${MONAD_CHAIN_ID}`);
const chain = defineChain({
  id: chainId,
  name: "monad-fork",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [FORK_RPC_URL] } },
});
const wallet = createWalletClient({ account: devAccount, chain, transport: http() });
const reader = createPublicClient({ chain, transport: http() });
const balanceTokens = [
  { ref: NATIVE, symbol: "MON", decimals: 18 },
  { ref: WMON_ADDRESS, symbol: "WMON", decimals: 18 },
  { ref: USDC_ADDRESS, symbol: "USDC", decimals: 6 },
  { ref: AUSD_ADDRESS, symbol: "AUSD", decimals: 6 },
] as const;

async function printBalances(): Promise<void> {
  for (const token of balanceTokens) {
    const raw =
      token.ref === NATIVE
        ? await reader.getBalance({ address: devAccount.address })
        : await reader.readContract({
            address: token.ref,
            abi: erc.ERC20Abi,
            functionName: "balanceOf",
            args: [devAccount.address],
          });
    console.log(`  ${token.symbol.padEnd(5)} ${formatUnits(raw, token.decimals)}`);
  }
}

const [command, capabilityPath] = process.argv.slice(2);
if (command === "address") {
  console.log(devAccount.address);
} else if (command === "balance") {
  await printBalances();
} else if (command === "send") {
  if (!capabilityPath) throw new Error("usage: wallet send <verified-capability.json>");
  const capability = JSON.parse(readFileSync(capabilityPath, "utf8")) as CapabilityNode;
  if (capability.kind !== "capability") throw new Error("input is not a Capability");
  const executable = flattenCapabilityTree(capability);
  const sender = devAccount.address.toLowerCase();
  if (executable.some(({ transaction }) => transaction.from.toLowerCase() !== sender)) {
    throw new Error(`Capability contains a transaction not sent by ${devAccount.address}`);
  }
  await assertCleanSignerSimulation(capability, executable.length);
  for (const [index, { transaction }] of executable.entries()) {
    const hash = await wallet.sendTransaction({
      to: transaction.to,
      data: transaction.data,
      value: BigInt(transaction.value),
    });
    const receipt = await reader.waitForTransactionReceipt({ hash });
    console.log(`${index + 1}/${executable.length} ${hash} → ${receipt.status}`);
    if (receipt.status !== "success") throw new Error(`transaction ${hash} failed`);
  }
  await printBalances();
} else {
  throw new Error("usage: wallet <address|balance|send <verified-capability.json>>");
}

async function assertCleanSignerSimulation(
  capability: CapabilityNode,
  expectedTransactions: number,
): Promise<void> {
  const runtime = await system.monadRuntime({ rpcUrl: FORK_RPC_URL });
  const registry = new Registry(runtime).use(system, erc, kuru);
  const simulation = await createTraceSimulator(runtime, {
    receipt: (capabilityNode, changes) => registry.parseReceipt(capabilityNode, changes),
  }).simulate(capability);

  const unsafe =
    Boolean(simulation.halted) ||
    simulation.results.length !== expectedTransactions ||
    simulation.results.some((result) => {
      return result.reverted || result.warnings.length > 0 || !result.receipt;
    });

  if (unsafe) {
    console.error(JSON.stringify(simulation, null, 2));
    throw new Error("Capability did not re-simulate cleanly at the signer boundary");
  }

  console.log(
    `re-simulated ${simulation.results.length} transaction${
      simulation.results.length === 1 ? "" : "s"
    } at the signer boundary`,
  );
  for (const [index, result] of simulation.results.entries()) {
    console.log(`  ${index + 1}/${simulation.results.length} ${result.receipt?.text}`);
  }
}

/** Local-fork signer. It accepts only a validated Capability tree from the Agent example. */
import { readFileSync } from "node:fs";
import { type CapabilityNode, flattenCapabilityTree, NATIVE } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { AUSD_ADDRESS, MONAD_CHAIN_ID, USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http } from "viem";
import { devAccount, FORK_RPC_URL, rpc } from "./dev-wallet.js";

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
            abi: ERC20Abi,
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

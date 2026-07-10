/**
 * The demo wallet: the one component in this example that Moss deliberately
 * is not. It holds the (publicly known) dev key, and it signs and sends —
 * nothing else. It takes a Plan exactly as `action` returned it and refuses
 * anything that isn't addressed to its own account on its own chain.
 *
 * Usage:
 *   pnpm --filter @mossxyz/example-agent-swap wallet address
 *   pnpm --filter @mossxyz/example-agent-swap wallet balance
 *   pnpm --filter @mossxyz/example-agent-swap wallet send <plan.json>
 */
import { readFileSync } from "node:fs";
import { NATIVE, type Plan } from "@mossxyz/core";
import { ERC20Abi } from "@mossxyz/erc";
import { MONAD_TOKENS } from "@mossxyz/system";
import { createPublicClient, createWalletClient, defineChain, formatUnits, http } from "viem";
import { devAccount, FORK_RPC_URL, rpc } from "./dev-wallet.js";

const chainId = Number(await rpc<string>("eth_chainId"));
const chain = defineChain({
  id: chainId,
  name: "monad-fork",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [FORK_RPC_URL] } },
});
const wallet = createWalletClient({ account: devAccount, chain, transport: http() });
const reader = createPublicClient({ chain, transport: http() });

async function printBalances(): Promise<void> {
  for (const token of MONAD_TOKENS) {
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

const [command, planPath] = process.argv.slice(2);

switch (command) {
  case "address":
    console.log(devAccount.address);
    break;

  case "balance":
    console.log(`balances of ${devAccount.address} (chain ${chainId}):`);
    await printBalances();
    break;

  case "send": {
    if (!planPath) {
      console.error("usage: wallet send <plan.json — a Plan exactly as `action` returned it>");
      process.exit(1);
    }
    const plan = JSON.parse(readFileSync(planPath, "utf8")) as Plan;
    if (plan.kind !== "plan") {
      console.error(`${planPath} is not a Plan (kind: ${JSON.stringify(plan.kind)})`);
      process.exit(1);
    }
    if (plan.chainId !== chainId) {
      console.error(`plan targets chain ${plan.chainId}, this wallet is on chain ${chainId}`);
      process.exit(1);
    }
    const me = devAccount.address.toLowerCase();
    if (plan.txs.some((tx) => tx.from.toLowerCase() !== me)) {
      console.error(`plan contains transactions not from this wallet (${devAccount.address})`);
      process.exit(1);
    }

    console.log(`sending ${plan.txs.length} tx(s): ${plan.intent}`);
    for (const [i, tx] of plan.txs.entries()) {
      const hash = await wallet.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: BigInt(tx.value),
      });
      const receipt = await reader.waitForTransactionReceipt({ hash });
      console.log(`  tx ${i + 1}/${plan.txs.length} ${hash} → ${receipt.status}`);
      if (receipt.status !== "success") process.exitCode = 1;
    }
    console.log(`balances of ${devAccount.address} after:`);
    await printBalances();
    break;
  }

  default:
    console.error("usage: wallet <address|balance|send <plan.json>>");
    process.exit(1);
}

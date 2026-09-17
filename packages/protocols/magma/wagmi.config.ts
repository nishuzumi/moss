import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

/**
 * ABI origin: compiled (Moss ADR 0007).
 *
 * Upstream repository: MagmaStaking/contracts-public
 * Upstream commit: 5793bdb9e102d581347a3cde76c7f70ba6b362d0
 * Upstream source: interfaces/IMagma.sol
 * Local source: contracts/IMagma.sol
 * Compiler: solc 0.8.30
 * Regenerate: pnpm gen:abis
 */
export default defineConfig({
  out: "src/abis/magma.ts",
  plugins: [
    foundry({
      project: ".",
      include: ["IMagma.sol/**"],
      exclude: ["build-info/**"],
    }),
  ],
});

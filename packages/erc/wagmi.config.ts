import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

/**
 * ABI origin: compiled (ADR 0007). The standard toolchain: forge compiles
 * contracts/, the wagmi CLI foundry plugin emits `as const` viem-typed ABIs.
 * This config file IS the provenance record for the compiled tier — it names
 * the source project and what gets included. Regenerate: pnpm gen:abis
 */
export default defineConfig({
  out: "src/abis/erc.ts",
  plugins: [
    foundry({
      project: ".",
      include: ["IERC20.sol/**", "IERC721.sol/**", "IERC4626.sol/**", "IWETH9.sol/**"],
      // wagmi's default excludes assume IERC20 is someone else's vendored
      // interface; here it IS our compiled source of truth — override them.
      exclude: ["build-info/**"],
    }),
  ],
});

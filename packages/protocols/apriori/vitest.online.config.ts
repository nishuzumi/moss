import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The online ABI derivation suite (pnpm test:abi:online). Keyless: the
// aprMON implementation is unverified on MonadScan, so the vendored ABI is
// enforced directly against mainnet RPC (EIP-1967 linkage, bytecode
// selector/topic presence, token metadata) instead of a keyed explorer
// fetch. Kept apart from the offline default `pnpm test`.
export default defineConfig({
  esbuild: { target: "es2022" },
  test: { include: ["test-online/**/*.test.ts"] },
  resolve: {
    // Tests run against workspace sources, not dists, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": src("../../core/src/index.ts"),
      "@themoss/simulator": src("../../simulator/src/index.ts"),
      "@themoss/erc": src("../../erc/src/index.ts"),
      "@themoss/system": src("../../system/src/index.ts"),
      "@themoss/abi-tools": src("../../abi-tools/src/index.ts"),
    },
  },
});

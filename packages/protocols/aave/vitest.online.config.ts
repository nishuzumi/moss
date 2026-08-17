import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The online ABI cross-check (pnpm test:abi:online). Keyed: it fetches the
// explorer-verified Pool implementation's ABI, so a missing MONADSCAN_API_KEY
// fails instead of skipping. Kept apart from the default `pnpm test`, which
// stays deterministic and keyless.
export default defineConfig({
  // Stage-3 decorators: the adapter is a decorated class and esbuild has to
  // lower it, exactly as in vitest.config.ts (ADR 0001).
  esbuild: { target: "es2022" },
  test: { include: ["test-online/**/*.test.ts"] },
  resolve: {
    // Tests run against workspace sources, not dists, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": src("../../core/src/index.ts"),
      "@themoss/erc": src("../../erc/src/index.ts"),
      "@themoss/abi-tools": src("../../abi-tools/src/index.ts"),
    },
  },
});

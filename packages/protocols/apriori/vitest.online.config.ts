import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// The online explorer cross-check suite (pnpm test:abi:online). Kept apart
// from the offline default so a missing MONADSCAN_API_KEY fails loudly here
// without ever gating `pnpm test`.
export default defineConfig({
  esbuild: { target: "es2022" },
  test: { include: ["test-online/**/*.test.ts"] },
  resolve: {
    alias: {
      "@themoss/core": src("../../core/src/index.ts"),
      "@themoss/system": src("../../system/src/index.ts"),
      "@themoss/erc": src("../../erc/src/index.ts"),
    },
  },
});

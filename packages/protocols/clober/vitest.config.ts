import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  esbuild: { target: "es2022" },
  // Live ABI deployment evidence lives in test-online/ and runs only
  // through vitest.online.config.ts (pnpm test:abi:online).
  test: { include: ["test/**/*.test.ts"] },
  resolve: {
    alias: {
      "@themoss/core": src("../../core/src/index.ts"),
      "@themoss/simulator": src("../../simulator/src/index.ts"),
      "@themoss/erc": src("../../erc/src/index.ts"),
      "@themoss/system": src("../../system/src/index.ts"),
    },
  },
});

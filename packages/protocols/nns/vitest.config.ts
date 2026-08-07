import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { target: "es2022" },
  test: {
    include: ["test/**/*.test.ts", "test-online/live-mainnet.test.ts"],
  },
  resolve: {
    alias: {
      "@themoss/abi-tools": fileURLToPath(new URL("../../abi-tools/src/index.ts", import.meta.url)),
      "@themoss/core": fileURLToPath(new URL("../../core/src/index.ts", import.meta.url)),
    },
  },
});

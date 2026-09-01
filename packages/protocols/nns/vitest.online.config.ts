import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  esbuild: { target: "es2022" },
  test: { include: ["test-online/abi-explorer.test.ts"] },
  resolve: {
    alias: {
      "@themoss/abi-tools": src("../../abi-tools/src/index.ts"),
      "@themoss/core": src("../../core/src/index.ts"),
    },
  },
});

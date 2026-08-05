import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const source = (relativePath: string): string =>
  fileURLToPath(new URL(relativePath, import.meta.url));

export default defineConfig({
  esbuild: { target: "es2022" },
  resolve: {
    alias: {
      "@themoss/abi-tools": source("../../abi-tools/src/index.ts"),
      "@themoss/core": source("../../core/src/index.ts"),
      "@themoss/system": source("../../system/src/index.ts"),
    },
  },
  test: {
    include: ["test-online/abi-explorer.test.ts"],
  },
});

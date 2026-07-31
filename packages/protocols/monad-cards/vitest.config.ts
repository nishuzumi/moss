import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { target: "es2022" },
  resolve: {
    alias: {
      "@themoss/test-support": fileURLToPath(
        new URL("../../test-support/src/index.ts", import.meta.url),
      ),
      "@themoss/core": fileURLToPath(new URL("../../core/src/index.ts", import.meta.url)),
    },
  },
});

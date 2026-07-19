import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { target: "es2022" },
  resolve: {
    alias: {
      "@themoss/core": fileURLToPath(new URL("../../core/src/index.ts", import.meta.url)),
    },
  },
});

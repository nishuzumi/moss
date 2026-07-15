import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  esbuild: { target: "es2022" },
  resolve: {
    alias: {
      "@themoss/core": src("../../packages/core/src/index.ts"),
      "@themoss/protocol-nft-mint": src("../../packages/protocols/nft-mint/src/index.ts"),
    },
  },
});

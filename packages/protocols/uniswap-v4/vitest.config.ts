import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // Stage-3 decorators: V8 cannot parse them natively yet, so the esbuild
  // transform must lower them (ADR 0001 toolchain constraint). This is also
  // why the repo pins vitest 3 — vite 8's oxc does not lower them.
  esbuild: { target: "es2022" },
  resolve: {
    // Tests run against workspace sources, not dists, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": src("../../core/src/index.ts"),
      "@themoss/simulator": src("../../simulator/src/index.ts"),
      "@themoss/erc": src("../../erc/src/index.ts"),
      "@themoss/system": src("../../system/src/index.ts"),
    },
  },
});

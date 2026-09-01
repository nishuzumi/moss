import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Stage-3 decorators: V8 cannot parse them natively yet, so the esbuild
  // transform must lower them (ADR 0001 toolchain constraint). This is also
  // why the repo pins vitest 3 — vite 8's oxc does not lower them.
  esbuild: { target: "es2022" },
  resolve: {
    // Tests run against core's source, not its dist, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": fileURLToPath(new URL("../core/src/index.ts", import.meta.url)),
      "@themoss/simulator": fileURLToPath(new URL("../simulator/src/index.ts", import.meta.url)),
    },
  },
});

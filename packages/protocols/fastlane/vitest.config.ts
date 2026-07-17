// Vitest config for @themoss/protocol-fastlane.
//
// Stage-3 decorators cannot be parsed natively by V8, so esbuild
// must lower them (ADR 0001). This is also why the repo pins vitest
// 3 — vite 8's oxc transform doesn't lower decorators.
//
// Tests run against core's source (not dist) so a stale build
// can never produce phantom failures.
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

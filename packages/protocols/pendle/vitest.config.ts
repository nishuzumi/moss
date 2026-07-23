import { defineConfig } from "vitest/config";

export default defineConfig({
  // Stage-3 decorators need esbuild lowering (ADR 0001 toolchain constraint).
  esbuild: { target: "es2022" },
  // The keyed online explorer cross-check lives in test-online/ and runs only
  // through vitest.online.config.ts (pnpm test:abi:online), never in `pnpm test`.
  test: { include: ["test/**/*.test.ts"] },
});

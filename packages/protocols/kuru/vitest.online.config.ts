import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Online ABI/deployment checks (pnpm test:abi:online). Explorer mode requires
// MONADSCAN_API_KEY; the explicitly reviewed deployment-evidence mode does not.
// Kept apart from the default test suite.
export default defineConfig({
  esbuild: { target: "es2022" },
  test: { include: ["test-online/**/*.test.ts"] },
  resolve: {
    // Tests run against workspace sources, not dists, so a stale build can
    // never produce phantom failures.
    alias: {
      "@themoss/core": src("../../core/src/index.ts"),
      "@themoss/simulator": src("../../simulator/src/index.ts"),
      "@themoss/erc": src("../../erc/src/index.ts"),
      "@themoss/system": src("../../system/src/index.ts"),
      "@themoss/abi-tools": src("../../abi-tools/src/index.ts"),
    },
  },
});

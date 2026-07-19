#!/usr/bin/env node

/**
 * CLI entry point for the fetch-abi tool.
 *
 * Thin wrapper around the pure `run()` in fetch-abi-logic.mjs: invokes
 * it with `process.argv` / `process.env` / default stdio and translates
 * the returned `exitCode` into `process.exit`. Kept separate so tests
 * can `import` the logic without triggering this process.exit boundary.
 *
 * Usage:
 *   pnpm fetch-abi <address> <exportName> [--date YYYY-MM-DD]
 */

import { run } from "./fetch-abi-logic.mjs";

const result = await run(process.argv.slice(2), process.env);
process.exit(result.exitCode);

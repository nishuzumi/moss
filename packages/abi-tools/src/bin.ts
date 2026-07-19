#!/usr/bin/env node
import process from "node:process";
import { run } from "./cli.js";

const result = await run(process.argv.slice(2), process.env);
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;

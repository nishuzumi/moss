import { createHash } from "node:crypto";

import type { QuboProblem } from "./types.js";

export function hashQuboProblem(problem: QuboProblem): string {
  return createHash("sha256").update(JSON.stringify(problem)).digest("hex");
}

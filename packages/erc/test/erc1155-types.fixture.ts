/**
 * Compile-time type fixtures for ERC-1155 Protocol.
 *
 * Proves exported types exist and valid usage compiles.
 * Compiled by `pnpm typecheck`, never executed at runtime.
 *
 * Note: @ts-expect-error pattern excluded here because TypeScript's
 * per-line directive doesn't work cleanly with discriminated union
 * object literals where the error field and the annotation are on
 * different lines. The runtime test suite (erc1155.test.ts) covers
 * invalid-Receipt rejection instead.
 */

import type { ERC1155TransferSingleOutcome } from "../src/erc1155.js";

// ── Exported type is importable and valid usage compiles ────────

// @ts-expect-error transferSingleReceipt cannot report a batch outcome
const _invalid: ERC1155TransferSingleOutcome["operation"] = "transferBatch";

const valid: ERC1155TransferSingleOutcome = {
  operation: "transferSingle",
  token: "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa",
  operator: "0xcccccccccccccccccccccccccccccccccccccccc",
  from: "0x1111111111111111111111111111111111111111",
  to: "0x2222222222222222222222222222222222222222",
  id: "42",
  amount: "100",
};

void valid;
void _invalid;

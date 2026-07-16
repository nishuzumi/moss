// ABI origin: CHANGEME (ADR 0007) — pick exactly one tier and document it:
//
//   compiled  — generated from contract source in this package: foundry
//               project + @wagmi/cli foundry plugin (copy wagmi.config.ts and
//               the gen:abis script from packages/erc; mind wagmi's default
//               excludes if your interface shares a name with common ones).
//   explorer  — pulled from the block explorer's VERIFIED contract page.
//               Record the explorer URL and the retrieval date.
//   vendored  — taken from a third-party verifiable source (official SDK on
//               npm, protocol repo). Do NOT hand-copy: commit the upstream
//               files verbatim in abis-src/ and add an update:abis script
//               that fetches the pinned release, records the tarball sha256,
//               and regenerates this file (copy the setup from
//               packages/protocols/kuru — script + package.json entry).
//
// Human-readable parseAbi strings and generated `as const` JSON are both
// fine — what matters is that abitype can infer literal types, so Handles
// stay fully typed.
import { parseAbi } from "viem";

export const ExampleVaultAbi = parseAbi([
  "function deposit() payable",
  "function balanceOf(address owner) view returns (uint256)",
  "event Deposited(address indexed account, uint256 amount)",
]);

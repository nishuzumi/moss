/**
 * The COMPILED half of the ABI pipeline (ADR 0007 tier 1).
 *
 * Morpho publishes no MetaMorpho V1.1 ABI. The `metaMorphoAbi` its own SDK
 * ships is the V1.0 artifact: it is missing `UpdateLostAssets`, which every
 * V1.1 vault on Monad emits on deposit and on withdrawal (confirmed against a
 * live `debug_traceCall` on 2026-08-01). Decoding that event is not optional
 * here, because a Receipt must cover every Change exactly. So the vault ABI is
 * compiled from Morpho's own Solidity, vendored verbatim at a pinned commit,
 * instead of transcribed.
 *
 * Two artifacts, both complete:
 *   - IMetaMorphoV1_1: the vault's whole callable surface, plus the ERC-4626
 *     and ERC-20 events it inherits.
 *   - EventsLib: the vault's own events, which Solidity places in the
 *     library that declares them rather than in the interface.
 *
 * `contracts/lib/` is staged from node_modules rather than committed: Morpho's
 * sources import their dependencies through relative `../../lib/` paths, which
 * remappings cannot rewrite, and vendoring OpenZeppelin plus Morpho Blue into
 * this repo would be a far larger diff than the three files we actually read.
 * Git submodules stay banned (ADR 0007) and none is added.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

export interface SourceFile {
  path: string;
  sha256: string;
}

export interface StagedDependency {
  package: string;
  stageTo: string;
}

export interface Artifact {
  contract: string;
  exportName: string;
}

export interface ContractSources {
  repository: string;
  commit: string;
  fetchedAt: string;
  solc: string;
  files: SourceFile[];
  dependencies: StagedDependency[];
  artifacts: Artifact[];
}

export function readSources(packageRoot: string): ContractSources {
  return JSON.parse(readFileSync(join(packageRoot, "contracts", "SOURCES.json"), "utf8"));
}

export function digest(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Offline integrity check: every committed Solidity file still hashes to what
 * SOURCES.json recorded when it was fetched. Runs in the normal test suite, so
 * an edited vendored source fails without needing foundry or the network.
 */
export function verifySources(packageRoot: string): string[] {
  const sources = readSources(packageRoot);
  const mismatches: string[] = [];
  for (const file of sources.files) {
    const actual = digest(readFileSync(join(packageRoot, "contracts", file.path)));
    if (actual !== file.sha256) mismatches.push(`${file.path}: ${actual} != ${file.sha256}`);
  }
  return mismatches;
}

/** Copy the npm-published Solidity dependencies to the paths the sources import. */
export function stageDependencies(packageRoot: string): void {
  const sources = readSources(packageRoot);
  for (const dependency of sources.dependencies) {
    const from = join(packageRoot, "node_modules", dependency.package);
    if (!existsSync(from)) {
      throw new Error(`${dependency.package} is not installed; run pnpm install first`);
    }
    const to = join(packageRoot, "contracts", dependency.stageTo);
    rmSync(to, { recursive: true, force: true });
    mkdirSync(dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true, dereference: true });
  }
}

/** Compile the vendored sources and render the generated TypeScript module. */
export function generate(packageRoot: string): string {
  const sources = readSources(packageRoot);
  const mismatches = verifySources(packageRoot);
  if (mismatches.length > 0) {
    throw new Error(`vendored Solidity does not match SOURCES.json:\n  ${mismatches.join("\n  ")}`);
  }
  stageDependencies(packageRoot);
  const contracts = join(packageRoot, "contracts");
  execFileSync("forge", ["build", "--skip", "test"], { cwd: contracts, stdio: "inherit" });

  const fileList = sources.files
    .map((file) => `//     ${file.path}\n//       sha256 ${file.sha256}`)
    .join("\n");
  let generated = `// GENERATED FILE — do not edit by hand.
//   regenerate:  pnpm gen:contract-abis   (needs foundry; only when contracts/ changes)
//   re-vendor:   pnpm update:contracts
// ABI origin: compiled (ADR 0007)
//   source:   github.com/${sources.repository} @ ${sources.commit}
${fileList}
//   fetched:  ${sources.fetchedAt}, compiled with solc ${sources.solc}, optimizer off
//   staged:   OpenZeppelin and Morpho Blue Solidity come from npm at build time
//             (contracts/lib is generated, never committed)
//   why compiled rather than vendored from the SDK: Morpho's published
//   metaMorphoAbi is the MetaMorpho V1.0 artifact and omits UpdateLostAssets,
//   which every V1.1 vault on Monad emits on deposit and withdrawal. A Receipt
//   has to cover every Change, so the missing event is load-bearing.
//   verification: the Monad-mainnet test simulates a real deposit and a real
//   withdrawal on a live vault and decodes every emitted event through these
//   ABIs, so a signature that did not match the deployed contract fails.
`;

  for (const artifact of sources.artifacts) {
    const path = join(contracts, "out", `${artifact.contract}.sol`, `${artifact.contract}.json`);
    const abi = (JSON.parse(readFileSync(path, "utf8")) as { abi: unknown }).abi;
    if (!Array.isArray(abi)) throw new Error(`${artifact.contract}: forge artifact has no ABI`);
    generated += `\n// ${artifact.contract}.sol, compiled in full.\nexport const ${artifact.exportName} = ${JSON.stringify(abi, null, 2)} as const;\n`;
  }
  return generated;
}

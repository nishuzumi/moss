import type { Abi } from "abitype";

export interface RenderAbiModuleOptions {
  /** TypeScript identifier the module exports as `<exportName>Abi`. */
  exportName: string;
  /** Verified contract address the ABI was retrieved from. */
  address: string;
  /** Validated ABI to embed as an `as const` literal. */
  abi: Abi;
  /** Retrieval instant recorded in the provenance header (UTC date). */
  retrievedAt: Date;
}

/**
 * Render an explorer-origin ABI module (ADR 0007): a provenance header naming
 * the verified source and retrieval date, then the full ABI as typed
 * `as const` TypeScript. Deterministic: same inputs, same bytes.
 */
export function renderAbiModule({
  exportName,
  address,
  abi,
  retrievedAt,
}: RenderAbiModuleOptions): string {
  return [
    "// ABI origin: explorer (ADR 0007)",
    `//   Source:    https://monadscan.com/address/${address}`,
    "//   Endpoint:  Etherscan V2 (chainid=143, module=contract, action=getabi)",
    `//   Retrieved: ${retrievedAt.toISOString().slice(0, 10)} (UTC)`,
    "",
    `export const ${exportName}Abi = ${JSON.stringify(abi, null, 2)} as const;`,
    "",
  ].join("\n");
}

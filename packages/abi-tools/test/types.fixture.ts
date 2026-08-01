// Compile-time contract of the @themoss/abi-tools public API (AGENTS.md:
// exported types are public API behavior). Checked by `pnpm typecheck`.
import type { Abi } from "abitype";
import {
  type AbiComparisonIssue,
  type CompareDeployedAbiOptions,
  compareDeployedAbi,
  ERC1967_IMPLEMENTATION_SLOT,
  erc1967ImplementationAddress,
  type FacetSource,
  type FetchAbiError,
  type FetchAbiErrorKind,
  fetchAbi,
  renderAbiModule,
  type SelectorRowStatus,
} from "../src/index.js";

declare const address: string;
declare const key: string;
declare const error: FetchAbiError;
declare const abi: Abi;

// fetchAbi returns a typed ABI, with fetch injectable.
const fetched: Promise<Abi> = fetchAbi(address, key);
void fetched;
void fetchAbi(address, key, { fetch: globalThis.fetch });

// Error kinds stay a closed literal union.
const kind: FetchAbiErrorKind = error.kind;
void kind;
// @ts-expect-error unknown kinds are rejected
const badKind: FetchAbiErrorKind = "bogus";
void badKind;

// renderAbiModule requires the full provenance inputs and a real Abi.
void renderAbiModule({ exportName: "wmon", address, abi, retrievedAt: new Date() });
// @ts-expect-error retrievedAt is required — the renderer never reads the clock
void renderAbiModule({ exportName: "wmon", address, abi: [] });
// @ts-expect-error a raw string is not an Abi
void renderAbiModule({ exportName: "wmon", address, abi: "[]", retrievedAt: new Date() });

// @ts-expect-error the API key is required
void fetchAbi(address);
// @ts-expect-error fetch must be a function
void fetchAbi(address, key, { fetch: "fetch" });

// compareDeployedAbi is pure and typed over Abi with a closed issue union.
const options: CompareDeployedAbiOptions = { allowedActualOnly: ["function pause()"] };
const issues: readonly AbiComparisonIssue[] = compareDeployedAbi(abi, abi, options);
void issues;
// @ts-expect-error issue kinds are a closed union
const badIssueKind: AbiComparisonIssue["kind"] = "warning";
void badIssueKind;
// @ts-expect-error expected must be an Abi, not raw JSON text
void compareDeployedAbi("[]", abi);
// @ts-expect-error actual must be an Abi, not raw JSON text
void compareDeployedAbi(abi, "[]");
// @ts-expect-error allowlist entries are signature strings
void compareDeployedAbi(abi, abi, { allowedActualOnly: [/pause/] });

// The ERC-1967 helpers keep literal slot and template-address types; the
// parser deliberately accepts unknown (raw eth_getStorageAt output).
const slot: "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc" =
  ERC1967_IMPLEMENTATION_SLOT;
void slot;
declare const rawSlotWord: unknown;
const implementation: `0x${string}` = erc1967ImplementationAddress(rawSlotWord);
void implementation;

// The selector-proxy verdicts stay closed literal unions, like the fetch error
// kinds above: a caller can switch on them exhaustively.
const rowStatus: SelectorRowStatus = "selector-collision";
void rowStatus;
// @ts-expect-error unknown row statuses are rejected
const badRowStatus: SelectorRowStatus = "collision";
void badRowStatus;
const facetSource: FacetSource = "selectorToFacet";
void facetSource;
// @ts-expect-error unknown facet sources are rejected
const badFacetSource: FacetSource = "diamond";
void badFacetSource;

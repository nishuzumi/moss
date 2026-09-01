import type { Abi } from "abitype";
import type { AbiComparisonIssue } from "./compare-abi.js";

/** 4-byte function selector, lowercase whenever selector-proxy tooling produces one. */
export type Selector = `0x${string}`;

/**
 * Where a selector→facet map came from. The two loupe sources are complete
 * maps; the point-lookup sources cover only probed selectors; `"none"` means
 * the contract answered no registry view.
 */
export type FacetSource = "facets" | "facetAddresses" | "facetAddress" | "selectorToFacet" | "none";

/**
 * Injected `eth_call`: resolve with returned data, throw `EthCallRevert` on an
 * EVM revert, and propagate every transport failure unchanged.
 */
export type EthCall = (request: { to: `0x${string}`; data: `0x${string}` }) => Promise<string>;

/** The structural slice of a viem Public Client used by `createViemEthCall`. */
export interface ViemCallClient {
  call(request: { to: `0x${string}`; data: `0x${string}` }): Promise<{ data?: `0x${string}` }>;
}

/** Injected `eth_getCode`: returns `"0x"` for an address with no code. */
export type GetCode = (address: `0x${string}`) => Promise<string>;

export interface ResolveSelectorProxyOptions {
  /** The dispatcher address every selector is resolved against. */
  proxy: string;
  /** Injected `eth_call` transport. */
  call: EthCall;
  /** Selectors to resolve when only a point-lookup view exists. */
  selectors?: readonly string[];
  /**
   * Injected `eth_getCode`, enabling a point-lookup view implemented directly
   * by the dispatcher to prove itself through a resolved facet with code.
   */
  getCode?: GetCode;
}

export interface SelectorProxyResolution {
  /** The resolved proxy, lowercase. */
  proxy: `0x${string}`;
  /** Which registry view produced the map. */
  source: FacetSource;
  /**
   * True when `selectorFacets` is the proxy's complete map (loupe sources).
   * This says nothing about whether every facet ABI was available later.
   */
  complete: boolean;
  /** Facet for every selector that resolved to one, lowercase both sides. */
  selectorFacets: ReadonlyMap<Selector, `0x${string}`>;
  /** Distinct facets in first-seen order, lowercase. */
  facets: readonly `0x${string}`[];
}

export interface FacetAbiUnion {
  /** Deduplicated union of facet ABIs, first definition kept. */
  union: Abi;
  /** Conflicting definitions reported in `compareDeployedAbi` issue format. */
  conflicts: readonly AbiComparisonIssue[];
}

/** Aggregate outcome of selector-proxy evidence gathered in one run. */
export type SelectorProxyCrossCheckStatus =
  | "not-selector-proxy"
  | "matched"
  | "mismatch"
  | "inconclusive";

/** Per-selector routing verdict for one vendored function. */
export type SelectorRowStatus =
  | "matched"
  | "unmapped"
  | "facet-no-code"
  | "facet-unverified"
  | "facet-fetch-failed"
  | "not-in-facet-abi"
  | "selector-collision"
  | "mismatch";

export interface SelectorRow {
  /** The vendored function's 4-byte selector. */
  selector: Selector;
  /** Canonical signature, e.g. `function transfer(address,uint256)`. */
  signature: string;
  /** The facet the proxy dispatches this selector to, when it has one. */
  facet?: `0x${string}`;
  status: SelectorRowStatus;
  /** Human-readable specifics for everything but `matched`. */
  detail?: string;
}

export interface FacetReport {
  facet: `0x${string}`;
  /** Explorer/code evidence available for this facet. */
  status: "verified" | "unverified" | "no-code" | "fetch-failed";
  /** Item count of the verified ABI. */
  abiItems?: number;
  /** Fetch error message for `unverified` and `fetch-failed`. */
  detail?: string;
}

export interface CrossCheckSelectorProxyAbiOptions {
  /** The vendored interface the proxy is expected to serve. */
  vendored: Abi;
  /** The dispatcher address. */
  proxy: string;
  /** Injected `eth_call` transport. */
  call: EthCall;
  /** Injected `eth_getCode` transport, for the facet no-code check. */
  getCode: GetCode;
  /** Fetches one facet's explorer-verified ABI. */
  fetchFacetAbi: (facet: `0x${string}`) => Promise<Abi>;
  /** Passed through to the union `compareDeployedAbi` run. */
  allowedActualOnly?: readonly string[];
}

export interface SelectorProxyCrossCheck {
  proxy: `0x${string}`;
  /** Registry view used; `"none"` hands control to the single-implementation path. */
  source: FacetSource;
  /**
   * Overall result. A proven mismatch wins; otherwise unavailable facet
   * evidence is `"inconclusive"` rather than a false match.
   */
  status: SelectorProxyCrossCheckStatus;
  /** Selector-map completeness only; independent of facet ABI availability. */
  complete: boolean;
  /** One routing verdict per vendored function, in vendored order. */
  rows: readonly SelectorRow[];
  /** One report per inspected facet; complete maps include every named facet. */
  facets: readonly FacetReport[];
  /**
   * Cross-facet conflicts and semantic ABI issues. Missing events/errors are
   * withheld unless the map and every named facet ABI are both complete.
   */
  issues: readonly AbiComparisonIssue[];
}

import type { Abi, AbiFunction } from "abitype";
import { decodeFunctionResult, encodeFunctionData, parseAbi, toFunctionSelector } from "viem";
import {
  type AbiComparisonIssue,
  compareDeployedAbi,
  semanticsOf,
  signatureOf,
} from "./compare-abi.js";
import { ADDRESS_PATTERN } from "./fetch-abi.js";

/**
 * Explorer cross-check support for selector-proxy (Diamond-style) contracts.
 *
 * A selector proxy has no single implementation: its fallback looks the called
 * selector up in a registry and delegatecalls the facet found there. The
 * ERC-1967 slot is zero and explorer `getabi` returns only the dispatcher, so
 * `compareDeployedAbi(vendored, dispatcherAbi)` reports nearly every vendored
 * function as missing. Covering these contracts means resolving each selector
 * to its facet, fetching each facet's verified ABI, and comparing selector by
 * selector.
 *
 * Registry views resolved here, in order of preference:
 * 1. `facets()` (EIP-2535 loupe): the complete selector map in one call.
 * 2. `facetAddresses()` + `facetFunctionSelectors(address)` (EIP-2535 loupe):
 *    the complete map in 1+n calls.
 * 3. `facetAddress(bytes4)` or `selectorToFacet(bytes4)`: point lookups only,
 *    so the map covers exactly the probed selectors. Pendle's RouterStatic
 *    (`facetAddress`, reverts "selector not found" when unmapped) and Router
 *    (`selectorToFacet`, returns the zero address when unmapped) are this
 *    shape; neither implements the EIP-2535 loupe.
 * A contract answering none of these resolves to `source: "none"` so callers
 * can fall back to the single-implementation cross-check path cleanly.
 *
 * Transport is injected (like `fetchAbi`'s fetch): `EthCall` must resolve with
 * the returned data and throw on revert. A transport failure can therefore
 * only surface as an unavailable view or an unmapped selector, both of which
 * turn the cross-check red, never silently green.
 */

/** 4-byte function selector, lowercase whenever this module produces one. */
export type Selector = `0x${string}`;

/**
 * Where a selector→facet map came from. The two loupe sources are complete
 * maps; the two point-lookup sources cover only the probed selectors;
 * `"none"` means the contract answered no registry view at all.
 */
export type FacetSource = "facets" | "facetAddresses" | "facetAddress" | "selectorToFacet" | "none";

/** `facets()` per EIP-2535. */
export const FACETS_SELECTOR = "0x7a0ed627" as const;
/** `facetAddresses()` per EIP-2535. */
export const FACET_ADDRESSES_SELECTOR = "0x52ef6b2c" as const;
/** `facetFunctionSelectors(address)` per EIP-2535. */
export const FACET_FUNCTION_SELECTORS_SELECTOR = "0xadfca15e" as const;
/** `facetAddress(bytes4)` per EIP-2535 and Pendle's `IPMiniDiamond`. */
export const FACET_ADDRESS_SELECTOR = "0xcdffacc6" as const;
/** `selectorToFacet(bytes4)`, Pendle's `IPActionStorageV4` registry view. */
export const SELECTOR_TO_FACET_SELECTOR = "0xae7473ac" as const;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SELECTOR_PATTERN = /^0x[0-9a-fA-F]{8}$/;

const LOUPE_ABI = parseAbi([
  "function facets() view returns ((address facetAddress, bytes4[] functionSelectors)[])",
  "function facetAddresses() view returns (address[])",
  "function facetFunctionSelectors(address _facet) view returns (bytes4[])",
  "function facetAddress(bytes4 _functionSelector) view returns (address)",
  "function selectorToFacet(bytes4 selector) view returns (address)",
]);

/**
 * Injected `eth_call`: resolve with the returned data on success, throw on
 * revert. viem's `client.call` fits as
 * `async ({ to, data }) => (await client.call({ to, data })).data ?? "0x"`.
 */
export type EthCall = (request: { to: `0x${string}`; data: `0x${string}` }) => Promise<string>;

/** Injected `eth_getCode`: returns `"0x"` for an address with no code. */
export type GetCode = (address: `0x${string}`) => Promise<string>;

export interface ResolveSelectorProxyOptions {
  /** The dispatcher address every selector is resolved against. */
  proxy: string;
  /** Injected `eth_call` transport. */
  call: EthCall;
  /**
   * Selectors to resolve when only a point-lookup view exists. The loupe
   * views ignore this and return the complete map.
   */
  selectors?: readonly string[];
}

export interface SelectorProxyResolution {
  /** The resolved proxy, lowercase. */
  proxy: `0x${string}`;
  /** Which registry view produced the map. */
  source: FacetSource;
  /**
   * True when `selectorFacets` is the proxy's complete map (loupe sources).
   * Point-lookup sources cover only the probed selectors, so an absent
   * selector means "returned no facet", not "the proxy dispatches nothing
   * else".
   */
  complete: boolean;
  /** Facet for every selector that resolved to one, lowercase both sides. */
  selectorFacets: ReadonlyMap<Selector, `0x${string}`>;
  /** Distinct facets in first-seen order, lowercase. */
  facets: readonly `0x${string}`[];
}

function normalizeSelector(selector: string): Selector {
  if (!SELECTOR_PATTERN.test(selector)) {
    throw new Error(`not a 4-byte hex selector: ${selector}`);
  }
  return selector.toLowerCase() as Selector;
}

function buildCompleteResolution(
  proxy: `0x${string}`,
  source: FacetSource,
  entries: readonly (readonly [string, readonly string[]])[],
): SelectorProxyResolution {
  const selectorFacets = new Map<Selector, `0x${string}`>();
  const facets: `0x${string}`[] = [];
  for (const [rawFacet, rawSelectors] of entries) {
    const facet = rawFacet.toLowerCase() as `0x${string}`;
    // Fail closed on a corrupt map: EIP-2535 forbids a selector without a
    // facet and a selector mapped twice, so either means the loupe answer
    // cannot be trusted as a comparison base.
    if (facet === ZERO_ADDRESS) {
      throw new Error(`selector proxy ${proxy} lists selectors on the zero address`);
    }
    if (!facets.includes(facet)) facets.push(facet);
    for (const rawSelector of rawSelectors) {
      const selector = normalizeSelector(rawSelector);
      const existing = selectorFacets.get(selector);
      if (existing !== undefined && existing !== facet) {
        throw new Error(
          `selector proxy ${proxy} maps ${selector} to two facets: ${existing} and ${facet}`,
        );
      }
      selectorFacets.set(selector, facet);
    }
  }
  return { proxy, source, complete: true, selectorFacets, facets };
}

/**
 * Resolve a selector proxy's selector→facet map through the first registry
 * view the contract answers: the EIP-2535 loupe (`facets()`, then
 * `facetAddresses()` + `facetFunctionSelectors`), then the point-lookup
 * registries (`facetAddress(bytes4)`, then `selectorToFacet(bytes4)`).
 *
 * A point-lookup view counts as available only when it resolves its own
 * selector to a non-zero facet: a dispatched registry view must be able to
 * find itself, while both revert shapes seen in the wild ("INVALID_SELECTOR"
 * for an undispatched view, "selector not found" from a registry that rejects
 * unknown selectors) stay distinguishable without matching revert strings.
 * Once a view passes that probe, a revert or zero answer for a specific
 * selector means "unmapped".
 */
export async function resolveSelectorProxy(
  options: ResolveSelectorProxyOptions,
): Promise<SelectorProxyResolution> {
  const { call } = options;
  if (!ADDRESS_PATTERN.test(options.proxy)) {
    throw new Error(`not a 20-byte hex proxy address: ${options.proxy}`);
  }
  const proxy = options.proxy.toLowerCase() as `0x${string}`;
  const probeSelectors = (options.selectors ?? []).map(normalizeSelector);

  async function tryCall(data: `0x${string}`): Promise<`0x${string}` | undefined> {
    try {
      const result = await call({ to: proxy, data });
      return typeof result === "string" && result.startsWith("0x")
        ? (result as `0x${string}`)
        : undefined;
    } catch {
      return undefined;
    }
  }

  const facetsData = await tryCall(encodeFunctionData({ abi: LOUPE_ABI, functionName: "facets" }));
  if (facetsData !== undefined) {
    try {
      const decoded = decodeFunctionResult({
        abi: LOUPE_ABI,
        functionName: "facets",
        data: facetsData,
      });
      return buildCompleteResolution(
        proxy,
        "facets",
        decoded.map((facet) => [facet.facetAddress, facet.functionSelectors] as const),
      );
    } catch (error) {
      // A corrupt complete map must fail loud; only an undecodable answer
      // (e.g. a fallback that returned success without loupe data) falls
      // through to the next view.
      if (error instanceof Error && error.message.startsWith("selector proxy")) throw error;
    }
  }

  const addressesData = await tryCall(
    encodeFunctionData({ abi: LOUPE_ABI, functionName: "facetAddresses" }),
  );
  if (addressesData !== undefined) {
    let entries: (readonly [string, readonly string[]])[] | undefined = [];
    try {
      const facetAddresses = decodeFunctionResult({
        abi: LOUPE_ABI,
        functionName: "facetAddresses",
        data: addressesData,
      });
      for (const facet of facetAddresses) {
        const selectorsData = await tryCall(
          encodeFunctionData({
            abi: LOUPE_ABI,
            functionName: "facetFunctionSelectors",
            args: [facet],
          }),
        );
        if (selectorsData === undefined) {
          entries = undefined;
          break;
        }
        const selectors = decodeFunctionResult({
          abi: LOUPE_ABI,
          functionName: "facetFunctionSelectors",
          data: selectorsData,
        });
        entries.push([facet, selectors] as const);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("selector proxy")) throw error;
      entries = undefined;
    }
    // A half-working loupe (addresses answered, a selector list did not) is
    // not trusted as a complete map; fall through to the point lookups.
    if (entries !== undefined) {
      return buildCompleteResolution(proxy, "facetAddresses", entries);
    }
  }

  async function lookupFacet(
    view: "facetAddress" | "selectorToFacet",
    selector: Selector,
  ): Promise<`0x${string}` | undefined> {
    const data = await tryCall(
      encodeFunctionData({ abi: LOUPE_ABI, functionName: view, args: [selector] }),
    );
    if (data === undefined) return undefined;
    try {
      const facet = decodeFunctionResult({ abi: LOUPE_ABI, functionName: view, data });
      return facet.toLowerCase() as `0x${string}`;
    } catch {
      return undefined;
    }
  }

  for (const view of ["facetAddress", "selectorToFacet"] as const) {
    const own = view === "facetAddress" ? FACET_ADDRESS_SELECTOR : SELECTOR_TO_FACET_SELECTOR;
    const self = await lookupFacet(view, own);
    if (self === undefined || self === ZERO_ADDRESS) continue;
    const selectorFacets = new Map<Selector, `0x${string}`>();
    const facets: `0x${string}`[] = [];
    for (const selector of probeSelectors) {
      const facet = await lookupFacet(view, selector);
      if (facet === undefined || facet === ZERO_ADDRESS) continue;
      selectorFacets.set(selector, facet);
      if (!facets.includes(facet)) facets.push(facet);
    }
    return { proxy, source: view, complete: false, selectorFacets, facets };
  }

  return { proxy, source: "none", complete: false, selectorFacets: new Map(), facets: [] };
}

export interface FacetAbiUnion {
  /** Deduplicated union of the facet ABIs, first definition kept. */
  union: Abi;
  /**
   * Same canonical signature carried by two facets (or twice by one) with
   * different semantics, reported in `compareDeployedAbi`'s issue format.
   * Identical redefinitions (facets sharing a base contract's events) are
   * deduplicated silently.
   */
  conflicts: readonly AbiComparisonIssue[];
}

/**
 * Union facet ABIs into one deployed surface for `compareDeployedAbi`.
 * Constructors are excluded like the comparison itself excludes them.
 */
export function unionFacetAbis(facetAbis: ReadonlyMap<`0x${string}`, Abi>): FacetAbiUnion {
  const union: Abi[number][] = [];
  const seen = new Map<string, { facet: `0x${string}`; semantics: string }>();
  const conflicts: AbiComparisonIssue[] = [];
  for (const [facet, abi] of facetAbis) {
    for (const item of abi) {
      if (item.type === "constructor") continue;
      const record = item as unknown as Record<string, unknown>;
      const signature = signatureOf(record);
      const semantics = semanticsOf(record);
      const first = seen.get(signature);
      if (first === undefined) {
        seen.set(signature, { facet, semantics });
        union.push(item);
        continue;
      }
      if (first.semantics !== semantics) {
        conflicts.push({
          kind: "duplicate",
          signature,
          detail: `conflicting definitions between facets ${first.facet} (${first.semantics}) and ${facet} (${semantics})`,
        });
      }
    }
  }
  return { union, conflicts };
}

/** Per-selector routing verdict for one vendored function. */
export type SelectorRowStatus =
  | "matched"
  | "unmapped"
  | "facet-no-code"
  | "facet-unverified"
  | "facet-fetch-failed"
  | "not-in-facet-abi"
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
  /**
   * `verified` when the explorer returned the facet's ABI, `no-code` when
   * `eth_getCode` returned empty (the fetch is skipped), `unverified` when
   * the explorer refused with "source code not verified", `fetch-failed` for
   * every other fetch error (network, rate limit, bad key).
   */
  status: "verified" | "unverified" | "no-code" | "fetch-failed";
  /** Item count of the verified ABI. */
  abiItems?: number;
  /** The fetch error message for `unverified` and `fetch-failed`. */
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
  /**
   * Fetches one facet's explorer-verified ABI, e.g.
   * `(facet) => fetchAbi(facet, key)`. Called once per distinct facet,
   * sequentially, so explorer rate limits stay in the caller's control.
   */
  fetchFacetAbi: (facet: `0x${string}`) => Promise<Abi>;
  /** Passed through to the union `compareDeployedAbi` run. */
  allowedActualOnly?: readonly string[];
}

export interface SelectorProxyCrossCheck {
  proxy: `0x${string}`;
  /** `"none"` means not a selector proxy: `rows`, `facets`, and `issues` are
   * empty and the caller should use the single-implementation path. */
  source: FacetSource;
  complete: boolean;
  /** One routing verdict per vendored function, in vendored order. */
  rows: readonly SelectorRow[];
  /** One report per facet the vendored surface routes to. */
  facets: readonly FacetReport[];
  /**
   * Cross-facet conflicts plus `compareDeployedAbi(vendored, union)` in the
   * existing issue format. Functions are additionally verified per selector
   * in `rows`; events and errors are covered only here, against the union of
   * the routed facets' ABIs.
   */
  issues: readonly AbiComparisonIssue[];
}

/**
 * Explorer cross-check for a selector proxy: resolve every vendored function
 * selector to its facet, fetch each routed facet's verified ABI once, then
 * verify both ways: per selector (each vendored function exists on the exact
 * facet its selector dispatches to, with `compareDeployedAbi`'s semantics)
 * and against the union of the facet ABIs (which also covers events and
 * errors). An all-`matched` `rows` plus acceptable `issues` is a pass.
 */
export async function crossCheckSelectorProxyAbi(
  options: CrossCheckSelectorProxyAbiOptions,
): Promise<SelectorProxyCrossCheck> {
  const { vendored, call, getCode, fetchFacetAbi } = options;
  const targets = vendored
    .filter((item): item is AbiFunction => item.type === "function")
    .map((fn) => ({
      fn,
      selector: toFunctionSelector(fn).toLowerCase() as Selector,
      signature: signatureOf(fn as unknown as Record<string, unknown>),
    }));
  const resolution = await resolveSelectorProxy({
    proxy: options.proxy,
    call,
    selectors: [...new Set(targets.map(({ selector }) => selector))],
  });
  if (resolution.source === "none") {
    return {
      proxy: resolution.proxy,
      source: "none",
      complete: false,
      rows: [],
      facets: [],
      issues: [],
    };
  }

  const routed = new Set(
    targets
      .map(({ selector }) => resolution.selectorFacets.get(selector))
      .filter((facet) => facet !== undefined),
  );
  const facetReports: FacetReport[] = [];
  const verifiedAbis = new Map<`0x${string}`, Abi>();
  for (const facet of resolution.facets) {
    if (!routed.has(facet)) continue;
    const code = await getCode(facet);
    if (code.toLowerCase() === "0x") {
      facetReports.push({ facet, status: "no-code" });
      continue;
    }
    try {
      const abi = await fetchFacetAbi(facet);
      verifiedAbis.set(facet, abi);
      facetReports.push({ facet, status: "verified", abiItems: abi.length });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      facetReports.push({
        facet,
        status: /source code not verified/i.test(detail) ? "unverified" : "fetch-failed",
        detail,
      });
    }
  }

  const { union, conflicts } = unionFacetAbis(verifiedAbis);
  const issues = [
    ...conflicts,
    ...compareDeployedAbi(vendored, union, { allowedActualOnly: options.allowedActualOnly }),
  ];

  const reportByFacet = new Map(facetReports.map((report) => [report.facet, report]));
  const rows: SelectorRow[] = targets.map(({ fn, selector, signature }) => {
    const facet = resolution.selectorFacets.get(selector);
    if (facet === undefined) {
      return {
        selector,
        signature,
        status: "unmapped" as const,
        detail: resolution.complete
          ? "the proxy's complete facet map does not dispatch this selector"
          : "the proxy's selector registry returned no facet for this selector",
      };
    }
    const facetReport = reportByFacet.get(facet);
    if (facetReport?.status === "no-code") {
      return { selector, signature, facet, status: "facet-no-code" as const };
    }
    if (facetReport?.status === "unverified" || facetReport?.status === "fetch-failed") {
      return {
        selector,
        signature,
        facet,
        status: `facet-${facetReport.status}` as const,
        detail: facetReport.detail,
      };
    }
    let match: Record<string, unknown> | undefined;
    let collision: string | undefined;
    for (const item of verifiedAbis.get(facet) ?? []) {
      if (item.type !== "function") continue;
      const record = item as unknown as Record<string, unknown>;
      if (signatureOf(record) === signature) {
        match = record;
        break;
      }
      if ((toFunctionSelector(item).toLowerCase() as Selector) === selector) {
        collision = signatureOf(record);
      }
    }
    if (match === undefined) {
      return {
        selector,
        signature,
        facet,
        status: "not-in-facet-abi" as const,
        detail:
          collision === undefined
            ? "the facet's verified ABI does not contain this function"
            : `the facet's verified ABI implements ${collision} at this selector`,
      };
    }
    const expected = semanticsOf(fn as unknown as Record<string, unknown>);
    const actual = semanticsOf(match);
    if (expected !== actual) {
      return {
        selector,
        signature,
        facet,
        status: "mismatch" as const,
        detail: `expected ${expected}, actual ${actual}`,
      };
    }
    return { selector, signature, facet, status: "matched" as const };
  });

  return {
    proxy: resolution.proxy,
    source: resolution.source,
    complete: resolution.complete,
    rows,
    facets: facetReports,
    issues,
  };
}

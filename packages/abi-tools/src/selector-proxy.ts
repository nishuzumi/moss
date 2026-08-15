import type { Abi, AbiFunction } from "abitype";
import { decodeFunctionResult, encodeFunctionData, parseAbi, toFunctionSelector } from "viem";
import {
  type AbiComparisonIssue,
  compareDeployedAbi,
  semanticsOf,
  signatureOf,
} from "./compare-abi.js";
import { ADDRESS_PATTERN } from "./fetch-abi.js";
import type {
  CrossCheckSelectorProxyAbiOptions,
  EthCall,
  FacetAbiUnion,
  FacetReport,
  FacetSource,
  ResolveSelectorProxyOptions,
  Selector,
  SelectorProxyCrossCheck,
  SelectorProxyResolution,
  SelectorRow,
  ViemCallClient,
} from "./types.js";

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
 * Transport is injected (like `fetchAbi`'s fetch): `EthCall` must resolve
 * with the returned data and throw `EthCallRevert` on revert. Any other
 * throw is a transport failure (network, timeout, rate limit) and propagates
 * out of resolution and the cross-check unchanged, so an unreachable
 * registry fails the run loudly instead of being misread as an unavailable
 * view or an unmapped selector.
 */

const LOUPE_ABI = parseAbi([
  "function facets() view returns ((address facetAddress, bytes4[] functionSelectors)[])",
  "function facetAddresses() view returns (address[])",
  "function facetFunctionSelectors(address _facet) view returns (bytes4[])",
  "function facetAddress(bytes4 _functionSelector) view returns (address)",
  "function selectorToFacet(bytes4 selector) view returns (address)",
]);

/** Derives one loupe view's selector, so the exported constants stay pinned
 * to `LOUPE_ABI` instead of being hand-maintained hex (ADR 0007's spirit). */
function loupeSelector(name: (typeof LOUPE_ABI)[number]["name"]): Selector {
  const fn = LOUPE_ABI.find((item) => item.name === name);
  if (fn === undefined) throw new Error(`not a loupe view: ${name}`);
  return toFunctionSelector(fn).toLowerCase() as Selector;
}

/** `facets()` per EIP-2535. */
export const FACETS_SELECTOR = loupeSelector("facets");
/** `facetAddresses()` per EIP-2535. */
export const FACET_ADDRESSES_SELECTOR = loupeSelector("facetAddresses");
/** `facetFunctionSelectors(address)` per EIP-2535. */
export const FACET_FUNCTION_SELECTORS_SELECTOR = loupeSelector("facetFunctionSelectors");
/** `facetAddress(bytes4)` per EIP-2535 and Pendle's `IPMiniDiamond`. */
export const FACET_ADDRESS_SELECTOR = loupeSelector("facetAddress");
/** `selectorToFacet(bytes4)`, Pendle's `IPActionStorageV4` registry view. */
export const SELECTOR_TO_FACET_SELECTOR = loupeSelector("selectorToFacet");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const SELECTOR_PATTERN = /^0x[0-9a-fA-F]{8}$/;

// Fail-closed bounds on a complete facet map, so a hostile or corrupt loupe
// answer cannot drive unbounded per-facet calls and explorer fetches
// (precedent: discovery bounds in #41, tree bounds in #142). Real diamonds
// carry tens of facets; either bound tripping means the answer is not a map.
const MAX_FACETS = 256;
const MAX_SELECTORS = 8192;

/** Adapts viem's `client.call` to the injected `EthCall` contract. */
export function createViemEthCall(client: ViemCallClient): EthCall {
  return async ({ to, data }) => {
    try {
      return (await client.call({ to, data })).data ?? "0x";
    } catch (error) {
      // Error constructors differ when pnpm installs viem under multiple peer
      // graphs. The direct cause is viem's semantic classification; walking
      // deeper could mistake a transport error with a colliding name for a
      // revert below an UnknownRpcError.
      const cause =
        typeof error === "object" && error !== null && "cause" in error ? error.cause : undefined;
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "CallExecutionError" &&
        typeof cause === "object" &&
        cause !== null &&
        "name" in cause &&
        cause.name === "ExecutionRevertedError"
      ) {
        throw new EthCallRevert(error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
  };
}

/**
 * The one throw `EthCall` may use for an EVM revert. Everything else a
 * transport throws (network, timeout, rate limit) propagates out of
 * resolution and the cross-check, because "the registry answered no" and
 * "the registry could not be reached" must never share a verdict.
 */
export class EthCallRevert extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EthCallRevert";
  }
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
  if (entries.length > MAX_FACETS) {
    throw new Error(`selector proxy ${proxy} lists ${entries.length} facets, over ${MAX_FACETS}`);
  }
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
      if (selectorFacets.size > MAX_SELECTORS) {
        throw new Error(`selector proxy ${proxy} maps over ${MAX_SELECTORS} selectors`);
      }
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
 * A point-lookup view counts as available when it resolves its own selector
 * to a non-zero facet: a dispatched registry view must be able to find
 * itself, while both revert shapes seen in the wild ("INVALID_SELECTOR" for
 * an undispatched view, "selector not found" from a registry that rejects
 * unknown selectors) stay distinguishable without matching revert strings.
 * When `getCode` is supplied, a view that fails that self-probe (a
 * dispatcher implementing the view in its own bytecode) is still accepted
 * if a probed selector resolves to an address with deployed code. Once a
 * view is accepted, a revert or zero answer for a specific selector means
 * "unmapped".
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
    } catch (error) {
      // Only a revert means "the contract answered no"; a transport failure
      // propagates so it cannot masquerade as an unavailable view.
      if (error instanceof EthCallRevert) return undefined;
      throw error;
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
    // Decoding is the only thing a `catch` may cover in this path. A
    // transport failure inside the fanout has to propagate, so it is never
    // reclassified as a loupe that answered badly, which would drop the run
    // to a point lookup and report the whole vendored surface off a map the
    // proxy never gave.
    let facetAddresses: readonly `0x${string}`[] | undefined;
    try {
      facetAddresses = decodeFunctionResult({
        abi: LOUPE_ABI,
        functionName: "facetAddresses",
        data: addressesData,
      });
    } catch {
      facetAddresses = undefined;
    }
    if (facetAddresses !== undefined) {
      // Both bounds fire before the per-facet calls they would otherwise
      // drive: the facet bound right after the address list decodes, the
      // selector bound as each facet's list decodes, so an over-limit
      // answer stops the fanout instead of merely failing after it.
      if (facetAddresses.length > MAX_FACETS) {
        throw new Error(
          `selector proxy ${proxy} lists ${facetAddresses.length} facets, over ${MAX_FACETS}`,
        );
      }
      let entries: (readonly [string, readonly string[]])[] | undefined = [];
      let selectorBudget = 0;
      for (const facet of facetAddresses) {
        const selectorsData = await tryCall(
          encodeFunctionData({
            abi: LOUPE_ABI,
            functionName: "facetFunctionSelectors",
            args: [facet],
          }),
        );
        let selectors: readonly `0x${string}`[] | undefined;
        if (selectorsData !== undefined) {
          try {
            selectors = decodeFunctionResult({
              abi: LOUPE_ABI,
              functionName: "facetFunctionSelectors",
              data: selectorsData,
            });
          } catch {
            selectors = undefined;
          }
        }
        // A half-working loupe (addresses answered, a selector list reverted
        // or did not decode) is not trusted as a complete map; fall through
        // to the point lookups.
        if (selectors === undefined) {
          entries = undefined;
          break;
        }
        selectorBudget += selectors.length;
        if (selectorBudget > MAX_SELECTORS) {
          throw new Error(`selector proxy ${proxy} maps over ${MAX_SELECTORS} selectors`);
        }
        entries.push([facet, selectors] as const);
      }
      if (entries !== undefined) {
        return buildCompleteResolution(proxy, "facetAddresses", entries);
      }
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
    const selfResolved = self !== undefined && self !== ZERO_ADDRESS;
    if (!selfResolved && options.getCode === undefined) continue;
    const selectorFacets = new Map<Selector, `0x${string}`>();
    const facets: `0x${string}`[] = [];
    for (const selector of probeSelectors) {
      const facet = await lookupFacet(view, selector);
      if (facet === undefined || facet === ZERO_ADDRESS) continue;
      selectorFacets.set(selector, facet);
      if (!facets.includes(facet)) facets.push(facet);
    }
    if (!selfResolved) {
      // A dispatcher implementing the view in its own bytecode answers zero
      // (or reverts) for its own selector, so the self-probe alone would
      // miss it. Accept the view anyway when a probed selector resolved to
      // deployed code: a fallback returning decodable garbage yields
      // addresses without code, so this keeps the same protection.
      let anyCode = false;
      for (const facet of facets) {
        const code = await options.getCode?.(facet);
        if (code !== undefined && code.toLowerCase() !== "0x") {
          anyCode = true;
          break;
        }
      }
      if (!anyCode) continue;
    }
    return { proxy, source: view, complete: false, selectorFacets, facets };
  }

  return { proxy, source: "none", complete: false, selectorFacets: new Map(), facets: [] };
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

/**
 * Explorer cross-check for a selector proxy: resolve every vendored function
 * selector to its facet, fetch each routed facet's verified ABI once, then
 * verify both ways: per selector (each vendored function exists on the exact
 * facet its selector dispatches to, with `compareDeployedAbi`'s semantics)
 * and against the union of the facet ABIs (which also covers events and
 * errors). Callers use `status`, which also accounts for unavailable facet
 * evidence; rows and issues alone are not a pass criterion.
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
    getCode,
  });
  if (resolution.source === "none") {
    return {
      proxy: resolution.proxy,
      source: "none",
      status: "not-selector-proxy",
      complete: false,
      rows: [],
      facets: [],
      issues: [],
    };
  }

  // Events and errors are not selector-routed, so a facet carrying a
  // vendored event without any vendored function must still enter the
  // union. A complete map already names every facet; fetch them all. A
  // point-lookup map only ever names routed facets.
  const facetReports: FacetReport[] = [];
  const verifiedAbis = new Map<`0x${string}`, Abi>();
  for (const facet of resolution.facets) {
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
  const comparison = compareDeployedAbi(vendored, union, {
    allowedActualOnly: options.allowedActualOnly,
  });
  const reportByFacet = new Map(facetReports.map((report) => [report.facet, report]));
  const unavailableEvidence = facetReports.some(
    ({ status }) => status === "unverified" || status === "fetch-failed",
  );
  // Missing requires absence evidence. Events and errors need a complete map
  // with every facet ABI; a function routed to an unavailable facet has only
  // an inconclusive row, not proof that the function is absent.
  const canProveMissingEventsAndErrors = resolution.complete && !unavailableEvidence;
  const comparisonIssues = comparison.filter((issue) => {
    if (issue.kind !== "missing") return true;
    if (!issue.signature.startsWith("function ")) return canProveMissingEventsAndErrors;
    const target = targets.find(({ signature }) => signature === issue.signature);
    const facet = target === undefined ? undefined : resolution.selectorFacets.get(target.selector);
    const status = facet === undefined ? undefined : reportByFacet.get(facet)?.status;
    return status !== "unverified" && status !== "fetch-failed";
  });
  const issues = [...conflicts, ...comparisonIssues];

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
    // The whole facet ABI is scanned, not just up to the match: a second
    // function at the same selector can be listed after the vendored one, and
    // stopping at the match would drop it.
    let match: Record<string, unknown> | undefined;
    let collision: string | undefined;
    for (const item of verifiedAbis.get(facet) ?? []) {
      if (item.type !== "function") continue;
      const record = item as unknown as Record<string, unknown>;
      const itemSignature = signatureOf(record);
      if (itemSignature === signature) {
        match ??= record;
        continue;
      }
      if ((toFunctionSelector(item).toLowerCase() as Selector) === selector) {
        collision ??= itemSignature;
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
    if (collision !== undefined) {
      // Two signatures at one selector: the facet dispatches whichever its
      // bytecode routes there, so finding the vendored signature is not
      // evidence that it is the one served. The union comparison still
      // reports the other function and any mismatch on this signature.
      return {
        selector,
        signature,
        facet,
        status: "selector-collision" as const,
        detail: `the facet's verified ABI also implements ${collision} at this selector`,
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

  const mismatch =
    facetReports.some(({ status }) => status === "no-code") ||
    rows.some(
      ({ status }) =>
        status !== "matched" && status !== "facet-unverified" && status !== "facet-fetch-failed",
    ) ||
    issues.length > 0;

  return {
    proxy: resolution.proxy,
    source: resolution.source,
    status: mismatch ? "mismatch" : unavailableEvidence ? "inconclusive" : "matched",
    complete: resolution.complete,
    rows,
    facets: facetReports,
    issues,
  };
}

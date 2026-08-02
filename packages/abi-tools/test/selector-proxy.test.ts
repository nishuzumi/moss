import type { Abi } from "abitype";
import { encodeFunctionResult, getAddress, parseAbi, toFunctionSelector } from "viem";
import { describe, expect, it } from "vitest";
import {
  crossCheckSelectorProxyAbi,
  type EthCall,
  EthCallRevert,
  FACET_ADDRESS_SELECTOR,
  FACET_ADDRESSES_SELECTOR,
  FACET_FUNCTION_SELECTORS_SELECTOR,
  FACETS_SELECTOR,
  resolveSelectorProxy,
  SELECTOR_TO_FACET_SELECTOR,
  type Selector,
  unionFacetAbis,
} from "../src/selector-proxy.js";

const PROXY = "0x1000000000000000000000000000000000000001";
const FACET_A = "0x000000000000000000000000000000000000aaaa";
const FACET_B = "0x000000000000000000000000000000000000bbbb";
const REGISTRY_FACET = "0x000000000000000000000000000000000000cccc";
const ZERO = "0x0000000000000000000000000000000000000000";

// The same five views the module encodes against, for building fake answers.
const LOUPE = parseAbi([
  "function facets() view returns ((address facetAddress, bytes4[] functionSelectors)[])",
  "function facetAddresses() view returns (address[])",
  "function facetFunctionSelectors(address _facet) view returns (bytes4[])",
  "function facetAddress(bytes4 _functionSelector) view returns (address)",
  "function selectorToFacet(bytes4 selector) view returns (address)",
]);

const transfer = {
  type: "function",
  name: "transfer",
  inputs: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
  ],
  outputs: [{ name: "", type: "bool" }],
  stateMutability: "nonpayable",
} as const;

const balanceOf = {
  type: "function",
  name: "balanceOf",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
  stateMutability: "view",
} as const;

const transferEvent = {
  type: "event",
  name: "Transfer",
  anonymous: false,
  inputs: [
    { name: "from", type: "address", indexed: true },
    { name: "to", type: "address", indexed: true },
    { name: "value", type: "uint256", indexed: false },
  ],
} as const;

/** The classic 4-byte collision: different signatures, one selector. */
const burn = {
  type: "function",
  name: "burn",
  inputs: [{ name: "amount", type: "uint256" }],
  outputs: [],
  stateMutability: "nonpayable",
} as const;

const collider = {
  type: "function",
  name: "collate_propagate_storage",
  inputs: [{ name: "data", type: "bytes16" }],
  outputs: [],
  stateMutability: "nonpayable",
} as const;

const TRANSFER = toFunctionSelector(transfer) as Selector;
const BALANCE_OF = toFunctionSelector(balanceOf) as Selector;
const BURN = toFunctionSelector(burn) as Selector;
const UNKNOWN = "0xdeadbeef" as Selector;

/** bytes4 argument of a point lookup: left-aligned in the single word. */
const argSelector = (data: string): string => `0x${data.slice(10, 18)}`;

/** address argument of `facetFunctionSelectors`: right-aligned in the word. */
const argAddress = (data: string): string => `0x${data.slice(34, 74)}`;

/**
 * A registry that answers exactly one point-lookup view, like Pendle's two
 * dispatchers: RouterStatic's `facetAddress` reverts "selector not found"
 * when unmapped, Router's `selectorToFacet` returns the zero address and
 * never reverts. Every other call reverts like a dispatched fallback.
 */
function pointLookupCall(
  view: "facetAddress" | "selectorToFacet",
  map: Record<string, `0x${string}`>,
): EthCall {
  const own = view === "facetAddress" ? FACET_ADDRESS_SELECTOR : SELECTOR_TO_FACET_SELECTOR;
  return async ({ to, data }) => {
    expect(to).toBe(PROXY);
    if (!data.startsWith(own)) throw new EthCallRevert("INVALID_SELECTOR");
    const facet = map[argSelector(data)];
    if (view === "facetAddress") {
      if (facet === undefined) throw new EthCallRevert("selector not found");
      return encodeFunctionResult({ abi: LOUPE, functionName: view, result: facet });
    }
    return encodeFunctionResult({ abi: LOUPE, functionName: view, result: facet ?? ZERO });
  };
}

type FacetEntries = readonly (readonly [`0x${string}`, readonly Selector[]])[];

/** A loupe answering `facets()` with the complete map in one call. */
function facetsCall(entries: FacetEntries): EthCall {
  return async ({ data }) => {
    if (!data.startsWith(FACETS_SELECTOR)) throw new EthCallRevert("function does not exist");
    return encodeFunctionResult({
      abi: LOUPE,
      functionName: "facets",
      result: entries.map(([facetAddress, functionSelectors]) => ({
        facetAddress,
        functionSelectors: [...functionSelectors],
      })),
    });
  };
}

/** A loupe answering only `facetAddresses()` + `facetFunctionSelectors()`. */
function facetAddressesCall(entries: FacetEntries): EthCall {
  return async ({ data }) => {
    if (data.startsWith(FACET_ADDRESSES_SELECTOR)) {
      return encodeFunctionResult({
        abi: LOUPE,
        functionName: "facetAddresses",
        result: entries.map(([facet]) => facet),
      });
    }
    if (data.startsWith(FACET_FUNCTION_SELECTORS_SELECTOR)) {
      const entry = entries.find(([facet]) => facet === argAddress(data));
      if (entry === undefined) throw new EthCallRevert("unknown facet");
      return encodeFunctionResult({
        abi: LOUPE,
        functionName: "facetFunctionSelectors",
        result: [...entry[1]],
      });
    }
    throw new EthCallRevert("function does not exist");
  };
}

const revertingCall: EthCall = async () => {
  throw new EthCallRevert("execution reverted");
};

describe("loupe selector constants", () => {
  it("derives the selectors the specs publish", () => {
    // Pinned against the published values (EIP-2535 for the four loupe views,
    // Pendle's IPActionStorageV4 for selectorToFacet). The derivation covers a
    // hand-typed constant; this covers a typo in a LOUPE_ABI signature string,
    // which would otherwise be wrong on both sides of a fake-transport match.
    expect({
      facets: FACETS_SELECTOR,
      facetAddresses: FACET_ADDRESSES_SELECTOR,
      facetFunctionSelectors: FACET_FUNCTION_SELECTORS_SELECTOR,
      facetAddress: FACET_ADDRESS_SELECTOR,
      selectorToFacet: SELECTOR_TO_FACET_SELECTOR,
    }).toEqual({
      facets: "0x7a0ed627",
      facetAddresses: "0x52ef6b2c",
      facetFunctionSelectors: "0xadfca15e",
      facetAddress: "0xcdffacc6",
      selectorToFacet: "0xae7473ac",
    });
  });
});

describe("resolveSelectorProxy", () => {
  it("resolves the complete map through facets()", async () => {
    const resolution = await resolveSelectorProxy({
      proxy: PROXY,
      call: facetsCall([
        [FACET_A, [TRANSFER, BALANCE_OF]],
        [FACET_B, [UNKNOWN]],
      ]),
    });
    expect(resolution).toMatchObject({ proxy: PROXY, source: "facets", complete: true });
    expect(resolution.facets).toEqual([FACET_A, FACET_B]);
    expect([...resolution.selectorFacets]).toEqual([
      [TRANSFER, FACET_A],
      [BALANCE_OF, FACET_A],
      [UNKNOWN, FACET_B],
    ]);
  });

  it("falls back to facetAddresses() + facetFunctionSelectors()", async () => {
    const resolution = await resolveSelectorProxy({
      proxy: PROXY,
      call: facetAddressesCall([
        [FACET_A, [TRANSFER]],
        [FACET_B, [BALANCE_OF]],
      ]),
    });
    expect(resolution).toMatchObject({ source: "facetAddresses", complete: true });
    expect([...resolution.selectorFacets]).toEqual([
      [TRANSFER, FACET_A],
      [BALANCE_OF, FACET_B],
    ]);
  });

  it.each([
    ["a reverting facetAddress registry", "facetAddress"],
    ["a zero-returning selectorToFacet registry", "selectorToFacet"],
  ] as const)("probes selectors through %s", async (_name, view) => {
    const own = view === "facetAddress" ? FACET_ADDRESS_SELECTOR : SELECTOR_TO_FACET_SELECTOR;
    const resolution = await resolveSelectorProxy({
      proxy: PROXY,
      call: pointLookupCall(view, { [own]: REGISTRY_FACET, [TRANSFER]: FACET_A }),
      selectors: [TRANSFER, UNKNOWN],
    });
    expect(resolution).toMatchObject({ source: view, complete: false });
    // The unmapped selector is absent, whether the registry reverted or
    // answered the zero address.
    expect([...resolution.selectorFacets]).toEqual([[TRANSFER, FACET_A]]);
    expect(resolution.facets).toEqual([FACET_A]);
  });

  it("normalizes the proxy address and probe selectors to lowercase", async () => {
    // The registry answers the checksummed (mixed-case) facet address; the
    // proxy and the probe selector arrive uppercase from the caller.
    const checksummed = getAddress("0x3bd359c1119da7da1d913d1c4d2b7c461115433a");
    expect(checksummed).not.toBe(checksummed.toLowerCase());
    const resolution = await resolveSelectorProxy({
      proxy: PROXY.toUpperCase().replace("0X", "0x"),
      call: pointLookupCall("selectorToFacet", {
        [SELECTOR_TO_FACET_SELECTOR]: REGISTRY_FACET,
        [TRANSFER]: checksummed,
      }),
      selectors: [TRANSFER.toUpperCase().replace("0X", "0x")],
    });
    expect(resolution.proxy).toBe(PROXY);
    expect([...resolution.selectorFacets]).toEqual([
      [TRANSFER, checksummed.toLowerCase() as `0x${string}`],
    ]);
  });

  it.each([
    ["every view reverts", revertingCall],
    [
      "the registry cannot resolve its own selector",
      pointLookupCall("selectorToFacet", { [TRANSFER]: FACET_A }),
    ],
  ] as const)("resolves to none when %s", async (_name, call) => {
    const resolution = await resolveSelectorProxy({ proxy: PROXY, call, selectors: [TRANSFER] });
    expect(resolution).toMatchObject({ source: "none", complete: false });
    expect(resolution.selectorFacets.size).toBe(0);
    expect(resolution.facets).toEqual([]);
  });

  it("falls through to a point lookup when the loupe answer is undecodable", async () => {
    // A catch-all fallback that returns empty success for the loupe views
    // must not be trusted as a loupe; the point lookup still resolves.
    const registry = pointLookupCall("selectorToFacet", {
      [SELECTOR_TO_FACET_SELECTOR]: REGISTRY_FACET,
      [TRANSFER]: FACET_A,
    });
    const resolution = await resolveSelectorProxy({
      proxy: PROXY,
      call: async (request) => {
        if (
          request.data.startsWith(FACETS_SELECTOR) ||
          request.data.startsWith(FACET_ADDRESSES_SELECTOR)
        ) {
          return "0x";
        }
        return registry(request);
      },
      selectors: [TRANSFER],
    });
    expect(resolution).toMatchObject({ source: "selectorToFacet", complete: false });
    expect([...resolution.selectorFacets]).toEqual([[TRANSFER, FACET_A]]);
  });

  it.each([
    ["selectors on the zero address", [[ZERO, [TRANSFER]]] as FacetEntries, /zero address/],
    [
      "a selector mapped to two facets",
      [
        [FACET_A, [TRANSFER]],
        [FACET_B, [TRANSFER]],
      ] as FacetEntries,
      /maps 0xa9059cbb to two facets/,
    ],
  ])("fails loud on a corrupt complete map with %s", async (_name, entries, message) => {
    await expect(resolveSelectorProxy({ proxy: PROXY, call: facetsCall(entries) })).rejects.toThrow(
      message,
    );
  });

  it("rejects malformed input before any call", async () => {
    const call: EthCall = async () => {
      throw new Error("must not be called");
    };
    await expect(resolveSelectorProxy({ proxy: "not-an-address", call })).rejects.toThrow(
      /not a 20-byte hex proxy address/,
    );
    await expect(
      resolveSelectorProxy({ proxy: PROXY, call, selectors: ["0xa9059c"] }),
    ).rejects.toThrow(/not a 4-byte hex selector/);
  });

  it("propagates a transport failure instead of reading it as an unavailable view", async () => {
    const call: EthCall = async () => {
      throw new Error("ECONNRESET");
    };
    await expect(resolveSelectorProxy({ proxy: PROXY, call })).rejects.toThrow("ECONNRESET");
  });

  it("propagates a transport failure on one probe instead of reporting it unmapped", async () => {
    // The registry genuinely dispatches TRANSFER, but that one call dies on
    // the socket. The failure must surface as the failure it is, not as
    // "returned no facet".
    const registry = pointLookupCall("selectorToFacet", {
      [SELECTOR_TO_FACET_SELECTOR]: REGISTRY_FACET,
      [TRANSFER]: FACET_A,
    });
    const call: EthCall = async (request) => {
      if (argSelector(request.data) === TRANSFER) throw new Error("socket hang up");
      return registry(request);
    };
    await expect(
      resolveSelectorProxy({ proxy: PROXY, call, selectors: [TRANSFER] }),
    ).rejects.toThrow("socket hang up");
  });

  it("accepts a self-implemented point-lookup view through the facet code check", async () => {
    // A dispatcher implementing selectorToFacet in its own bytecode answers
    // the zero address for the view's own selector, so the self-probe fails;
    // a probed selector resolving to deployed code accepts the view anyway.
    const call = pointLookupCall("selectorToFacet", { [TRANSFER]: FACET_A });
    const resolution = await resolveSelectorProxy({
      proxy: PROXY,
      call,
      selectors: [TRANSFER],
      getCode: async (address) => (address === FACET_A ? "0x6080" : "0x"),
    });
    expect(resolution).toMatchObject({ source: "selectorToFacet", complete: false });
    expect([...resolution.selectorFacets]).toEqual([[TRANSFER, FACET_A]]);
  });

  it("still resolves to none when the code-check fallback finds no deployed code", async () => {
    // A catch-all fallback can return decodable garbage addresses; without
    // code behind any of them the view stays untrusted.
    const call = pointLookupCall("selectorToFacet", { [TRANSFER]: FACET_A });
    const resolution = await resolveSelectorProxy({
      proxy: PROXY,
      call,
      selectors: [TRANSFER],
      getCode: async () => "0x",
    });
    expect(resolution).toMatchObject({ source: "none", complete: false });
  });

  it("fails loud on a complete map over the facet or selector bounds", async () => {
    const manyFacets: FacetEntries = Array.from({ length: 257 }, (_, index) => [
      `0x${(index + 1).toString(16).padStart(40, "0")}` as `0x${string}`,
      [`0x${index.toString(16).padStart(8, "0")}` as Selector],
    ]);
    await expect(
      resolveSelectorProxy({ proxy: PROXY, call: facetsCall(manyFacets) }),
    ).rejects.toThrow(/257 facets, over 256/);
    const manySelectors: FacetEntries = [
      [
        FACET_A,
        Array.from(
          { length: 8193 },
          (_, index) => `0x${index.toString(16).padStart(8, "0")}` as Selector,
        ),
      ],
    ];
    await expect(
      resolveSelectorProxy({ proxy: PROXY, call: facetsCall(manySelectors) }),
    ).rejects.toThrow(/maps over 8192 selectors/);
  });

  it("bounds the facetAddresses() fanout before making the per-facet calls", async () => {
    // The facet bound must reject right after the address list decodes: 257
    // listed facets means zero facetFunctionSelectors calls, not 257 calls
    // followed by the throw.
    const manyFacets: FacetEntries = Array.from({ length: 257 }, (_, index) => [
      `0x${(index + 1).toString(16).padStart(40, "0")}` as `0x${string}`,
      [`0x${index.toString(16).padStart(8, "0")}` as Selector],
    ]);
    const inner = facetAddressesCall(manyFacets);
    let selectorCalls = 0;
    const counting: EthCall = async (request) => {
      if (request.data.startsWith(FACET_FUNCTION_SELECTORS_SELECTOR)) selectorCalls += 1;
      return inner(request);
    };
    await expect(resolveSelectorProxy({ proxy: PROXY, call: counting })).rejects.toThrow(
      /257 facets, over 256/,
    );
    expect(selectorCalls).toBe(0);
  });

  it("stops the facetAddresses() fanout when the selector budget crosses mid-loop", async () => {
    // The cumulative selector bound is checked as each facet's list decodes,
    // so one over-budget facet early in the list stops before any call to
    // the facets after it.
    const bigFacet = [
      FACET_A,
      Array.from(
        { length: 8193 },
        (_, index) => `0x${index.toString(16).padStart(8, "0")}` as Selector,
      ),
    ] as const;
    const entries: FacetEntries = [bigFacet, [FACET_B, [TRANSFER]]];
    const inner = facetAddressesCall(entries);
    let selectorCalls = 0;
    const counting: EthCall = async (request) => {
      if (request.data.startsWith(FACET_FUNCTION_SELECTORS_SELECTOR)) selectorCalls += 1;
      return inner(request);
    };
    await expect(resolveSelectorProxy({ proxy: PROXY, call: counting })).rejects.toThrow(
      /maps over 8192 selectors/,
    );
    expect(selectorCalls).toBe(1);
  });

  it("propagates a transport failure during the facetAddresses() fanout", async () => {
    // The loupe answers the address list, then one per-facet call dies on the
    // socket. Reading that as a half-working loupe would drop the run to the
    // point lookups (here, source "none"), so a reachable diamond would have
    // its whole vendored surface judged against a map the proxy never gave.
    const inner = facetAddressesCall([
      [FACET_A, [TRANSFER]],
      [FACET_B, [BALANCE_OF]],
    ]);
    const call: EthCall = async (request) => {
      if (
        request.data.startsWith(FACET_FUNCTION_SELECTORS_SELECTOR) &&
        argAddress(request.data) === FACET_B
      ) {
        throw new Error("socket hang up");
      }
      return inner(request);
    };
    await expect(resolveSelectorProxy({ proxy: PROXY, call })).rejects.toThrow("socket hang up");
  });
});

describe("unionFacetAbis", () => {
  it("dedupes identical redefinitions, keeps the first, and drops constructors", () => {
    const constructorItem = {
      type: "constructor",
      stateMutability: "nonpayable",
      inputs: [],
    } as Abi[number];
    const { union, conflicts } = unionFacetAbis(
      new Map<`0x${string}`, Abi>([
        [FACET_A, [transfer, transferEvent]],
        [FACET_B, [constructorItem, transferEvent, balanceOf]],
      ]),
    );
    expect(union).toEqual([transfer, transferEvent, balanceOf]);
    expect(conflicts).toEqual([]);
  });

  it("reports the same signature with different semantics as a conflict", () => {
    const payableTransfer = { ...transfer, stateMutability: "payable" } as Abi[number];
    const { union, conflicts } = unionFacetAbis(
      new Map<`0x${string}`, Abi>([
        [FACET_A, [transfer]],
        [FACET_B, [payableTransfer]],
      ]),
    );
    expect(union).toEqual([transfer]);
    expect(conflicts).toMatchObject([
      { kind: "duplicate", signature: "function transfer(address,uint256)" },
    ]);
    expect(conflicts[0]?.detail).toMatch(new RegExp(`${FACET_A}.*${FACET_B}`));
  });
});

describe("crossCheckSelectorProxyAbi", () => {
  const hasCode = async () => "0x6080";

  function fetcher(abis: Record<string, Abi>) {
    const fetched: `0x${string}`[] = [];
    return {
      fetched,
      fetchFacetAbi: async (facet: `0x${string}`) => {
        fetched.push(facet);
        const abi = abis[facet];
        if (abi === undefined) throw new Error("Contract source code not verified");
        return abi;
      },
    };
  }

  it("passes a fully routed Router-shape proxy selector by selector", async () => {
    const { fetched, fetchFacetAbi } = fetcher({
      [FACET_A]: [transfer, transferEvent],
      [FACET_B]: [balanceOf],
    });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer, balanceOf, transferEvent],
      proxy: PROXY,
      call: pointLookupCall("selectorToFacet", {
        [SELECTOR_TO_FACET_SELECTOR]: REGISTRY_FACET,
        [TRANSFER]: FACET_A,
        [BALANCE_OF]: FACET_B,
      }),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result).toMatchObject({ proxy: PROXY, source: "selectorToFacet", complete: false });
    expect(result.rows).toEqual([
      {
        selector: TRANSFER,
        signature: "function transfer(address,uint256)",
        facet: FACET_A,
        status: "matched",
      },
      {
        selector: BALANCE_OF,
        signature: "function balanceOf(address)",
        facet: FACET_B,
        status: "matched",
      },
    ]);
    expect(result.facets).toEqual([
      { facet: FACET_A, status: "verified", abiItems: 2 },
      { facet: FACET_B, status: "verified", abiItems: 1 },
    ]);
    expect(result.issues).toEqual([]);
    // Each routed facet is fetched exactly once; the registry's own facet is
    // not routed by any vendored selector and must not be fetched at all.
    expect(fetched).toEqual([FACET_A, FACET_B]);
  });

  it("covers the RouterStatic shape and flags vendored selectors the registry rejects", async () => {
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [transfer] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer, balanceOf],
      proxy: PROXY,
      call: pointLookupCall("facetAddress", {
        [FACET_ADDRESS_SELECTOR]: REGISTRY_FACET,
        [TRANSFER]: FACET_A,
      }),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result).toMatchObject({ source: "facetAddress", complete: false });
    expect(result.rows[0]).toMatchObject({ selector: TRANSFER, status: "matched" });
    expect(result.rows[1]).toMatchObject({ selector: BALANCE_OF, status: "unmapped" });
    expect(result.rows[1]?.detail).toMatch(/returned no facet/);
    // The union comparison sees only the routed facet's ABI, so the unmapped
    // function also surfaces as missing.
    expect(result.issues).toEqual([{ kind: "missing", signature: "function balanceOf(address)" }]);
  });

  it("distinguishes the unmapped detail for a complete loupe map", async () => {
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [transfer] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer, balanceOf],
      proxy: PROXY,
      call: facetsCall([[FACET_A, [TRANSFER]]]),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result).toMatchObject({ source: "facets", complete: true });
    expect(result.rows[1]).toMatchObject({ selector: BALANCE_OF, status: "unmapped" });
    expect(result.rows[1]?.detail).toMatch(/complete facet map does not dispatch/);
  });

  it("covers a vendored event carried by a facet no vendored function routes to", async () => {
    // Ordinary diamond layout: the event lives on facet B, whose functions
    // are all outside the vendored surface. With a complete map every facet
    // is known, so B must enter the union and the event must not read as
    // missing from the deployment.
    const { fetched, fetchFacetAbi } = fetcher({
      [FACET_A]: [transfer],
      [FACET_B]: [transferEvent],
    });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer, transferEvent],
      proxy: PROXY,
      call: facetsCall([
        [FACET_A, [TRANSFER]],
        [FACET_B, [UNKNOWN]],
      ]),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result).toMatchObject({ source: "facets", complete: true });
    expect(result.rows).toMatchObject([{ selector: TRANSFER, status: "matched" }]);
    expect(fetched).toEqual([FACET_A, FACET_B]);
    expect(result.issues).toEqual([]);
  });

  it("still reports a missing event as missing when the complete map cannot explain it", async () => {
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [transfer] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer, transferEvent],
      proxy: PROXY,
      call: facetsCall([[FACET_A, [TRANSFER]]]),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result.issues).toEqual([
      { kind: "missing", signature: "event Transfer(address,address,uint256)" },
    ]);
  });

  it("keeps event coverage best-effort under a point-lookup source", async () => {
    // The registry cannot enumerate facets, so an event absent from the
    // routed union may live on an unreachable facet: no missing verdict.
    // A missing vendored function still surfaces; its evidence is complete
    // because the registry was asked about that exact selector.
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [transfer] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer, balanceOf, transferEvent],
      proxy: PROXY,
      call: pointLookupCall("selectorToFacet", {
        [SELECTOR_TO_FACET_SELECTOR]: REGISTRY_FACET,
        [TRANSFER]: FACET_A,
      }),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result).toMatchObject({ source: "selectorToFacet", complete: false });
    expect(result.rows[1]).toMatchObject({ selector: BALANCE_OF, status: "unmapped" });
    expect(result.issues).toEqual([{ kind: "missing", signature: "function balanceOf(address)" }]);
  });

  it("propagates a transport failure out of the cross-check", async () => {
    const registry = pointLookupCall("selectorToFacet", {
      [SELECTOR_TO_FACET_SELECTOR]: REGISTRY_FACET,
      [TRANSFER]: FACET_A,
    });
    const call: EthCall = async (request) => {
      if (argSelector(request.data) === TRANSFER) throw new Error("HTTP 429");
      return registry(request);
    };
    await expect(
      crossCheckSelectorProxyAbi({
        vendored: [transfer],
        proxy: PROXY,
        call,
        getCode: hasCode,
        fetchFacetAbi: async () => {
          throw new Error("must not fetch");
        },
      }),
    ).rejects.toThrow("HTTP 429");
  });

  it.each([
    [
      "no code",
      { getCode: async () => "0x", failure: undefined },
      { facet: { status: "no-code" }, row: { status: "facet-no-code" } },
    ],
    [
      "an unverified facet",
      { getCode: undefined, failure: "Contract source code not verified" },
      {
        facet: { status: "unverified" },
        row: { status: "facet-unverified", detail: "Contract source code not verified" },
      },
    ],
    [
      "a failing explorer fetch",
      { getCode: undefined, failure: "HTTP 503" },
      {
        facet: { status: "fetch-failed" },
        row: { status: "facet-fetch-failed", detail: "HTTP 503" },
      },
    ],
  ] as const)("turns a facet with %s red instead of green", async (_name, setup, expected) => {
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer],
      proxy: PROXY,
      call: facetsCall([[FACET_A, [TRANSFER]]]),
      getCode: setup.getCode ?? hasCode,
      fetchFacetAbi: async () => {
        throw new Error(setup.failure ?? "must not fetch a codeless facet");
      },
    });
    expect(result.facets).toMatchObject([{ facet: FACET_A, ...expected.facet }]);
    expect(result.rows).toMatchObject([{ selector: TRANSFER, facet: FACET_A, ...expected.row }]);
  });

  it("reports a function absent from its routed facet, naming any selector collision", async () => {
    expect(toFunctionSelector(collider)).toBe(toFunctionSelector(burn));
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [collider], [FACET_B]: [] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [burn, transfer],
      proxy: PROXY,
      call: facetsCall([
        [FACET_A, [BURN]],
        [FACET_B, [TRANSFER]],
      ]),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result.rows[0]).toMatchObject({ facet: FACET_A, status: "not-in-facet-abi" });
    expect(result.rows[0]?.detail).toMatch(
      /implements function collate_propagate_storage\(bytes16\)/,
    );
    expect(result.rows[1]).toMatchObject({ facet: FACET_B, status: "not-in-facet-abi" });
    expect(result.rows[1]?.detail).toMatch(/does not contain this function/);
  });

  it.each([
    ["after the vendored signature", [burn, collider]],
    ["before it", [collider, burn]],
  ] as const)("does not pass a row when a collider is listed %s", async (_name, items) => {
    // Both signatures hash to 0x42966c68, so the facet dispatches only one
    // of them. Finding the vendored signature in the ABI is not evidence
    // that it is the one served, in either ABI order.
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [...items] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [burn],
      proxy: PROXY,
      call: facetsCall([[FACET_A, [BURN]]]),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result.rows).toMatchObject([
      { selector: BURN, facet: FACET_A, status: "selector-collision" },
    ]);
    expect(result.rows[0]?.detail).toMatch(
      /also implements function collate_propagate_storage\(bytes16\)/,
    );
    // The other function still surfaces in the union comparison.
    expect(result.issues).toMatchObject([
      { kind: "unexpected", signature: "function collate_propagate_storage(bytes16)" },
    ]);
  });

  it("reports changed semantics on the routed facet as a mismatch", async () => {
    const changed = { ...transfer, outputs: [{ name: "", type: "uint256" }] } as Abi[number];
    const { fetchFacetAbi } = fetcher({ [FACET_A]: [changed] });
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer],
      proxy: PROXY,
      call: facetsCall([[FACET_A, [TRANSFER]]]),
      getCode: hasCode,
      fetchFacetAbi,
    });
    expect(result.rows[0]).toMatchObject({ status: "mismatch" });
    expect(result.rows[0]?.detail).toMatch(/outputs=\(bool\).*outputs=\(uint256\)/);
    expect(result.issues).toMatchObject([
      { kind: "mismatch", signature: "function transfer(address,uint256)" },
    ]);
  });

  it("surfaces cross-facet conflicts and honors the actual-only allowlist", async () => {
    const payableTransfer = { ...transfer, stateMutability: "payable" } as Abi[number];
    const pause = {
      type: "function",
      name: "pause",
      inputs: [],
      outputs: [],
      stateMutability: "nonpayable",
    } as Abi[number];
    const { fetchFacetAbi } = fetcher({
      [FACET_A]: [transfer, pause],
      [FACET_B]: [balanceOf, payableTransfer],
    });
    const options = {
      vendored: [transfer, balanceOf] as Abi,
      proxy: PROXY,
      call: facetsCall([
        [FACET_A, [TRANSFER]],
        [FACET_B, [BALANCE_OF]],
      ]),
      getCode: hasCode,
      fetchFacetAbi,
    };
    const strict = await crossCheckSelectorProxyAbi(options);
    // The vendored selector still matches its own facet; the conflicting
    // redefinition on the other facet and the unlisted extra both surface.
    expect(strict.rows).toMatchObject([{ status: "matched" }, { status: "matched" }]);
    expect(strict.issues).toMatchObject([
      { kind: "duplicate", signature: "function transfer(address,uint256)" },
      { kind: "unexpected", signature: "function pause()" },
    ]);

    const { fetchFacetAbi: refetch } = fetcher({
      [FACET_A]: [transfer, pause],
      [FACET_B]: [balanceOf, payableTransfer],
    });
    const allowed = await crossCheckSelectorProxyAbi({
      ...options,
      fetchFacetAbi: refetch,
      allowedActualOnly: ["function pause()"],
    });
    expect(allowed.issues).toMatchObject([
      { kind: "duplicate", signature: "function transfer(address,uint256)" },
    ]);
  });

  it("hands a non-proxy back untouched as source none", async () => {
    const result = await crossCheckSelectorProxyAbi({
      vendored: [transfer],
      proxy: PROXY,
      call: revertingCall,
      getCode: hasCode,
      fetchFacetAbi: async () => {
        throw new Error("must not fetch");
      },
    });
    expect(result).toEqual({
      proxy: PROXY,
      source: "none",
      complete: false,
      rows: [],
      facets: [],
      issues: [],
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  type AddressValue,
  Capability,
  type Change,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
  Registry,
  tokenMetadata,
  transaction,
} from "../src/index.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as const;
const ONCHAIN = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa" as const;
const TRUSTED = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" as const;
const PACKAGE = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as const;
const ORDINARY = "0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd" as const;
const noParams = {} satisfies ParamsSpec;

function queryObservationMarker(): symbol {
  const marker = Object.getOwnPropertySymbols(tokenMetadata({}, { address: ONCHAIN }))[0];
  if (!marker) throw new Error("missing Query observation marker");
  return marker;
}

const observationMarker = queryObservationMarker();

function forgedObservation(observation: unknown) {
  return Object.defineProperty({}, observationMarker, {
    value: observation,
    enumerable: false,
  });
}

@Protocol({
  name: "observed-token",
  category: "token",
  description: "Query observation fixture.",
  contracts: {},
  labels: { PackageToken: PACKAGE },
})
class ObservedTokenProtocol {
  @Query({ intent: "Observe safe token metadata", params: noParams })
  async observeSafe() {
    const result = {
      address: ONCHAIN,
      symbol: "CHAIN",
      name: "Chain Token",
      decimals: 18,
    } as const;
    return tokenMetadata(result, {
      address: ONCHAIN,
      symbol: result.symbol,
      name: result.name,
    });
  }

  @Query({ intent: "Observe metadata with a name fallback", params: noParams })
  async observeFallback() {
    return tokenMetadata(
      { status: "fallback" as const },
      { address: ONCHAIN, symbol: "Bad/Name", name: "Fallback Name" },
    );
  }

  @Query({ intent: "Replace observed metadata", params: noParams })
  async observeReplacement() {
    return tokenMetadata(
      { status: "replacement" as const },
      { address: ONCHAIN, symbol: "NEXT", name: "Next Token" },
    );
  }

  @Query({ intent: "Delete unsafe observed metadata", params: noParams })
  async observeUnsafe() {
    return tokenMetadata(
      { status: "unsafe" as const },
      { address: ONCHAIN, symbol: "Bad/Name", name: "x".repeat(33) },
    );
  }

  @Query({ intent: "Observe metadata for a Trusted token", params: noParams })
  async observeTrusted() {
    return tokenMetadata({ status: "trusted" as const }, { address: TRUSTED, symbol: "CHAIN-T" });
  }

  @Query({ intent: "Observe metadata for a Package token", params: noParams })
  async observePackage() {
    return tokenMetadata({ status: "package" as const }, { address: PACKAGE, symbol: "CHAIN-P" });
  }

  @Query({ intent: "Return ordinary metadata-shaped fields", params: noParams })
  async ordinaryFields() {
    return { address: ORDINARY, symbol: "ORD", name: "Ordinary Token" };
  }

  @Query({ intent: "Fail the metadata Query", params: noParams })
  async fail() {
    throw new Error("metadata unavailable");
  }

  @Query({ intent: "Return an unknown observation", params: noParams })
  async unknownObservation() {
    return forgedObservation({ kind: "futureObservation", address: ONCHAIN });
  }

  @Query({ intent: "Return malformed token metadata", params: noParams })
  async malformedObservation() {
    return forgedObservation({ kind: "tokenMetadata", address: ONCHAIN, symbol: 7 });
  }

  @Capability<ObservedTokenProtocol, typeof noParams>({
    intent: "Render observed token labels",
    verb: "transfer",
    params: noParams,
    receipt: "renderReceipt",
    risk: ["fundOut"],
  })
  async render(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return transaction(ctx.account, ONCHAIN);
  }

  @Receipt()
  renderReceipt(_: readonly Change[]): ReceiptResult<null> {
    return {
      kind: "receipt",
      outcome: null,
      text: `onchain ${ONCHAIN.toLowerCase()} trusted ${TRUSTED} package ${PACKAGE} ordinary ${ORDINARY}`,
      changes: [],
    };
  }
}

const runtime: MossRuntime = {
  rpcUrl: "http://offline",
  // biome-ignore lint/suspicious/noExplicitAny: calls are not used by this unit test
  client: {} as any,
};

async function runQuery(registry: Registry, method: string) {
  return registry.action("observed-token", method, ACCOUNT, {});
}

async function renderText(registry: Registry): Promise<string> {
  const capability = await registry.action("observed-token", "render", ACCOUNT, {});
  if (capability.kind !== "capability") throw new Error("expected Capability");
  return registry.parseReceipt(capability, []).text;
}

describe("Registry Query observations", () => {
  it("keeps tokenMetadata invisible while preserving the exact result object", () => {
    const result = { kind: "metadata" as const, decimals: 18 as const };
    const observed = tokenMetadata(result, { address: ONCHAIN, symbol: "CHAIN" });

    expect(observed).toBe(result);
    expect(Object.keys(observed)).toEqual(["kind", "decimals"]);
    expect({ ...observed }).toEqual({ kind: "metadata", decimals: 18 });
    expect(JSON.parse(JSON.stringify(observed))).toEqual({ kind: "metadata", decimals: 18 });
    const [marker] = Object.getOwnPropertySymbols(observed);
    expect(marker).toBe(observationMarker);
    expect(Object.getOwnPropertyDescriptor(observed, marker as symbol)).toMatchObject({
      enumerable: false,
      configurable: false,
      writable: false,
    });
  });

  it("returns ordinary JSON and learns a case-insensitive OnChain label", async () => {
    const registry = new Registry(runtime).use(ObservedTokenProtocol);
    const query = await runQuery(registry, "observeSafe");

    expect(query).toEqual({
      kind: "query",
      protocol: "observed-token",
      method: "observeSafe",
      data: { address: ONCHAIN, symbol: "CHAIN", name: "Chain Token", decimals: 18 },
    });
    expect(await renderText(registry)).toContain(`onchain OnChain(CHAIN,${ONCHAIN.toLowerCase()})`);
  });

  it("ignores ordinary metadata-shaped fields and isolates Registry instances", async () => {
    const observed = new Registry(runtime).use(ObservedTokenProtocol);
    const isolated = new Registry(runtime).use(ObservedTokenProtocol);
    await runQuery(observed, "ordinaryFields");
    await runQuery(observed, "observeSafe");

    expect(await renderText(observed)).toContain(`ordinary ${ORDINARY}`);
    expect(await renderText(isolated)).toContain(`onchain ${ONCHAIN.toLowerCase()}`);
  });

  it("prefers safe symbol, falls back to name, replaces, and deletes metadata", async () => {
    const registry = new Registry(runtime).use(ObservedTokenProtocol);

    await runQuery(registry, "observeFallback");
    expect(await renderText(registry)).toContain(`OnChain(Fallback Name,${ONCHAIN.toLowerCase()})`);
    await runQuery(registry, "observeReplacement");
    expect(await renderText(registry)).toContain(`OnChain(NEXT,${ONCHAIN.toLowerCase()})`);
    await runQuery(registry, "observeUnsafe");
    expect(await renderText(registry)).toContain(`onchain ${ONCHAIN.toLowerCase()}`);
  });

  it("leaves metadata unchanged when a Query fails", async () => {
    const registry = new Registry(runtime).use(ObservedTokenProtocol);
    await runQuery(registry, "observeSafe");

    await expect(runQuery(registry, "fail")).rejects.toThrow("metadata unavailable");
    expect(await renderText(registry)).toContain(`OnChain(CHAIN,${ONCHAIN.toLowerCase()})`);
  });

  it("rejects unknown and malformed observations without changing metadata", async () => {
    const registry = new Registry(runtime).use(ObservedTokenProtocol);
    await runQuery(registry, "observeSafe");

    await expect(runQuery(registry, "unknownObservation")).rejects.toThrow(
      'unknown Query observation kind "futureObservation"',
    );
    await expect(runQuery(registry, "malformedObservation")).rejects.toThrow(
      "symbol must be a string",
    );
    expect(await renderText(registry)).toContain(`OnChain(CHAIN,${ONCHAIN.toLowerCase()})`);
  });

  it("keeps Trusted and visible Package labels above OnChain metadata", async () => {
    const registry = new Registry(runtime, {
      trustedTokens: [{ address: TRUSTED, label: "Trusted Token" }],
    }).use(ObservedTokenProtocol);
    await runQuery(registry, "observeSafe");
    await runQuery(registry, "observeTrusted");
    await runQuery(registry, "observePackage");

    expect(await renderText(registry)).toBe(
      `onchain OnChain(CHAIN,${ONCHAIN.toLowerCase()}) trusted Trusted(Trusted Token) ` +
        `package Package(Observed Token:PackageToken) ordinary ${ORDINARY}`,
    );
  });
});

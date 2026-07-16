import { describe, expect, it } from "vitest";
import {
  type AddressValue,
  Capability,
  type CapabilityNode,
  type Change,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  Registry,
  transaction,
} from "../src/index.js";

const ACCOUNT = "0x1111111111111111111111111111111111111111" as const;
const TRUSTED = "0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa" as const;
const CATALOG_ONLY = "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB" as const;
const ROOT = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as const;
const DEEP = "0xDDdDddDdDdddDDddDDddDDDDdDdDDdDDdDDDDDDd" as const;
const AMBIGUOUS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;
const UNRELATED = "0xFfFfFffFffFFfffFFfFFffFfFffFfFfFffFfFfFf" as const;
const RAW = "0x1234567890123456789012345678901234567890" as const;

const trustedTokens = [
  { address: TRUSTED, label: "Trusted Token" },
  { address: CATALOG_ONLY, label: "Catalog Token" },
] as const;
const noParams = {} satisfies ParamsSpec;
const outcome = { operation: "label" } as const;
const nestedOutcome = { operation: "nested" } as const;
const leafData = { source: "event" } as const;

@Protocol({
  name: "deep-token",
  category: "token",
  description: "Transitive label fixture.",
  contracts: {},
  labels: { Asset: DEEP, RootShadow: ROOT, Conflict: AMBIGUOUS, TrustedShadow: TRUSTED },
})
class DeepTokenProtocol {
  @Query({ intent: "Inspect deep fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "branch",
  category: "token",
  description: "Dependency branch fixture.",
  contracts: {},
  protocols: { deep: DeepTokenProtocol },
})
class BranchProtocol {
  declare deep: ProtocolRef<DeepTokenProtocol>;

  @Query({ intent: "Inspect branch fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "other-token",
  category: "token",
  description: "Conflicting dependency fixture.",
  contracts: {},
  labels: { Conflict: AMBIGUOUS },
})
class OtherTokenProtocol {
  @Query({ intent: "Inspect other fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "unrelated",
  category: "token",
  description: "Unrelated label fixture.",
  contracts: {},
  labels: { Asset: UNRELATED },
})
class UnrelatedProtocol {
  @Query({ intent: "Inspect unrelated fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "root-protocol",
  category: "token",
  description: "Receipt label root fixture.",
  contracts: {},
  protocols: { branch: BranchProtocol, other: OtherTokenProtocol, deep: DeepTokenProtocol },
  labels: { Router: ROOT, TrustedShadow: TRUSTED },
})
class RootProtocol {
  declare branch: ProtocolRef<BranchProtocol>;
  declare other: ProtocolRef<OtherTokenProtocol>;
  declare deep: ProtocolRef<DeepTokenProtocol>;

  @Capability<RootProtocol, typeof noParams>({
    intent: "Render fixture labels",
    verb: "transfer",
    params: noParams,
    receipt: "renderReceipt",
    risk: ["fundOut"],
  })
  async render(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return transaction(ctx.account, ROOT);
  }

  @Receipt()
  renderReceipt(changes: readonly Change[]): ReceiptResult<typeof outcome> {
    return {
      kind: "receipt",
      outcome,
      text: `trusted ${TRUSTED.toUpperCase()} root ${ROOT}`,
      changes: [
        {
          kind: "receipt",
          outcome: nestedOutcome,
          text: `deep ${DEEP} ambiguous ${AMBIGUOUS}`,
          changes: changes.map((change) => ({
            kind: "change",
            change,
            data: leafData,
            text: `catalog ${CATALOG_ONLY} boundary a${DEEP} and ${DEEP}aa then ${DEEP} unrelated ${UNRELATED} raw ${RAW}`,
          })),
        },
      ],
    };
  }
}

@Protocol({
  name: "duplicate-labels",
  category: "token",
  description: "Duplicate label fixture.",
  contracts: {},
  labels: { One: TRUSTED, Two: TRUSTED.toLowerCase() as AddressValue },
})
class DuplicateLabelsProtocol {
  @Query({ intent: "Inspect duplicate fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "unsafe-label",
  category: "token",
  description: "Unsafe label fixture.",
  contracts: {},
  labels: { "Bad/Name": ROOT },
})
class UnsafeLabelProtocol {
  @Query({ intent: "Inspect unsafe fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "lengthy",
  category: "token",
  description: "Long label fixture.",
  contracts: {},
  labels: { "123456789012345678901234567890": ROOT },
})
class LongLabelProtocol {
  @Query({ intent: "Inspect long fixture", params: noParams })
  async inspect() {
    return null;
  }
}

const runtime: MossRuntime = {
  rpcUrl: "http://offline",
  // biome-ignore lint/suspicious/noExplicitAny: calls are not used by this unit test
  client: {} as any,
};

function capability(): CapabilityNode {
  return {
    kind: "capability",
    protocol: "root-protocol",
    method: "render",
    params: {},
    receipt: "renderReceipt",
    children: [transaction(ACCOUNT, ROOT)],
  };
}

describe("Registry Receipt labels", () => {
  it("renders Trusted, root, and one visible dependency label through the Receipt tree", () => {
    const registry = new Registry(runtime, { trustedTokens });
    registry.use(RootProtocol, UnrelatedProtocol);
    const change = {
      kind: "event",
      address: RAW,
      topics: ["0xabcdef"],
      data: "0x1234",
    } satisfies Change;

    const receipt = registry.parseReceipt(capability(), [change]);
    expect(receipt.text).toBe("trusted Trusted Token root Root Protocol Router");
    expect(receipt.outcome).toBe(outcome);

    const nested = receipt.changes[0];
    if (nested?.kind !== "receipt") throw new Error("expected nested Receipt");
    expect(nested.text).toBe(`deep Deep Token Asset ambiguous ${AMBIGUOUS}`);
    expect(nested.outcome).toBe(nestedOutcome);

    const leaf = nested.changes[0];
    if (leaf?.kind !== "change") throw new Error("expected ReceiptChange");
    expect(leaf.text).toBe(
      `catalog Catalog Token boundary a${DEEP} and ${DEEP}aa then Deep Token Asset unrelated ${UNRELATED} raw ${RAW}`,
    );
    expect(leaf.change).toBe(change);
    expect(leaf.data).toBe(leafData);
  });

  it("does not discover Trusted labels from ordinary module exports", () => {
    const registry = new Registry(runtime);
    registry.use({ RootProtocol, trustedTokens });
    const change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: ROOT,
      value: "1",
    } satisfies Change;

    const receipt = registry.parseReceipt(capability(), [change]);
    const nested = receipt.changes[0];
    if (nested?.kind !== "receipt") throw new Error("expected nested Receipt");
    const leaf = nested.changes[0];
    if (leaf?.kind !== "change") throw new Error("expected ReceiptChange");
    expect(leaf.text).toContain(`catalog ${CATALOG_ONLY}`);
  });

  it("rejects ambiguous identities and unsafe final names at registration", () => {
    expect(() =>
      Protocol({
        name: "invalid-",
        category: "token",
        description: "Invalid slug fixture.",
        contracts: {},
        labels: { Token: TRUSTED },
      }),
    ).toThrow("lowercase slug");
    expect(
      () =>
        new Registry(runtime, {
          trustedTokens: [
            { address: TRUSTED, label: "One" },
            { address: TRUSTED.toLowerCase() as AddressValue, label: "Two" },
          ],
        }),
    ).toThrow("multiple Trusted names");
    expect(
      () =>
        new Registry(runtime, {
          trustedTokens: [{ address: "invalid" as AddressValue, label: "Invalid" }],
        }),
    ).toThrow("invalid address");
    expect(() => new Registry(runtime).use(DuplicateLabelsProtocol)).toThrow(
      "multiple Package names",
    );

    for (const label of ["", "Bad/Name", "x".repeat(33)]) {
      expect(() => new Registry(runtime, { trustedTokens: [{ address: TRUSTED, label }] })).toThrow(
        "1-32 character safe name",
      );
    }
    expect(() => new Registry(runtime).use(UnsafeLabelProtocol)).toThrow(
      "1-32 character safe name",
    );
    expect(() => new Registry(runtime).use(LongLabelProtocol)).toThrow("1-32 character safe name");
  });
});

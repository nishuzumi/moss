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
const SHARED = "0x2345678901234567890123456789012345678901" as const;
const OTHER_ONLY = "0x3456789012345678901234567890123456789012" as const;
const CALLER_SHARED = "0x4567890123456789012345678901234567890123" as const;

const trustedTokens = [
  { address: TRUSTED, label: "Trusted Token" },
  { address: CATALOG_ONLY, label: "Catalog Token" },
] as const;
const noParams = {} satisfies ParamsSpec;
const outcome = { operation: "label" } as const;
const branchOutcome = { operation: "branch" } as const;
const nestedOutcome = { operation: "nested" } as const;
const leafData = { source: "event" } as const;

@Protocol({
  name: "deep-token",
  category: "token",
  description: "Transitive label fixture.",
  contracts: {},
  labels: { Asset: DEEP, SharedChild: SHARED, Conflict: AMBIGUOUS, TrustedShadow: TRUSTED },
})
class DeepTokenProtocol {
  @Query({ intent: "Inspect deep fixture", params: noParams })
  async inspect() {
    return null;
  }

  @Receipt()
  renderReceipt(changes: readonly Change[]): ReceiptResult<typeof nestedOutcome> {
    return {
      kind: "receipt",
      outcome: nestedOutcome,
      text: `trusted ${TRUSTED} own ${DEEP} child ${SHARED} nearest ${CALLER_SHARED} ancestor ${ROOT}`,
      changes: [
        {
          kind: "receipt",
          outcome: null,
          text: `sibling ${OTHER_ONLY}`,
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
  name: "branch",
  category: "token",
  description: "Dependency branch fixture.",
  contracts: {},
  labels: { Nearest: CALLER_SHARED },
  protocols: { deep: DeepTokenProtocol },
})
class BranchProtocol {
  declare deep: ProtocolRef<DeepTokenProtocol>;

  @Query({ intent: "Inspect branch fixture", params: noParams })
  async inspect() {
    return null;
  }

  @Receipt()
  renderReceipt(changes: readonly Change[]): ReceiptResult<typeof branchOutcome> {
    return {
      kind: "receipt",
      outcome: branchOutcome,
      text: `ancestor ${ROOT}`,
      changes: [this.deep.renderReceipt(changes)],
    };
  }
}

@Protocol({
  name: "other-token",
  category: "token",
  description: "Conflicting dependency fixture.",
  contracts: {},
  labels: { Conflict: AMBIGUOUS, Reserve: OTHER_ONLY },
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
  labels: {
    Router: ROOT,
    SharedRoot: SHARED,
    Farthest: CALLER_SHARED,
    TrustedShadow: TRUSTED,
  },
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
      text: `trusted ${TRUSTED.toUpperCase()} root ${ROOT} dependency ${OTHER_ONLY} ambiguous ${AMBIGUOUS}`,
      changes: [this.branch.renderReceipt(changes)],
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
  name: "duplicate-names",
  category: "token",
  description: "Duplicate name fixture.",
  contracts: {},
  labels: { Token: ROOT, token: DEEP },
})
class DuplicateNamesProtocol {
  @Query({ intent: "Inspect duplicate name fixture", params: noParams })
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

@Protocol({
  name: "forged-receipt",
  category: "token",
  description: "Invalid Receipt provenance fixture.",
  contracts: {},
  protocols: { deep: DeepTokenProtocol, unrelated: UnrelatedProtocol },
})
class ForgedReceiptProtocol {
  declare deep: ProtocolRef<DeepTokenProtocol>;
  declare unrelated: ProtocolRef<UnrelatedProtocol>;

  @Capability<ForgedReceiptProtocol, typeof noParams>({
    intent: "Return invalid Receipt provenance",
    verb: "transfer",
    params: noParams,
    receipt: "forgedReceipt",
    risk: ["fundOut"],
  })
  async render(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return transaction(ctx.account, ROOT);
  }

  @Receipt()
  forgedReceipt(changes: readonly Change[]): ReceiptResult<null> {
    const child = this.deep.renderReceipt(changes);
    const forged = { ...child, protocol: "unrelated" };
    return { kind: "receipt", outcome: null, text: "root", changes: [forged] };
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
    expect(receipt.protocol).toBe("root-protocol");
    expect(receipt.text).toBe(
      `trusted Trusted(Trusted Token) root Package(Root Protocol:Router) dependency Package(Other Token:Reserve) ambiguous ${AMBIGUOUS}`,
    );
    expect(receipt.outcome).toBe(outcome);

    const branch = receipt.changes[0];
    if (branch?.kind !== "receipt") throw new Error("expected branch Receipt");
    expect(branch.protocol).toBe("branch");
    expect(branch.text).toBe("ancestor Package(Root Protocol:Router)");
    expect(branch.outcome).toBe(branchOutcome);

    const nested = branch.changes[0];
    if (nested?.kind !== "receipt") throw new Error("expected nested Receipt");
    expect(nested.protocol).toBe("deep-token");
    expect(nested.text).toBe(
      "trusted Trusted(Trusted Token) own Package(Deep Token:Asset) " +
        "child Package(Deep Token:SharedChild) nearest Package(Branch:Nearest) " +
        "ancestor Package(Root Protocol:Router)",
    );
    expect(nested.outcome).toBe(nestedOutcome);

    const group = nested.changes[0];
    if (group?.kind !== "receipt") throw new Error("expected grouped Receipt");
    expect(group.protocol).toBe("deep-token");
    expect(group.text).toBe(`sibling ${OTHER_ONLY}`);

    const leaf = group.changes[0];
    if (leaf?.kind !== "change") throw new Error("expected ReceiptChange");
    expect(leaf.text).toBe(
      `catalog Trusted(Catalog Token) boundary a${DEEP} and ${DEEP}aa then Package(Deep Token:Asset) unrelated ${UNRELATED} raw ${RAW}`,
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
    const branch = receipt.changes[0];
    if (branch?.kind !== "receipt") throw new Error("expected branch Receipt");
    const nested = branch.changes[0];
    if (nested?.kind !== "receipt") throw new Error("expected nested Receipt");
    const group = nested.changes[0];
    if (group?.kind !== "receipt") throw new Error("expected grouped Receipt");
    const leaf = group.changes[0];
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

  it("rejects case-insensitive duplicate names for different addresses", () => {
    expect(
      () =>
        new Registry(runtime, {
          trustedTokens: [
            { address: ROOT, label: "USDC" },
            { address: DEEP, label: "usdc" },
          ],
        }),
    ).toThrow('Trusted name "usdc" to multiple addresses');
    expect(() => new Registry(runtime).use(DuplicateNamesProtocol)).toThrow(
      'Package name "token" to multiple addresses',
    );
  });

  it("rejects a cloned child Receipt with a forged Protocol", () => {
    const registry = new Registry(runtime).use(ForgedReceiptProtocol, UnrelatedProtocol);
    const node = {
      kind: "capability",
      protocol: "forged-receipt",
      method: "render",
      params: {},
      children: [transaction(ACCOUNT, ROOT)],
    } satisfies CapabilityNode;
    const change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: ROOT,
      value: "1",
    } satisfies Change;

    expect(() => registry.parseReceipt(node, [change])).toThrow(
      'Receipt protocol "unrelated" was not assigned by Registry',
    );
  });
});

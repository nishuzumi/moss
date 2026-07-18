import { parseAbi, parseUnits } from "viem";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import {
  type AddressValue,
  CAPABILITY_TREE_LIMITS,
  Capability,
  type CapabilityNode,
  CapabilityTreeValidationError,
  type Change,
  flattenCapabilityTree,
  type Handle,
  type InferParams,
  type ReceiptResult as MossReceipt,
  type MossRuntime,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  Registry,
  type TransactionNode,
  transaction,
  UnsignedIntegerString,
  verifyReceiptCoverage,
} from "../src/index.js";

const VaultAbi = parseAbi(["function deposit() payable"]);
const VAULT = "0x1111111111111111111111111111111111111111" as const;
const ACCOUNT = "0x2222222222222222222222222222222222222222" as const;

const wrapParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Amount of native MON to wrap.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "testvault",
  category: "token",
  description: "Test-only vault.",
  contracts: { vault: { abi: VaultAbi, addr: VAULT } },
})
class TestVault {
  declare vault: Handle<typeof VaultAbi>;

  @Capability<TestVault, typeof wrapParams>({
    intent: "Wrap {amount} native MON",
    verb: "wrap",
    params: wrapParams,
    receipt: "wrapReceipt",
    risk: ["fundOut"],
  })
  async wrap({ amount }: InferParams<typeof wrapParams>) {
    return [this.vault.deposit([], { value: parseUnits(amount, 18) })];
  }

  @Receipt()
  wrapReceipt(changes: readonly Change[]): MossReceipt<{ operation: "wrap" }> {
    if ("runtime" in this || "vault" in this) {
      throw new Error("Receipt instance must not expose Runtime or Handles");
    }
    return {
      kind: "receipt",
      outcome: { operation: "wrap" },
      text: "Wrapped native MON",
      changes: changes.map((change) => ({
        kind: "change",
        change,
        data: { operation: "wrap" },
        text: "Observed wrap change",
      })),
    };
  }
}

const approvalParams = {
  token: { type: PositiveDecimalString, description: "Fixture token coordinate." },
  amount: { type: UnsignedIntegerString, description: "Allowance amount." },
} satisfies ParamsSpec;

@Protocol({
  name: "approval",
  category: "token",
  description: "Fixture approval Protocol.",
  contracts: {},
})
class ApprovalProtocol {
  @Capability<ApprovalProtocol, typeof approvalParams>({
    intent: "Approve fixture token",
    verb: "transfer",
    params: approvalParams,
    receipt: "approvalReceipt",
    risk: ["approval"],
  })
  async approve(_: InferParams<typeof approvalParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, VAULT, { data: "0x1234" })];
  }

  @Query({ intent: "Read fixture approval data", params: approvalParams })
  async inspect(params: InferParams<typeof approvalParams>) {
    return { amount: params.amount };
  }

  @Receipt()
  approvalReceipt(changes: readonly Change[]): MossReceipt<{ operation: "approve" }> {
    return receiptFor("approve", changes);
  }
}

const noParams = {} satisfies ParamsSpec;

@Protocol({
  name: "composed",
  category: "dex",
  description: "Fixture composed Protocol.",
  contracts: {},
  protocols: { approval: ApprovalProtocol },
})
class ComposedProtocol {
  declare approval: ProtocolRef<ApprovalProtocol>;

  @Capability<ComposedProtocol, typeof noParams>({
    intent: "Compose approval and swap",
    verb: "swap",
    params: noParams,
    receipt: "swapReceipt",
    risk: ["fundOut", "approval"],
  })
  async swap(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    const inspected = await this.approval.inspect({ token: "1", amount: "10" });
    if (inspected.amount !== "10") throw new Error("injected Query returned invalid data");
    const approval = await this.approval.approve({ token: "1", amount: "10" });
    return [approval, transaction(ctx.account, VAULT, { data: "0xabcd" })];
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): MossReceipt<{ operation: "swap" }> {
    return receiptFor("swap", changes);
  }
}

class UndecoratedDependency {}

@Protocol({
  name: "broken-dependency",
  category: "token",
  description: "Fixture with an undecorated dependency.",
  contracts: {},
  protocols: { missing: UndecoratedDependency },
})
class BrokenDependencyProtocol {
  declare missing: ProtocolRef<UndecoratedDependency>;

  @Query({ intent: "Inspect the fixture", params: noParams })
  async inspect() {
    return null;
  }
}

@Protocol({
  name: "bad-receipt",
  category: "token",
  description: "Fixture with an unmarked Receipt method.",
  contracts: {},
})
class BadReceiptProtocol {
  @Capability<BadReceiptProtocol, typeof noParams>({
    intent: "Execute the fixture",
    verb: "transfer",
    params: noParams,
    receipt: "unmarkedReceipt",
    risk: ["fundOut"],
  })
  async execute(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, VAULT)];
  }

  unmarkedReceipt(changes: readonly Change[]): MossReceipt<null> {
    return {
      kind: "receipt",
      outcome: null,
      text: "unmarked",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

@Protocol({
  name: "missing-risk",
  category: "token",
  description: "Fixture with missing risk metadata.",
  contracts: {},
})
class MissingRiskProtocol {
  @Capability<MissingRiskProtocol, typeof noParams>({
    intent: "Execute the fixture",
    verb: "transfer",
    params: noParams,
    receipt: "executeReceipt",
    risk: [],
  })
  async execute(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, VAULT)];
  }

  @Receipt()
  executeReceipt(changes: readonly Change[]): MossReceipt<null> {
    return {
      kind: "receipt",
      outcome: null,
      text: "executed",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

class DecoratedMethodBase {
  @Capability<DecoratedMethodBase, typeof wrapParams>({
    intent: "Wrap fixture value",
    verb: "wrap",
    params: wrapParams,
    receipt: "wrapReceipt",
    risk: ["fundOut"],
  })
  async wrap(_: InferParams<typeof wrapParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, VAULT)];
  }

  @Receipt()
  wrapReceipt(changes: readonly Change[]): MossReceipt<null> {
    return {
      kind: "receipt",
      outcome: null,
      text: "wrapped",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

@Protocol({
  name: "overridden",
  category: "token",
  description: "Fixture with an unmarked method override.",
  contracts: {},
})
class OverriddenProtocol extends DecoratedMethodBase {
  override async wrap(_: InferParams<typeof wrapParams>) {
    return [];
  }
}

@Protocol({
  name: "decorated-child",
  category: "token",
  description: "Fixture extending another decorated Protocol.",
  contracts: {},
})
class DecoratedProtocolChild extends TestVault {}

class DecoratedProtocolIntermediate extends TestVault {}

@Protocol({
  name: "indirect-decorated-child",
  category: "token",
  description: "Fixture indirectly extending another decorated Protocol.",
  contracts: {},
})
class IndirectDecoratedProtocolChild extends DecoratedProtocolIntermediate {}

@Protocol({
  name: "invalid-metadata",
  category: "token",
  description: "Fixture with invalid method metadata.",
  contracts: {},
})
class InvalidMetadataProtocol {
  @Query({ intent: "", params: noParams })
  async inspect() {
    return null;
  }
}

const undescribedParams = {
  value: { type: z.string(), description: "Fixture value." },
} satisfies ParamsSpec;

@Protocol({
  name: "undescribed-parameter",
  category: "token",
  description: "Fixture with an undescribed Parameter type.",
  contracts: {},
})
class UndescribedParameterProtocol {
  @Query({ intent: "Inspect the fixture", params: undescribedParams })
  async inspect(params: InferParams<typeof undescribedParams>) {
    return params.value;
  }
}

function receiptFor<T extends "approve" | "swap">(
  operation: T,
  changes: readonly Change[],
): MossReceipt<{ operation: T }> {
  return {
    kind: "receipt",
    outcome: { operation },
    text: operation,
    changes: changes.map((change) => ({
      kind: "change",
      change,
      data: { operation },
      text: operation,
    })),
  };
}

const runtime: MossRuntime = {
  rpcUrl: "http://offline",
  // biome-ignore lint/suspicious/noExplicitAny: calls are not used by this unit test
  client: {} as any,
};

describe("framework core seam", () => {
  it("registers a Protocol directly and builds its one-transaction Capability", async () => {
    const registry = new Registry(runtime);
    registry.use(TestVault);

    const [loaded] = registry.load([{ protocol: "testvault", method: "wrap" }]);
    expect(loaded?.params.amount).toMatchObject({
      description: "Amount of native MON to wrap.",
      type: { description: expect.stringContaining("positive base-10 decimal") },
    });

    const capability = await registry.action("testvault", "wrap", ACCOUNT, { amount: "1.5" });
    if (capability.kind !== "capability") throw new Error("expected Capability");
    expect(capability).toEqual({
      kind: "capability",
      protocol: "testvault",
      method: "wrap",
      params: { amount: "1.5" },
      children: [
        {
          kind: "transaction",
          transaction: {
            from: ACCOUNT,
            to: VAULT,
            data: "0xd0e30db0",
            value: "0x14d1120d7b160000",
          },
        },
      ],
    });
    expect(registry.parseReceipt(capability, []).outcome).toEqual({ operation: "wrap" });
  });

  it("auto-registers injected dependencies and preserves nested execution order", async () => {
    const registry = new Registry(runtime);
    registry.use({ ComposedProtocol, helper: { ignored: true } });

    expect([...new Set(registry.discover().map(({ protocol }) => protocol))]).toEqual([
      "approval",
      "composed",
    ]);
    const result = await registry.action("composed", "swap", ACCOUNT, {});
    if (result.kind !== "capability") throw new Error("expected Capability");
    expect(result.children[0]).toMatchObject({
      kind: "capability",
      protocol: "approval",
      method: "approve",
    });
    expect(flattenCapabilityTree(result).map(({ transaction: tx }) => tx.data)).toEqual([
      "0x1234",
      "0xabcd",
    ]);
  });

  it("rejects inherited markers, undecorated dependencies, and invalid Capability metadata", () => {
    class UndecoratedHelper extends TestVault {}
    const registry = new Registry(runtime);

    registry.use({ TestVault, UndecoratedHelper });
    expect(registry.discover().map(({ protocol }) => protocol)).toEqual(["testvault"]);
    expect(() => new Registry(runtime).use(UndecoratedHelper)).toThrow("decorated Protocol");
    expect(() => new Registry(runtime).use(BrokenDependencyProtocol)).toThrow(
      "not decorated with @Protocol",
    );
    expect(() => new Registry(runtime).use(BadReceiptProtocol)).toThrow("not an @Receipt method");
    expect(() => new Registry(runtime).use(MissingRiskProtocol)).toThrow("risk label");
    expect(() => new Registry(runtime).use(OverriddenProtocol)).toThrow("declares no");
    expect(() => new Registry(runtime).use(DecoratedProtocolChild)).toThrow(
      "cannot extend another decorated Protocol",
    );
    expect(() => new Registry(runtime).use(IndirectDecoratedProtocolChild)).toThrow(
      "cannot extend another decorated Protocol",
    );
    expect(() => new Registry(runtime).use(InvalidMetadataProtocol)).toThrow("non-empty string");
    expect(() => new Registry(runtime).use(UndescribedParameterProtocol)).toThrow(
      "type description",
    );
  });

  it("requires exactly one direct transaction per Capability", () => {
    const capability = (children: CapabilityNode["children"]): CapabilityNode => ({
      kind: "capability",
      protocol: "fixture",
      method: "execute",
      params: null,
      children,
    });
    expect(() => flattenCapabilityTree(capability([]))).toThrow("got 0");
    expect(() =>
      flattenCapabilityTree(capability([transaction(ACCOUNT, VAULT), transaction(ACCOUNT, VAULT)])),
    ).toThrow("got 2");
    const malformed = { kind: "transaction" } as unknown as TransactionNode;
    expect(() => flattenCapabilityTree(capability([malformed]))).toThrow("UnsignedTx");
  });

  it("bounds Capability depth and count while preserving valid boundary trees", () => {
    const atDepthLimit = nestedCapabilities(CAPABILITY_TREE_LIMITS.maxDepth);
    expect(flattenCapabilityTree(atDepthLimit)).toHaveLength(CAPABILITY_TREE_LIMITS.maxDepth);
    expectCapabilityTreeError(nestedCapabilities(CAPABILITY_TREE_LIMITS.maxDepth + 1), "MAX_DEPTH");

    const atCountLimit = wideCapabilities(CAPABILITY_TREE_LIMITS.maxCapabilities);
    expect(flattenCapabilityTree(atCountLimit)).toHaveLength(
      CAPABILITY_TREE_LIMITS.maxCapabilities,
    );
    expectCapabilityTreeError(
      wideCapabilities(CAPABILITY_TREE_LIMITS.maxCapabilities + 1),
      "MAX_CAPABILITIES",
    );
  });

  it("rejects Capability cycles, shared nodes, and excessive child counts", () => {
    const cyclic = fixtureCapability();
    (cyclic as unknown as { children: unknown[] }).children = [cyclic, fixtureTransaction()];
    expectCapabilityTreeError(cyclic, "CYCLE");

    const shared = fixtureCapability();
    const reused = fixtureCapability();
    (shared as unknown as { children: unknown[] }).children = [
      reused,
      reused,
      fixtureTransaction(),
    ];
    expectCapabilityTreeError(shared, "SHARED_NODE");

    const tooManyChildren = fixtureCapability();
    (tooManyChildren as unknown as { children: unknown[] }).children = Array.from(
      { length: CAPABILITY_TREE_LIMITS.maxChildrenPerCapability + 1 },
      () => fixtureTransaction(),
    );
    expectCapabilityTreeError(tooManyChildren, "MAX_CHILDREN");
  });

  it("bounds cumulative parameter complexity without rejecting shared parameter values", () => {
    const atDepthLimit = fixtureCapability(nestedParam(CAPABILITY_TREE_LIMITS.maxParamDepth));
    expect(() => flattenCapabilityTree(atDepthLimit)).not.toThrow();
    expectCapabilityTreeError(
      fixtureCapability(nestedParam(CAPABILITY_TREE_LIMITS.maxParamDepth + 1)),
      "MAX_PARAM_DEPTH",
    );

    expect(() =>
      flattenCapabilityTree(
        fixtureCapability(Array(CAPABILITY_TREE_LIMITS.maxParamNodes - 1).fill(null)),
      ),
    ).not.toThrow();
    expectCapabilityTreeError(
      fixtureCapability(Array(CAPABILITY_TREE_LIMITS.maxParamNodes).fill(null)),
      "MAX_PARAM_NODES",
    );
    const cumulativeParams = Array(CAPABILITY_TREE_LIMITS.maxParamNodes / 2).fill(null);
    const cumulativeRoot = fixtureCapability(cumulativeParams);
    const cumulativeChild = fixtureCapability(cumulativeParams);
    (cumulativeRoot as unknown as { children: unknown[] }).children = [
      cumulativeChild,
      fixtureTransaction(),
    ];
    expectCapabilityTreeError(cumulativeRoot, "MAX_PARAM_NODES");

    expect(() =>
      flattenCapabilityTree(
        fixtureCapability("a".repeat(CAPABILITY_TREE_LIMITS.maxParamStringLength)),
      ),
    ).not.toThrow();
    expectCapabilityTreeError(
      fixtureCapability("a".repeat(CAPABILITY_TREE_LIMITS.maxParamStringLength + 1)),
      "MAX_PARAM_STRING_LENGTH",
    );

    const cyclicParams: Record<string, unknown> = {};
    cyclicParams.self = cyclicParams;
    expectCapabilityTreeError(
      fixtureCapability(cyclicParams as CapabilityNode["params"]),
      "PARAM_CYCLE",
    );

    const reused = { amount: "1" };
    expect(() =>
      flattenCapabilityTree(fixtureCapability({ first: reused, second: reused })),
    ).not.toThrow();
  });

  it("bounds cumulative calldata bytes", () => {
    expect(() =>
      flattenCapabilityTree(
        fixtureCapability({}, `0x${"00".repeat(CAPABILITY_TREE_LIMITS.maxCalldataBytes)}`),
      ),
    ).not.toThrow();
    expectCapabilityTreeError(
      fixtureCapability({}, `0x${"00".repeat(CAPABILITY_TREE_LIMITS.maxCalldataBytes + 1)}`),
      "MAX_CALLDATA_BYTES",
    );

    const half = Math.floor(CAPABILITY_TREE_LIMITS.maxCalldataBytes / 2) + 1;
    const cumulativeRoot = fixtureCapability({}, `0x${"00".repeat(half)}`);
    const cumulativeChild = fixtureCapability({}, `0x${"00".repeat(half)}`);
    (cumulativeRoot as unknown as { children: unknown[] }).children = [
      cumulativeChild,
      ...cumulativeRoot.children,
    ];
    expectCapabilityTreeError(cumulativeRoot, "MAX_CALLDATA_BYTES");
  });

  it("validates every Capability node against registered protocol methods", async () => {
    const registry = new Registry(runtime).use(ComposedProtocol);
    const result = await registry.action("composed", "swap", ACCOUNT, {});
    if (result.kind !== "capability") throw new Error("expected Capability");

    expect(() => registry.validateCapabilityTree(result)).not.toThrow();
    expect(() =>
      registry.validateCapabilityTree({ ...result, method: "inspect" } satisfies CapabilityNode),
    ).toThrow('unknown capability "composed.inspect"');

    const [approval, ownTransaction] = result.children;
    if (approval?.kind !== "capability" || ownTransaction?.kind !== "transaction") {
      throw new Error("unexpected fixture shape");
    }
    expect(() =>
      registry.validateCapabilityTree({
        ...result,
        children: [{ ...approval, method: "missing" }, ownTransaction],
      }),
    ).toThrow('unknown capability "approval.missing"');
  });

  it("requires Receipt leaves to retain every original Change object in order", () => {
    const first = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: VAULT,
      value: "1",
    } satisfies Change;
    const second = {
      kind: "event",
      address: VAULT,
      topics: ["0x01"],
      data: "0x02",
    } satisfies Change;
    const changes = [first, second] as const;
    const receipt = receiptFor("swap", changes);
    expect(() => verifyReceiptCoverage(changes, receipt)).not.toThrow();

    const missing = receiptFor("swap", [first]);
    expect(() => verifyReceiptCoverage(changes, missing)).toThrow("covered 1 Changes");
    const duplicated = receiptFor("swap", [first, first]);
    expect(() => verifyReceiptCoverage(changes, duplicated)).toThrow("original object");
    const copied = receiptFor("swap", [{ ...first }, second]);
    expect(() => verifyReceiptCoverage(changes, copied)).toThrow("original object");
    const reordered = receiptFor("swap", [second, first]);
    expect(() => verifyReceiptCoverage(changes, reordered)).toThrow("original object");

    const firstLeaf = receipt.changes[0];
    if (firstLeaf?.kind !== "change") throw new Error("expected fixture ReceiptChange");
    expect(() =>
      verifyReceiptCoverage(changes, {
        ...receipt,
        changes: [receiptFor("approve", [second]), firstLeaf],
      }),
    ).toThrow("Receipt Change 0 does not retain the original object in order");
  });

  it("validates Receipt evidence recursively", () => {
    const change = {
      kind: "nativeTransfer",
      from: ACCOUNT,
      to: VAULT,
      value: "1",
    } satisfies Change;
    const nested = receiptFor("approve", [change]);
    const receipt: MossReceipt<{ operation: "swap" }> = {
      kind: "receipt",
      outcome: { operation: "swap" },
      text: "swap",
      changes: [nested],
    };
    expect(() => verifyReceiptCoverage([change], receipt)).not.toThrow();
    expect(() => verifyReceiptCoverage([change], { ...receipt, text: "" })).toThrow(
      "Receipt.text must be a non-empty string",
    );

    const invalidNested = {
      ...nested,
      // Runtime validation must reject values smuggled through untyped Protocol code.
      outcome: { amount: 1n },
    } as unknown as MossReceipt;
    expect(() => verifyReceiptCoverage([change], { ...receipt, changes: [invalidNested] })).toThrow(
      "non-JSON-safe bigint",
    );

    const leaf = nested.changes[0];
    if (leaf?.kind !== "change") throw new Error("expected fixture ReceiptChange");
    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        changes: [{ ...nested, changes: [{ ...leaf, text: 1 as unknown as string }] }],
      }),
    ).toThrow("text must be a non-empty string");

    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        changes: [{ ...leaf, text: " " }],
      }),
    ).toThrow("Receipt.changes[0].text must be a non-empty string");

    const cyclicReceipt = receiptFor("swap", [change]);
    (cyclicReceipt as unknown as { changes: unknown[] }).changes = [cyclicReceipt];
    expect(() => verifyReceiptCoverage([change], cyclicReceipt)).toThrow(
      "Receipt.changes[0] contains a Receipt cycle",
    );

    const cyclicData: Record<string, unknown> = {};
    cyclicData.self = cyclicData;
    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        changes: [{ ...leaf, data: cyclicData } as unknown as typeof leaf],
      }),
    ).toThrow("Receipt.changes[0].data.self contains a cycle");

    expect(() =>
      verifyReceiptCoverage([change], {
        ...receipt,
        changes: [{ ...leaf, data: new Date(0) } as unknown as typeof leaf],
      }),
    ).toThrow("Receipt.changes[0].data contains a non-plain object");
  });
});

function fixtureTransaction(data: `0x${string}` = "0x"): TransactionNode {
  return transaction(ACCOUNT, VAULT, { data });
}

function fixtureCapability(
  params: CapabilityNode["params"] = {},
  data: `0x${string}` = "0x",
): CapabilityNode {
  return {
    kind: "capability",
    protocol: "fixture",
    method: "execute",
    params,
    children: [fixtureTransaction(data)],
  };
}

function nestedCapabilities(depth: number): CapabilityNode {
  let node = fixtureCapability();
  for (let index = 1; index < depth; index += 1) {
    node = { ...fixtureCapability(), children: [node, fixtureTransaction()] };
  }
  return node;
}

function wideCapabilities(count: number): CapabilityNode {
  const children = Array.from({ length: Math.min(count - 1, 63) }, () => fixtureCapability());
  let remaining = count - 1 - children.length;
  let cursor = children[0];
  while (remaining > 0 && cursor) {
    const nested = fixtureCapability();
    (cursor as unknown as { children: unknown[] }).children = [nested, fixtureTransaction()];
    cursor = nested;
    remaining -= 1;
  }
  return { ...fixtureCapability(), children: [...children, fixtureTransaction()] };
}

function nestedParam(depth: number): CapabilityNode["params"] {
  let value: CapabilityNode["params"] = null;
  for (let index = 0; index < depth; index += 1) value = [value];
  return value;
}

function expectCapabilityTreeError(
  capability: CapabilityNode,
  code: InstanceType<typeof CapabilityTreeValidationError>["code"],
): void {
  try {
    flattenCapabilityTree(capability);
    throw new Error(`expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CapabilityTreeValidationError);
    expect(error).not.toBeInstanceOf(RangeError);
    expect((error as CapabilityTreeValidationError).code).toBe(code);
  }
}

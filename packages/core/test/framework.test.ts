import { parseAbi, parseUnits } from "viem";
import { describe, expect, it } from "vitest";
import { z } from "zod/v4";
import {
  type AddressValue,
  CAPABILITY_TREE_LIMITS,
  Capability,
  type CapabilityNode,
  type CapabilityResult,
  type Change,
  flattenCapabilityTree,
  type Handle,
  type InferParams,
  type ReceiptResult as MossReceipt,
  type MossRuntime,
  type Nestable,
  nestable,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  Registry,
  type SelfRef,
  type TransactionNode,
  transaction,
  UnsignedIntegerString,
  verifyReceiptCoverage,
} from "../src/index.js";

const VaultAbi = parseAbi([
  "function deposit() payable",
  "error VaultLimit(address account, uint256 amount)",
]);
const VAULT = "0x1111111111111111111111111111111111111111" as const;
const SIDECAR_ABI = parseAbi(["error SidecarOnly(uint256 code)"]);
const SIDECAR = "0x4444444444444444444444444444444444444444" as const;
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
  contracts: {
    vault: { abi: VaultAbi, addr: VAULT },
    sidecar: { abi: SIDECAR_ABI, addr: SIDECAR },
  },
  // SidecarOnly is declared by the second contract only: an explanation is Protocol metadata, so
  // any one of the declared ABIs satisfies it.
  customErrorMessages: { VaultLimit: "vault limit exceeded", SidecarOnly: "sidecar refused" },
  stringRevertMessages: { "vault: paused": "the vault is paused" },
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
  name: "debt-fixture",
  category: "lending",
  description: "Fixture debt Protocol.",
  contracts: {},
})
class DebtProtocol {
  @Capability<DebtProtocol, typeof noParams>({
    intent: "Increase fixture debt",
    verb: "borrow",
    params: noParams,
    receipt: "borrowReceipt",
    risk: ["debt"],
  })
  async borrow(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, VAULT)];
  }

  @Receipt()
  borrowReceipt(changes: readonly Change[]): MossReceipt<{ operation: "borrow" }> {
    return receiptFor("borrow", changes);
  }
}

@Protocol({
  name: "bad-error-message",
  category: "token",
  description: "Fixture with an error explanation absent from its ABI.",
  contracts: { vault: { abi: VaultAbi, addr: VAULT } },
  customErrorMessages: { MissingError: "this name is not ABI-derived" },
})
class BadErrorMessageProtocol {
  @Query({ intent: "Inspect the fixture", params: noParams })
  async inspect() {
    return null;
  }
}

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

const forgeParams = {
  method: {
    type: z.string().min(1).describe("A method name of the Protocol, as a non-empty string."),
    description: "Method the Capability reaches for through self.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "selfnesting",
  category: "token",
  description: "Fixture Protocol nesting its own Capability through self.",
  contracts: {},
})
class SelfNestingProtocol {
  declare self: SelfRef<SelfNestingProtocol, "approve">;

  @Capability<SelfNestingProtocol, typeof noParams>({
    intent: "Compose a self-nested approval",
    verb: "swap",
    params: noParams,
    receipt: "swapReceipt",
    risk: ["fundOut"],
  })
  async swap(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    selfKeys = Object.keys(this.self);
    return [
      await this.self.approve({ token: "1", amount: "10" }),
      transaction(ctx.account, VAULT, { data: "0xabcd" }),
    ];
  }

  @Capability<SelfNestingProtocol, typeof approvalParams>({
    intent: "Approve fixture token",
    verb: "transfer",
    params: approvalParams,
    receipt: "approvalReceipt",
    risk: ["approval"],
  })
  async approve(
    params: InferParams<typeof approvalParams>,
    ctx: { account: AddressValue },
  ): Promise<Nestable<TransactionNode[]>> {
    if (typeof params.amount !== "string") throw new Error("self call skipped parameter parsing");
    return nestable([transaction(ctx.account, VAULT, { data: "0x1234" })]);
  }

  @Capability<SelfNestingProtocol, typeof forgeParams>({
    intent: "Reach for {method} through self",
    verb: "swap",
    params: forgeParams,
    receipt: "swapReceipt",
    risk: ["fundOut"],
  })
  async forge(params: InferParams<typeof forgeParams>): Promise<CapabilityResult> {
    // NestableNames rejects both names this is called with, so only a cast gets
    // here. Core still has to refuse instead of answering with undefined.
    const forged = this.self as unknown as Record<
      string,
      (input: unknown) => Promise<CapabilityNode>
    >;
    const nested = forged[params.method];
    if (!nested) throw new Error("self exposed the method as undefined");
    return [await nested({ token: "1", amount: "10" })];
  }

  /** Capability-shaped and never decorated, so no surface carries it. */
  async undecoratedHelper(_params: { amount: string }): Promise<TransactionNode[]> {
    return [];
  }

  @Query({ intent: "Read fixture approval data", params: approvalParams })
  async inspect(params: InferParams<typeof approvalParams>) {
    return { amount: params.amount };
  }

  @Receipt()
  swapReceipt(changes: readonly Change[]): MossReceipt<{ operation: "swap" }> {
    return receiptFor("swap", changes);
  }

  @Receipt()
  approvalReceipt(changes: readonly Change[]): MossReceipt<{ operation: "approve" }> {
    return receiptFor("approve", changes);
  }
}

/** Capability method names `self` exposed on the last SelfNestingProtocol build. */
let selfKeys: string[] = [];
let descendCalls = 0;
let leafCalls = 0;

const roundParams = {
  remaining: { type: UnsignedIntegerString, description: "Remaining nesting rounds." },
} satisfies ParamsSpec;

@Protocol({
  name: "selfrecursion",
  category: "token",
  description: "Fixture Protocol whose Capabilities nest through self without bound.",
  contracts: {},
})
class SelfRecursiveProtocol {
  declare self: SelfRef<SelfRecursiveProtocol, "descend" | "leaf">;

  @Capability<SelfRecursiveProtocol, typeof roundParams>({
    intent: "Nest one more copy of itself",
    verb: "swap",
    params: roundParams,
    receipt: "runReceipt",
    risk: ["fundOut"],
  })
  async descend(
    params: InferParams<typeof roundParams>,
    ctx: { account: AddressValue },
  ): Promise<Nestable<CapabilityResult>> {
    descendCalls += 1;
    const own = transaction(ctx.account, VAULT, { data: "0x01" });
    const remaining = Number(params.remaining);
    if (remaining <= 0) return nestable([own]);
    return nestable([await this.self.descend({ remaining: String(remaining - 1) }), own]);
  }

  @Capability<SelfRecursiveProtocol, typeof roundParams>({
    intent: "Nest a flat run of leaf Capabilities",
    verb: "swap",
    params: roundParams,
    receipt: "runReceipt",
    risk: ["fundOut"],
  })
  async spread(
    params: InferParams<typeof roundParams>,
    ctx: { account: AddressValue },
  ): Promise<CapabilityResult> {
    const children: (CapabilityNode | TransactionNode)[] = [];
    for (let round = 0; round < Number(params.remaining); round += 1) {
      children.push(await this.self.leaf({ remaining: "0" }));
    }
    children.push(transaction(ctx.account, VAULT, { data: "0x02" }));
    return children;
  }

  @Capability<SelfRecursiveProtocol, typeof roundParams>({
    intent: "Own one leaf transaction",
    verb: "swap",
    params: roundParams,
    receipt: "runReceipt",
    risk: ["fundOut"],
  })
  async leaf(
    _: InferParams<typeof roundParams>,
    ctx: { account: AddressValue },
  ): Promise<Nestable<CapabilityResult>> {
    leafCalls += 1;
    return nestable([transaction(ctx.account, VAULT, { data: "0x03" })]);
  }

  @Receipt()
  runReceipt(changes: readonly Change[]): MossReceipt<{ operation: "swap" }> {
    return receiptFor("swap", changes);
  }
}

@Protocol({
  name: "selfsurface",
  category: "token",
  description: "Fixture Protocol reaching for self outside a Capability.",
  contracts: {},
})
class SelfSurfaceProtocol {
  declare self: SelfRef<SelfSurfaceProtocol, "noop">;

  @Capability<SelfSurfaceProtocol, typeof noParams>({
    intent: "Own one transaction",
    verb: "swap",
    params: noParams,
    receipt: "noopReceipt",
    risk: ["fundOut"],
  })
  async noop(
    _: InferParams<typeof noParams>,
    ctx: { account: AddressValue },
  ): Promise<Nestable<TransactionNode[]>> {
    return nestable([transaction(ctx.account, VAULT, { data: "0x04" })]);
  }

  @Query({ intent: "Reach for self from a Query", params: noParams })
  async peek() {
    return { nested: typeof this.self.noop };
  }

  @Receipt()
  noopReceipt(changes: readonly Change[]): MossReceipt<{ operation: "swap" }> {
    if (typeof this.self.noop === "function") throw new Error("unreachable");
    return receiptFor("swap", changes);
  }
}

@Protocol({
  name: "selffield",
  category: "token",
  description: "Fixture Protocol that initializes self itself.",
  contracts: {},
})
class SelfFieldProtocol {
  self = { claimed: true };

  @Capability<SelfFieldProtocol, typeof noParams>({
    intent: "Own one transaction",
    verb: "swap",
    params: noParams,
    receipt: "fieldReceipt",
    risk: ["fundOut"],
  })
  async run(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return [transaction(ctx.account, VAULT, { data: "0x05" })];
  }

  @Receipt()
  fieldReceipt(changes: readonly Change[]): MossReceipt<{ operation: "swap" }> {
    return receiptFor("swap", changes);
  }
}

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

function receiptFor<T extends "approve" | "borrow" | "swap">(
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
  it("loads the debt risk label through Registry", () => {
    const registry = new Registry(runtime).use(DebtProtocol);
    const [loaded] = registry.load([{ protocol: "debt-fixture", method: "borrow" }]);

    expect(loaded?.risk).toEqual(["debt"]);
  });

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
    // Explanations are Protocol metadata, so both reach either target; the ABI is the target's own.
    // An entry the matched ABI cannot decode is simply never looked up.
    expect(registry.resolveContract("testvault", VAULT)).toEqual({
      abi: VaultAbi,
      customErrorMessages: { VaultLimit: "vault limit exceeded", SidecarOnly: "sidecar refused" },
      stringRevertMessages: { "vault: paused": "the vault is paused" },
    });
    expect(registry.resolveContract("testvault", SIDECAR)?.abi).toEqual(SIDECAR_ABI);
    expect(
      registry.resolveContract("testvault", "0x3333333333333333333333333333333333333333"),
    ).toBeUndefined();
    expect(registry.resolveContract("unregistered", VAULT)).toBeUndefined();
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

  it("routes a Protocol's own nested Capability through core (self-injection)", async () => {
    const registry = new Registry(runtime);
    registry.use(SelfNestingProtocol);

    const result = await registry.action("selfnesting", "swap", ACCOUNT, {});
    if (result.kind !== "capability") throw new Error("expected capability");

    // The nested node must be stamped by core, not hand-assembled.
    expect(result.children[0]).toMatchObject({
      kind: "capability",
      protocol: "selfnesting",
      method: "approve",
      params: { token: "1", amount: "10" },
    });
    expect(flattenCapabilityTree(result).map(({ transaction: tx }) => tx.data)).toEqual([
      "0x1234",
      "0xabcd",
    ]);

    // Registry must resolve the nested node's Receipt parser.
    const changes: Change[] = [
      { kind: "event", address: VAULT, topics: [], data: "0x" },
      { kind: "event", address: VAULT, topics: [], data: "0x" },
    ];
    const nested = result.children[0];
    if (nested?.kind !== "capability") throw new Error("expected nested capability");
    expect(registry.parseReceipt(nested, [changes[0] as Change]).outcome).toEqual({
      operation: "approve",
    });
    expect(registry.parseReceipt(result, [changes[1] as Change]).outcome).toEqual({
      operation: "swap",
    });
  });

  it("bounds self nesting during construction, before the over-limit method runs", async () => {
    const registry = new Registry(runtime);
    registry.use(SelfRecursiveProtocol);

    descendCalls = 0;
    await expect(
      registry.action("selfrecursion", "descend", ACCOUNT, { remaining: "100" }),
    ).rejects.toMatchObject({ name: "CapabilityTreeError", code: "CAPABILITY_DEPTH" });
    // The depth budget is spent, never exceeded: the call past the limit is
    // rejected instead of parsing params and running the Protocol method.
    expect(descendCalls).toBe(CAPABILITY_TREE_LIMITS.maxCapabilityDepth);

    leafCalls = 0;
    await expect(
      registry.action("selfrecursion", "spread", ACCOUNT, { remaining: "100" }),
    ).rejects.toMatchObject({ name: "CapabilityTreeError", code: "CAPABILITY_COUNT" });
    expect(leafCalls).toBe(CAPABILITY_TREE_LIMITS.maxCapabilities - 1);
  });

  it("injects self as a Capability-only surface and rejects it anywhere else", async () => {
    const registry = new Registry(runtime);
    registry.use(SelfNestingProtocol, SelfSurfaceProtocol, SelfFieldProtocol);

    selfKeys = [];
    await registry.action("selfnesting", "swap", ACCOUNT, {});
    // Queries read state and Receipt parsers stay pure, so neither is nestable,
    // and a method with no @Capability is on no surface at all.
    expect([...selfKeys].sort()).toEqual(["approve", "forge", "swap"]);

    await expect(registry.action("selfsurface", "peek", ACCOUNT, {})).rejects.toThrow(
      'cannot reach "self.noop" from a Query',
    );
    const node = await registry.action("selfsurface", "noop", ACCOUNT, {});
    if (node.kind !== "capability") throw new Error("expected capability");
    expect(() => registry.parseReceipt(node, [])).toThrow(
      'cannot reach "self.noop" from a Receipt',
    );

    await expect(registry.action("selffield", "run", ACCOUNT, {})).rejects.toThrow(
      'must leave "self" to core',
    );
  });

  it("refuses a method that is not a Capability when self is reached past a cast", async () => {
    const registry = new Registry(runtime);
    registry.use(SelfNestingProtocol);

    // `NestableNames` rejects all three names at compile time (types.fixture.ts).
    // A cast is the only way to reach them, and core refuses by name rather than
    // handing back undefined: an undecorated helper, a Query and a Receipt parser
    // are on no `self` surface.
    await expect(
      registry.action("selfnesting", "forge", ACCOUNT, { method: "undecoratedHelper" }),
    ).rejects.toThrow('cannot nest "self.undecoratedHelper", which is not a @Capability');
    await expect(
      registry.action("selfnesting", "forge", ACCOUNT, { method: "inspect" }),
    ).rejects.toThrow('cannot nest "self.inspect", which is not a @Capability');
    await expect(
      registry.action("selfnesting", "forge", ACCOUNT, { method: "approvalReceipt" }),
    ).rejects.toThrow('cannot nest "self.approvalReceipt", which is not a @Capability');
  });

  it("reserves self against contract and dependency injection keys", () => {
    expect(() =>
      Protocol({
        name: "reserved-contract",
        category: "token",
        description: "Fixture claiming self as a contract.",
        contracts: { self: { abi: VaultAbi, addr: VAULT } },
      }),
    ).toThrow('cannot declare a contract named "self"');
    expect(() =>
      Protocol({
        name: "reserved-dependency",
        category: "token",
        description: "Fixture claiming self as a dependency.",
        contracts: {},
        protocols: { self: ApprovalProtocol },
      }),
    ).toThrow('cannot declare a dependency named "self"');
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
    expect(() => new Registry(runtime).use(BadErrorMessageProtocol)).toThrow(
      'error "MissingError" is not declared by a contract ABI',
    );
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

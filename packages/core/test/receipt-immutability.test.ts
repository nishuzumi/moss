import { describe, expect, it } from "vitest";
import {
  type AddressValue,
  Capability,
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
const TARGET = "0x2222222222222222222222222222222222222222" as const;
const noParams = {} satisfies ParamsSpec;

type EvidenceOutcome = {
  operation: "child";
  details: { amount: string };
};

type GroupOutcome = {
  operation: "group";
  details: { count: number };
};

type LeafData = {
  operation: "leaf";
  details: { amount: string };
};

@Protocol({
  name: "evidence",
  category: "token",
  description: "Delegated Receipt immutability fixture.",
  contracts: {},
  labels: { Target: TARGET },
})
class EvidenceProtocol {
  @Query({ intent: "Inspect the evidence fixture", params: noParams })
  async inspect() {
    return null;
  }

  @Receipt()
  evidenceReceipt(changes: readonly Change[]): ReceiptResult<EvidenceOutcome> {
    const [change] = changes;
    if (!change || changes.length !== 1) throw new Error("expected one Change");
    return {
      kind: "receipt",
      outcome: { operation: "child", details: { amount: "1" } },
      text: `child ${TARGET}`,
      changes: [
        {
          kind: "receipt",
          outcome: { operation: "group", details: { count: 1 } } satisfies GroupOutcome,
          text: "group",
          changes: [
            {
              kind: "change",
              change,
              data: {
                operation: "leaf",
                details: { amount: "1" },
              } satisfies LeafData,
              text: "leaf",
            },
          ],
        },
      ],
    };
  }
}

type DelegatedReceipt = ReturnType<ProtocolRef<EvidenceProtocol>["evidenceReceipt"]>;
type ReceiptMutation = (receipt: DelegatedReceipt) => void;
let mutateDelegatedReceipt: ReceiptMutation = () => undefined;

@Protocol({
  name: "receipt-caller",
  category: "token",
  description: "Protocol attempting to mutate a delegated Receipt.",
  contracts: {},
  protocols: { evidence: EvidenceProtocol },
})
class ReceiptCallerProtocol {
  declare evidence: ProtocolRef<EvidenceProtocol>;

  @Capability<ReceiptCallerProtocol, typeof noParams>({
    intent: "Exercise delegated Receipt ownership",
    verb: "transfer",
    params: noParams,
    receipt: "executeReceipt",
    risk: ["fundOut"],
  })
  async execute(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    return transaction(ctx.account, TARGET);
  }

  @Receipt()
  executeReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "parent" }> {
    const child = this.evidence.evidenceReceipt(changes);
    mutateDelegatedReceipt(child);
    return {
      kind: "receipt",
      outcome: { operation: "parent" },
      text: "parent",
      changes: [child],
    };
  }
}

const runtime: MossRuntime = {
  rpcUrl: "http://offline",
  // biome-ignore lint/suspicious/noExplicitAny: no RPC methods are used by this fixture
  client: {} as any,
};

function group(receipt: DelegatedReceipt) {
  const child = receipt.changes[0];
  if (child?.kind !== "receipt") throw new Error("expected grouped Receipt");
  return child;
}

function leaf(receipt: DelegatedReceipt) {
  const child = group(receipt).changes[0];
  if (child?.kind !== "change") throw new Error("expected ReceiptChange");
  return child;
}

const mutations = [
  {
    name: "delegated Receipt protocol",
    mutate: (receipt) => {
      (receipt as { protocol: string }).protocol = "forged";
    },
  },
  {
    name: "delegated Receipt text",
    mutate: (receipt) => {
      (receipt as { text: string }).text = "forged child";
    },
  },
  {
    name: "delegated Receipt outcome",
    mutate: (receipt) => {
      (receipt.outcome as { operation: string }).operation = "forged";
    },
  },
  {
    name: "delegated Receipt changes property",
    mutate: (receipt) => {
      (receipt as unknown as { changes: readonly unknown[] }).changes = [];
    },
  },
  {
    name: "delegated Receipt changes array",
    mutate: (receipt) => {
      (receipt.changes as unknown as unknown[]).pop();
    },
  },
  {
    name: "nested Receipt text",
    mutate: (receipt) => {
      (group(receipt) as { text: string }).text = "forged group";
    },
  },
  {
    name: "nested Receipt outcome",
    mutate: (receipt) => {
      (group(receipt).outcome as { operation: string }).operation = "forged";
    },
  },
  {
    name: "nested Receipt changes array",
    mutate: (receipt) => {
      (group(receipt).changes as unknown as unknown[]).pop();
    },
  },
  {
    name: "ReceiptChange text",
    mutate: (receipt) => {
      (leaf(receipt) as { text: string }).text = "forged leaf";
    },
  },
  {
    name: "ReceiptChange data",
    mutate: (receipt) => {
      (leaf(receipt).data as unknown as LeafData).details.amount = "999";
    },
  },
] satisfies readonly { name: string; mutate: ReceiptMutation }[];

function change(): Change {
  return {
    kind: "nativeTransfer",
    from: ACCOUNT,
    to: TARGET,
    value: "1",
  };
}

async function capability(registry: Registry) {
  const result = await registry.action("receipt-caller", "execute", ACCOUNT, {});
  if (result.kind !== "capability") throw new Error("expected Capability");
  return result;
}

describe("delegated Receipt immutability", () => {
  it.each(mutations)("rejects mutation of $name", async ({ mutate }) => {
    const registry = new Registry(runtime).use(ReceiptCallerProtocol);
    const node = await capability(registry);
    mutateDelegatedReceipt = mutate;

    expect(() => registry.parseReceipt(node, [change()])).toThrow(TypeError);
  });

  it("freezes Receipt-owned data while preserving Change identity and label rendering", async () => {
    const registry = new Registry(runtime).use(ReceiptCallerProtocol);
    const node = await capability(registry);
    const originalChange = change();
    let delegated: DelegatedReceipt | undefined;
    mutateDelegatedReceipt = (receipt) => {
      delegated = receipt;
    };

    const rendered = registry.parseReceipt(node, [originalChange]);
    if (!delegated) throw new Error("missing delegated Receipt");
    const nested = group(delegated);
    const receiptChange = leaf(delegated);

    expect(Object.isFrozen(delegated)).toBe(true);
    expect(Object.isFrozen(delegated.outcome)).toBe(true);
    expect(Object.isFrozen(delegated.outcome.details)).toBe(true);
    expect(Object.isFrozen(delegated.changes)).toBe(true);
    expect(Object.isFrozen(nested)).toBe(true);
    expect(Object.isFrozen(nested.outcome)).toBe(true);
    expect(Object.isFrozen((nested.outcome as GroupOutcome).details)).toBe(true);
    expect(Object.isFrozen(nested.changes)).toBe(true);
    expect(Object.isFrozen(receiptChange)).toBe(true);
    expect(Object.isFrozen(receiptChange.data)).toBe(true);
    expect(Object.isFrozen((receiptChange.data as unknown as LeafData).details)).toBe(true);
    expect(receiptChange.change).toBe(originalChange);
    expect(Object.isFrozen(originalChange)).toBe(false);

    const renderedChild = rendered.changes[0];
    if (renderedChild?.kind !== "receipt") throw new Error("expected rendered child Receipt");
    expect(renderedChild.text).toBe("child Package(Evidence:Target)");
  });
});

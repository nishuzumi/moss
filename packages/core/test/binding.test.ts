import { parseAbi } from "viem";
import { describe, expect, it, vi } from "vitest";
import {
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  type ProtocolFactory,
  protocolFactory,
  Query,
  Receipt,
  type ReceiptResult,
  Registry,
  transaction,
  UnsignedIntegerString,
} from "../src/index.js";

const FixtureAbi = parseAbi(["function set(uint256 value)"]);
const FIRST = "0x1111111111111111111111111111111111111111" as const;
const SECOND = "0x2222222222222222222222222222222222222222" as const;
const ACCOUNT = "0x3333333333333333333333333333333333333333" as const;
const DIRECT = "0x4444444444444444444444444444444444444444" as const;

const fixtureBinding = {
  contract: { type: Address, description: "Contract bound to this fixture Protocol." },
} satisfies ParamsSpec;

const valueParams = {
  value: { type: UnsignedIntegerString, description: "Value written by this operation." },
} satisfies ParamsSpec;

const noParams = {} satisfies ParamsSpec;

let executions = 0;

@Protocol({
  name: "bound-fixture",
  category: "token",
  description: "Parameterized Registry fixture.",
  contracts: {},
  binding: {
    params: fixtureBinding,
    contracts: ({ contract }) => ({ fixture: { abi: FixtureAbi, addr: contract } }),
  },
})
class BoundFixture {
  declare fixture: Handle<typeof FixtureAbi>;
  #queries = 0;

  @Capability<BoundFixture, typeof valueParams>({
    intent: "Write a value to the bound fixture",
    verb: "transfer",
    params: valueParams,
    receipt: "setReceipt",
    risk: ["fundOut"],
  })
  async set(params: InferParams<typeof valueParams>) {
    executions += 1;
    return [this.fixture.set([BigInt(params.value)])];
  }

  @Query({ intent: "Inspect the bound fixture", params: noParams })
  async inspect() {
    return { contract: this.fixture.address, calls: ++this.#queries };
  }

  @Receipt()
  setReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "set" }> {
    return {
      kind: "receipt",
      outcome: { operation: "set" },
      text: "Set fixture value",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

const BoundFixtureFactory = protocolFactory(BoundFixture, fixtureBinding);

let asyncBindingExecutions = 0;
const asyncBinding = {
  contract: {
    type: Address.refine(async () => true).describe("A synchronously validated fixture address."),
    description: "Contract bound through an invalid asynchronous schema.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "async-bound-fixture",
  category: "token",
  description: "Fixture with an invalid asynchronous binding schema.",
  contracts: {},
  binding: { params: asyncBinding, contracts: () => ({}) },
})
class AsyncBoundFixture {
  @Query({ intent: "Inspect the async fixture", params: noParams })
  async inspect() {
    asyncBindingExecutions += 1;
    return null;
  }
}

@Protocol({
  name: "bound-composer",
  category: "token",
  description: "Unbound Protocol that composes parameterized fixtures.",
  contracts: {},
  protocols: { fixture: BoundFixtureFactory },
})
class BoundComposer {
  declare fixture: ProtocolFactory<typeof BoundFixtureFactory>;

  @Capability<BoundComposer, typeof noParams>({
    intent: "Compose two independently bound fixture writes",
    verb: "transfer",
    params: noParams,
    receipt: "composeReceipt",
    risk: ["fundOut"],
  })
  async compose(_: InferParams<typeof noParams>, ctx: { account: AddressValue }) {
    const first = this.fixture.create({ contract: FIRST });
    const second = this.fixture.create({ contract: SECOND });
    const inspected = await first.inspect({});
    if (inspected.contract !== FIRST) throw new Error("Query used the wrong binding");
    return [
      await first.set({ value: "1" }),
      await second.set({ value: "2" }),
      transaction(ctx.account, DIRECT),
    ];
  }

  @Query({ intent: "Prove repeated bindings create independent references", params: noParams })
  async independent() {
    const first = this.fixture.create({ contract: FIRST });
    const second = this.fixture.create({ contract: FIRST });
    return { first: await first.inspect({}), second: await second.inspect({}) };
  }

  @Receipt()
  composeReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "compose" }> {
    if (Object.hasOwn(this.fixture, "create")) {
      throw new Error("Receipt instance exposed a live factory");
    }
    const nested = this.fixture.receipts.setReceipt(changes);
    return {
      kind: "receipt",
      outcome: { operation: "compose" },
      text: "Composed fixture writes",
      changes: [nested],
    };
  }
}

const client = {
  readContract: vi.fn(),
  call: vi.fn(),
};

const runtime: MossRuntime = {
  rpcUrl: "http://offline",
  // biome-ignore lint/suspicious/noExplicitAny: only call counts matter in this fixture
  client: client as any,
};

describe("Bound Protocol Registry seam", () => {
  it("loads and executes binding separately from method params", async () => {
    const registry = new Registry(runtime).use({ BoundFixture, BoundFixtureFactory });

    expect(registry.load([{ protocol: "bound-fixture", method: "set" }])).toMatchObject([
      {
        binding: {
          contract: {
            description: "Contract bound to this fixture Protocol.",
            type: { description: expect.stringContaining("20-byte EVM address") },
          },
        },
        params: { value: { description: "Value written by this operation." } },
      },
    ]);

    const result = await registry.action(
      "bound-fixture",
      "set",
      ACCOUNT,
      { value: "7" },
      { contract: FIRST },
    );
    if (result.kind !== "capability") throw new Error("expected Capability");
    expect(result).toMatchObject({
      binding: { contract: FIRST },
      params: { value: "7" },
      children: [{ kind: "transaction", transaction: { from: ACCOUNT, to: FIRST } }],
    });
  });

  it("injects uncached factories for Capability, Query, and Receipt composition", async () => {
    const registry = new Registry(runtime).use(BoundComposer);
    const [loaded] = registry.load([{ protocol: "bound-composer", method: "compose" }]);
    expect(loaded).not.toHaveProperty("binding");

    const result = await registry.action("bound-composer", "compose", ACCOUNT, {});
    if (result.kind !== "capability") throw new Error("expected Capability");
    expect(result).not.toHaveProperty("binding");
    expect(result.children.slice(0, 2)).toMatchObject([
      { kind: "capability", binding: { contract: FIRST } },
      { kind: "capability", binding: { contract: SECOND } },
    ]);
    expect(registry.parseReceipt(result, []).changes).toHaveLength(1);

    const query = await registry.action("bound-composer", "independent", ACCOUNT, {});
    expect(query).toEqual({
      kind: "query",
      protocol: "bound-composer",
      method: "independent",
      data: {
        first: { contract: FIRST, calls: 1 },
        second: { contract: FIRST, calls: 1 },
      },
    });
  });

  it("rejects malformed bindings before Protocol execution or RPC", async () => {
    executions = 0;
    client.readContract.mockClear();
    client.call.mockClear();
    const registry = new Registry(runtime).use(BoundFixture);

    await expect(
      registry.action(
        "bound-fixture",
        "set",
        ACCOUNT,
        { value: "1" },
        { contract: "not-an-address" },
      ),
    ).rejects.toThrow("invalid binding");
    await expect(registry.action("bound-fixture", "set", ACCOUNT, { value: "1" })).rejects.toThrow(
      "requires one",
    );
    expect(executions).toBe(0);
    expect(client.readContract).not.toHaveBeenCalled();
    expect(client.call).not.toHaveBeenCalled();

    asyncBindingExecutions = 0;
    const asyncRegistry = new Registry(runtime).use(AsyncBoundFixture);
    await expect(
      asyncRegistry.action("async-bound-fixture", "inspect", ACCOUNT, {}, { contract: FIRST }),
    ).rejects.toThrow("Encountered Promise during synchronous parse");
    expect(asyncBindingExecutions).toBe(0);

    expect(() => protocolFactory(BoundFixture, { ...fixtureBinding })).toThrow(
      "declared binding schema",
    );
  });
});

import { parseAbi } from "viem";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod/v4";
import {
  Address,
  type AddressValue,
  Capability,
  type Change,
  createProtocolFactory,
  flattenCapabilityTree,
  type Handle,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
  Registry,
  transaction,
  UnsignedIntegerString,
} from "../src/index.js";

const AssetAbi = parseAbi(["function transfer(address recipient, uint256 amount) returns (bool)"]);
const ACCOUNT = "0x1111111111111111111111111111111111111111" as const;
const TOKEN_A = "0x2222222222222222222222222222222222222222" as const;
const TOKEN_B = "0x3333333333333333333333333333333333333333" as const;
const RECIPIENT = "0x4444444444444444444444444444444444444444" as const;
const ROOT_TARGET = "0x5555555555555555555555555555555555555555" as const;

const assetBinding = {
  token: { type: Address, description: "ERC-compatible token contract bound to this instance." },
} satisfies ParamsSpec;

const moveParams = {
  recipient: { type: Address, description: "Address that receives the bound asset." },
  amount: { type: UnsignedIntegerString, description: "Raw token amount to transfer." },
} satisfies ParamsSpec;

const inspectParams = {} satisfies ParamsSpec;

let bindingContractCalls = 0;

@Protocol({
  name: "bound-asset",
  category: "token",
  description: "Parameterized asset fixture.",
  contracts: {},
  binding: {
    params: assetBinding,
    contracts: ({ token }) => {
      bindingContractCalls += 1;
      return { asset: { abi: AssetAbi, addr: token } };
    },
  },
})
class BoundAsset {
  declare asset: Handle<typeof AssetAbi>;

  @Capability<BoundAsset, typeof moveParams>({
    intent: "Move the bound asset",
    verb: "transfer",
    params: moveParams,
    receipt: "moveReceipt",
    risk: ["fundOut"],
  })
  async move(params: InferParams<typeof moveParams>) {
    return [this.asset.transfer([params.recipient, BigInt(params.amount)])];
  }

  @Query({ intent: "Inspect the bound asset", params: inspectParams })
  async inspect() {
    return { token: this.asset.address };
  }

  @Receipt()
  moveReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "move" }> {
    if ("runtime" in this || "asset" in this) {
      throw new Error("Receipt references must not expose Runtime or bound Handles");
    }
    return {
      kind: "receipt",
      outcome: { operation: "move" },
      text: "Moved a bound asset",
      changes: changes.map((change) => ({
        kind: "change",
        change,
        data: { operation: "move" },
        text: "Observed a bound asset Change",
      })),
    };
  }
}

const BoundAssetFactory = createProtocolFactory(BoundAsset, assetBinding);

let bindingDecodeCalls = 0;
let lastDecodedRevision: string | undefined;

const transformingBinding = {
  token: { type: Address, description: "Token contract bound to the transform fixture." },
  revision: {
    type: z
      .string()
      .overwrite((value) => {
        bindingDecodeCalls += 1;
        return `${value}!`;
      })
      .describe("A revision string decoded once by the binding schema."),
    description: "Revision used to detect repeated binding decoding.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "transforming-binding",
  category: "token",
  description: "Fixture with a non-idempotent binding transform.",
  contracts: {},
  binding: {
    params: transformingBinding,
    contracts: ({ token, revision }) => {
      lastDecodedRevision = revision;
      return { asset: { abi: AssetAbi, addr: token } };
    },
  },
})
class TransformingBindingProtocol {
  declare asset: Handle<typeof AssetAbi>;

  @Query({ intent: "Inspect the transformed binding", params: inspectParams })
  async inspect() {
    return { token: this.asset.address };
  }
}

const TransformingBindingFactory = createProtocolFactory(
  TransformingBindingProtocol,
  transformingBinding,
);

const composeParams = {
  first: { type: Address, description: "First token binding used by the composition." },
  second: { type: Address, description: "Second token binding used by the composition." },
} satisfies ParamsSpec;

@Protocol({
  name: "bound-composer",
  category: "dex",
  description: "Fixture that composes independent bound Protocol references.",
  contracts: {},
  protocols: { assets: BoundAssetFactory, transformed: TransformingBindingFactory },
})
class BoundComposer {
  declare assets: typeof BoundAssetFactory;
  declare transformed: typeof TransformingBindingFactory;

  @Capability<BoundComposer, typeof composeParams>({
    intent: "Compose two bound asset movements",
    verb: "swap",
    params: composeParams,
    receipt: "composeReceipt",
    risk: ["fundOut"],
  })
  async compose(params: InferParams<typeof composeParams>, ctx: { account: AddressValue }) {
    const first = this.assets.create({ token: params.first });
    const second = this.assets.create({ token: params.second });
    if (first === second) throw new Error("factory cached a bound Protocol reference");
    return [
      await first.move({ recipient: RECIPIENT, amount: "1" }),
      await second.move({ recipient: RECIPIENT, amount: "2" }),
      transaction(ctx.account, ROOT_TARGET, { data: "0xcafe" }),
    ];
  }

  @Query({ intent: "Inspect independent bound references", params: composeParams })
  async inspect(params: InferParams<typeof composeParams>) {
    const first = this.assets.create({ token: params.first });
    const second = this.assets.create({ token: params.second });
    return {
      independent: first !== second,
      first: await first.inspect({}),
      second: await second.inspect({}),
    };
  }

  @Query({ intent: "Exercise runtime factory validation", params: inspectParams })
  async rejectInvalidFactoryBinding() {
    // @ts-expect-error Deliberately bypass the public type contract to exercise runtime validation.
    this.assets.create({ token: "not-an-address" });
    return null;
  }

  @Query({ intent: "Inspect one transformed bound reference", params: inspectParams })
  async inspectTransformed() {
    const bound = this.transformed.create({ token: TOKEN_A, revision: "v1" });
    return bound.inspect({});
  }

  @Receipt()
  composeReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "compose" }> {
    return {
      kind: "receipt",
      outcome: { operation: "compose" },
      text: "Composed bound assets",
      changes: [this.assets.receipts.moveReceipt(changes)],
    };
  }
}

const asyncBinding = {
  identity: {
    type: z
      .string()
      .refine(async () => true)
      .describe("A fixture identity whose validation is incorrectly asynchronous."),
    description: "Identity used to prove binding validation is synchronous.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "async-binding",
  category: "token",
  description: "Invalid asynchronous binding fixture.",
  contracts: {},
  binding: { params: asyncBinding, contracts: () => ({}) },
})
class AsyncBindingProtocol {
  @Query({ intent: "Inspect the invalid binding fixture", params: inspectParams })
  async inspect() {
    return null;
  }
}

const undescribedBinding = {
  identity: {
    type: z.string(),
    description: "Identity with an intentionally undescribed binding type.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "undescribed-binding",
  category: "token",
  description: "Invalid binding metadata fixture.",
  contracts: {},
  binding: { params: undescribedBinding, contracts: () => ({}) },
})
class UndescribedBindingProtocol {
  @Query({ intent: "Inspect the invalid binding metadata", params: inspectParams })
  async inspect() {
    return null;
  }
}

const runtime = (): MossRuntime => ({
  rpcUrl: "http://offline",
  client: {
    readContract: vi.fn(),
    call: vi.fn(),
  } as unknown as MossRuntime["client"],
});

describe("bound Protocol Registry seam", () => {
  it("requires an explicit factory alias tied to the declared binding schema", () => {
    expect(typeof BoundAssetFactory).toBe("object");
    expect(() => createProtocolFactory(BoundAsset, { ...assetBinding })).toThrow(
      "must use its declared binding schema",
    );
    expect(() => createProtocolFactory(BoundComposer, {})).toThrow(
      "does not declare a Protocol binding",
    );
  });

  it("describes binding separately and serializes canonical binding on CapabilityNodes", async () => {
    bindingContractCalls = 0;
    const registry = new Registry(runtime()).use(BoundAssetFactory);
    const [loaded] = registry.load([{ protocol: "bound-asset", method: "move" }]);

    expect(loaded?.binding).toEqual({
      token: {
        description: "ERC-compatible token contract bound to this instance.",
        type: expect.objectContaining({ description: expect.stringContaining("20-byte EVM") }),
      },
    });
    expect(loaded?.params).toHaveProperty("recipient");
    expect(loaded?.params).not.toHaveProperty("token");

    const result = await registry.action(
      "bound-asset",
      "move",
      ACCOUNT,
      { recipient: RECIPIENT, amount: "7" },
      { token: TOKEN_A },
    );
    if (result.kind !== "capability") throw new Error("expected Capability");
    expect(result.binding).toEqual({ token: TOKEN_A });
    expect(result.params).toEqual({ recipient: RECIPIENT, amount: "7" });
    expect(flattenCapabilityTree(result)[0]?.transaction.to).toBe(TOKEN_A);
    expect(bindingContractCalls).toBe(1);

    const query = await registry.action("bound-asset", "inspect", ACCOUNT, {}, { token: TOKEN_B });
    expect(query).toEqual({
      kind: "query",
      protocol: "bound-asset",
      method: "inspect",
      data: { token: TOKEN_B },
    });
  });

  it("injects non-callable factories with independent references and pure Receipts", async () => {
    const registry = new Registry(runtime()).use(BoundComposer);
    const capability = await registry.action("bound-composer", "compose", ACCOUNT, {
      first: TOKEN_A,
      second: TOKEN_B,
    });
    if (capability.kind !== "capability") throw new Error("expected Capability");

    expect(capability.binding).toBeUndefined();
    expect(capability.children.slice(0, 2)).toMatchObject([
      { kind: "capability", protocol: "bound-asset", binding: { token: TOKEN_A } },
      { kind: "capability", protocol: "bound-asset", binding: { token: TOKEN_B } },
    ]);
    expect(flattenCapabilityTree(capability).map(({ transaction: tx }) => tx.to)).toEqual([
      TOKEN_A,
      TOKEN_B,
      ROOT_TARGET,
    ]);

    const query = await registry.action("bound-composer", "inspect", ACCOUNT, {
      first: TOKEN_A,
      second: TOKEN_A,
    });
    expect(query).toMatchObject({
      kind: "query",
      data: {
        independent: true,
        first: { token: TOKEN_A },
        second: { token: TOKEN_A },
      },
    });
    expect(registry.parseReceipt(capability, [])).toMatchObject({
      outcome: { operation: "compose" },
      changes: [{ outcome: { operation: "move" } }],
    });
  });

  it("decodes factory bindings exactly once before reusing the validated value", async () => {
    bindingDecodeCalls = 0;
    lastDecodedRevision = undefined;
    const registry = new Registry(runtime()).use(BoundComposer);

    await expect(
      registry.action("bound-composer", "inspectTransformed", ACCOUNT, {}),
    ).resolves.toMatchObject({ data: { token: TOKEN_A } });
    expect(bindingDecodeCalls).toBe(1);
    expect(lastDecodedRevision).toBe("v1!");
  });

  it("rejects malformed binding before construction, Protocol execution, or RPC", async () => {
    bindingContractCalls = 0;
    const mossRuntime = runtime();
    const registry = new Registry(mossRuntime).use(BoundAssetFactory, BoundComposer);

    await expect(
      registry.action(
        "bound-asset",
        "move",
        ACCOUNT,
        { recipient: "also-invalid", amount: -1 },
        { token: "not-an-address" },
      ),
    ).rejects.toThrow("invalid binding");
    await expect(
      registry.action("bound-asset", "inspect", ACCOUNT, {}, { token: TOKEN_A, extra: true }),
    ).rejects.toThrow("invalid binding");
    await expect(registry.action("bound-asset", "inspect", ACCOUNT, {})).rejects.toThrow(
      "requires a binding object",
    );
    await expect(
      registry.action(
        "bound-composer",
        "inspect",
        ACCOUNT,
        {
          first: TOKEN_A,
          second: TOKEN_B,
        },
        { token: TOKEN_A },
      ),
    ).rejects.toThrow("does not accept a binding");
    await expect(
      registry.action("bound-composer", "rejectInvalidFactoryBinding", ACCOUNT, {}),
    ).rejects.toThrow("invalid binding");

    expect(bindingContractCalls).toBe(0);
    expect(mossRuntime.client.readContract).not.toHaveBeenCalled();
    expect(mossRuntime.client.call).not.toHaveBeenCalled();
  });

  it("rejects asynchronous binding schemas", async () => {
    const registry = new Registry(runtime()).use(AsyncBindingProtocol);
    await expect(
      registry.action("async-binding", "inspect", ACCOUNT, {}, { identity: "fixture" }),
    ).rejects.toThrow("binding schemas must be synchronous");
  });

  it("keeps declaration names inside the quoted metadata path", () => {
    expect(() => new Registry(runtime()).use(UndescribedBindingProtocol)).toThrow(
      'binding "undescribed-binding.identity" type description must be a non-empty string',
    );
  });
});

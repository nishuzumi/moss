import {
  Address,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import type { MetaMorphoV1_1Abi, MetaMorphoV1_1FactoryAbi } from "../src/index.js";
import { Morpho } from "../src/index.js";

const fixtureParams = {
  vault: { type: Address, description: "Fixture vault." },
  amount: { type: PositiveDecimalString, description: "Fixture amount." },
} satisfies ParamsSpec;

const validParams: InferParams<typeof fixtureParams> = {
  vault: "0x32841A8511D5c2c5b253f45668780B99139e476D",
  amount: "1.5",
};
const invalidAmount: InferParams<typeof fixtureParams> = {
  vault: "0x32841A8511D5c2c5b253f45668780B99139e476D",
  // @ts-expect-error Amounts are inferred from the Zod schema as decimal strings, not numbers.
  amount: 1.5,
};

const morpho = null as unknown as ProtocolRef<Morpho>;
void morpho.supply;
void morpho.withdraw;
void morpho.position;
morpho.supplyReceipt([]).protocol satisfies string;
morpho.supplyReceipt([]).outcome.operation satisfies "supply" | "withdraw";
// @ts-expect-error Injected Protocol references expose methods, not Handles.
void morpho.factory;

function vaultHandleFixture(handle: Handle<typeof MetaMorphoV1_1Abi>) {
  handle.deposit([1n, "0x1111111111111111111111111111111111111111"]);
  handle.withdraw([
    1n,
    "0x1111111111111111111111111111111111111111",
    "0x1111111111111111111111111111111111111111",
  ]);
  handle.read.maxWithdraw(["0x1111111111111111111111111111111111111111"]);
  // @ts-expect-error ABI-generic Handles reject methods the vault does not expose.
  handle.borrow([1n]);
  // @ts-expect-error ABI-generic Handles reject invalid ABI arguments.
  handle.read.maxWithdraw(["not-an-address"]);
}

function factoryHandleFixture(handle: Handle<typeof MetaMorphoV1_1FactoryAbi>) {
  handle.read.isMetaMorpho(["0x1111111111111111111111111111111111111111"]);
  // @ts-expect-error The factory has no vault deposit method.
  handle.deposit([1n]);
}

@Protocol({
  name: "valid-morpho-dependency-fixture",
  category: "lending",
  description: "Compile-time dependency fixture.",
  contracts: {},
  protocols: { morpho: Morpho },
})
class ValidDependencyFixture {
  declare morpho: ProtocolRef<Morpho>;
}

// @ts-expect-error Protocol dependencies require a matching typed instance field.
@Protocol({
  name: "invalid-morpho-dependency-fixture",
  category: "lending",
  description: "Compile-time dependency fixture.",
  contracts: {},
  protocols: { morpho: Morpho },
})
class InvalidDependencyFixture {}

class ReceiptNameFixture extends Morpho {
  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "supply",
    params: fixtureParams,
    receipt: "supplyReceipt",
    risk: ["fundOut"],
  })
  async valid(_: InferParams<typeof fixtureParams>) {
    return [];
  }

  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "supply",
    params: fixtureParams,
    // @ts-expect-error Receipt names are limited to methods returning ReceiptResult.
    receipt: "vaultInfo",
    risk: ["fundOut"],
  })
  async invalidReceiptName() {
    return [];
  }

  // @ts-expect-error Capability method params must match the declared parameter schemas.
  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "supply",
    params: fixtureParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
  })
  async invalidParams(_: { amount: number }) {
    return [];
  }

  @Query({ intent: "Compile-time query fixture", params: fixtureParams })
  async validQuery(params: InferParams<typeof fixtureParams>) {
    return params.vault;
  }

  // @ts-expect-error Query method params must match the declared parameter schemas.
  @Query({ intent: "Compile-time query fixture", params: fixtureParams })
  async invalidQuery(_: { vault: number }) {
    return "invalid";
  }

  @Receipt()
  fixtureReceipt(changes: readonly Change[]): ReceiptResult<{ ok: true }> {
    return {
      kind: "receipt",
      outcome: { ok: true },
      text: "Fixture Receipt: valid",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

const author = null as unknown as Morpho;
const authored = author.supplyReceipt([]);
authored.outcome.shares satisfies string;
// @ts-expect-error Package-authored ReceiptResult has no Core-owned Protocol provenance.
authored.protocol;
// @ts-expect-error The Outcome is typed; there is no free-form share field.
authored.outcome.sharesOut;

void validParams;
void invalidAmount;
void vaultHandleFixture;
void factoryHandleFixture;
void ValidDependencyFixture;
void InvalidDependencyFixture;
void ReceiptNameFixture;

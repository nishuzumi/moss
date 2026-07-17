import {
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import type { ExampleVaultAbi } from "../src/abis/example.js";
import { ExampleProtocol } from "../src/adapter.js";

const fixtureParams = {
  amount: { type: UnsignedIntegerString, description: "Fixture amount." },
} satisfies ParamsSpec;

const validParams: InferParams<typeof fixtureParams> = { amount: "42" };
// @ts-expect-error Params are inferred from the Zod schema as strings, not numbers.
const invalidParams: InferParams<typeof fixtureParams> = { amount: 42 };
const dependency = null as unknown as ProtocolRef<ExampleProtocol>;
void dependency.deposit;
dependency.depositReceipt([]).protocol satisfies string;
// @ts-expect-error Injected Protocol references expose methods, not Handles.
void dependency.vault;

function handleFixture(handle: Handle<typeof ExampleVaultAbi>) {
  handle.deposit([], { value: 1n });
  handle.read.balanceOf(["0x1111111111111111111111111111111111111111"]);
  // @ts-expect-error ABI-generic Handles reject unknown contract methods.
  handle.withdraw([]);
  // @ts-expect-error ABI-generic Handles reject invalid ABI arguments.
  handle.read.balanceOf(["not-an-address"]);
}

@Protocol({
  name: "valid-dependency-fixture",
  category: "token",
  description: "Compile-time dependency fixture.",
  contracts: {},
  protocols: { example: ExampleProtocol },
})
class ValidDependencyFixture {
  declare example: ProtocolRef<ExampleProtocol>;
}

// @ts-expect-error Protocol dependencies require a matching typed instance field.
@Protocol({
  name: "invalid-dependency-fixture",
  category: "token",
  description: "Compile-time dependency fixture.",
  contracts: {},
  protocols: { example: ExampleProtocol },
})
class InvalidDependencyFixture {}

// @ts-expect-error Protocol classes cannot require constructor arguments; Registry owns construction.
@Protocol({
  name: "invalid-constructor-fixture",
  category: "token",
  description: "Compile-time constructor fixture.",
  contracts: {},
})
class InvalidConstructorFixture {
  constructor(_required: string) {}
}

class ReceiptNameFixture extends ExampleProtocol {
  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "supply",
    params: fixtureParams,
    receipt: "depositReceipt",
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
    receipt: "missingReceipt",
    risk: ["fundOut"],
  })
  async invalid() {
    return [];
  }

  // @ts-expect-error Capability method params must match the declared parameter schemas.
  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "supply",
    params: fixtureParams,
    receipt: "depositReceipt",
    risk: ["fundOut"],
  })
  async invalidParams(_: { amount: number }) {
    return [];
  }

  @Query({ intent: "Compile-time query fixture", params: fixtureParams })
  async validQuery(params: InferParams<typeof fixtureParams>) {
    return params.amount;
  }

  // @ts-expect-error Query method params must match the declared parameter schemas.
  @Query({ intent: "Compile-time query fixture", params: fixtureParams })
  async invalidQuery(_: { amount: number }) {
    return "invalid";
  }

  @Receipt()
  typedReceipt(changes: readonly Change[]): ReceiptResult<{ ok: true }> {
    return {
      kind: "receipt",
      outcome: { ok: true },
      text: "Fixture Receipt: valid",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }

  // @ts-expect-error Receipt parsers accept only an immutable ordered Change list.
  @Receipt()
  invalidReceipt(_: string): ReceiptResult<{ ok: true }> {
    return { kind: "receipt", outcome: { ok: true }, text: "invalid", changes: [] };
  }
}

const author = null as unknown as ReceiptNameFixture;
const authoredReceipt = author.typedReceipt([]);
// @ts-expect-error Package-authored ReceiptResult has no Core-owned Protocol provenance.
authoredReceipt.protocol;

void validParams;
void invalidParams;
void handleFixture;
void ValidDependencyFixture;
void InvalidDependencyFixture;
void InvalidConstructorFixture;
void ReceiptNameFixture;

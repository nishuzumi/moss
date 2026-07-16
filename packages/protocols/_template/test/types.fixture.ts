import {
  Address,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  type ProtocolFactory,
  type ProtocolRef,
  protocolFactory,
  Query,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "@themoss/core";
import { ExampleVaultAbi } from "../src/abis/example.js";
import { ExampleProtocol } from "../src/adapter.js";

const fixtureParams = {
  amount: { type: UnsignedIntegerString, description: "Fixture amount." },
} satisfies ParamsSpec;

const validParams: InferParams<typeof fixtureParams> = { amount: "42" };
// @ts-expect-error Params are inferred from the Zod schema as strings, not numbers.
const invalidParams: InferParams<typeof fixtureParams> = { amount: 42 };
const dependency = null as unknown as ProtocolRef<ExampleProtocol>;
void dependency.deposit;
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

const bindingParams = {
  vault: { type: Address, description: "Vault bound to the compile-time fixture." },
} satisfies ParamsSpec;

@Protocol({
  name: "bound-template-fixture",
  category: "token",
  description: "Compile-time bound Protocol fixture.",
  contracts: {},
  binding: {
    params: bindingParams,
    contracts: ({ vault }) => ({ vault: { abi: ExampleVaultAbi, addr: vault } }),
  },
})
class BoundTemplateFixture {
  declare vault: Handle<typeof ExampleVaultAbi>;

  @Query({ intent: "Inspect a bound fixture", params: fixtureParams })
  async inspect(params: InferParams<typeof fixtureParams>) {
    return { address: this.vault.address, amount: params.amount };
  }

  @Receipt()
  boundReceipt(changes: readonly Change[]): ReceiptResult<{ ok: true }> {
    return {
      kind: "receipt",
      outcome: { ok: true },
      text: "Fixture Receipt: valid",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

const BoundTemplateFactory = protocolFactory(BoundTemplateFixture, bindingParams);
const boundFactory = null as unknown as ProtocolFactory<typeof BoundTemplateFactory>;
const boundReference = boundFactory.create({
  vault: "0x1111111111111111111111111111111111111111",
});
void boundReference.inspect({ amount: "42" });
void boundFactory.receipts.boundReceipt([]);
// @ts-expect-error Factory bindings retain the schema-derived address type.
boundFactory.create({ vault: 42 });
// @ts-expect-error Bound references exclude pure Receipt parsers.
void boundReference.boundReceipt([]);
// @ts-expect-error Receipt references exclude Capabilities and Queries.
void boundFactory.receipts.inspect({ amount: "42" });

@Protocol({
  name: "bound-consumer-fixture",
  category: "token",
  description: "Compile-time factory dependency fixture.",
  contracts: {},
  protocols: { bound: BoundTemplateFactory },
})
class BoundConsumerFixture {
  declare bound: ProtocolFactory<typeof BoundTemplateFactory>;
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

void validParams;
void invalidParams;
void handleFixture;
void ValidDependencyFixture;
void InvalidDependencyFixture;
void InvalidConstructorFixture;
void BoundConsumerFixture;
void ReceiptNameFixture;

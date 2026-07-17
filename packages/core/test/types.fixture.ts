import { parseAbi } from "viem";
import {
  Address,
  type BoundProtocolRef,
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  type ProtocolFactory,
  protocolFactory,
  Query,
  Receipt,
  type ReceiptRef,
  type ReceiptResult,
  UnsignedIntegerString,
} from "../src/index.js";

const FixtureAbi = parseAbi(["function set(uint256 value)"]);
const CONTRACT = "0x1111111111111111111111111111111111111111" as const;

const bindingParams = {
  contract: { type: Address, description: "Contract bound to the fixture." },
} satisfies ParamsSpec;

const methodParams = {
  value: { type: UnsignedIntegerString, description: "Value written by the fixture." },
} satisfies ParamsSpec;

@Protocol({
  name: "bound-types-fixture",
  category: "token",
  description: "Compile-time Bound Protocol fixture.",
  contracts: {},
  binding: {
    params: bindingParams,
    contracts: (binding) => {
      const address: `0x${string}` = binding.contract;
      // @ts-expect-error Binding values are derived from their runtime schema.
      const invalid: number = binding.contract;
      void invalid;
      return { fixture: { abi: FixtureAbi, addr: address } };
    },
  },
})
class BoundTypesFixture {
  declare fixture: Handle<typeof FixtureAbi>;

  @Capability<BoundTypesFixture, typeof methodParams>({
    intent: "Write the fixture value",
    verb: "transfer",
    params: methodParams,
    receipt: "setReceipt",
    risk: ["fundOut"],
  })
  async set(params: InferParams<typeof methodParams>) {
    return [this.fixture.set([BigInt(params.value)])];
  }

  @Query({ intent: "Read the fixture address", params: {} })
  async inspect() {
    return { contract: this.fixture.address };
  }

  @Receipt()
  setReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "set" }> {
    return {
      kind: "receipt",
      outcome: { operation: "set" },
      text: "set",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

const BoundTypesFactory = protocolFactory(BoundTypesFixture, bindingParams);
type BoundTypesFactory = ProtocolFactory<typeof BoundTypesFactory>;

const factory = null as unknown as BoundTypesFactory;
const reference: BoundProtocolRef<BoundTypesFixture> = factory.create({ contract: CONTRACT });
void reference.set({ value: "42" });
void reference.inspect({});
void factory.receipts.setReceipt([]);

const strictReceipts = null as unknown as ReceiptRef<{
  valid(changes: readonly Change[]): ReceiptResult<{ operation: "set" }>;
  invalid(value: string): ReceiptResult<{ operation: "set" }>;
}>;
void strictReceipts.valid([]);
// @ts-expect-error Receipt-shaped methods with invalid parser parameters are excluded.
void strictReceipts.invalid("not changes");

// @ts-expect-error Protocol factories are non-callable objects.
factory({ contract: CONTRACT });
// @ts-expect-error Factory bindings retain the schema-derived address type.
factory.create({ contract: 42 });
// @ts-expect-error Bound references retain method parameter types.
void reference.set({ value: 42 });
// @ts-expect-error Bound references do not expose Receipt parsers.
void reference.setReceipt([]);
// @ts-expect-error Receipt references expose only pure parsers.
void factory.receipts.set({ value: "42" });

@Protocol({
  name: "valid-factory-dependency",
  category: "token",
  description: "Compile-time factory injection fixture.",
  contracts: {},
  protocols: { bound: BoundTypesFactory },
})
class ValidFactoryDependency {
  declare bound: BoundTypesFactory;
}

// @ts-expect-error Factory dependencies require a matching typed instance field.
@Protocol({
  name: "invalid-factory-dependency",
  category: "token",
  description: "Compile-time invalid factory injection fixture.",
  contracts: {},
  protocols: { bound: BoundTypesFactory },
})
class InvalidFactoryDependency {}

@Protocol({
  name: "async-binding-fixture",
  category: "token",
  description: "Compile-time synchronous binding fixture.",
  contracts: {},
  binding: {
    params: bindingParams,
    // @ts-expect-error Dynamic contract construction must be synchronous.
    contracts: async ({ contract }) => ({ fixture: { abi: FixtureAbi, addr: contract } }),
  },
})
class AsyncBindingFixture {}

void ValidFactoryDependency;
void InvalidFactoryDependency;
void AsyncBindingFixture;

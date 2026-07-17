import { parseAbi } from "viem";
import {
  Address,
  type AddressValue,
  Capability,
  type Change,
  createProtocolFactory,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
  type ReceiptResult,
  UnsignedIntegerString,
} from "../src/index.js";

const FixtureAbi = parseAbi(["function transfer(address recipient, uint256 amount)"]);
const TOKEN = "0x1111111111111111111111111111111111111111" as const;
const RECIPIENT = "0x2222222222222222222222222222222222222222" as const;

const fixtureBinding = {
  token: { type: Address, description: "Token contract bound to this compile-time fixture." },
} satisfies ParamsSpec;

const fixtureParams = {
  recipient: { type: Address, description: "Recipient of the fixture transfer." },
  amount: { type: UnsignedIntegerString, description: "Raw fixture transfer amount." },
} satisfies ParamsSpec;

const noParams = {} satisfies ParamsSpec;

type FixtureBinding = InferParams<typeof fixtureBinding>;
const validBinding: FixtureBinding = { token: TOKEN };
// @ts-expect-error Binding values are inferred from the runtime Address schema.
const invalidBinding: FixtureBinding = { token: 123 };

@Protocol({
  name: "bound-types-fixture",
  category: "token",
  description: "Compile-time bound Protocol fixture.",
  contracts: {},
  binding: {
    params: fixtureBinding,
    contracts: (binding) => {
      const token: AddressValue = binding.token;
      // @ts-expect-error Binding fields come only from the declared runtime schema.
      void binding.collection;
      return { token: { abi: FixtureAbi, addr: token } };
    },
  },
})
class BoundTypesFixture {
  declare token: Handle<typeof FixtureAbi>;

  @Capability<BoundTypesFixture, typeof fixtureParams>({
    intent: "Move the bound fixture token",
    verb: "transfer",
    params: fixtureParams,
    receipt: "transferReceipt",
    risk: ["fundOut"],
  })
  async transfer(params: InferParams<typeof fixtureParams>) {
    return [this.token.transfer([params.recipient, BigInt(params.amount)])];
  }

  @Query({ intent: "Read the bound fixture token", params: noParams })
  async inspect() {
    return { token: this.token.address };
  }

  @Receipt()
  transferReceipt(changes: readonly Change[]): ReceiptResult<{ operation: "transfer" }> {
    return {
      kind: "receipt",
      outcome: { operation: "transfer" },
      text: "fixture",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

const BoundTypesFactory = createProtocolFactory(BoundTypesFixture, fixtureBinding);
const bound = BoundTypesFactory.create(validBinding);
bound.transfer({ recipient: RECIPIENT, amount: "1" });
bound.inspect({});
BoundTypesFactory.receipts.transferReceipt([]);

// @ts-expect-error ProtocolFactory is an object, not a callable function.
BoundTypesFactory(validBinding);
// @ts-expect-error Factory binding requires the schema-derived token field.
BoundTypesFactory.create({});
// @ts-expect-error Factory binding rejects fields not declared by the schema.
BoundTypesFactory.create({ token: TOKEN, collection: TOKEN });
// @ts-expect-error Address binding rejects non-address string literals.
BoundTypesFactory.create({ token: "not-an-address" });
// @ts-expect-error Bound references expose Capability and Query methods, not Receipt parsers.
bound.transferReceipt([]);
// @ts-expect-error Receipt references expose parsers only, not execution methods.
BoundTypesFactory.receipts.transfer({ recipient: RECIPIENT, amount: "1" });
// @ts-expect-error Bound method params do not contain Protocol identity.
bound.transfer({ token: TOKEN, recipient: RECIPIENT, amount: "1" });
// @ts-expect-error Bound method params retain their schema-derived value types.
bound.transfer({ recipient: RECIPIENT, amount: 1 });

@Protocol({
  name: "valid-factory-dependency-fixture",
  category: "token",
  description: "Compile-time ProtocolFactory dependency fixture.",
  contracts: {},
  protocols: { assets: BoundTypesFactory },
})
class ValidFactoryDependencyFixture {
  declare assets: typeof BoundTypesFactory;
}

// @ts-expect-error Protocol factory dependencies require a matching typed instance field.
@Protocol({
  name: "invalid-factory-dependency-fixture",
  category: "token",
  description: "Invalid compile-time ProtocolFactory dependency fixture.",
  contracts: {},
  protocols: { assets: BoundTypesFactory },
})
class InvalidFactoryDependencyFixture {}

@Protocol({
  name: "invalid-async-contracts-fixture",
  category: "token",
  description: "Invalid asynchronous binding construction fixture.",
  contracts: {},
  binding: {
    params: fixtureBinding,
    // @ts-expect-error Bound Handle construction must be synchronous.
    contracts: async ({ token }) => ({ token: { abi: FixtureAbi, addr: token } }),
  },
})
class InvalidAsyncContractsFixture {}

void invalidBinding;
void ValidFactoryDependencyFixture;
void InvalidFactoryDependencyFixture;
void InvalidAsyncContractsFixture;

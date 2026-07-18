import {
  Capability,
  type InferParams,
  type ParamsSpec,
  Protocol,
  type ProtocolRef,
  UnsignedIntegerString,
} from "@themoss/core";
import { FastLane } from "../src/fastlane.js";

const fixtureParams = {
  amount: { type: UnsignedIntegerString, description: "Fixture amount." },
} satisfies ParamsSpec;

const validParams: InferParams<typeof fixtureParams> = { amount: "42" };
// @ts-expect-error Params are inferred as strings, not numbers.
const invalidParams: InferParams<typeof fixtureParams> = { amount: 42 };

const dependency = null as unknown as ProtocolRef<FastLane>;
void dependency.stake;
void dependency.unstake;

@Protocol({
  name: "valid-dependency-fixture",
  category: "staking",
  description: "Compile-time dependency fixture.",
  contracts: {},
  protocols: { fastlane: FastLane },
})
class ValidDependencyFixture {
  declare fastlane: ProtocolRef<FastLane>;
}

// @ts-expect-error Protocol dependencies require a matching typed instance field.
@Protocol({
  name: "invalid-dependency-fixture",
  category: "staking",
  description: "Compile-time dependency fixture.",
  contracts: {},
  protocols: { fastlane: FastLane },
})
class InvalidDependencyFixture {}

class ReceiptNameFixture extends FastLane {
  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "stake",
    params: fixtureParams,
    receipt: "stakeReceipt",
    risk: ["fundOut"],
  })
  async valid(_: InferParams<typeof fixtureParams>) {
    return [];
  }

  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "stake",
    params: fixtureParams,
    // @ts-expect-error Receipt names must reference an @Receipt method.
    receipt: "missingReceipt",
    risk: ["fundOut"],
  })
  async invalid() {
    return [];
  }
}

void validParams;
void invalidParams;
void dependency;
void ValidDependencyFixture;
void InvalidDependencyFixture;
void ReceiptNameFixture;

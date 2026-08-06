import {
  type AddressValue,
  Capability,
  type Change,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  PositionSide,
  Protocol,
  Receipt,
  type ReceiptResult,
  Registry,
  type RiskLabel,
  tokenMetadata,
} from "../src/index.js";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;

const positionParams = {
  side: { type: PositionSide, description: "Direction of the position this Capability opens." },
} satisfies ParamsSpec;

@Protocol({
  name: "labeled-fixture",
  category: "token",
  description: "Compile-time label fixture.",
  contracts: {},
  labels: { Token: ADDRESS },
})
class LabeledFixture {}

@Protocol({
  name: "invalid-labeled-fixture",
  category: "token",
  description: "Compile-time invalid label fixture.",
  contracts: {},
  // @ts-expect-error Package label values must be EVM addresses.
  labels: { Token: "not-an-address" },
})
class InvalidLabeledFixture {}

@Protocol({
  name: "perps-fixture",
  category: "perps",
  description: "Compile-time perps vocabulary fixture.",
  contracts: {},
})
class PerpsFixture {
  @Capability<PerpsFixture, typeof positionParams>({
    intent: "Open a {side} position.",
    verb: "open",
    params: positionParams,
    receipt: "positionReceipt",
    risk: ["leverage", "liquidation"],
  })
  async open(_: InferParams<typeof positionParams>, __: { account: AddressValue }) {
    return [];
  }

  @Receipt()
  positionReceipt(_: readonly Change[]): ReceiptResult<{ operation: "position" }> {
    return { kind: "receipt", outcome: { operation: "position" }, text: "", changes: [] };
  }
}

@Protocol({
  name: "invalid-category-fixture",
  // @ts-expect-error Category is a closed set; "perpetuals" is not a member.
  category: "perpetuals",
  description: "Compile-time invalid category fixture.",
  contracts: {},
})
class InvalidCategoryFixture {}

@Protocol({
  name: "invalid-perps-fixture",
  category: "perps",
  description: "Compile-time invalid perps vocabulary fixture.",
  contracts: {},
})
class InvalidPerpsFixture {
  @Capability<InvalidPerpsFixture, typeof positionParams>({
    intent: "Open a {side} position.",
    // @ts-expect-error Verb is a closed set; "short" is not a member.
    verb: "short",
    params: positionParams,
    receipt: "positionReceipt",
    risk: ["liquidation"],
  })
  async short(_: InferParams<typeof positionParams>, __: { account: AddressValue }) {
    return [];
  }

  @Capability<InvalidPerpsFixture, typeof positionParams>({
    intent: "Open a {side} position.",
    verb: "open",
    params: positionParams,
    receipt: "positionReceipt",
    // @ts-expect-error RiskLabel is a closed set; "funding" is not a member.
    risk: ["funding"],
  })
  async open(_: InferParams<typeof positionParams>, __: { account: AddressValue }) {
    return [];
  }

  @Receipt()
  positionReceipt(_: readonly Change[]): ReceiptResult<{ operation: "position" }> {
    return { kind: "receipt", outcome: { operation: "position" }, text: "", changes: [] };
  }
}

const runtime = null as unknown as MossRuntime;
new Registry(runtime, { trustedTokens: [{ address: ADDRESS, label: "Token" }] });
new Registry(runtime, {
  // @ts-expect-error Trusted token addresses must be EVM addresses.
  trustedTokens: [{ address: "not-an-address", label: "Token" }],
});

const debtRisk: RiskLabel = "debt";
// @ts-expect-error RiskLabel remains a closed set.
const invalidRisk: RiskLabel = "not-a-risk";

const metadataResult = tokenMetadata(
  { kind: "metadata" as const, decimals: 18 as const },
  { address: ADDRESS, symbol: "TOKEN", name: "Token" },
);
const metadataKind: "metadata" = metadataResult.kind;
const metadataDecimals: 18 = metadataResult.decimals;
// @ts-expect-error token metadata requires a valid EVM address.
tokenMetadata({}, { address: "not-an-address", symbol: "TOKEN" });
// @ts-expect-error token metadata symbol must be a string.
tokenMetadata({}, { address: ADDRESS, symbol: 18 });
// @ts-expect-error tokenMetadata attaches observations only to object Query results.
tokenMetadata("metadata", { address: ADDRESS });

void LabeledFixture;
void InvalidLabeledFixture;
void PerpsFixture;
void InvalidCategoryFixture;
void InvalidPerpsFixture;
void debtRisk;
void invalidRisk;
void metadataKind;
void metadataDecimals;

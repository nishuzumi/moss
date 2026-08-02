import {
  type MossRuntime,
  Protocol,
  Registry,
  type RiskLabel,
  tokenMetadata,
} from "../src/index.js";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;

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
void debtRisk;
void invalidRisk;
void metadataKind;
void metadataDecimals;

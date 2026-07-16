import { type MossRuntime, Protocol, Registry } from "../src/index.js";

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

void LabeledFixture;
void InvalidLabeledFixture;

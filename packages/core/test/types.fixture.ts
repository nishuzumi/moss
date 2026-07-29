import {
  type Change,
  type MossRuntime,
  Protocol,
  type ReceiptResult,
  Registry,
  type SelfRef,
  type TransactionNode,
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
void metadataKind;
void metadataDecimals;

class SelfRefFixture {
  declare self: SelfRef<SelfRefFixture, "approve">;

  async approve(_params: { amount: string }): Promise<TransactionNode[]> {
    return [];
  }

  async transfer(_params: { to: string }): Promise<TransactionNode[]> {
    return [];
  }

  async quote(_params: { amount: string }): Promise<{ price: string }> {
    return { price: "1" };
  }

  approvalReceipt(_changes: readonly Change[]): ReceiptResult<{ operation: "approve" }> {
    return { kind: "receipt", outcome: { operation: "approve" }, text: "approve", changes: [] };
  }
}

declare const selfRef: SelfRefFixture["self"];
// A named method nests through the builder with its declared params.
void selfRef.approve({ amount: "1" });
// @ts-expect-error the nested call keeps the method's parameter contract.
void selfRef.approve({ amount: 1 });
// @ts-expect-error only the named subset of the class is exposed.
void selfRef.transfer;
// @ts-expect-error SelfRef rejects method names the class does not have.
type BadSelfRef = SelfRef<SelfRefFixture, "burn">;
// @ts-expect-error a Query reads state and is not nestable, so self cannot name one.
type QuerySelfRef = SelfRef<SelfRefFixture, "quote">;
// @ts-expect-error a Receipt parser is pure and is not nestable either.
type ReceiptSelfRef = SelfRef<SelfRefFixture, "approvalReceipt">;

void SelfRefFixture;
declare const badSelfRef: BadSelfRef;
void badSelfRef;
declare const querySelfRef: QuerySelfRef;
void querySelfRef;
declare const receiptSelfRef: ReceiptSelfRef;
void receiptSelfRef;

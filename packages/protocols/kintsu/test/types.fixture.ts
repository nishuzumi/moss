import {
  Capability,
  type Change,
  type Handle,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  type ProtocolRef,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import type { StakedMonadAbi } from "../src/abis/staked-monad.js";
import { Kintsu } from "../src/kintsu.js";

const fixtureParams = {
  amount: { type: PositiveDecimalString, description: "Fixture MON amount." },
} satisfies ParamsSpec;

const valid: InferParams<typeof fixtureParams> = { amount: "1" };
// @ts-expect-error Amounts are decimal strings, not numbers.
const invalid: InferParams<typeof fixtureParams> = { amount: 1 };

const dependency = null as unknown as ProtocolRef<Kintsu>;
void dependency.stake;
// @ts-expect-error Injected Protocol references expose methods, not Handles.
void dependency.stakedMonad;

function handleFixture(handle: Handle<typeof StakedMonadAbi>) {
  handle.deposit([1n, "0x1111111111111111111111111111111111111111"], { value: 1n });
  handle.read.convertToShares([1n]);
  // @ts-expect-error Full ABI typing rejects unknown functions.
  handle.stake([]);
  // @ts-expect-error The receiver must be an address.
  handle.deposit([1n, "not-an-address"]);
}

class ReceiptNameFixture extends Kintsu {
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
    // @ts-expect-error Receipt names are limited to typed Receipt methods.
    receipt: "missingReceipt",
    risk: ["fundOut"],
  })
  async invalidReceiptName(_: InferParams<typeof fixtureParams>) {
    return [];
  }

  @Receipt()
  fixtureReceipt(changes: readonly Change[]): ReceiptResult<{ ok: true }> {
    return {
      kind: "receipt",
      outcome: { ok: true },
      text: "valid",
      changes: changes.map((change) => ({ kind: "change", change, data: null, text: "change" })),
    };
  }
}

void valid;
void invalid;
void handleFixture;
void ReceiptNameFixture;

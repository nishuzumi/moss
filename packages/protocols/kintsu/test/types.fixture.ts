import {
  type ActionCtx,
  Capability,
  type Handle,
  type InferParams,
  type ParamsSpec,
} from "@themoss/core";
import type { StakedMonadAbi } from "../src/abis/staked-monad.js";
import { Kintsu } from "../src/index.js";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;
declare const kintsu: Kintsu;
declare const ctx: ActionCtx;

void kintsu.deposit({ amount: "1", receiver: ADDRESS, slippage: 50 }, ctx);
void kintsu.quoteDeposit({ amount: "1", slippage: 50 });
void kintsu.convertToAssets({ shares: "1" });
void kintsu.totalShares({});

function handleFixture(handle: Handle<typeof StakedMonadAbi>) {
  handle.deposit([1n, ADDRESS], { value: 1n });
  handle.read.convertToShares([1n]);
  // @ts-expect-error ABI-generic Handles reject unknown contract methods.
  handle.notAMethod([]);
  // @ts-expect-error ABI-generic Handles reject invalid ABI arguments.
  handle.read.convertToShares(["1"]);
}

const receiptFixtureParams = {} satisfies ParamsSpec;

class ReceiptNameFixture extends Kintsu {
  @Capability<ReceiptNameFixture, typeof receiptFixtureParams>({
    intent: "Compile-time Kintsu deposit fixture",
    verb: "stake",
    params: receiptFixtureParams,
    receipt: "depositReceipt",
    risk: ["fundOut"],
  })
  async validReceiptName(_: InferParams<typeof receiptFixtureParams>) {
    return [];
  }

  @Capability<ReceiptNameFixture, typeof receiptFixtureParams>({
    intent: "Compile-time Kintsu deposit fixture",
    verb: "stake",
    params: receiptFixtureParams,
    // @ts-expect-error Receipt names exclude Query methods.
    receipt: "quoteDeposit",
    risk: ["fundOut"],
  })
  async invalidReceiptName(_: InferParams<typeof receiptFixtureParams>) {
    return [];
  }
}

// @ts-expect-error receiver must be an address.
void kintsu.deposit({ amount: "1", receiver: "bad", slippage: 50 }, ctx);
// @ts-expect-error Receipt parsers accept immutable ordered Changes only.
void kintsu.depositReceipt("bad");
// @ts-expect-error Core, not the parser, stamps protocol provenance.
void (null as unknown as ReturnType<Kintsu["depositReceipt"]>).protocol;

void handleFixture;
void ReceiptNameFixture;

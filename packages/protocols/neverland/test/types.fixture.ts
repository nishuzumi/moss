import {
  type ActionCtx,
  Capability,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
} from "@themoss/core";
import { USDC_ADDRESS, WMON_ADDRESS } from "@themoss/system";
import { Neverland } from "../src/index.js";

declare const neverland: Neverland;
declare const ctx: ActionCtx;

void neverland.supply({ asset: USDC_ADDRESS, amount: "1" }, ctx);
void neverland.supply({ asset: USDC_ADDRESS, amount: "1", onBehalfOf: WMON_ADDRESS }, ctx);
void neverland.supplyNative({ amount: "1" }, ctx);
void neverland.withdraw({ asset: USDC_ADDRESS, amount: "1" }, ctx);
void neverland.withdrawNative({ amount: "1", to: WMON_ADDRESS }, ctx);
void neverland.borrow({ asset: USDC_ADDRESS, amount: "1" }, ctx);
void neverland.repay({ asset: USDC_ADDRESS, amount: "1" }, ctx);
void neverland.reserves();
void neverland.reserveData({ asset: USDC_ADDRESS });
void neverland.accountData({ user: WMON_ADDRESS });
void neverland.accountReserve({ asset: USDC_ADDRESS, user: WMON_ADDRESS });

// @ts-expect-error reserve assets are ERC-20 addresses, not the "native" literal.
void neverland.supply({ asset: "native", amount: "1" }, ctx);

// @ts-expect-error amounts are decimal strings, not numbers.
void neverland.supply({ asset: USDC_ADDRESS, amount: 1 }, ctx);

// @ts-expect-error onBehalfOf must be an address when supplied.
void neverland.borrow({ asset: USDC_ADDRESS, amount: "1", onBehalfOf: "neverland" }, ctx);

// @ts-expect-error reserveData requires its asset parameter.
void neverland.reserveData({});

const fixtureParams = {
  amount: { type: PositiveDecimalString, description: "Fixture amount." },
} satisfies ParamsSpec;

class ReceiptNameFixture extends Neverland {
  @Capability<ReceiptNameFixture, typeof fixtureParams>({
    intent: "Compile-time fixture",
    verb: "supply",
    params: fixtureParams,
    receipt: "supplyReceipt",
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
}

void ReceiptNameFixture;

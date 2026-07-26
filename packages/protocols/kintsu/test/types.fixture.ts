import type { ActionCtx } from "@themoss/core";
import type { Kintsu } from "../src/index.js";

const ADDRESS = "0x1111111111111111111111111111111111111111" as const;
declare const kintsu: Kintsu;
declare const ctx: ActionCtx;

void kintsu.deposit({ amount: "1", receiver: ADDRESS, slippage: 50 }, ctx);
void kintsu.quoteDeposit({ amount: "1", slippage: 50 });
void kintsu.convertToAssets({ shares: "1" });
void kintsu.totalShares({});

// @ts-expect-error receiver must be an address.
void kintsu.deposit({ amount: "1", receiver: "bad", slippage: 50 }, ctx);
// @ts-expect-error Receipt parsers accept immutable ordered Changes only.
void kintsu.depositReceipt("bad");
// @ts-expect-error Core, not the parser, stamps protocol provenance.
void (null as unknown as ReturnType<Kintsu["depositReceipt"]>).protocol;

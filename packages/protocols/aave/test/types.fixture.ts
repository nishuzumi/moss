import type { ActionCtx, ProtocolRef } from "@themoss/core";
import type { Aave, AaveReserve, AaveSupplyOutcome } from "../src/index.js";

declare const aave: Aave;
declare const ctx: ActionCtx;
declare const reserve: AaveReserve;

void aave.supply({ asset: reserve.underlying, amount: "1" }, ctx);
void aave.withdraw({ asset: reserve.underlying, amount: "1.5" }, ctx);
void aave.borrow({ asset: reserve.underlying, amount: "1" }, ctx);
void aave.repay({ asset: reserve.underlying, amount: "0.001" }, ctx);
void aave.accountData({ user: reserve.underlying });
void aave.reserve({ asset: reserve.underlying });

// @ts-expect-error Human token amounts are decimal strings, never numbers.
void aave.supply({ asset: reserve.underlying, amount: 1 }, ctx);

// @ts-expect-error The Monad market lists no native reserve, so asset is an address.
void aave.borrow({ asset: "native", amount: "1" }, ctx);

// @ts-expect-error Aave exposes no interest rate mode: only variable exists.
void aave.borrow({ asset: reserve.underlying, amount: "1", interestRateMode: 2 }, ctx);

const dependency = null as unknown as ProtocolRef<Aave>;
void dependency.supply;
dependency.supplyReceipt([]).protocol satisfies string;
dependency.supplyReceipt([]).outcome satisfies AaveSupplyOutcome;
// @ts-expect-error Injected Protocol references expose methods, not Handles.
void dependency.pool;

const supplied = dependency.supplyReceipt([]).outcome;
supplied.operation satisfies "supply";
// @ts-expect-error A supply Receipt never reports a borrow rate.
void supplied.borrowRate;

const repaid = dependency.repayReceipt([]).outcome;
repaid.interestRateMode satisfies "variable";
// @ts-expect-error Stable rate does not exist on this deployment.
const stable: typeof repaid.interestRateMode = "stable";
void stable;

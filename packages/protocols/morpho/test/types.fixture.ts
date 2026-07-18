import type { ActionCtx, CapabilitySpec } from "@themoss/core";
import { USDC_ADDRESS } from "@themoss/system";
import type { Morpho } from "../src/index.js";

declare const morpho: Morpho;
declare const ctx: ActionCtx;
declare const VAULT: `0x${string}`;

void morpho.deposit({ vault: VAULT, amount: "1.5" }, ctx);
void morpho.withdraw({ vault: VAULT, amount: "1" }, ctx);
void morpho.position({ vault: VAULT, owner: USDC_ADDRESS }, ctx);
void morpho.previewDeposit({ vault: VAULT, amount: "1" }, ctx);
void morpho.vaults({}, ctx);
void morpho.vaults({ asset: USDC_ADDRESS }, ctx);

// @ts-expect-error vault is required
void morpho.deposit({ amount: "1" }, ctx);

// @ts-expect-error amount is a decimal string, not a number
void morpho.withdraw({ vault: VAULT, amount: 1 }, ctx);

// @ts-expect-error asset must be an address when provided
void morpho.vaults({ asset: 123 }, ctx);

// @ts-expect-error receipt must name an @Receipt method on Morpho
const badReceiptName: CapabilitySpec<Morpho>["receipt"] = "nope";
void badReceiptName;

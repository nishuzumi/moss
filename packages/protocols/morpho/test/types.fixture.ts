import type { Handle } from "@themoss/core";
import type { MetaMorphoV1_1Abi, Morpho } from "../src/index.js";

declare const morpho: Morpho;
declare const vault: Handle<typeof MetaMorphoV1_1Abi>;

void morpho.position({ owner: "0x1111111111111111111111111111111111111111" });
// @ts-expect-error Query owner is inferred as an EVM address, not a number.
void morpho.position({ owner: 1 });

void vault.read.balanceOf(["0x1111111111111111111111111111111111111111"]);
void vault.read.convertToAssets([1n]);
// @ts-expect-error ABI-generic Handles reject unknown contract methods.
void vault.read.position([]);
// @ts-expect-error ABI-generic Handles reject invalid ABI arguments.
void vault.read.balanceOf(["not-an-address"]);

import { Address, type Handle, type ParamsSpec, Query } from "@themoss/core";
import { type MetaMorphoV1_1Abi, Morpho } from "../src/index.js";

const decoratedQueryParams = {
  owner: { type: Address, description: "Fixture owner." },
} satisfies ParamsSpec;

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

class DecoratedQueryFixture extends Morpho {
  // @ts-expect-error Query method params must match the declared parameter schemas.
  @Query({ intent: "Compile-time Morpho Query fixture", params: decoratedQueryParams })
  async invalid(_: { owner: number }) {
    return "invalid";
  }
}

void DecoratedQueryFixture;

import { type Address, address, type Handle, Protocol, Query } from "@themoss/core";
import { MetaMorphoV1_1Abi } from "./abis/metamorpho-v1.1.js";

/** Grove x Steakhouse High Yield AUSD, verified on-chain 2026-07-15 (bytecode,
 * metadata, asset, and factory isMetaMorpho). Official records:
 * https://docs.morpho.org/developers/contracts/addresses/
 * https://docs.morpho.org/developers/api/morpho-vaults/ */
export const MORPHO_AUSD_VAULT_ADDRESS: Address = "0x32841A8511D5c2c5b253f45668780B99139e476D";

@Protocol({
  name: "morpho",
  category: "lending",
  description:
    "Morpho MetaMorpho vault positions on Monad; currently the curated Grove x Steakhouse AUSD vault.",
  contracts: {
    vault: { abi: MetaMorphoV1_1Abi, addr: MORPHO_AUSD_VAULT_ADDRESS },
  },
})
export class Morpho {
  declare vault: Handle<typeof MetaMorphoV1_1Abi>;

  @Query({
    intent: "Position held by {owner} in the Grove x Steakhouse High Yield AUSD vault",
    params: { owner: address },
    tags: ["vault", "erc4626"],
  })
  async position({ owner }: { owner: Address }) {
    const shares = await this.vault.read.balanceOf([owner]);
    const assets = await this.vault.read.convertToAssets([shares]);
    return {
      owner,
      shares: shares.toString(),
      assets: assets.toString(),
    };
  }
}

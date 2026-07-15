import { type Address, address, type Handle, Protocol, Query } from "@themoss/core";
import { knownTokenAddress } from "@themoss/system";
import { MetaMorphoV1_1Abi } from "./abis/metamorpho-v1.1.js";

/**
 * Grove x Steakhouse High Yield AUSD, verified 2026-07-15:
 * - Monad bytecode exists and name/symbol/decimals/asset return the constants below.
 * - Morpho's official deployment docs list the Monad MetaMorpho V1.1 factory
 *   0x33f20973275B2F574488b18929cd7DCBf1AbF275.
 * - That factory's isMetaMorpho(vault) returns true and Morpho's official API
 *   lists this vault.
 * Sources: https://docs.morpho.org/developers/contracts/addresses/
 * and https://docs.morpho.org/developers/api/morpho-vaults/.
 */
export const MORPHO_AUSD_VAULT_ADDRESS: Address = "0x32841A8511D5c2c5b253f45668780B99139e476D";

export const AUSD_ADDRESS: Address = knownTokenAddress("AUSD");

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
      vault: MORPHO_AUSD_VAULT_ADDRESS,
      vaultName: "Grove x Steakhouse High Yield AUSD",
      shareSymbol: "grove-bbqAUSD",
      shareDecimals: 18,
      shares: shares.toString(),
      asset: AUSD_ADDRESS,
      assetSymbol: "AUSD",
      assetDecimals: 6,
      assets: assets.toString(),
    };
  }
}

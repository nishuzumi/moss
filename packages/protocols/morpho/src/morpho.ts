import {
  Address,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
} from "@themoss/core";
import { MetaMorphoV1_1Abi } from "./abis/metamorpho-v1.1.js";

/**
 * Read-only MetaMorpho V1.1 Protocol for the curated Grove x Steakhouse High
 * Yield AUSD vault on Monad mainnet. `shares` use 18 decimals; `assets` are
 * 6-decimal AUSD base units from the point-in-time ERC-4626 conversion.
 * Strategy, fees, and conversion may change on-chain. Supply, withdraw, APY,
 * and additional vaults are outside this partial #9 scope.
 *
 * Verified on-chain 2026-07-16: deployed bytecode, name, symbol, decimals, and
 * AUSD asset. Morpho's documented Monad MetaMorpho V1.1 factory at
 * 0x33f20973275B2F574488b18929cd7DCBf1AbF275 returned true from
 * isMetaMorpho(vault). Official vault record: POST https://api.morpho.org/graphql
 * with vaultByAddress(address: "0x32841A8511D5c2c5b253f45668780B99139e476D",
 * chainId: 143) returned this address, name, symbol, and AUSD asset.
 * https://docs.morpho.org/developers/contracts/addresses/
 * https://docs.morpho.org/developers/api/morpho-vaults/
 */
export const MORPHO_AUSD_VAULT_ADDRESS: Address = "0x32841A8511D5c2c5b253f45668780B99139e476D";

const positionParams = {
  owner: {
    type: Address,
    description: "Owner whose MetaMorpho vault shares and AUSD-equivalent assets are read.",
  },
} satisfies ParamsSpec;

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
    intent: "Read a Grove x Steakhouse High Yield AUSD vault position",
    params: positionParams,
    tags: ["vault", "erc4626"],
  })
  async position(params: InferParams<typeof positionParams>) {
    const shares = await this.vault.read.balanceOf([params.owner]);
    const assets = await this.vault.read.convertToAssets([shares]);
    return {
      owner: params.owner,
      shares: shares.toString(),
      assets: assets.toString(),
    };
  }
}

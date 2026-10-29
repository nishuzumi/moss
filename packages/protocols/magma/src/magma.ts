import {
  type AddressValue,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
} from "@themoss/core";
import { iMagmaAbi } from "./abis/magma.js";

export const MAGMA_ADDRESS: AddressValue = "0x8498312A6B3CbD158bf0c93AbdCF29E6e4F55081";

const noParams = {} satisfies ParamsSpec;

@Protocol({
  name: "magma",
  category: "staking",
  description: "Read Magma liquid-staking vault state on Monad mainnet.",
  contracts: {
    magma: {
      abi: iMagmaAbi,
      addr: MAGMA_ADDRESS,
    },
  },
  labels: {
    Magma: MAGMA_ADDRESS,
  },
})
export class Magma {
  declare magma: Handle<typeof iMagmaAbi>;

  @Query({
    intent: "Read the total MON assets managed by Magma",
    params: noParams,
    tags: ["tvl", "liquid-staking"],
  })
  async totalAssets(_params: InferParams<typeof noParams>) {
    const assets = await this.magma.read.totalAssets();

    return {
      assets: assets.toString(),
    };
  }

  @Query({
    intent: "Read the Magma Core Vault address",
    params: noParams,
    tags: ["vault", "liquid-staking"],
  })
  async coreVault(_params: InferParams<typeof noParams>) {
    const address = await this.magma.read.coreVault();

    return {
      address,
    };
  }

  @Query({
    intent: "Read the Magma gVault address",
    params: noParams,
    tags: ["vault", "liquid-staking"],
  })
  async gVault(_params: InferParams<typeof noParams>) {
    const address = await this.magma.read.gVault();

    return {
      address,
    };
  }

  @Query({
    intent: "Read the current Magma rewards fee",
    params: noParams,
    tags: ["fee", "liquid-staking"],
  })
  async rewardsFee(_params: InferParams<typeof noParams>) {
    const fee = await this.magma.read.rewardsFee();

    return {
      rewardsFee: fee.toString(),
    };
  }

  @Query({
    intent: "Read the current Magma withdrawal fee",
    params: noParams,
    tags: ["fee", "liquid-staking"],
  })
  async withdrawalFee(_params: InferParams<typeof noParams>) {
    const fee = await this.magma.read.withdrawalFee();

    return {
      withdrawalFee: fee.toString(),
    };
  }
}

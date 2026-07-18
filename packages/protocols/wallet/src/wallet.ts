import {
  Address,
  type Address as AddressValue,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
} from "@themoss/core";
import { formatEther, formatGwei } from "viem";

const walletAddressParams = {
  address: {
    type: Address,
    description: "Wallet address to query",
  },
} satisfies ParamsSpec;

type WalletAddressParams = InferParams<typeof walletAddressParams>;

export type WalletInfo = {
  address: AddressValue;
  nativeBalance: string;
  nativeBalanceFormatted: string;
  transactionCount: number;
  chainId: number;
};

export type NativeBalanceResult = {
  address: AddressValue;
  balance: string;
  balanceFormatted: string;
};

export type TransactionCountResult = {
  address: AddressValue;
  count: number;
};

export type GasEstimateResult = {
  from: AddressValue;
  to: AddressValue;
  gasEstimate: string;
  gasEstimateFormatted: string;
  gasPrice: string;
  gasPriceFormatted: string;
  estimatedCost: string;
  estimatedCostFormatted: string;
};

@Protocol({
  name: "wallet",
  category: "token",
  description: "Wallet information queries including balances, transaction counts, and gas estimates.",
  contracts: {},
})
export class Wallet {
  declare runtime: {
    client: {
      getBalance: (args: { address: Address }) => Promise<bigint>;
      getTransactionCount: (args: { address: Address }) => Promise<number>;
      estimateGas: (args: {
        from: Address;
        to: Address;
        value?: bigint;
        data?: string;
      }) => Promise<bigint>;
      getGasPrice: () => Promise<bigint>;
      getChainId: () => Promise<bigint>;
    };
  };

  @Query({
    intent: "Get comprehensive wallet information including balance, transaction count, and chain ID",
    params: walletAddressParams,
  })
  async getWalletInfo(params: WalletAddressParams): Promise<WalletInfo> {
    const [balance, transactionCount, chainId] = await Promise.all([
      this.runtime.client.getBalance({ address: params.address }),
      this.runtime.client.getTransactionCount({ address: params.address }),
      this.runtime.client.getChainId(),
    ]);

    return {
      address: params.address,
      nativeBalance: balance.toString(),
      nativeBalanceFormatted: formatEther(balance),
      transactionCount,
      chainId: Number(chainId),
    };
  }

  @Query({
    intent: "Get native token (MON) balance for a wallet address",
    params: walletAddressParams,
  })
  async getNativeBalance(params: WalletAddressParams): Promise<NativeBalanceResult> {
    const balance = await this.runtime.client.getBalance({ address: params.address });

    return {
      address: params.address,
      balance: balance.toString(),
      balanceFormatted: formatEther(balance),
    };
  }

  @Query({
    intent: "Get transaction count (nonce) for a wallet address",
    params: walletAddressParams,
  })
  async getTransactionCount(params: WalletAddressParams): Promise<TransactionCountResult> {
    const count = await this.runtime.client.getTransactionCount({ address: params.address });

    return {
      address: params.address,
      count,
    };
  }
}

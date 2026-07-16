import type { AddressValue } from "@themoss/core";

export class SimpleWallet {
  readonly name = "simple-wallet";

  readonly description =
    "A simple wallet adapter for Moss AI Agent.";

  getAddress(): AddressValue {
    return "0x0000000000000000000000000000000000000000";
  }

  async getBalance(address?: AddressValue) {
    return {
      operation: "getBalance",
      protocol: "simple-wallet",
      address:
        address ??
        "0x0000000000000000000000000000000000000000",
      balance: "0",
      symbol: "ETH",
    };
  }
}
import { describe, expect, it } from "vitest";
import { SimpleWallet } from "../src/index.js";

describe("SimpleWallet Adapter", () => {
  it("should export SimpleWallet", () => {
    const wallet = new SimpleWallet();

    expect(wallet.name).toBe("simple-wallet");
  });

  it("should return wallet address", () => {
    const wallet = new SimpleWallet();

    const address = wallet.getAddress();

    expect(address).toBe(
      "0x0000000000000000000000000000000000000000"
    );
  });

  it("should return balance information", async () => {
    const wallet = new SimpleWallet();

    const result = await wallet.getBalance();

    expect(result.protocol).toBe(
      "simple-wallet"
    );

    expect(result.balance).toBe("0");
  });
});
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  getAddress,
  type Hex,
} from "viem";
import { describe, expect, it } from "vitest";
import { ERC4626Abi } from "../src/index.js";

const VAULT = getAddress("0x1111111111111111111111111111111111111111");
const OWNER = getAddress("0x2222222222222222222222222222222222222222");
const RECEIVER = getAddress("0x3333333333333333333333333333333333333333");

describe("ERC4626 ABI", () => {
  it("exports the complete ERC-4626 vault surface", () => {
    const functionNames = new Set(
      ERC4626Abi.flatMap((entry) => (entry.type === "function" ? [entry.name] : [])),
    );
    expect([...functionNames].sort()).toEqual([
      "allowance",
      "approve",
      "asset",
      "balanceOf",
      "convertToAssets",
      "convertToShares",
      "decimals",
      "deposit",
      "maxDeposit",
      "maxMint",
      "maxRedeem",
      "maxWithdraw",
      "mint",
      "name",
      "previewDeposit",
      "previewMint",
      "previewRedeem",
      "previewWithdraw",
      "redeem",
      "symbol",
      "totalAssets",
      "totalSupply",
      "transfer",
      "transferFrom",
      "withdraw",
    ]);

    const eventNames = new Set(
      ERC4626Abi.flatMap((entry) => (entry.type === "event" ? [entry.name] : [])),
    );
    expect([...eventNames].sort()).toEqual(["Approval", "Deposit", "Transfer", "Withdraw"]);
  });

  it("keeps ERC-4626 read and write signatures ABI-typed", () => {
    expect(
      encodeFunctionData({
        abi: ERC4626Abi,
        functionName: "deposit",
        args: [123n, RECEIVER],
      }),
    ).toMatch(/^0x/);
    expect(
      encodeFunctionData({
        abi: ERC4626Abi,
        functionName: "withdraw",
        args: [123n, RECEIVER, OWNER],
      }),
    ).toMatch(/^0x/);
    expect(
      encodeFunctionData({
        abi: ERC4626Abi,
        functionName: "previewRedeem",
        args: [456n],
      }),
    ).toMatch(/^0x/);
  });

  it("decodes ERC-4626 Deposit and Withdraw events", () => {
    expect(
      decodeEventLog({
        abi: ERC4626Abi,
        eventName: "Deposit",
        topics: encodeEventTopics({
          abi: ERC4626Abi,
          eventName: "Deposit",
          args: { sender: OWNER, owner: RECEIVER },
        }) as [Hex, ...Hex[]],
        data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [123n, 456n]),
      }),
    ).toMatchObject({
      eventName: "Deposit",
      args: { sender: OWNER, owner: RECEIVER, assets: 123n, shares: 456n },
    });

    expect(
      decodeEventLog({
        abi: ERC4626Abi,
        eventName: "Withdraw",
        topics: encodeEventTopics({
          abi: ERC4626Abi,
          eventName: "Withdraw",
          args: { sender: OWNER, receiver: RECEIVER, owner: VAULT },
        }) as [Hex, ...Hex[]],
        data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [123n, 456n]),
      }),
    ).toMatchObject({
      eventName: "Withdraw",
      args: { sender: OWNER, receiver: RECEIVER, owner: VAULT, assets: 123n, shares: 456n },
    });
  });
});

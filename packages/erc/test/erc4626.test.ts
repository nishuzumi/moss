import {
  decodeEventLog,
  decodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  getAddress,
  type Hex,
  toEventSelector,
  toFunctionSelector,
} from "viem";
import { describe, expect, it } from "vitest";
import { ERC4626Abi } from "../src/index.js";

const RECEIVER = "0x1111111111111111111111111111111111111111";
const OWNER = "0x2222222222222222222222222222222222222222";
const SENDER = "0x3333333333333333333333333333333333333333";

function fn(name: string) {
  return ERC4626Abi.find((item) => item.type === "function" && item.name === name);
}

describe("ERC4626Abi", () => {
  it("covers the full EIP-4626 vault surface with the standard signatures", () => {
    // name -> [param types, stateMutability, output types], verified against
    // the EIP-4626 interface. Locks the compiled ABI against source drift.
    const expected: Record<string, [string[], string, string[]]> = {
      asset: [[], "view", ["address"]],
      totalAssets: [[], "view", ["uint256"]],
      convertToShares: [["uint256"], "view", ["uint256"]],
      convertToAssets: [["uint256"], "view", ["uint256"]],
      maxDeposit: [["address"], "view", ["uint256"]],
      previewDeposit: [["uint256"], "view", ["uint256"]],
      deposit: [["uint256", "address"], "nonpayable", ["uint256"]],
      maxMint: [["address"], "view", ["uint256"]],
      previewMint: [["uint256"], "view", ["uint256"]],
      mint: [["uint256", "address"], "nonpayable", ["uint256"]],
      maxWithdraw: [["address"], "view", ["uint256"]],
      previewWithdraw: [["uint256"], "view", ["uint256"]],
      withdraw: [["uint256", "address", "address"], "nonpayable", ["uint256"]],
      maxRedeem: [["address"], "view", ["uint256"]],
      previewRedeem: [["uint256"], "view", ["uint256"]],
      redeem: [["uint256", "address", "address"], "nonpayable", ["uint256"]],
    };

    for (const [name, [inputs, mutability, outputs]] of Object.entries(expected)) {
      const item = fn(name);
      expect(item, `${name} present`).toBeDefined();
      if (!item || item.type !== "function") throw new Error(`${name} is not a function`);
      expect(item.inputs.map((input) => input.type)).toEqual(inputs);
      expect(item.stateMutability).toBe(mutability);
      expect(item.outputs.map((output) => output.type)).toEqual(outputs);
    }
  });

  it("carries the ERC-20 share-token surface it inherits", () => {
    // A vault's shares are an ERC-20 token, so the compiled ABI must decode the
    // share Transfer/Approval a deposit or withdraw also emits.
    for (const name of ["transfer", "approve", "balanceOf", "totalSupply", "decimals"]) {
      expect(fn(name), `${name} present`).toBeDefined();
    }
    const events = ERC4626Abi.filter((item) => item.type === "event").map((item) => item.name);
    expect(events).toEqual(expect.arrayContaining(["Transfer", "Approval", "Deposit", "Withdraw"]));
  });

  it("encodes a deposit call that decodes back to the same args", () => {
    const data = encodeFunctionData({
      abi: ERC4626Abi,
      functionName: "deposit",
      args: [1_000_000n, RECEIVER],
    });
    expect(data.slice(0, 10)).toBe(toFunctionSelector("deposit(uint256,address)"));
    expect(decodeFunctionData({ abi: ERC4626Abi, data })).toEqual({
      functionName: "deposit",
      args: [1_000_000n, RECEIVER],
    });
  });

  it("encodes a redeem call that decodes back to the same args", () => {
    const data = encodeFunctionData({
      abi: ERC4626Abi,
      functionName: "redeem",
      args: [500n, RECEIVER, OWNER],
    });
    expect(data.slice(0, 10)).toBe(toFunctionSelector("redeem(uint256,address,address)"));
    expect(decodeFunctionData({ abi: ERC4626Abi, data })).toEqual({
      functionName: "redeem",
      args: [500n, RECEIVER, OWNER],
    });
  });

  it("decodes a Deposit event with the standard indexed topics", () => {
    const topics = encodeEventTopics({
      abi: ERC4626Abi,
      eventName: "Deposit",
      args: { sender: SENDER, owner: OWNER },
    });
    expect(topics[0]).toBe(toEventSelector("Deposit(address,address,uint256,uint256)"));
    const decoded = decodeEventLog({
      abi: ERC4626Abi,
      topics: topics as [Hex, ...Hex[]],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [1_000_000n, 999_999n]),
    });
    expect(decoded.eventName).toBe("Deposit");
    expect(decoded.args).toEqual({
      sender: getAddress(SENDER),
      owner: getAddress(OWNER),
      assets: 1_000_000n,
      shares: 999_999n,
    });
  });

  it("decodes a Withdraw event with all three indexed addresses", () => {
    const topics = encodeEventTopics({
      abi: ERC4626Abi,
      eventName: "Withdraw",
      args: { sender: SENDER, receiver: RECEIVER, owner: OWNER },
    });
    expect(topics[0]).toBe(toEventSelector("Withdraw(address,address,address,uint256,uint256)"));
    const decoded = decodeEventLog({
      abi: ERC4626Abi,
      topics: topics as [Hex, ...Hex[]],
      data: encodeAbiParameters([{ type: "uint256" }, { type: "uint256" }], [750n, 700n]),
    });
    expect(decoded.eventName).toBe("Withdraw");
    expect(decoded.args).toEqual({
      sender: getAddress(SENDER),
      receiver: getAddress(RECEIVER),
      owner: getAddress(OWNER),
      assets: 750n,
      shares: 700n,
    });
  });
});

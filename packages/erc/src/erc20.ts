import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  createHandle,
  type Hex,
  type InferParams,
  type ReceiptResult as MossReceipt,
  type MossRuntime,
  NATIVE,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  Query,
  Receipt,
  TokenReference,
  transaction,
  UnsignedIntegerString,
} from "@themoss/core";
import { decodeEventLog, parseUnits } from "viem";
import { ierc20Abi } from "./abis/erc.js";

const transferParams = {
  token: {
    type: TokenReference,
    description: "Asset sent by this transfer.",
  },
  to: { type: Address, description: "Address that receives the tokens." },
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the selected asset to send.",
  },
} satisfies ParamsSpec;

const approveParams = {
  token: { type: Address, description: "Asset whose allowance is changed." },
  spender: { type: Address, description: "Account authorized to spend the asset." },
  amount: {
    type: UnsignedIntegerString,
    description: "Allowance in the token's smallest unit; use 0 to revoke it.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  token: { type: TokenReference, description: "Asset whose balance is requested." },
  owner: { type: Address, description: "Address whose balance is read." },
} satisfies ParamsSpec;

const allowanceParams = {
  token: { type: Address, description: "Asset whose allowance is requested." },
  owner: { type: Address, description: "Account that granted the allowance." },
  spender: { type: Address, description: "Account authorized by the allowance." },
} satisfies ParamsSpec;

const metadataParams = {
  token: { type: Address, description: "Asset whose metadata is requested." },
} satisfies ParamsSpec;

export type ERC20Outcome =
  | {
      operation: "transfer";
      token: AddressValue | typeof NATIVE;
      from: AddressValue;
      to: AddressValue;
      amount: string;
    }
  | {
      operation: "approve";
      token: AddressValue;
      owner: AddressValue;
      spender: AddressValue;
      amount: string;
    };

export type ERC20TransferOutcome = Extract<ERC20Outcome, { operation: "transfer" }>;
export type ERC20ApprovalOutcome = Extract<ERC20Outcome, { operation: "approve" }>;

@Protocol({
  name: "erc20",
  category: "token",
  description: "Generic ERC-20 and native MON transfers, approvals, balances, and metadata.",
  contracts: {},
})
export class ERC20 {
  declare runtime: MossRuntime;

  #handle(token: AddressValue, account: AddressValue) {
    return createHandle(ierc20Abi, token, this.runtime.client, account);
  }

  @Capability<ERC20, typeof transferParams>({
    intent: "Transfer tokens",
    verb: "transfer",
    params: transferParams,
    receipt: "transferReceipt",
    risk: ["fundOut"],
    tags: ["payment"],
  })
  async transfer(params: InferParams<typeof transferParams>, ctx: ActionCtx) {
    const decimals =
      params.token === NATIVE
        ? 18
        : Number(await this.#handle(params.token, ctx.account).read.decimals());
    const amount = parseUnits(params.amount, decimals);
    return [
      params.token === NATIVE
        ? transaction(ctx.account, params.to, { value: amount })
        : this.#handle(params.token, ctx.account).transfer([params.to, amount]),
    ];
  }

  @Capability<ERC20, typeof approveParams>({
    intent: "Set an ERC-20 allowance",
    verb: "approve",
    params: approveParams,
    receipt: "approveReceipt",
    risk: ["approval"],
    tags: ["approval"],
  })
  async approve(params: InferParams<typeof approveParams>, ctx: ActionCtx) {
    return [
      this.#handle(params.token, ctx.account).approve([params.spender, BigInt(params.amount)]),
    ];
  }

  @Query({ intent: "Read a token balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>, ctx: ActionCtx) {
    if (params.token === NATIVE) {
      const balance = await this.runtime.client.getBalance({ address: params.owner });
      return { token: NATIVE, symbol: "MON", decimals: 18, balance: balance.toString() };
    }
    const handle = this.#handle(params.token, ctx.account);
    const [balance, decimals, symbol] = await Promise.all([
      handle.read.balanceOf([params.owner]),
      handle.read.decimals(),
      handle.read.symbol(),
    ]);
    return {
      token: params.token,
      symbol,
      decimals: Number(decimals),
      balance: balance.toString(),
    };
  }

  @Query({ intent: "Read an ERC-20 allowance", params: allowanceParams, tags: ["approval"] })
  async allowance(params: InferParams<typeof allowanceParams>, ctx: ActionCtx) {
    const amount = await this.#handle(params.token, ctx.account).read.allowance([
      params.owner,
      params.spender,
    ]);
    return { ...params, allowance: amount.toString() };
  }

  @Query({ intent: "Read ERC-20 metadata", params: metadataParams })
  async metadata(params: InferParams<typeof metadataParams>, ctx: ActionCtx) {
    const handle = this.#handle(params.token, ctx.account);
    const [name, symbol, decimals] = await Promise.all([
      handle.read.name(),
      handle.read.symbol(),
      handle.read.decimals(),
    ]);
    return { token: params.token, name, symbol, decimals: Number(decimals) };
  }

  @Receipt()
  transferReceipt(changes: readonly Change[]): MossReceipt<ERC20TransferOutcome> {
    const receipt = this.changesReceipt(changes);
    const transfers = receipt.outcome.filter(
      (outcome): outcome is Extract<ERC20Outcome, { operation: "transfer" }> =>
        outcome.operation === "transfer",
    );
    const [transfer] = transfers;
    if (!transfer || transfers.length !== 1 || receipt.outcome.length !== 1) {
      throw new Error("ERC20 transfer Receipt requires exactly one transfer Change");
    }
    return { ...receipt, outcome: transfer, text: receipt.changes[0]?.text ?? receipt.text };
  }

  @Receipt()
  approveReceipt(changes: readonly Change[]): MossReceipt<ERC20ApprovalOutcome> {
    const receipt = this.changesReceipt(changes);
    const approvals = receipt.outcome.filter(
      (outcome): outcome is Extract<ERC20Outcome, { operation: "approve" }> =>
        outcome.operation === "approve",
    );
    const [approval] = approvals;
    if (!approval || approvals.length !== 1 || receipt.outcome.length !== 1) {
      throw new Error("ERC20 approval Receipt requires exactly one Approval Change");
    }
    return { ...receipt, outcome: approval, text: receipt.changes[0]?.text ?? receipt.text };
  }

  @Receipt()
  changesReceipt(changes: readonly Change[]): MossReceipt<readonly ERC20Outcome[]> {
    const outcomes: ERC20Outcome[] = [];
    const parsed = changes.map((change) => {
      const outcome = parseERC20Change(change);
      outcomes.push(outcome);
      return {
        kind: "change" as const,
        change,
        data: outcome,
        text: describeERC20Outcome(outcome),
      };
    });
    return {
      kind: "receipt",
      outcome: outcomes,
      text: parsed.map(({ text }) => text).join("; "),
      changes: parsed,
    };
  }
}

function parseERC20Change(change: Change): ERC20Outcome {
  if (change.kind === "nativeTransfer") {
    return {
      operation: "transfer",
      token: NATIVE,
      from: change.from,
      to: change.to,
      amount: change.value,
    };
  }
  let decoded: ReturnType<typeof decodeEventLog<typeof ierc20Abi>>;
  try {
    decoded = decodeEventLog({
      abi: ierc20Abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error(`Unexpected Change: ${change.address} emitted an unsupported ERC-20 event`);
  }
  if (decoded.eventName === "Transfer") {
    return {
      operation: "transfer",
      token: change.address,
      from: decoded.args.from,
      to: decoded.args.to,
      amount: decoded.args.value.toString(),
    };
  }
  if (decoded.eventName === "Approval") {
    return {
      operation: "approve",
      token: change.address,
      owner: decoded.args.owner,
      spender: decoded.args.spender,
      amount: decoded.args.value.toString(),
    };
  }
  throw new Error(`Unexpected Change: ${change.address} emitted an unsupported ERC-20 event`);
}

function describeERC20Outcome(outcome: ERC20Outcome): string {
  return outcome.operation === "transfer"
    ? `ERC20 Transfer: ${outcome.amount} ${outcome.token} from ${outcome.from} to ${outcome.to}`
    : `ERC20 Approval: ${outcome.owner} approved ${outcome.spender} for ${outcome.amount} ${outcome.token}`;
}

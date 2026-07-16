import {
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20, WETH9Abi } from "@themoss/erc";
import { decodeEventLog, parseUnits } from "viem";
import { WMON_ADDRESS } from "./constants.js";

const amountParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of MON or WMON converted by this wrap or unwrap operation.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  owner: { type: Address, description: "Address whose WMON balance is read." },
} satisfies ParamsSpec;

type WMONOperation = "wrap" | "unwrap";
type WMONOutcome = {
  operation: WMONOperation;
  account: AddressValue;
  amount: string;
};

@Protocol({
  name: "wmon",
  category: "token",
  description: "Canonical Monad wrapped native token, with 1:1 wrap and unwrap operations.",
  contracts: { wmon: { abi: WETH9Abi, addr: WMON_ADDRESS } },
  protocols: { erc20: ERC20 },
})
export class WMON {
  declare wmon: Handle<typeof WETH9Abi>;
  declare erc20: ProtocolRef<ERC20>;

  @Capability<WMON, typeof amountParams>({
    intent: "Wrap native MON into WMON",
    verb: "wrap",
    params: amountParams,
    receipt: "wrapReceipt",
    risk: ["fundOut"],
    tags: ["wrapper"],
  })
  async wrap(params: InferParams<typeof amountParams>) {
    return [this.wmon.deposit([], { value: parseUnits(params.amount, 18) })];
  }

  @Capability<WMON, typeof amountParams>({
    intent: "Unwrap WMON into native MON",
    verb: "unwrap",
    params: amountParams,
    receipt: "unwrapReceipt",
    risk: ["fundOut"],
    tags: ["wrapper"],
  })
  async unwrap(params: InferParams<typeof amountParams>) {
    return [this.wmon.withdraw([parseUnits(params.amount, 18)])];
  }

  @Query({ intent: "Read a WMON balance", params: balanceParams, tags: ["balance"] })
  async balanceOf(params: InferParams<typeof balanceParams>) {
    const balance = await this.wmon.read.balanceOf([params.owner]);
    return { token: WMON_ADDRESS, symbol: "WMON", decimals: 18, balance: balance.toString() };
  }

  @Receipt()
  wrapReceipt(changes: readonly Change[]): ReceiptResult<WMONOutcome> {
    return this.#operationReceipt("wrap", changes);
  }

  @Receipt()
  unwrapReceipt(changes: readonly Change[]): ReceiptResult<WMONOutcome> {
    return this.#operationReceipt("unwrap", changes);
  }

  #operationReceipt(
    operation: WMONOperation,
    changes: readonly Change[],
  ): ReceiptResult<WMONOutcome> {
    let protocolEvent: { account: AddressValue; amount: string } | undefined;
    let nativeTransfer: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (nativeTransfer) throw new Error(`WMON ${operation} emitted multiple native transfers`);
        nativeTransfer = change;
        const text = `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", ...change },
          text,
        };
      }

      let event: ReturnType<typeof decodeEventLog<typeof WETH9Abi>>;
      try {
        event = decodeEventLog({
          abi: WETH9Abi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error(`Unexpected Change: ${change.address} emitted an unsupported WMON event`);
      }
      if (event.eventName === "Transfer" || event.eventName === "Approval") {
        return this.erc20.changesReceipt([change]);
      }
      const expected = operation === "wrap" ? "Deposit" : "Withdrawal";
      if (event.eventName !== expected) {
        throw new Error(`Unexpected Change: WMON ${operation} received ${event.eventName}`);
      }
      if (protocolEvent) throw new Error(`WMON ${operation} emitted multiple ${expected} events`);
      protocolEvent = {
        account: event.eventName === "Deposit" ? event.args.dst : event.args.src,
        amount: event.args.wad.toString(),
      };
      const text = `WMON ${expected}: ${protocolEvent.amount} for ${protocolEvent.account}`;
      return {
        kind: "change" as const,
        change,
        data: { operation: expected.toLowerCase(), ...protocolEvent },
        text,
      };
    });

    if (!protocolEvent || !nativeTransfer) {
      throw new Error(`WMON ${operation} Receipt requires its WMON event and native transfer`);
    }
    if (protocolEvent.amount !== nativeTransfer.value) {
      throw new Error(`WMON ${operation} amount differs between its event and native transfer`);
    }
    const expectedAccount = operation === "wrap" ? nativeTransfer.from : nativeTransfer.to;
    if (protocolEvent.account.toLowerCase() !== expectedAccount.toLowerCase()) {
      throw new Error(`WMON ${operation} account differs between its event and native transfer`);
    }
    const outcome: WMONOutcome = { operation, ...protocolEvent };
    return {
      kind: "receipt",
      outcome,
      text: `WMON ${operation}: ${outcome.amount} for ${outcome.account}`,
      changes: parsed,
    };
  }
}

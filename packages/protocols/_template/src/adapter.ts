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
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { decodeEventLog, parseUnits } from "viem";
import { ExampleVaultAbi } from "./abis/example.js";

// CHANGEME: replace with an address verified on Monad mainnet.
export const EXAMPLE_VAULT_ADDRESS: AddressValue = "0x0000000000000000000000000000000000000001";

const depositParams = {
  amount: {
    type: PositiveDecimalString,
    description: "Human-readable native MON amount to deposit; MON uses 18 decimals.",
  },
} satisfies ParamsSpec;

const balanceParams = {
  owner: { type: Address, description: "Address whose vault balance is read." },
} satisfies ParamsSpec;

type DepositOutcome = { operation: "deposit"; account: AddressValue; amount: string };

@Protocol({
  name: "template",
  category: "token",
  description: "CHANGEME: describe this Protocol in one sentence.",
  contracts: { vault: { abi: ExampleVaultAbi, addr: EXAMPLE_VAULT_ADDRESS } },
  labels: { Vault: EXAMPLE_VAULT_ADDRESS },
})
export class ExampleProtocol {
  declare vault: Handle<typeof ExampleVaultAbi>;

  @Capability<ExampleProtocol, typeof depositParams>({
    intent: "Deposit native MON into the example vault",
    verb: "supply",
    params: depositParams,
    receipt: "depositReceipt",
    risk: ["fundOut"],
    tags: ["example"],
  })
  async deposit(params: InferParams<typeof depositParams>) {
    return [this.vault.deposit([], { value: parseUnits(params.amount, 18) })];
  }

  @Query({ intent: "Read an example vault balance", params: balanceParams })
  async balanceOf(params: InferParams<typeof balanceParams>) {
    const balance = await this.vault.read.balanceOf([params.owner]);
    return { owner: params.owner, balance: balance.toString() };
  }

  @Receipt()
  depositReceipt(changes: readonly Change[]): ReceiptResult<DepositOutcome> {
    let event: DepositOutcome | undefined;
    let native: Extract<Change, { kind: "nativeTransfer" }> | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        if (native) throw new Error("example deposit emitted multiple native transfers");
        native = change;
        return {
          kind: "change" as const,
          change,
          data: { operation: "nativeTransfer", value: change.value },
          text: `Native MON Transfer: ${change.value} from ${change.from} to ${change.to}`,
        };
      }
      let decoded: ReturnType<typeof decodeEventLog<typeof ExampleVaultAbi>>;
      try {
        decoded = decodeEventLog({
          abi: ExampleVaultAbi,
          topics: change.topics as [Hex, ...Hex[]],
          data: change.data,
          strict: true,
        });
      } catch {
        throw new Error("Unexpected Change: unsupported example vault event");
      }
      if (decoded.eventName !== "Deposited" || event) {
        throw new Error(`Unexpected Change: example vault emitted ${decoded.eventName}`);
      }
      event = {
        operation: "deposit",
        account: decoded.args.account,
        amount: decoded.args.amount.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: event,
        text: `Example Deposit: ${event.amount} by ${event.account}`,
      };
    });
    if (!event || !native || event.amount !== native.value) {
      throw new Error("example deposit Receipt requires matching Deposited and native Changes");
    }
    return {
      kind: "receipt",
      outcome: event,
      text: `Example Deposit: ${event.amount} by ${event.account}`,
      changes: parsed,
    };
  }
}

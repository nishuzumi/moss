import {
  type Abi,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type ContractFunctionReturnType,
  decodeFunctionResult,
  encodeFunctionData,
  type PublicClient,
  toHex,
} from "viem";
import type { Address, Hex, TransactionNode } from "./types.js";

interface TransactionOptions {
  value?: bigint;
}

interface CallOptions extends TransactionOptions {
  from?: Address;
  /** Temporary sender balance for a read-only eth_call. */
  balance?: bigint;
}

type WriteName<TAbi extends Abi> = ContractFunctionName<TAbi, "nonpayable" | "payable">;
type ReadName<TAbi extends Abi> = ContractFunctionName<TAbi, "view" | "pure">;

type WriteFns<TAbi extends Abi> = {
  [K in WriteName<TAbi>]: ContractFunctionArgs<
    TAbi,
    "nonpayable" | "payable",
    K
  > extends readonly []
    ? (args?: readonly [], opts?: TransactionOptions) => TransactionNode
    : (
        args: ContractFunctionArgs<TAbi, "nonpayable" | "payable", K>,
        opts?: TransactionOptions,
      ) => TransactionNode;
};

type ReadFns<TAbi extends Abi> = {
  [K in ReadName<TAbi>]: ContractFunctionArgs<TAbi, "view" | "pure", K> extends readonly []
    ? () => Promise<ContractFunctionReturnType<TAbi, "view" | "pure", K>>
    : (
        args: ContractFunctionArgs<TAbi, "view" | "pure", K>,
      ) => Promise<ContractFunctionReturnType<TAbi, "view" | "pure", K>>;
};

type CallFns<TAbi extends Abi> = {
  [K in WriteName<TAbi>]: (
    args: ContractFunctionArgs<TAbi, "nonpayable" | "payable", K> | readonly [],
    opts?: CallOptions,
  ) => Promise<ContractFunctionReturnType<TAbi, "nonpayable" | "payable", K>>;
};

export type Handle<TAbi extends Abi = Abi> = {
  address: Address;
  abi: TAbi;
  read: ReadFns<TAbi>;
  call: CallFns<TAbi>;
} & Omit<WriteFns<TAbi>, "address" | "abi" | "read" | "call">;

export function transaction(
  from: Address,
  to: Address,
  opts: { data?: Hex; value?: bigint } = {},
): TransactionNode {
  return {
    kind: "transaction",
    transaction: {
      from,
      to,
      data: opts.data ?? "0x",
      value: toHex(opts.value ?? 0n),
    },
  };
}

export function createHandle<TAbi extends Abi>(
  abi: TAbi,
  contractAddress: Address,
  client: PublicClient,
  account: Address,
): Handle<TAbi> {
  const read = new Proxy(
    {},
    {
      get(_, fn: string) {
        return (args: unknown[] = []) =>
          client.readContract({
            address: contractAddress,
            abi,
            functionName: fn,
            args,
            // biome-ignore lint/suspicious/noExplicitAny: public proxy surface is ABI-typed
          } as any);
      },
    },
  );

  const call = new Proxy(
    {},
    {
      get(_, fn: string) {
        return async (args: unknown[] = [], opts: CallOptions = {}) => {
          const data = encodeFunctionData({
            abi,
            functionName: fn,
            args,
            // biome-ignore lint/suspicious/noExplicitAny: public proxy surface is ABI-typed
          } as any);
          const from = opts.from ?? account;
          const result = await client.call({
            to: contractAddress,
            data,
            account: from,
            ...(opts.value === undefined ? {} : { value: opts.value }),
            ...(opts.balance === undefined
              ? {}
              : { stateOverride: [{ address: from, balance: opts.balance }] }),
          });
          return decodeFunctionResult({
            abi,
            functionName: fn,
            data: result.data ?? "0x",
            // biome-ignore lint/suspicious/noExplicitAny: public proxy surface is ABI-typed
          } as any);
        };
      },
    },
  );

  return new Proxy(
    { address: contractAddress, abi, read, call },
    {
      get(target, prop: string | symbol) {
        if (prop in target || typeof prop === "symbol") {
          return (target as Record<string | symbol, unknown>)[prop];
        }
        return (args: unknown[] = [], opts: TransactionOptions = {}) => {
          if (!Array.isArray(args)) {
            throw new TypeError(`handle.${prop}(args, opts?): args must be an array`);
          }
          return transaction(account, contractAddress, {
            data: encodeFunctionData({
              abi,
              functionName: prop,
              args,
              // biome-ignore lint/suspicious/noExplicitAny: public proxy surface is ABI-typed
            } as any),
            value: opts.value,
          });
        };
      },
    },
  ) as Handle<TAbi>;
}

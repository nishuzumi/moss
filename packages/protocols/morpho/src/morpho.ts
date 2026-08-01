/**
 * Morpho vaults on Monad mainnet: supply and withdraw on MetaMorpho V1.1.
 *
 * A MetaMorpho vault is an ERC-4626 vault whose curator spreads the deposited
 * asset across Morpho Blue markets. Depositing therefore does more than mint
 * shares: the vault walks its supply queue and supplies into Morpho Blue, so a
 * single `deposit` produces vault events, Morpho Blue market events, an IRM
 * rate update and several ERC-20 transfers. The Receipt parser below covers all
 * of them, because Moss requires exact ordered coverage of every Change.
 *
 * Vault identity (the open design question in issue #13): a vault address is a
 * parameter, and the adapter refuses it unless the canonical MetaMorpho V1.1
 * factory says it created that vault. Morpho vaults are permissionlessly
 * created, so a hardcoded catalog would go stale the week it landed, and the
 * factory is an on-chain authority rather than an API snapshot. `vaultInfo`
 * exposes the curation surface (owner, curator, guardian, timelock, fee) so an
 * Agent can judge a vault it was handed rather than assume it is safe.
 *
 * v1 scope (intentionally narrow):
 *   - `supply` and `withdraw` in units of the vault's underlying asset.
 *     `mint` and `redeem` (the share-denominated pair) are out of scope.
 *   - `position` and `vaultInfo` queries.
 *   - Vault APY is not computed here. It needs the Morpho Blue market read
 *     surface, per-market IRM rates and Morpho's WAD share math, which is its
 *     own change with its own numeric verification.
 *
 * Risk model (closed set, ADR 0003):
 *   - `fundOut`: the asset leaves the account on supply, and shares are burned
 *     on withdraw.
 *   - `approval`: supply grants the vault an allowance first.
 */
import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  createHandle,
  type Handle,
  type Hex,
  type InferParams,
  type JsonSafeValue,
  type MossRuntime,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptChange,
  type ReceiptResult,
  toJsonSafe,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import {
  MetaMorphoEventsAbi,
  MetaMorphoV1_1Abi,
  MetaMorphoV1_1FactoryAbi,
} from "./abis/metamorpho-v1-1.js";
import { AdaptiveCurveIrmAbi, MorphoBlueAbi } from "./abis/morpho.js";

/**
 * Fixed Morpho deployments on Monad mainnet (chain 143).
 * Source: the canonical Monad protocol registry,
 * https://github.com/monad-crypto/protocols/blob/main/mainnet/morpho.jsonc
 * (retrieved 2026-08-01). The live test checks deployed bytecode for each and
 * checks that the factory's own `MORPHO()` returns the Morpho Blue address
 * below, so the two constants are cross-checked against each other on chain.
 */
export const MORPHO_BLUE_ADDRESS: AddressValue = "0xD5D960E8C380B724a48AC59E2DfF1b2CB4a1eAee";
export const METAMORPHO_V1_1_FACTORY_ADDRESS: AddressValue =
  "0x33f20973275B2F574488b18929cd7DCBf1AbF275";
export const ADAPTIVE_CURVE_IRM_ADDRESS: AddressValue =
  "0x09475a3D6eA8c314c592b1a3799bDE044E2F400F";

/**
 * The one Monad vault Morpho's own interface lists (`listed: true` from
 * https://api.morpho.org/graphql for chainId 143, checked 2026-08-01). Exported
 * as a documented starting point and used as the live test's target; it is not
 * an allowlist, and `supply` accepts any factory-created vault.
 */
export const GROVE_STEAKHOUSE_AUSD_VAULT: AddressValue =
  "0x32841A8511D5c2c5b253f45668780B99139e476D";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const vaultParameter = {
  type: Address,
  description:
    "MetaMorpho V1.1 vault on Monad. Rejected unless the canonical Morpho factory created it.",
};

const supplyParams = {
  vault: vaultParameter,
  amount: {
    type: PositiveDecimalString,
    description:
      "Quantity of the vault's underlying asset to supply, in that asset's display units.",
  },
} satisfies ParamsSpec;

const withdrawParams = {
  vault: vaultParameter,
  amount: {
    type: PositiveDecimalString,
    description:
      "Quantity of the vault's underlying asset to take out, in that asset's display units.",
  },
} satisfies ParamsSpec;

const positionParams = {
  vault: vaultParameter,
  owner: { type: Address, description: "Address whose vault shares are read." },
} satisfies ParamsSpec;

const vaultInfoParams = { vault: vaultParameter } satisfies ParamsSpec;

export type MorphoVaultFlowOutcome = {
  operation: "supply" | "withdraw";
  vault: AddressValue;
  asset: AddressValue;
  owner: AddressValue;
  receiver: AddressValue;
  assets: string;
  shares: string;
};

/** One ERC-20 Transfer, decoded for cross-checking against the vault event. */
interface TransferFact {
  token: AddressValue;
  from: AddressValue;
  to: AddressValue;
  value: bigint;
}

/** The ERC-4626 event that names what the transaction actually did. */
interface FlowFact {
  vault: AddressValue;
  owner: AddressValue;
  receiver: AddressValue;
  counterparty: AddressValue;
  assets: bigint;
  shares: bigint;
}

const same = (left: string, right: string) => left.toLowerCase() === right.toLowerCase();

@Protocol({
  name: "morpho",
  category: "lending",
  description:
    "Morpho vaults on Monad: supply an asset into a MetaMorpho V1.1 vault that lends it across " +
    "curated Morpho Blue markets, withdraw it again, and read vault terms and positions.",
  contracts: {
    factory: { abi: MetaMorphoV1_1FactoryAbi, addr: METAMORPHO_V1_1_FACTORY_ADDRESS },
  },
  labels: {
    Factory: METAMORPHO_V1_1_FACTORY_ADDRESS,
    Blue: MORPHO_BLUE_ADDRESS,
    Irm: ADAPTIVE_CURVE_IRM_ADDRESS,
  },
  protocols: { erc20: ERC20 },
})
export class Morpho {
  declare factory: Handle<typeof MetaMorphoV1_1FactoryAbi>;
  declare erc20: ProtocolRef<ERC20>;
  declare runtime: MossRuntime;

  /**
   * Reject anything the canonical factory did not create, then read the two
   * facts every method needs: the underlying asset and its decimals. Four
   * reads at most, all against fixed or just-verified addresses.
   */
  async #resolve(vault: AddressValue, account: AddressValue) {
    const created = await this.factory.read.isMetaMorpho([vault]);
    if (!created) {
      throw new Error(
        `morpho: ${vault} is not a Morpho vault. The MetaMorpho V1.1 factory ` +
          `${METAMORPHO_V1_1_FACTORY_ADDRESS} did not create it.`,
      );
    }
    const handle = createHandle(MetaMorphoV1_1Abi, vault, this.runtime.client, account);
    const asset = await handle.read.asset();
    const assetHandle = createHandle(ERC20Abi, asset, this.runtime.client, account);
    const decimals = Number(await assetHandle.read.decimals());
    return { handle, asset, assetHandle, decimals };
  }

  @Capability<Morpho, typeof supplyParams>({
    intent: "Supply {amount} of the underlying asset into Morpho vault {vault}",
    verb: "supply",
    params: supplyParams,
    receipt: "supplyReceipt",
    risk: ["fundOut", "approval"],
    tags: ["lending", "vault", "erc4626"],
  })
  async supply(params: InferParams<typeof supplyParams>, ctx: ActionCtx) {
    const { handle, asset, decimals } = await this.#resolve(params.vault, ctx.account);
    const assets = parseUnits(params.amount, decimals);
    const capacity = await handle.read.maxDeposit([ctx.account]);
    if (assets > capacity) {
      throw new Error(
        `morpho: vault ${params.vault} accepts at most ${formatUnits(capacity, decimals)} more ` +
          `of its asset right now; its supply caps are full`,
      );
    }
    return [
      await this.erc20.approve({
        token: asset,
        spender: params.vault,
        amount: assets.toString(),
      }),
      handle.deposit([assets, ctx.account]),
    ];
  }

  @Capability<Morpho, typeof withdrawParams>({
    intent: "Withdraw {amount} of the underlying asset from Morpho vault {vault}",
    verb: "withdraw",
    params: withdrawParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
    tags: ["lending", "vault", "erc4626"],
  })
  async withdraw(params: InferParams<typeof withdrawParams>, ctx: ActionCtx) {
    const { handle, decimals } = await this.#resolve(params.vault, ctx.account);
    const assets = parseUnits(params.amount, decimals);
    // maxWithdraw folds together the caller's shares and the liquidity the
    // vault can actually pull back out of its markets, so it catches both
    // "you do not hold that much" and "the markets are fully borrowed".
    const available = await handle.read.maxWithdraw([ctx.account]);
    if (assets > available) {
      throw new Error(
        `morpho: ${ctx.account} can withdraw at most ${formatUnits(available, decimals)} from ` +
          `vault ${params.vault} right now, limited by its shares or by market liquidity`,
      );
    }
    return [handle.withdraw([assets, ctx.account, ctx.account])];
  }

  @Query({
    intent: "Read {owner}'s position in Morpho vault {vault}",
    params: positionParams,
    tags: ["lending", "position"],
  })
  async position(params: InferParams<typeof positionParams>, ctx: ActionCtx) {
    const { handle, asset, assetHandle, decimals } = await this.#resolve(params.vault, ctx.account);
    const [shares, symbol, assetSymbol] = await Promise.all([
      handle.read.balanceOf([params.owner]),
      handle.read.symbol(),
      assetHandle.read.symbol(),
    ]);
    const [assets, withdrawable] = await Promise.all([
      handle.read.convertToAssets([shares]),
      handle.read.maxWithdraw([params.owner]),
    ]);
    return {
      vault: params.vault,
      owner: params.owner,
      symbol,
      shares: shares.toString(),
      asset,
      assetSymbol,
      assetDecimals: decimals,
      assets: assets.toString(),
      withdrawable: withdrawable.toString(),
    };
  }

  @Query({
    intent: "Describe Morpho vault {vault}: its asset, size, fee and curation roles",
    params: vaultInfoParams,
    tags: ["lending", "vault"],
  })
  async vaultInfo(params: InferParams<typeof vaultInfoParams>, ctx: ActionCtx) {
    const { handle, asset, assetHandle, decimals } = await this.#resolve(params.vault, ctx.account);
    const [name, symbol, assetSymbol, totalAssets, fee] = await Promise.all([
      handle.read.name(),
      handle.read.symbol(),
      assetHandle.read.symbol(),
      handle.read.totalAssets(),
      handle.read.fee(),
    ]);
    const [owner, curator, guardian, timelock, capacity] = await Promise.all([
      handle.read.owner(),
      handle.read.curator(),
      handle.read.guardian(),
      handle.read.timelock(),
      handle.read.maxDeposit([ctx.account]),
    ]);
    return {
      vault: params.vault,
      name,
      symbol,
      asset,
      assetSymbol,
      assetDecimals: decimals,
      totalAssets: totalAssets.toString(),
      // MetaMorpho stores the performance fee as a WAD fraction of interest.
      feeBps: Number((fee * 10_000n) / 10n ** 18n),
      owner,
      curator,
      guardian,
      timelockSeconds: timelock.toString(),
      depositCapacity: capacity.toString(),
    };
  }

  @Receipt()
  supplyReceipt(changes: readonly Change[]): ReceiptResult<MorphoVaultFlowOutcome> {
    return this.#flowReceipt("supply", changes);
  }

  @Receipt()
  withdrawReceipt(changes: readonly Change[]): ReceiptResult<MorphoVaultFlowOutcome> {
    return this.#flowReceipt("withdraw", changes);
  }

  /**
   * Turn one vault transaction's Changes into a typed Outcome.
   *
   * Evidence only: the parser never sees the request, so the vault is whichever
   * address emitted the ERC-4626 event, and it is only accepted as a vault if
   * the same address also emitted MetaMorpho's own bookkeeping events. Morpho
   * Blue and IRM events are bound to their fixed deployments, so evidence from
   * some other emitter cannot be read as Morpho market activity. Every amount
   * in the Outcome is cross-checked against a matching ERC-20 transfer.
   */
  #flowReceipt(
    operation: "supply" | "withdraw",
    changes: readonly Change[],
  ): ReceiptResult<MorphoVaultFlowOutcome> {
    const expected = operation === "supply" ? "Deposit" : "Withdraw";
    const transfers: TransferFact[] = [];
    const bookkeepers = new Set<string>();
    let flow: FlowFact | undefined;

    const parsed: (ReceiptChange | ReceiptResult<JsonSafeValue>)[] = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        throw new Error(
          `Unexpected Change: Morpho ${operation} moved native MON; vault flows are ERC-20 only`,
        );
      }
      const topics = change.topics as [Hex, ...Hex[]];

      if (same(change.address, MORPHO_BLUE_ADDRESS)) {
        const decoded = decodeEventLog({ abi: MorphoBlueAbi, topics, data: change.data });
        return {
          kind: "change" as const,
          change,
          data: toJsonSafe({ source: "morphoBlue", event: decoded.eventName, args: decoded.args }),
          text: `Morpho Blue ${decoded.eventName} at ${change.address}: ${describeArgs(decoded.args)}`,
        };
      }

      if (same(change.address, ADAPTIVE_CURVE_IRM_ADDRESS)) {
        const decoded = decodeEventLog({ abi: AdaptiveCurveIrmAbi, topics, data: change.data });
        return {
          kind: "change" as const,
          change,
          data: toJsonSafe({ source: "irm", event: decoded.eventName, args: decoded.args }),
          text: `Morpho IRM ${decoded.eventName} at ${change.address}: ${describeArgs(decoded.args)}`,
        };
      }

      const bookkeeping = tryDecode(MetaMorphoEventsAbi, topics, change.data);
      if (bookkeeping) {
        bookkeepers.add(change.address.toLowerCase());
        return {
          kind: "change" as const,
          change,
          data: toJsonSafe({
            source: "vault",
            event: bookkeeping.eventName,
            args: bookkeeping.args,
          }),
          text: `Morpho vault ${bookkeeping.eventName} at ${change.address}: ${describeArgs(bookkeeping.args)}`,
        };
      }

      const vaultEvent = tryDecode(MetaMorphoV1_1Abi, topics, change.data);
      if (vaultEvent?.eventName === "Deposit" || vaultEvent?.eventName === "Withdraw") {
        if (vaultEvent.eventName !== expected) {
          throw new Error(
            `Unexpected Change: Morpho ${operation} received an ERC-4626 ${vaultEvent.eventName}`,
          );
        }
        if (flow) throw new Error(`Morpho ${operation} emitted multiple ${expected} events`);
        const args = vaultEvent.args as Record<string, unknown>;
        flow = {
          vault: change.address,
          owner: args.owner as AddressValue,
          receiver: (args.receiver ?? args.owner) as AddressValue,
          counterparty: args.sender as AddressValue,
          assets: args.assets as bigint,
          shares: args.shares as bigint,
        };
        return {
          kind: "change" as const,
          change,
          data: toJsonSafe({ source: "vault", event: vaultEvent.eventName, args: vaultEvent.args }),
          text:
            `Morpho vault ${vaultEvent.eventName} at ${change.address}: ` +
            `${flow.assets} assets for ${flow.shares} shares`,
        };
      }

      // Everything else is an ERC-20 movement: the asset in or out, and the
      // vault's own shares minted or burned. The canonical ERC-20 parser owns
      // that evidence; a transfer is also recorded here for cross-checking.
      const transfer = tryDecode(ERC20Abi, topics, change.data);
      if (transfer?.eventName === "Transfer") {
        const args = transfer.args as Record<string, unknown>;
        transfers.push({
          token: change.address,
          from: args.from as AddressValue,
          to: args.to as AddressValue,
          value: args.value as bigint,
        });
      }
      return this.erc20.changesReceipt([change]);
    });

    if (!flow) {
      throw new Error(`Morpho ${operation} Receipt requires the vault's ERC-4626 ${expected}`);
    }
    const confirmed: FlowFact = flow;
    if (bookkeepers.size !== 1 || !bookkeepers.has(confirmed.vault.toLowerCase())) {
      throw new Error(
        `Morpho ${operation} Receipt requires MetaMorpho bookkeeping events from ${confirmed.vault}`,
      );
    }

    const shareMove = transfers.find(
      (transfer) =>
        same(transfer.token, confirmed.vault) &&
        transfer.value === confirmed.shares &&
        same(operation === "supply" ? transfer.from : transfer.to, ZERO_ADDRESS) &&
        same(operation === "supply" ? transfer.to : transfer.from, confirmed.owner),
    );
    if (!shareMove) {
      throw new Error(
        `Morpho ${operation} Receipt requires ${confirmed.shares} shares ` +
          `${operation === "supply" ? "minted to" : "burned from"} ${confirmed.owner}`,
      );
    }

    const assetMove = transfers.find((transfer) =>
      operation === "supply"
        ? !same(transfer.token, confirmed.vault) &&
          same(transfer.to, confirmed.vault) &&
          same(transfer.from, confirmed.counterparty) &&
          transfer.value === confirmed.assets
        : !same(transfer.token, confirmed.vault) &&
          same(transfer.from, confirmed.vault) &&
          same(transfer.to, confirmed.receiver) &&
          transfer.value === confirmed.assets,
    );
    if (!assetMove) {
      throw new Error(
        `Morpho ${operation} Receipt requires a ${confirmed.assets} asset transfer ` +
          `${operation === "supply" ? "into" : "out of"} ${confirmed.vault}`,
      );
    }

    const outcome: MorphoVaultFlowOutcome = {
      operation,
      vault: confirmed.vault,
      asset: assetMove.token,
      owner: confirmed.owner,
      receiver: confirmed.receiver,
      assets: confirmed.assets.toString(),
      shares: confirmed.shares.toString(),
    };
    const direction = operation === "supply" ? "into" : "out of";
    return {
      kind: "receipt",
      outcome,
      text:
        `Morpho ${operation}: ${outcome.assets} ${outcome.asset} ${direction} vault ` +
        `${outcome.vault} for ${outcome.owner}, ${outcome.shares} shares`,
      changes: parsed,
    };
  }
}

type DecodedEvent = { eventName: string; args: unknown };

function tryDecode(
  abi: readonly unknown[],
  topics: [Hex, ...Hex[]],
  data: Hex,
): DecodedEvent | undefined {
  try {
    // biome-ignore lint/suspicious/noExplicitAny: one decoder over three const ABIs
    return decodeEventLog({ abi: abi as any, topics, data, strict: true }) as DecodedEvent;
  } catch {
    return undefined;
  }
}

function describeArgs(args: unknown): string {
  if (typeof args !== "object" || args === null) return String(args);
  return Object.entries(args)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
}

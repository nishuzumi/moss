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
 * parameter that the adapter refuses unless the canonical MetaMorpho V1.1
 * factory says it created that vault. Morpho vaults are permissionlessly
 * created, so a hardcoded catalog would go stale the week it landed, while the
 * factory is an on-chain authority rather than an API snapshot. `vaultInfo`
 * exposes the curation surface (owner, curator, guardian, timelock, fee) so an
 * Agent can judge a vault it was handed rather than assume it is safe. That same
 * permissionless model is why a Receipt never names the underlying token: only a
 * live `asset()` read can authenticate it, and a Receipt parser has no chain
 * access. See `#flowReceipt`.
 *
 * v1 scope (intentionally narrow):
 *   - `supply` and `withdraw` in units of the vault's underlying asset.
 *     `mint` and `redeem` (the share-denominated pair) are out of scope.
 *   - `position` and `vaultInfo` queries.
 *   - Vault APY is not computed here. It needs the Morpho Blue market read
 *     surface, per-market IRM rates and Morpho's WAD share math, which is its
 *     own change with its own numeric verification.
 *
 * Risk model (Core's closed set, ADR 0003):
 *   - `fundOut`, meaning assets leave the account in this transaction: the
 *     asset goes out on supply. The vault's shares are burned on withdraw.
 *   - `approval`: supply grants the vault an allowance first.
 *   - not `debt`. A vault depositor lends; the vault borrows on its own behalf
 *     in Morpho Blue markets, never on the depositor's, so neither Capability
 *     adds a repayment obligation.
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
  caller: AddressValue;
  assets: bigint;
  shares: bigint;
}

/** One Morpho Blue market event, held until the vault it belongs to is known. */
interface MarketFact {
  event: string;
  args: unknown;
  vaultFields: readonly string[];
}

/**
 * The only Morpho Blue events a vault flow can produce, and the event fields
 * that have to name the vault itself.
 *
 * MetaMorpho V1.1 supplies through `MORPHO.supply(marketParams, toSupply, 0,
 * address(this), hex"")` and takes back through `MORPHO.withdraw(marketParams,
 * toWithdraw, 0, address(this), address(this))` (`_supplyMorpho` and
 * `_withdrawMorpho` in MetaMorphoV1_1.sol, at the commit pinned in
 * contracts/SOURCES.json). Morpho Blue emits `Supply(id, msg.sender, onBehalf,
 * ...)` and `Withdraw(id, msg.sender, onBehalf, receiver, ...)` (Morpho.sol).
 * So the vault is every participant in its own market events. A deposit only
 * supplies, a withdrawal only withdraws and interest accrual names no address
 * at all. Market evidence for anyone else or for the other direction belongs
 * to some other operation.
 */
const MARKET_EVENTS: Record<"supply" | "withdraw", Record<string, readonly string[]>> = {
  supply: { Supply: ["caller", "onBehalf"], AccrueInterest: [] },
  withdraw: { Withdraw: ["caller", "onBehalf", "receiver"], AccrueInterest: [] },
};

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
      // ERC-4626 scopes maxDeposit to one receiver, so this ceiling belongs to
      // the account it was read for. It is not a vault-global cap. The field
      // names that account so a caller cannot read it as one.
      depositCapacityAccount: ctx.account,
      depositCapacityForAccount: capacity.toString(),
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
   * some other emitter cannot be read as Morpho market activity.
   *
   * The ERC-20 side is correlated by candidate set, not by first match. The
   * parser collects every Transfer that fits the operation's share shape and
   * every Transfer that fits its asset shape, then requires exactly one of
   * each. Two candidates mean either that the evidence cannot say which movement
   * the flow made or that two movements would collapse into one Outcome. Both
   * fail closed. Transfers that fit neither shape stay ordinary ERC-20 evidence
   * through the dependency Receipt.
   *
   * The Outcome names the vault, the owner, the receiver, the assets and the
   * shares, every one of them read from the vault's own ERC-4626 event. It does
   * not name the underlying token. A MetaMorpho vault takes its asset as a
   * permissionless constructor parameter, the ERC-4626 event does not carry it
   * and a Receipt parser cannot read `asset()`, so the only thing available here
   * is whichever contract emitted a matching Transfer. A non-compliant
   * underlying can stay silent while another token emits the same shape, which
   * leaves the candidate unique without making it the asset. Claiming it would
   * put a caller-chosen address in the Outcome and in the Agent-facing text, so
   * the claim is not made at all. `vaultInfo` and `position` report the asset
   * from a live `asset()` read, where the identity is authenticated at the
   * moment it is used.
   *
   * Market evidence is bound to this flow, not only to its emitter: a Morpho
   * Blue event has to be the direction the operation produces and has to name
   * the vault as its participant, so a market event belonging to another
   * account is refused instead of being reported as this operation's evidence.
   * The ERC-4626 caller has to be the share owner too, which is the only shape
   * either Capability builds. OpenZeppelin v5 spends a share allowance without
   * emitting anything (`ERC20._spendAllowance` passes `emitEvent: false`), so a
   * third-party caller leaves nothing in the log to check it against.
   */
  #flowReceipt(
    operation: "supply" | "withdraw",
    changes: readonly Change[],
  ): ReceiptResult<MorphoVaultFlowOutcome> {
    const expected = operation === "supply" ? "Deposit" : "Withdraw";
    const transfers: TransferFact[] = [];
    const markets: MarketFact[] = [];
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
        const vaultFields = MARKET_EVENTS[operation][decoded.eventName];
        if (!vaultFields) {
          throw new Error(
            `Unexpected Change: Morpho ${operation} received a Morpho Blue ` +
              `${decoded.eventName}, which a vault ${operation} does not produce`,
          );
        }
        markets.push({ event: decoded.eventName, args: decoded.args, vaultFields });
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
        const owner = args.owner as AddressValue;
        const caller = args.sender as AddressValue;
        if (!same(caller, owner)) {
          throw new Error(
            `Morpho ${operation} Receipt requires the ${expected} caller ${caller} to be the ` +
              `share owner ${owner}; moving another account's shares is not this shape`,
          );
        }
        flow = {
          vault: change.address,
          owner,
          receiver: (args.receiver ?? owner) as AddressValue,
          caller,
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

    for (const market of markets) {
      for (const field of market.vaultFields) {
        const participant = addressField(market.args, field);
        if (!participant || !same(participant, confirmed.vault)) {
          throw new Error(
            `Morpho ${operation} Receipt requires Morpho Blue ${market.event}.${field} to name ` +
              `vault ${confirmed.vault}, got ${participant ?? "no address"}`,
          );
        }
      }
    }

    const moved = operation === "supply" ? "minted to" : "burned from";
    const shareMoves = transfers.filter(
      (transfer) =>
        same(transfer.token, confirmed.vault) &&
        transfer.value === confirmed.shares &&
        same(operation === "supply" ? transfer.from : transfer.to, ZERO_ADDRESS) &&
        same(operation === "supply" ? transfer.to : transfer.from, confirmed.owner),
    );
    const [shareMove, ...extraShareMoves] = shareMoves;
    if (!shareMove) {
      throw new Error(
        `Morpho ${operation} Receipt requires ${confirmed.shares} shares ` +
          `${moved} ${confirmed.owner}`,
      );
    }
    if (extraShareMoves.length > 0) {
      throw new Error(
        `Morpho ${operation} Receipt requires exactly one vault share movement, got ` +
          `${shareMoves.length} Transfers of ${confirmed.shares} shares ${moved} ` +
          `${confirmed.owner}`,
      );
    }

    const direction = operation === "supply" ? "into" : "out of";
    const assetMoves = transfers.filter((transfer) =>
      operation === "supply"
        ? !same(transfer.token, confirmed.vault) &&
          same(transfer.to, confirmed.vault) &&
          same(transfer.from, confirmed.caller) &&
          transfer.value === confirmed.assets
        : !same(transfer.token, confirmed.vault) &&
          same(transfer.from, confirmed.vault) &&
          same(transfer.to, confirmed.receiver) &&
          transfer.value === confirmed.assets,
    );
    if (assetMoves.length === 0) {
      throw new Error(
        `Morpho ${operation} Receipt requires a ${confirmed.assets} asset transfer ` +
          `${direction} ${confirmed.vault}`,
      );
    }
    if (assetMoves.length > 1) {
      throw new Error(
        `Morpho ${operation} Receipt requires exactly one asset movement, got ` +
          `${assetMoves.length} candidate Transfers of ${confirmed.assets} ${direction} vault ` +
          `${confirmed.vault}, from tokens ${assetMoves.map((move) => move.token).join(", ")}. ` +
          `A vault's asset is permissionless, so no matching Transfer can be assumed canonical`,
      );
    }

    // The Outcome names no token. The one candidate above is the movement this
    // flow requires, never proof of which token made it: see #flowReceipt.
    const outcome: MorphoVaultFlowOutcome = {
      operation,
      vault: confirmed.vault,
      owner: confirmed.owner,
      receiver: confirmed.receiver,
      assets: confirmed.assets.toString(),
      shares: confirmed.shares.toString(),
    };
    return {
      kind: "receipt",
      outcome,
      text:
        `Morpho ${operation}: ${outcome.assets} assets ${direction} vault ` +
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

/** One address-valued field of a decoded event, or nothing if it carries none. */
function addressField(args: unknown, field: string): string | undefined {
  if (typeof args !== "object" || args === null) return undefined;
  const value = (args as Record<string, unknown>)[field];
  return typeof value === "string" ? value : undefined;
}

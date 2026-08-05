import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type CapabilityNode,
  type CapabilityResult,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  ParameterError,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptChange,
  type ReceiptResult,
  tokenMetadata,
} from "@themoss/core";
import { ERC20, ERC20Abi } from "@themoss/erc";
import { decodeEventLog, formatUnits, parseUnits, zeroAddress } from "viem";
import { BasePerspectiveAbi, EthereumVaultConnectorAbi, EVaultAbi } from "./abis/euler.js";
import { EULER_EVC_ADDRESS, EULER_GOVERNED_PERSPECTIVE_ADDRESS } from "./addresses.js";
import type {
  EulerBorrowOutcome,
  EulerBorrowParams,
  EulerMarketsParams,
  EulerRepayOutcome,
  EulerSupplyOutcome,
  EulerWithdrawOutcome,
} from "./types.js";
import { EulerVaultConnector } from "./vault-connector.js";
import { resolveVault, sameAddress, vaultHandle } from "./vaults.js";

/** Bounds the `markets` Query: the governed perspective is a growing on-chain
 * list, and an unbounded walk would turn one Query into hundreds of RPC calls. */
const MAX_MARKETS = 64;

const vaultParams = {
  vault: {
    type: Address,
    description: "EVK vault this operation acts on; it is verified against the Euler factory.",
  },
} satisfies ParamsSpec;

const vaultAmountParams = {
  ...vaultParams,
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the vault's underlying asset, in that asset's display units.",
  },
} satisfies ParamsSpec;

const OptionalAddress = Address.optional().describe(
  "An optional 20-byte EVM address encoded as a 0x-prefixed hexadecimal string.",
);

const borrowParams = {
  ...vaultAmountParams,
  collateral: {
    type: OptionalAddress,
    description:
      "EVK vault whose shares back this borrow; enabled as collateral first when it is not already.",
  },
} satisfies ParamsSpec;

const marketParams = {
  asset: {
    type: OptionalAddress,
    description: "Restricts the listing to vaults lending this underlying token.",
  },
} satisfies ParamsSpec;

const positionParams = {
  ...vaultParams,
  owner: { type: Address, description: "Account whose vault position is read." },
} satisfies ParamsSpec;

type Operation = "supply" | "withdraw" | "borrow" | "repay";

const OPERATION_EVENT = {
  supply: "Deposit",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
} as const satisfies Record<Operation, string>;

type ObservedTransfer = {
  token: AddressValue;
  from: AddressValue;
  to: AddressValue;
  value: bigint;
};

/** Decodes a Change as an ERC-20 `Transfer`, or returns undefined. Pure. */
function observeTransfer(change: Change): ObservedTransfer | undefined {
  if (change.kind !== "event") return undefined;
  try {
    const event = decodeEventLog({
      abi: ERC20Abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
    if (event.eventName !== "Transfer") return undefined;
    return {
      token: change.address,
      from: event.args.from,
      to: event.args.to,
      value: event.args.value,
    };
  } catch {
    return undefined;
  }
}

function decodeVaultEvent(change: Change) {
  if (change.kind !== "event") return undefined;
  try {
    return decodeEventLog({
      abi: EVaultAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

@Protocol({
  name: "euler",
  category: "lending",
  description:
    "Euler v2 lending on Monad: supply, withdraw, borrow and repay across EVK vaults verified against the Euler factory and its on-chain vault perspectives.",
  contracts: {
    governedPerspective: { abi: BasePerspectiveAbi, addr: EULER_GOVERNED_PERSPECTIVE_ADDRESS },
    evcReads: { abi: EthereumVaultConnectorAbi, addr: EULER_EVC_ADDRESS },
  },
  protocols: { erc20: ERC20, connector: EulerVaultConnector },
})
export class Euler {
  declare runtime: MossRuntime;
  declare governedPerspective: Handle<typeof BasePerspectiveAbi>;
  declare evcReads: Handle<typeof EthereumVaultConnectorAbi>;
  declare erc20: ProtocolRef<ERC20>;
  declare connector: ProtocolRef<EulerVaultConnector>;

  // --- Capabilities -------------------------------------------------------

  @Capability<Euler, typeof vaultAmountParams>({
    intent: "Supply {amount} of the {vault} vault's underlying asset to Euler",
    verb: "supply",
    params: vaultAmountParams,
    receipt: "supplyReceipt",
    risk: ["fundOut", "approval"],
    tags: ["evk", "erc4626"],
  })
  async supply(
    params: InferParams<typeof vaultAmountParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    const handle = vaultHandle(this.runtime, vault.address, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);

    // A supply cap is a property of the vault, so it is safe to check here;
    // account-level state is not, because an earlier Capability in the same
    // tree may be what creates it.
    const limit = await handle.read.maxDeposit([ctx.account]);
    if (assets > limit) {
      throw new ParameterError(
        `${vault.symbol} accepts at most ${formatUnits(limit, vault.assetDecimals)} more of its underlying asset`,
      );
    }

    return [
      await this.erc20.approve({
        token: vault.asset,
        spender: vault.address,
        amount: assets.toString(),
      }),
      handle.deposit([assets, ctx.account]),
    ];
  }

  @Capability<Euler, typeof vaultAmountParams>({
    intent: "Withdraw {amount} of the {vault} vault's underlying asset from Euler",
    verb: "withdraw",
    params: vaultAmountParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
    tags: ["evk", "erc4626"],
  })
  async withdraw(
    params: InferParams<typeof vaultAmountParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    const handle = vaultHandle(this.runtime, vault.address, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);
    // No balance guard: the shares being redeemed may be exactly what an
    // earlier Capability in this tree just minted. Simulation is the check.
    return [handle.withdraw([assets, ctx.account, ctx.account])];
  }

  borrow(params: EulerBorrowParams, ctx: ActionCtx): Promise<CapabilityResult>;
  @Capability<Euler, typeof borrowParams>({
    intent: "Borrow {amount} of the {vault} vault's underlying asset from Euler",
    verb: "borrow",
    params: borrowParams,
    receipt: "borrowReceipt",
    // Borrowing records repayment obligations (`debt`) and hands the debt
    // vault control of this account's collateral (`liquidation`), so an Agent
    // sees both dangers in the closed risk set rather than as long-tail tags.
    risk: ["approval", "debt", "liquidation"],
    tags: ["evk"],
  })
  async borrow(
    params: InferParams<typeof borrowParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    const handle = vaultHandle(this.runtime, vault.address, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);

    const [cash, controllerEnabled, enabledCollaterals] = await Promise.all([
      handle.read.cash(),
      this.evcReads.read.isControllerEnabled([ctx.account, vault.address]),
      this.evcReads.read.getCollaterals([ctx.account]),
    ]);
    if (assets > cash) {
      throw new ParameterError(
        `${vault.symbol} holds only ${formatUnits(cash, vault.assetDecimals)} of borrowable cash`,
      );
    }

    const authorizations: CapabilityNode[] = [];
    if (params.collateral !== undefined) {
      const collateral = await resolveVault(this.runtime, ctx.account, params.collateral);
      const borrowLtv = await handle.read.LTVBorrow([collateral.address]);
      if (borrowLtv === 0) {
        throw new ParameterError(
          `${vault.symbol} does not accept ${collateral.symbol} as collateral`,
        );
      }
      if (!enabledCollaterals.some((entry) => sameAddress(entry, collateral.address))) {
        authorizations.push(await this.connector.enableCollateral({ vault: collateral.address }));
      }
    } else if (enabledCollaterals.length === 0) {
      throw new ParameterError(
        "the account has no collateral enabled on the Euler Vault Connector; pass `collateral`",
      );
    }
    if (!controllerEnabled) {
      authorizations.push(await this.connector.enableController({ vault: vault.address }));
    }

    return [...authorizations, handle.borrow([assets, ctx.account])];
  }

  @Capability<Euler, typeof vaultAmountParams>({
    intent: "Repay {amount} of the account's {vault} debt on Euler",
    verb: "repay",
    params: vaultAmountParams,
    receipt: "repayReceipt",
    risk: ["fundOut", "approval"],
    tags: ["evk", "debt"],
  })
  async repay(
    params: InferParams<typeof vaultAmountParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    const handle = vaultHandle(this.runtime, vault.address, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);
    // No debt guard, for the same reason `withdraw` has no balance guard: the
    // debt may be created by an earlier Capability in this tree. Euler reverts
    // on an over-repayment, which simulation surfaces before anything is signed.
    return [
      await this.erc20.approve({
        token: vault.asset,
        spender: vault.address,
        amount: assets.toString(),
      }),
      handle.repay([assets, ctx.account]),
    ];
  }

  // --- Queries ------------------------------------------------------------

  markets(
    params: EulerMarketsParams,
    ctx: ActionCtx,
  ): Promise<{
    perspective: AddressValue;
    vaults: { vault: AddressValue; asset: AddressValue; symbol: string }[];
  }>;
  @Query({
    intent: "List the Euler vaults verified by Euler's on-chain governed perspective",
    params: marketParams,
    tags: ["evk", "discovery"],
  })
  async markets(params: InferParams<typeof marketParams>, ctx: ActionCtx) {
    const verified = await this.governedPerspective.read.verifiedArray();
    if (verified.length > MAX_MARKETS) {
      throw new Error(
        `Euler's governed perspective lists ${verified.length} vaults, above this Query's ${MAX_MARKETS} bound`,
      );
    }
    const vaults = await Promise.all(
      verified.map(async (address) => {
        const handle = vaultHandle(this.runtime, address, ctx.account);
        const [asset, symbol] = await Promise.all([handle.read.asset(), handle.read.symbol()]);
        return { vault: address, asset, symbol };
      }),
    );
    const asset = params.asset;
    return {
      perspective: EULER_GOVERNED_PERSPECTIVE_ADDRESS,
      vaults:
        asset === undefined ? vaults : vaults.filter((entry) => sameAddress(entry.asset, asset)),
    };
  }

  @Query({
    intent: "Read one Euler vault's asset, liquidity and accepted collateral",
    params: vaultParams,
    tags: ["evk"],
  })
  async vault(params: InferParams<typeof vaultParams>, ctx: ActionCtx) {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    const handle = vaultHandle(this.runtime, vault.address, ctx.account);
    const [totalAssets, totalBorrows, cash, interestRate, collaterals] = await Promise.all([
      handle.read.totalAssets(),
      handle.read.totalBorrows(),
      handle.read.cash(),
      handle.read.interestRate(),
      handle.read.LTVList(),
    ]);
    const acceptedCollateral = await Promise.all(
      collaterals.map(async (collateral) => {
        const [borrowLtvBps, liquidationLtvBps] = await Promise.all([
          handle.read.LTVBorrow([collateral]),
          handle.read.LTVLiquidation([collateral]),
        ]);
        return { vault: collateral, borrowLtvBps, liquidationLtvBps };
      }),
    );
    // The observation lets Registry render this vault's address as
    // OnChain(symbol,address) in later Receipt text.
    return tokenMetadata(
      {
        vault: vault.address,
        symbol: vault.symbol,
        name: vault.name,
        asset: vault.asset,
        assetDecimals: vault.assetDecimals,
        perspective: vault.perspective,
        totalAssets: totalAssets.toString(),
        totalBorrows: totalBorrows.toString(),
        cash: cash.toString(),
        interestRate: interestRate.toString(),
        acceptedCollateral,
      },
      { address: vault.address, symbol: vault.symbol, name: vault.name },
    );
  }

  @Query({
    intent: "Read an account's Euler position in one vault",
    params: positionParams,
    tags: ["evk", "balance"],
  })
  async position(params: InferParams<typeof positionParams>, ctx: ActionCtx) {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    const handle = vaultHandle(this.runtime, vault.address, ctx.account);
    const [shares, debt, collateralEnabled, controllerEnabled] = await Promise.all([
      handle.read.balanceOf([params.owner]),
      handle.read.debtOf([params.owner]),
      this.evcReads.read.isCollateralEnabled([params.owner, vault.address]),
      this.evcReads.read.isControllerEnabled([params.owner, vault.address]),
    ]);
    const assets = await handle.read.convertToAssets([shares]);
    return {
      vault: vault.address,
      symbol: vault.symbol,
      owner: params.owner,
      asset: vault.asset,
      assetDecimals: vault.assetDecimals,
      shares: shares.toString(),
      assets: assets.toString(),
      debt: debt.toString(),
      collateralEnabled,
      controllerEnabled,
    };
  }

  // --- Receipts -----------------------------------------------------------

  @Receipt()
  supplyReceipt(changes: readonly Change[]): ReceiptResult<EulerSupplyOutcome> {
    const { vault, asset, event, parsed } = this.#vaultOperation("supply", changes);
    if (event.eventName !== "Deposit") throw new Error("Euler supply Receipt requires a Deposit");
    const outcome: EulerSupplyOutcome = {
      operation: "supply",
      vault,
      asset,
      sender: event.args.sender,
      owner: event.args.owner,
      assets: event.args.assets.toString(),
      shares: event.args.shares.toString(),
    };
    return {
      kind: "receipt",
      outcome,
      text: `Euler Supply: ${outcome.assets} of ${asset} into ${vault} for ${outcome.shares} shares to ${outcome.owner}`,
      changes: parsed,
    };
  }

  @Receipt()
  withdrawReceipt(changes: readonly Change[]): ReceiptResult<EulerWithdrawOutcome> {
    const { vault, asset, event, parsed } = this.#vaultOperation("withdraw", changes);
    if (event.eventName !== "Withdraw") {
      throw new Error("Euler withdraw Receipt requires a Withdraw");
    }
    const outcome: EulerWithdrawOutcome = {
      operation: "withdraw",
      vault,
      asset,
      sender: event.args.sender,
      receiver: event.args.receiver,
      owner: event.args.owner,
      assets: event.args.assets.toString(),
      shares: event.args.shares.toString(),
    };
    return {
      kind: "receipt",
      outcome,
      text: `Euler Withdraw: ${outcome.assets} of ${asset} from ${vault} burning ${outcome.shares} shares of ${outcome.owner} to ${outcome.receiver}`,
      changes: parsed,
    };
  }

  @Receipt()
  borrowReceipt(changes: readonly Change[]): ReceiptResult<EulerBorrowOutcome> {
    const { vault, asset, event, parsed, debtToken, payout } = this.#vaultOperation(
      "borrow",
      changes,
    );
    if (event.eventName !== "Borrow") throw new Error("Euler borrow Receipt requires a Borrow");
    if (!debtToken || !payout) {
      throw new Error("Euler borrow Receipt requires a debt mint and an underlying payout");
    }
    const outcome: EulerBorrowOutcome = {
      operation: "borrow",
      vault,
      asset,
      account: event.args.account,
      receiver: payout.to,
      assets: event.args.assets.toString(),
      debtToken,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Euler Borrow: ${outcome.assets} of ${asset} from ${vault} to ${outcome.receiver}, debt recorded for ${outcome.account}`,
      changes: parsed,
    };
  }

  @Receipt()
  repayReceipt(changes: readonly Change[]): ReceiptResult<EulerRepayOutcome> {
    const { vault, asset, event, parsed, debtToken } = this.#vaultOperation("repay", changes);
    if (event.eventName !== "Repay") throw new Error("Euler repay Receipt requires a Repay");
    if (!debtToken) throw new Error("Euler repay Receipt requires a debt burn");
    const outcome: EulerRepayOutcome = {
      operation: "repay",
      vault,
      asset,
      account: event.args.account,
      assets: event.args.assets.toString(),
      debtToken,
    };
    return {
      kind: "receipt",
      outcome,
      text: `Euler Repay: ${outcome.assets} of ${asset} into ${vault} clearing debt of ${outcome.account}`,
      changes: parsed,
    };
  }

  // --- internals ----------------------------------------------------------

  /**
   * One pass establishes which contract emitted this operation's own event —
   * that is the vault, proven by evidence rather than taken from parameters —
   * then one ordered pass accounts for every Change.
   */
  #vaultOperation(operation: Operation, changes: readonly Change[]) {
    const expected = OPERATION_EVENT[operation];
    let vault: AddressValue | undefined;
    let event: NonNullable<ReturnType<typeof decodeVaultEvent>> | undefined;
    for (const change of changes) {
      if (change.kind !== "event" || sameAddress(change.address, EULER_EVC_ADDRESS)) continue;
      const decoded = decodeVaultEvent(change);
      if (decoded?.eventName !== expected) continue;
      if (vault) throw new Error(`Euler ${operation} emitted multiple ${expected} events`);
      vault = change.address;
      event = decoded;
    }
    if (!vault || !event) {
      throw new Error(`Euler ${operation} Receipt requires a ${expected} event`);
    }
    const vaultAddress = vault;

    const transfers: ObservedTransfer[] = [];
    let shareTransfer: ObservedTransfer | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") {
        throw new Error(`Unexpected Change: Euler ${operation} moved native MON`);
      }
      if (sameAddress(change.address, EULER_EVC_ADDRESS)) {
        return this.connector.changesReceipt([change]);
      }
      if (sameAddress(change.address, vaultAddress)) {
        const share = observeTransfer(change);
        if (!share) return this.#vaultChange(change, vaultAddress, operation, expected);
        if (shareTransfer) {
          throw new Error(`Euler ${operation} emitted multiple vault share transfers`);
        }
        shareTransfer = share;
        const minted = sameAddress(share.from, zeroAddress);
        return {
          kind: "change" as const,
          change,
          data: {
            event: minted ? "shareMint" : "shareBurn",
            vault: vaultAddress,
            from: share.from,
            to: share.to,
            shares: share.value.toString(),
          },
          text: `Euler ${minted ? "Share Mint" : "Share Burn"}: ${share.value} of ${vaultAddress} ${
            minted ? `to ${share.to}` : `from ${share.from}`
          }`,
        };
      }
      const transfer = observeTransfer(change);
      if (!transfer) {
        throw new Error(
          `Unexpected Change: ${change.address} emitted an unsupported event during an Euler ${operation}`,
        );
      }
      transfers.push(transfer);
      return this.erc20.changesReceipt([change]);
    });

    const { assets } = event.args as { assets: bigint };
    const { asset, debtToken, payout } = this.#reconcile(operation, {
      vault: vaultAddress,
      assets,
      transfers,
      shareTransfer,
    });
    return { vault: vaultAddress, asset, event, parsed, debtToken, payout };
  }

  /**
   * Cross-checks the operation's own event against the token movements that
   * accompany it, so a Receipt can only state amounts two Changes agree on.
   * This is also how the underlying asset and the vault's debt token are
   * identified: by their role in the movement, never by assumption.
   */
  #reconcile(
    operation: Operation,
    observed: {
      vault: AddressValue;
      assets: bigint;
      transfers: readonly ObservedTransfer[];
      shareTransfer: ObservedTransfer | undefined;
    },
  ) {
    const { vault, assets, transfers, shareTransfer } = observed;
    const matching = transfers.filter((transfer) => transfer.value === assets);

    const unique = (candidates: readonly ObservedTransfer[], role: string) => {
      if (candidates.length > 1) {
        throw new Error(
          `Euler ${operation} Receipt is ambiguous: ${candidates.length} ${role} match the reported ${assets} ` +
            `(${candidates.map((transfer) => transfer.token).join(", ")})`,
        );
      }
      return candidates[0];
    };

    if (operation === "supply" || operation === "repay") {
      const inflow = unique(
        matching.filter((transfer) => sameAddress(transfer.to, vault)),
        "transfers into the vault",
      );
      if (!inflow) {
        throw new Error(
          `Euler ${operation} Receipt requires an underlying transfer into the vault`,
        );
      }
      if (operation === "supply") {
        if (!shareTransfer) throw new Error("Euler supply Receipt requires a vault share mint");
        return { asset: inflow.token, debtToken: undefined, payout: undefined };
      }
      const debtBurn = unique(
        matching.filter((transfer) => sameAddress(transfer.to, zeroAddress)),
        "debt-token burns",
      );
      if (!debtBurn) {
        throw new Error(
          "Euler repay Receipt requires a debt-token burn matching the repaid amount",
        );
      }
      return { asset: inflow.token, debtToken: debtBurn.token, payout: undefined };
    }

    const payout = unique(
      matching.filter((transfer) => sameAddress(transfer.from, vault)),
      "transfers out of the vault",
    );
    if (!payout) {
      throw new Error(
        `Euler ${operation} Receipt requires an underlying transfer out of the vault`,
      );
    }
    if (operation === "withdraw") {
      if (!shareTransfer) throw new Error("Euler withdraw Receipt requires a vault share burn");
      return { asset: payout.token, debtToken: undefined, payout };
    }
    const debtMint = unique(
      matching.filter((transfer) => sameAddress(transfer.from, zeroAddress)),
      "debt-token mints",
    );
    if (!debtMint) {
      throw new Error(
        "Euler borrow Receipt requires a debt-token mint matching the borrowed amount",
      );
    }
    return { asset: payout.token, debtToken: debtMint.token, payout };
  }

  #vaultChange(
    change: Change,
    vault: AddressValue,
    operation: Operation,
    expected: string,
  ): ReceiptChange {
    const decoded = decodeVaultEvent(change);
    if (!decoded) {
      throw new Error(`Unexpected Change: ${vault} emitted an unsupported Euler vault event`);
    }
    if (decoded.eventName === expected) {
      const args = decoded.args as Record<string, unknown>;
      return {
        kind: "change",
        change,
        data: {
          event: expected,
          vault,
          ...Object.fromEntries(
            Object.entries(args).map(([key, value]) => [
              key,
              typeof value === "bigint" ? value.toString() : String(value),
            ]),
          ),
        },
        text: `Euler ${expected}: ${vault} recorded ${String(args.assets)} for ${String(
          args.account ?? args.owner ?? args.sender,
        )}`,
      };
    }
    if (decoded.eventName === "VaultStatus") {
      return {
        kind: "change",
        change,
        data: {
          event: "VaultStatus",
          vault,
          totalShares: decoded.args.totalShares.toString(),
          totalBorrows: decoded.args.totalBorrows.toString(),
          cash: decoded.args.cash.toString(),
          interestRate: decoded.args.interestRate.toString(),
        },
        text: `Euler Vault Status: ${vault} now holds ${decoded.args.cash} cash against ${decoded.args.totalBorrows} borrows`,
      };
    }
    if (decoded.eventName === "InterestAccrued") {
      return {
        kind: "change",
        change,
        data: {
          event: "InterestAccrued",
          vault,
          account: decoded.args.account,
          assets: decoded.args.assets.toString(),
        },
        text: `Euler Interest Accrued: ${decoded.args.assets} in ${vault} for ${decoded.args.account}`,
      };
    }
    throw new Error(
      `Unexpected Change: ${vault} emitted ${decoded.eventName} during an Euler ${operation}`,
    );
  }
}

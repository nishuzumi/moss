import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type Change,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  Protocol,
  Query,
  Receipt,
  type ReceiptChange,
  type ReceiptResult,
} from "@themoss/core";
import { decodeEventLog } from "viem";
import { EthereumVaultConnectorAbi } from "./abis/euler.js";
import { EULER_EVC_ADDRESS } from "./addresses.js";
import type { EulerAccountStatusOutcome } from "./types.js";
import { resolveVault, sameAddress } from "./vaults.js";

const vaultParams = {
  vault: {
    type: Address,
    description: "EVK vault to authorize; it is verified against the Euler factory first.",
  },
} satisfies ParamsSpec;

const accountParams = {
  account: { type: Address, description: "Account whose Vault Connector state is read." },
} satisfies ParamsSpec;

export function decodeConnectorEvent(change: Change) {
  if (change.kind !== "event") {
    throw new Error("Unexpected Change: the Euler Vault Connector moved native MON");
  }
  try {
    return decodeEventLog({
      abi: EthereumVaultConnectorAbi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    throw new Error("Unexpected Change: the Euler Vault Connector emitted an unsupported event");
  }
}

/** Renders one Vault Connector Change. Shared with the vault adapter, whose
 * operations route through the connector and therefore carry its events. */
export function connectorChange(change: Change): ReceiptChange {
  const decoded = decodeConnectorEvent(change);
  switch (decoded.eventName) {
    case "CallWithContext":
      return {
        kind: "change",
        change,
        data: {
          event: "CallWithContext",
          onBehalfOfAccount: decoded.args.onBehalfOfAccount,
          targetContract: decoded.args.targetContract,
          selector: decoded.args.selector,
        },
        text: `Euler Vault Connector Call: ${decoded.args.targetContract} on behalf of ${decoded.args.onBehalfOfAccount} through ${EULER_EVC_ADDRESS}`,
      };
    case "VaultStatusCheck":
      return {
        kind: "change",
        change,
        data: { event: "VaultStatusCheck", vault: decoded.args.vault },
        text: `Euler Vault Status Check: ${decoded.args.vault} by ${EULER_EVC_ADDRESS}`,
      };
    case "AccountStatusCheck":
      return {
        kind: "change",
        change,
        data: {
          event: "AccountStatusCheck",
          account: decoded.args.account,
          controller: decoded.args.controller,
        },
        text: `Euler Account Status Check: ${decoded.args.account} under controller ${decoded.args.controller}`,
      };
    case "OwnerRegistered":
      return {
        kind: "change",
        change,
        data: { event: "OwnerRegistered", owner: decoded.args.owner },
        text: `Euler Vault Connector Owner Registered: ${decoded.args.owner}`,
      };
    case "CollateralStatus":
      return {
        kind: "change",
        change,
        data: {
          event: "CollateralStatus",
          account: decoded.args.account,
          collateral: decoded.args.collateral,
          enabled: decoded.args.enabled,
        },
        text: `Euler Collateral ${decoded.args.enabled ? "Enabled" : "Disabled"}: ${decoded.args.collateral} for ${decoded.args.account}`,
      };
    case "ControllerStatus":
      return {
        kind: "change",
        change,
        data: {
          event: "ControllerStatus",
          account: decoded.args.account,
          controller: decoded.args.controller,
          enabled: decoded.args.enabled,
        },
        text: `Euler Controller ${decoded.args.enabled ? "Enabled" : "Disabled"}: ${decoded.args.controller} for ${decoded.args.account}`,
      };
    default:
      throw new Error(`Unexpected Change: the Euler Vault Connector emitted ${decoded.eventName}`);
  }
}

/**
 * The Euler Vault Connector is its own contract with its own semantics —
 * account authorization, not lending — and every EVK vault routes through it.
 * Modelling it as a separate Protocol is what lets the lending adapter compose
 * its authorization steps as nested Capabilities with their own Receipts.
 */
@Protocol({
  name: "euler-vault-connector",
  category: "lending",
  description:
    "Euler Vault Connector authorization on Monad: enable an EVK vault as account collateral, or as the account's debt controller.",
  contracts: { evc: { abi: EthereumVaultConnectorAbi, addr: EULER_EVC_ADDRESS } },
  labels: { EVC: EULER_EVC_ADDRESS },
})
export class EulerVaultConnector {
  declare runtime: MossRuntime;
  declare evc: Handle<typeof EthereumVaultConnectorAbi>;

  @Capability<EulerVaultConnector, typeof vaultParams>({
    intent: "Enable the {vault} vault as Euler collateral for the account",
    verb: "approve",
    params: vaultParams,
    receipt: "collateralReceipt",
    risk: ["approval"],
    tags: ["evk", "evc", "collateral"],
  })
  async enableCollateral(params: InferParams<typeof vaultParams>, ctx: ActionCtx) {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    return [this.evc.enableCollateral([ctx.account, vault.address])];
  }

  @Capability<EulerVaultConnector, typeof vaultParams>({
    intent: "Enable the {vault} vault as the account's Euler debt controller",
    verb: "approve",
    params: vaultParams,
    receipt: "controllerReceipt",
    // A controller may seize this account's collateral. `liquidation` is the
    // risk label that says so; it enters the closed set with the perps
    // vocabulary change, so until then it rides as a tag (ADR 0003 names tags
    // as the pressure valve for exactly this).
    risk: ["approval"],
    tags: ["evk", "evc", "controller", "liquidation"],
  })
  async enableController(params: InferParams<typeof vaultParams>, ctx: ActionCtx) {
    const vault = await resolveVault(this.runtime, ctx.account, params.vault);
    return [this.evc.enableController([ctx.account, vault.address])];
  }

  @Query({
    intent: "Read the vaults an account has enabled as Euler collateral",
    params: accountParams,
    tags: ["evc", "collateral"],
  })
  async collaterals(params: InferParams<typeof accountParams>) {
    const vaults = await this.evc.read.getCollaterals([params.account]);
    return { account: params.account, vaults };
  }

  @Query({
    intent: "Read the vaults controlling an account's Euler debt",
    params: accountParams,
    tags: ["evc", "controller"],
  })
  async controllers(params: InferParams<typeof accountParams>) {
    const vaults = await this.evc.read.getControllers([params.account]);
    return { account: params.account, vaults };
  }

  @Receipt()
  collateralReceipt(changes: readonly Change[]): ReceiptResult<EulerAccountStatusOutcome> {
    return this.#accountStatusReceipt("enableCollateral", changes);
  }

  @Receipt()
  controllerReceipt(changes: readonly Change[]): ReceiptResult<EulerAccountStatusOutcome> {
    return this.#accountStatusReceipt("enableController", changes);
  }

  /** Renders any Vault Connector Change; the vault adapter delegates its own
   * connector Changes here so both Protocols describe them identically. */
  @Receipt()
  changesReceipt(changes: readonly Change[]): ReceiptResult<readonly Record<string, never>[]> {
    const parsed = changes.map((change) => connectorChange(change));
    return {
      kind: "receipt",
      outcome: [],
      text: parsed.map(({ text }) => text).join("; "),
      changes: parsed,
    };
  }

  #accountStatusReceipt(
    operation: "enableCollateral" | "enableController",
    changes: readonly Change[],
  ): ReceiptResult<EulerAccountStatusOutcome> {
    const wanted = operation === "enableCollateral" ? "CollateralStatus" : "ControllerStatus";
    let outcome: EulerAccountStatusOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer" || !sameAddress(change.address, EULER_EVC_ADDRESS)) {
        throw new Error(
          `Unexpected Change: Euler ${operation} touched a contract other than the Vault Connector`,
        );
      }
      const decoded = decodeConnectorEvent(change);
      if (decoded.eventName === wanted) {
        if (outcome) throw new Error(`Euler ${operation} emitted multiple ${wanted} events`);
        const args = decoded.args as {
          account: AddressValue;
          enabled: boolean;
          collateral?: AddressValue;
          controller?: AddressValue;
        };
        const vault = args.collateral ?? args.controller;
        if (!vault) throw new Error(`Euler ${operation} ${wanted} named no vault`);
        outcome = { operation, account: args.account, vault, enabled: args.enabled };
      }
      return connectorChange(change);
    });
    if (!outcome) throw new Error(`Euler ${operation} Receipt requires a ${wanted} event`);
    if (!outcome.enabled) throw new Error(`Euler ${operation} reported the vault as disabled`);
    const label = operation === "enableCollateral" ? "Collateral" : "Controller";
    return {
      kind: "receipt",
      outcome,
      text: `Euler ${label} Enabled: ${outcome.vault} for ${outcome.account}`,
      changes: parsed,
    };
  }
}

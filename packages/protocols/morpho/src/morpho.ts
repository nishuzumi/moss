import {
  type ActionCtx,
  Address,
  type AddressValue,
  Capability,
  type CapabilityResult,
  type Change,
  createHandle,
  type Handle,
  type Hex,
  type InferParams,
  type MossRuntime,
  type ParamsSpec,
  PositiveDecimalString,
  Protocol,
  type ProtocolRef,
  Query,
  Receipt,
  type ReceiptResult,
} from "@themoss/core";
import { ERC20 } from "@themoss/erc";
import { decodeEventLog, formatUnits, getAddress, isAddress, parseUnits } from "viem";
import { MorphoVaultV2Abi, MorphoVaultV2FactoryAbi } from "./abis/morpho.js";
import type {
  MorphoDepositOutcome,
  MorphoWithdrawOutcome,
  VaultCandidate,
  VaultSummary,
  VerifiedVault,
} from "./types.js";

// Official Morpho Vaults V2 factory on Monad mainnet: vendored
// @morpho-org/morpho-ts `lib/esm/addresses.js` entry
// `addresses[143].vaultV2Factory` (version and tarball digest in
// abis-src/VENDOR.json), cross-checked against api.morpho.org, which reports
// the same `factory.address` for every listed Monad vault (retrieved
// 2026-07-18). The live test verifies deployed bytecode, and every vault this
// adapter touches must pass this factory's on-chain `isVaultV2` attestation.
export const MORPHO_VAULT_V2_FACTORY_ADDRESS =
  "0x8B2F922162FBb60A6a072cC784A2E4168fB0bb0c" as const;
const MORPHO_API_URL = "https://api.morpho.org/graphql";
// Moss v1 is Monad-mainnet only; the Runtime rejects any RPC whose chain ID
// is not 143, so the multichain Morpho API must be filtered to the same chain.
const MONAD_CHAIN_ID = 143;
const MAX_DISCOVERED_VAULTS = 100;

// Discovery requests only `listed: true` vaults: the unlisted Monad set
// includes junk and adversarial display data, and API responses are only
// candidates for on-chain verification either way (ADR 0012).
const VAULTS_QUERY = `query MossVaults($first: Int!, $where: VaultV2sFilters!) {
  vaultV2s(first: $first, where: $where, orderBy: TotalAssetsUsd, orderDirection: Desc) {
    items {
      address
      name
      symbol
      netApy
      netApyExcludingRewards
      totalAssetsUsd
      liquidityAdapter { address }
      asset { address }
    }
  }
}`;

const OptionalAddress = Address.optional().describe(
  "An optional 20-byte EVM address encoded as a 0x-prefixed hexadecimal string.",
);

const vaultField = {
  type: Address,
  description:
    "Morpho Vault V2 contract this operation targets; must be attested by the on-chain VaultV2 factory.",
};

const discoverParams = {
  asset: {
    type: OptionalAddress,
    description:
      "Restrict results to vaults denominated in this underlying ERC-20 asset; omit to list every curated vault.",
  },
} satisfies ParamsSpec;

const positionParams = {
  vault: vaultField,
  owner: { type: Address, description: "Address whose vault position is read." },
} satisfies ParamsSpec;

const depositParams = {
  vault: vaultField,
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the vault's underlying asset to deposit, in its display units.",
  },
} satisfies ParamsSpec;

const withdrawParams = {
  vault: vaultField,
  amount: {
    type: PositiveDecimalString,
    description: "Quantity of the vault's underlying asset to withdraw, in its display units.",
  },
} satisfies ParamsSpec;

@Protocol({
  name: "morpho",
  category: "lending",
  description:
    "Morpho Vaults V2 on Monad: deposit into and withdraw from curated ERC-4626 yield vaults discovered via the Morpho API and verified on-chain.",
  contracts: {
    factory: { abi: MorphoVaultV2FactoryAbi, addr: MORPHO_VAULT_V2_FACTORY_ADDRESS },
  },
  protocols: { erc20: ERC20 },
})
export class Morpho {
  declare runtime: MossRuntime;
  declare factory: Handle<typeof MorphoVaultV2FactoryAbi>;
  declare erc20: ProtocolRef<ERC20>;

  vaults(
    params: { asset?: AddressValue },
    ctx: ActionCtx,
  ): Promise<{ vaults: readonly VaultSummary[] }>;
  @Query({
    intent: "List curated Morpho V2 vaults on Monad with on-chain asset facts and advisory APY",
    params: discoverParams,
    tags: ["vault", "erc4626", "yield"],
  })
  async vaults(
    params: InferParams<typeof discoverParams>,
    ctx: ActionCtx,
  ): Promise<{ vaults: readonly VaultSummary[] }> {
    const candidates = await fetchVaultCandidates(params.asset);
    const vaults = await Promise.all(
      candidates.map(async (candidate) => {
        const vault = await this.#verifyVault(candidate.address, ctx.account);
        if (!sameAddress(vault.asset, candidate.asset)) {
          throw new Error(`Morpho API returned vault ${candidate.address} with a mismatched asset`);
        }
        if (params.asset && !sameAddress(vault.asset, params.asset)) {
          throw new Error(
            `Morpho API returned vault ${candidate.address} outside the requested asset filter`,
          );
        }
        const totalAssets = await vault.handle.read.totalAssets();
        return {
          address: vault.address,
          name: candidate.name ?? null,
          symbol: candidate.symbol ?? null,
          asset: { address: vault.asset, symbol: vault.assetSymbol, decimals: vault.assetDecimals },
          totalAssets: totalAssets.toString(),
          totalAssetsDisplay: formatUnits(totalAssets, vault.assetDecimals),
          netApy: candidate.netApy ?? null,
          netApyExcludingRewards: candidate.netApyExcludingRewards ?? null,
          totalAssetsUsd: candidate.totalAssetsUsd ?? null,
          liquidityAdapter: candidate.liquidityAdapter ?? null,
        };
      }),
    );
    return { vaults };
  }

  @Query({
    intent: "Read a Morpho V2 vault position as shares and redeemable assets",
    params: positionParams,
    tags: ["vault", "balance"],
  })
  async position(params: InferParams<typeof positionParams>, ctx: ActionCtx) {
    const vault = await this.#verifyVault(params.vault, ctx.account);
    const shares = await vault.handle.read.balanceOf([params.owner]);
    const assets = await vault.handle.read.convertToAssets([shares]);
    return {
      vault: vault.address,
      owner: params.owner,
      shares: shares.toString(),
      assets: assets.toString(),
      assetsDisplay: formatUnits(assets, vault.assetDecimals),
      asset: { address: vault.asset, symbol: vault.assetSymbol, decimals: vault.assetDecimals },
    };
  }

  @Query({
    intent: "Preview the vault shares minted by a Morpho V2 deposit",
    params: depositParams,
    tags: ["vault", "quote"],
  })
  async previewDeposit(params: InferParams<typeof depositParams>, ctx: ActionCtx) {
    const vault = await this.#verifyVault(params.vault, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);
    // VaultV2 previews via the ERC-4626 preview functions only; its
    // maxDeposit/maxMint/maxWithdraw/maxRedeem always return 0 by design.
    const shares = await vault.handle.read.previewDeposit([assets]);
    return {
      vault: vault.address,
      amount: params.amount,
      assets: assets.toString(),
      shares: shares.toString(),
    };
  }

  @Capability<Morpho, typeof depositParams>({
    intent: "Deposit an asset into a verified Morpho V2 vault to earn yield",
    verb: "supply",
    params: depositParams,
    receipt: "depositReceipt",
    risk: ["fundOut", "approval"],
    tags: ["vault", "erc4626", "yield"],
  })
  async deposit(
    params: InferParams<typeof depositParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const vault = await this.#verifyVault(params.vault, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);
    const approval = await this.erc20.approve({
      token: vault.asset,
      spender: vault.address,
      amount: assets.toString(),
    });
    // Shares always mint to the caller: onBehalf is pinned to ctx.account so
    // discovery data can never redirect a position to a third party.
    return [approval, vault.handle.deposit([assets, ctx.account])];
  }

  @Capability<Morpho, typeof withdrawParams>({
    intent: "Withdraw an asset from a Morpho V2 vault position",
    verb: "withdraw",
    params: withdrawParams,
    receipt: "withdrawReceipt",
    risk: ["fundOut"],
    tags: ["vault", "erc4626", "yield"],
  })
  async withdraw(
    params: InferParams<typeof withdrawParams>,
    ctx: ActionCtx,
  ): Promise<CapabilityResult> {
    const vault = await this.#verifyVault(params.vault, ctx.account);
    const assets = parseUnits(params.amount, vault.assetDecimals);
    // receiver and onBehalf are pinned to ctx.account: the caller burns its
    // own shares and receives the assets itself; no approval is needed.
    return [vault.handle.withdraw([assets, ctx.account, ctx.account])];
  }

  @Receipt()
  depositReceipt(changes: readonly Change[]): ReceiptResult<MorphoDepositOutcome> {
    let outcome: MorphoDepositOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      const event = tryDecodeMorphoEvent(change);
      if (!event || event.eventName === "Transfer" || event.eventName === "Approval") {
        // Underlying asset movements, share mints, and allowance updates are
        // ERC-20 semantics; delegate them so coverage stays exhaustive.
        return this.erc20.changesReceipt([change]);
      }
      if (event.eventName === "AccrueInterest") return accrueInterestChange(change, event.args);
      if (event.eventName !== "Deposit") {
        throw new Error(`Unexpected Change: Morpho vault emitted ${event.eventName}`);
      }
      if (outcome) throw new Error("Morpho deposit emitted multiple Deposit events");
      outcome = {
        operation: "deposit",
        protocol: "morpho",
        vault: getAddress(change.address),
        sender: event.args.sender,
        onBehalf: event.args.onBehalf,
        assets: event.args.assets.toString(),
        shares: event.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: outcome,
        text: `Morpho Deposit: ${outcome.assets} asset units into ${outcome.vault} minted ${outcome.shares} shares for ${outcome.onBehalf}`,
      };
    });
    if (!outcome) throw new Error("Morpho deposit Receipt requires a Deposit event");
    return {
      kind: "receipt",
      outcome,
      text: `Morpho Deposit: ${outcome.assets} asset units into ${outcome.vault} for ${outcome.shares} shares`,
      changes: parsed,
    };
  }

  @Receipt()
  withdrawReceipt(changes: readonly Change[]): ReceiptResult<MorphoWithdrawOutcome> {
    let outcome: MorphoWithdrawOutcome | undefined;
    const parsed = changes.map((change) => {
      if (change.kind === "nativeTransfer") return this.erc20.changesReceipt([change]);
      const event = tryDecodeMorphoEvent(change);
      if (!event || event.eventName === "Transfer" || event.eventName === "Approval") {
        return this.erc20.changesReceipt([change]);
      }
      if (event.eventName === "AccrueInterest") return accrueInterestChange(change, event.args);
      if (event.eventName !== "Withdraw") {
        throw new Error(`Unexpected Change: Morpho vault emitted ${event.eventName}`);
      }
      if (outcome) throw new Error("Morpho withdraw emitted multiple Withdraw events");
      outcome = {
        operation: "withdraw",
        protocol: "morpho",
        vault: getAddress(change.address),
        sender: event.args.sender,
        receiver: event.args.receiver,
        onBehalf: event.args.onBehalf,
        assets: event.args.assets.toString(),
        shares: event.args.shares.toString(),
      };
      return {
        kind: "change" as const,
        change,
        data: outcome,
        text: `Morpho Withdraw: ${outcome.assets} asset units from ${outcome.vault} to ${outcome.receiver} burned ${outcome.shares} shares`,
      };
    });
    if (!outcome) throw new Error("Morpho withdraw Receipt requires a Withdraw event");
    return {
      kind: "receipt",
      outcome,
      text: `Morpho Withdraw: ${outcome.assets} asset units from ${outcome.vault} for ${outcome.shares} shares`,
      changes: parsed,
    };
  }

  /** The ADR 0012 gate: every vault this adapter touches — API-discovered or
   * user-supplied — must be attested by the fixed factory on-chain, and every
   * asset fact used afterwards is read from chain state, never from the API. */
  async #verifyVault(vault: AddressValue, account: AddressValue): Promise<VerifiedVault> {
    const attested = await this.factory.read.isVaultV2([vault]);
    if (!attested) {
      throw new Error(`address ${vault} is not a factory-attested Morpho Vault V2`);
    }
    const address = getAddress(vault);
    const handle = createHandle(MorphoVaultV2Abi, address, this.runtime.client, account);
    const asset = await handle.read.asset();
    const { symbol, decimals } = await this.erc20.metadata({ token: asset });
    return { address, handle, asset, assetDecimals: decimals, assetSymbol: symbol };
  }
}

async function fetchVaultCandidates(asset?: AddressValue): Promise<readonly VaultCandidate[]> {
  let response: Response;
  try {
    response = await fetch(MORPHO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: VAULTS_QUERY,
        variables: {
          first: MAX_DISCOVERED_VAULTS,
          where: {
            chainId_in: [MONAD_CHAIN_ID],
            listed: true,
            ...(asset ? { assetAddress_in: [asset] } : {}),
          },
        },
      }),
    });
  } catch (error) {
    throw new Error(`Morpho vault discovery failed: ${errorMessage(error)}`);
  }
  if (!response.ok) {
    throw new Error(`Morpho vault discovery failed with HTTP ${response.status}`);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error(`Morpho vault discovery returned invalid JSON: ${errorMessage(error)}`);
  }
  if (!isRecord(payload)) throw new Error("Morpho vault discovery returned an invalid response");
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    const [first] = payload.errors;
    const message =
      isRecord(first) && typeof first.message === "string" ? first.message : "unknown";
    throw new Error(`Morpho vault discovery returned a GraphQL error: ${message}`);
  }
  const vaultV2s = isRecord(payload.data) ? payload.data.vaultV2s : undefined;
  if (!isRecord(vaultV2s) || !Array.isArray(vaultV2s.items)) {
    throw new Error("Morpho vault discovery returned an invalid response");
  }
  const candidates = vaultV2s.items.map(parseVaultCandidate);
  const unique = new Map<string, VaultCandidate>();
  for (const candidate of candidates) {
    const key = candidate.address.toLowerCase();
    const previous = unique.get(key);
    if (previous && !sameAddress(previous.asset, candidate.asset)) {
      throw new Error(`Morpho vault discovery returned conflicting vault ${candidate.address}`);
    }
    unique.set(key, candidate);
  }
  return [...unique.values()];
}

function parseVaultCandidate(value: unknown): VaultCandidate {
  if (!isRecord(value)) throw new Error("Morpho vault discovery returned an invalid vault");
  if (!isRecord(value.asset)) {
    throw new Error("Morpho vault discovery returned a vault without an asset");
  }
  const liquidityAdapter = value.liquidityAdapter;
  if (liquidityAdapter !== null && liquidityAdapter !== undefined && !isRecord(liquidityAdapter)) {
    throw new Error("Morpho vault discovery returned an invalid liquidityAdapter");
  }
  return {
    address: parseApiAddress(value.address, "address"),
    asset: parseApiAddress(value.asset.address, "asset.address"),
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    ...(typeof value.symbol === "string" ? { symbol: value.symbol } : {}),
    ...(typeof value.netApy === "number" ? { netApy: value.netApy } : {}),
    ...(typeof value.netApyExcludingRewards === "number"
      ? { netApyExcludingRewards: value.netApyExcludingRewards }
      : {}),
    ...(typeof value.totalAssetsUsd === "number" ? { totalAssetsUsd: value.totalAssetsUsd } : {}),
    ...(isRecord(liquidityAdapter)
      ? { liquidityAdapter: parseApiAddress(liquidityAdapter.address, "liquidityAdapter.address") }
      : {}),
  };
}

function parseApiAddress(value: unknown, field: string): AddressValue {
  if (typeof value !== "string" || !isAddress(value, { strict: false })) {
    throw new Error(`Morpho vault discovery returned invalid ${field}`);
  }
  return getAddress(value);
}

function accrueInterestChange(
  change: Extract<Change, { kind: "event" }>,
  args: {
    previousTotalAssets: bigint;
    newTotalAssets: bigint;
    performanceFeeShares: bigint;
    managementFeeShares: bigint;
  },
) {
  const data = {
    event: "AccrueInterest",
    emitter: change.address,
    previousTotalAssets: args.previousTotalAssets.toString(),
    newTotalAssets: args.newTotalAssets.toString(),
    performanceFeeShares: args.performanceFeeShares.toString(),
    managementFeeShares: args.managementFeeShares.toString(),
  } as const;
  return {
    kind: "change" as const,
    change,
    data,
    text: `Morpho Vault Interest Accrual: totalAssets ${data.previousTotalAssets} to ${data.newTotalAssets} on ${data.emitter}`,
  };
}

function tryDecodeMorphoEvent(change: Extract<Change, { kind: "event" }>) {
  try {
    return decodeEventLog({
      abi: MorphoVaultV2Abi,
      topics: change.topics as [Hex, ...Hex[]],
      data: change.data,
      strict: true,
    });
  } catch {
    return undefined;
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

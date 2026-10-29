import { type AddressValue, createHandle, type MossRuntime } from "@themoss/core";
import { ERC20Abi } from "@themoss/erc";
import { BasePerspectiveAbi, EVaultAbi, GenericFactoryAbi } from "./abis/euler.js";
import {
  EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS,
  EULER_EVC_ADDRESS,
  EULER_GOVERNED_PERSPECTIVE_ADDRESS,
  EULER_VAULT_FACTORY_ADDRESS,
} from "./addresses.js";
import type { VerifiedVault } from "./types.js";

export const sameAddress = (left: string, right: string) =>
  left.toLowerCase() === right.toLowerCase();

export const vaultHandle = (runtime: MossRuntime, vault: AddressValue, account: AddressValue) =>
  createHandle(EVaultAbi, vault, runtime.client, account);

/**
 * Nothing about a caller-supplied vault is trusted until the chain says so.
 * EVK vaults are created per market, so they cannot be fixed constants; instead
 * every action re-establishes that the Euler factory created this vault, that
 * one of Euler's own on-chain perspectives has verified it, and that it points
 * back at the pinned Vault Connector. Verification failures are explicit — there
 * is no fallback path that proceeds on an unverified vault.
 */
export async function resolveVault(
  runtime: MossRuntime,
  account: AddressValue,
  vault: AddressValue,
): Promise<VerifiedVault> {
  const handle = vaultHandle(runtime, vault, account);
  const factory = createHandle(
    GenericFactoryAbi,
    EULER_VAULT_FACTORY_ADDRESS,
    runtime.client,
    account,
  );
  const perspective = (address: AddressValue) =>
    createHandle(BasePerspectiveAbi, address, runtime.client, account);

  const [isProxy, governed, escrowed] = await Promise.all([
    factory.read.isProxy([vault]),
    perspective(EULER_GOVERNED_PERSPECTIVE_ADDRESS).read.isVerified([vault]),
    perspective(EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS).read.isVerified([vault]),
  ]);
  if (!isProxy) {
    throw new Error(`Euler vault ${vault} was not created by the Euler EVault factory`);
  }
  if (!governed && !escrowed) {
    throw new Error(
      `Euler vault ${vault} is verified by neither the governed nor the escrowed-collateral perspective`,
    );
  }

  const [evc, asset, symbol, name] = await Promise.all([
    handle.read.EVC(),
    handle.read.asset(),
    handle.read.symbol(),
    handle.read.name(),
  ]);
  if (!sameAddress(evc, EULER_EVC_ADDRESS)) {
    throw new Error(`Euler vault ${vault} reports Vault Connector ${evc}, not the pinned one`);
  }

  const assetDecimals = await createHandle(
    ERC20Abi,
    asset,
    runtime.client,
    account,
  ).read.decimals();

  return {
    address: vault,
    asset,
    assetDecimals: Number(assetDecimals),
    symbol,
    name,
    perspective: governed ? "governed" : "escrowedCollateral",
  };
}

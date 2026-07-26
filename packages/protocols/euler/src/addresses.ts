import type { AddressValue } from "@themoss/core";

/**
 * Euler v2 core deployment on Monad mainnet.
 *
 * Source: euler-interfaces `addresses/143/CoreAddresses.json` and
 * `addresses/143/PeripheryAddresses.json` at commit
 * df477f9d56a0c11542c26aabb63690219eecce6d — the same pinned commit the ABIs in
 * ./abis/euler.ts are vendored from (see ../abis-src/VENDOR.json).
 * https://github.com/euler-xyz/euler-interfaces/tree/df477f9d56a0c11542c26aabb63690219eecce6d/addresses/143
 *
 * These four are the only fixed addresses this adapter owns: they are
 * protocol-exclusive singletons. Vaults are NOT constants — they are created
 * per market by the factory, so they arrive as Capability parameters and are
 * verified against these singletons on every action (see ./euler.ts
 * `#resolveVault`). The live test verifies deployed bytecode for each one.
 */
export const EULER_EVC_ADDRESS: AddressValue = "0x7a9324E8f270413fa2E458f5831226d99C7477CD";
export const EULER_VAULT_FACTORY_ADDRESS: AddressValue =
  "0xba4Dd672062dE8FeeDb665DD4410658864483f1E";
export const EULER_GOVERNED_PERSPECTIVE_ADDRESS: AddressValue =
  "0x8707B105567661E7c6B41cDd1b3EC7D784e5FA50";
export const EULER_ESCROWED_COLLATERAL_PERSPECTIVE_ADDRESS: AddressValue =
  "0xf3e1Dd13C448A7E1a6e19ba8A7f29f45C1E93AaB";

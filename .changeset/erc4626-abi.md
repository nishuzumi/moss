---
"@themoss/erc": minor
---

Add the compiled `ERC4626Abi` for EIP-4626 tokenized vaults (ADR 0007 compiled tier). `contracts/IERC4626.sol` is the source of truth: it extends `IERC20`, so the generated `src/abis/erc.ts` covers the vault surface (`asset`, `totalAssets`, `convertToShares`/`convertToAssets`, and the deposit, mint, withdraw and redeem flows with their `max`/`preview` reads) together with the ERC-20 share-token surface and the `Deposit` and `Withdraw` events. The ABI is regenerated with `pnpm gen:abis` (forge + @wagmi/cli) rather than hand-written. This is the interface-layer building block for ERC-4626 vault protocols such as Morpho MetaMorpho and Euler EVK; the vault-identity composition model is left for a follow-up.

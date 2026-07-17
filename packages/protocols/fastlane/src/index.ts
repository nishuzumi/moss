// Public API surface of @themoss/protocol-fastlane.
//
// Exports:
//   - Shmonad: the @Protocol class (registerable via Registry.use)
//   - SHMONAD_ADDRESS: the on-chain contract address
//   - ShmonadAbi: the vault ABI (for consumers that need it)
//   - Types: StakeOutcome, UnstakeOutcome, ExchangeRateResult

export { ShmonadAbi } from "./abis/shmond.js";
export { SHMONAD_ADDRESS, Shmonad } from "./shmonad.js";
export type { ExchangeRateResult, StakeOutcome, UnstakeOutcome } from "./types.js";

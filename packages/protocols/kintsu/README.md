# Kintsu Protocol Adapter

Moss adapter for staking native MON with Kintsu on Monad mainnet and receiving sMON shares.

## Supported operations

- `stake`: deposits MON through `deposit(minShares, receiver)` and protects the quote with a configurable slippage limit (default 50 bps).
- `convertToShares`: quotes sMON for a MON amount.
- `convertToAssets`: quotes the MON value of sMON shares.
- `balanceOf`: reads an account's sMON balance.

Kintsu withdrawals are asynchronous (`requestUnlock`, batch processing, then `redeem`) and are deliberately outside this first adapter scope.

## Deployment and ABI

- sMON proxy: `0xA3227C5969757783154C60bF0bC1944180ed81B9`
- Canonical address: <https://github.com/monad-crypto/protocols/blob/main/mainnet/kintsu.jsonc>
- ABI: full `143_artifact.json` vendored from `@water-cooler-studios/monad-contracts-core@2.2.0`; see `abis-src/VENDOR.json`.

Moss builds and simulates unsigned transactions only. It never signs or broadcasts them.

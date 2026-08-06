# @themoss/protocol-merkl

Moss Protocol adapter for discovering and safely self-claiming [Merkl](https://merkl.xyz/) incentives on Monad mainnet (chain ID `143`). Merkl aggregates incentive distributions from lending, staking, liquidity, and other protocols into Merkle trees; this package adds a pre-signing explanation and verification layer for those rewards.

## Surface

- Query `merkl.rewards({ account })` inspects any public account.
- Capability `merkl.claim({ tokens })` claims 1–16 unique reward tokens, preserving the requested order.

`rewards` reports each token's API cumulative earned amount, API-reported claimed amount, authoritative current on-chain claimed amount, incremental amount claimable now, pending amount, proof availability, effective on-chain recipient, and availability reason. Campaign breakdowns are included as API-derived metadata only; their names and amounts are not on-chain verified.

`claim` is strictly self-claim-only. The user is always `ActionCtx.account`. The Agent cannot provide a user, Distributor, recipient, amount, proof, or arbitrary calldata. The Capability owns exactly one direct `Distributor.claim` transaction and needs no approvals.

## Deployment and upgrade tripwire

| Contract | Address | Verification |
| --- | --- | --- |
| Distributor ERC-1967/UUPS proxy | `0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae` | Published by the [official Monad protocol registry](https://github.com/monad-developers/protocols/blob/main/mainnet/merkl.jsonc) and [Merkl contract-address documentation](https://docs.merkl.xyz/integrate-merkl/smart-contract-addresses) |
| Current implementation | `0x3f0fa7847b1b2e4515a93e05b29f115d9bb51d85` | [Explorer-verified `Distributor`](https://monadscan.com/address/0x3f0fa7847b1b2e4515a93e05b29f115d9bb51d85) |

`abis.json` pins both runtime bytecode hashes and the current EIP-1967 implementation. The normal live deployment suite verifies chain ID 143, both code hashes, the proxy slot, required function selectors and `Claimed` topic, and the current read surface. Any implementation or incompatible bytecode change fails clearly and requires a human ABI review.

## Trust and amount model

The official Merkl API endpoint is an off-chain candidate source:

```text
GET https://api.merkl.xyz/v4/users/{account}/rewards?chainId=143
GET https://api.merkl.xyz/v4/users/{account}/rewards?chainId=143&reloadChainId=143
```

The Query uses the normal endpoint. Claim construction uses Merkl's fresh-reload mechanism and rejects network errors, schema drift, wrong chains, malformed addresses/uints/proofs, duplicates, and inconsistent records. There is no stale hard-coded fallback.

Merkl API `amount` is cumulative earned value and is the amount passed to the Distributor. The incremental value payable now is:

```text
claimable = API cumulative amount - Distributor.claimed(account, token)
```

The on-chain claimed value takes precedence over the API's claimed field. `pending` is reported separately and is never added to transaction amounts. Before constructing calldata, the adapter reads the active root and claimed values, locally verifies every proof using `keccak256(abi.encode(user, token, cumulativeAmount))` with sorted proof pairs, and requires a strictly positive incremental amount.

For each token the effective recipient is resolved exactly as the deployed Distributor does: token-specific mapping, then account-wide mapping at token zero, then the account itself. Claim construction rejects any redirect away from `ActionCtx.account`, including a default redirect. A mapping explicitly set to the same account is accepted.

## Receipt evidence

The pure Receipt parser accepts only the observed execution order confirmed by a live Monad simulation: for every reward, a Distributor-emitted `Claimed(user, token, incrementalAmount)` followed by that token contract's `Transfer(Distributor, user, incrementalAmount)`. It authenticates all emitters and parties, matches exact positive amounts, rejects duplicate/missing/ambiguous/decoy evidence and every unexplained Change, and preserves original Change identity, length, and order. ERC-20 Transfer Changes are delegated unchanged to the injected `@themoss/erc` Protocol.

The typed outcome reports only execution-proven facts:

```ts
{
  operation: "claim";
  account: AddressValue;
  rewards: readonly { token: AddressValue; amount: string }[];
}
```

It deliberately does not reconstruct cumulative amounts, proofs, campaigns, or the planned token list.

## Risk metadata and exclusions

Claims are inflow-only. Moss Registry currently rejects an empty risk list and Core has no accepted inflow label, so `merkl.claim` temporarily carries `risk: ["fundOut"]`, following the existing aPriori claim precedent. This is a compatibility placeholder, not a semantic description, and should be replaced when the framework accepts `fundIn` or an equivalent label.

This v1 package does not expose claiming for another user, operator or main-operator controls, `toggleOperator`, `toggleMainOperatorStatus`, recipient configuration, `setClaimRecipient`, `claimWithRecipient`, callback data or contract callbacks, swaps, vault deposits, campaign management, disputes, tree updates, governance/admin methods, cross-chain claiming, or arbitrary Distributor addresses.

## ABI provenance and verification

The committed `src/abis/distributor.ts` contains the full 73-entry ABI fetched from the explorer-verified active implementation, following ADR 0007. It is generated by the shared deterministic renderer; the source table pins the canonical full-ABI SHA-256, and `test/abis.test.ts` re-renders and hashes it so hand edits fail. Refresh and independently compare it with:

```bash
MONADSCAN_API_KEY=... pnpm update:abis
MONADSCAN_API_KEY=... pnpm test:abi:online
```

Normal `pnpm test` includes keyless deployment verification and a real unsigned Monad self-claim simulation unless `MOSS_SKIP_E2E` is set. `MOSS_RPC_URL` overrides the repository default RPC. The live fixture can be maintained with `MERKL_LIVE_ACCOUNT` and `MERKL_LIVE_TOKEN`; loss of a positive claim fails explicitly rather than silently skipping. No signing, sending, private key, or storage mutation is used.

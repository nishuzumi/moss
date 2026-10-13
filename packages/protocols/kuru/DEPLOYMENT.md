# Kuru deployment verification

Verification date: 2026-10-12 UTC. This record binds the narrow paused-market exclusion to reviewed deployed runtime code; it does not certify every interface or behavior of the deployment.

Read-only observations at Monad mainnet chain 143 block 112692350 (0x6b78c7e), hash 0xd86360773eccd42bb227bbee657e7408c46002fb6f8eb5845f71fc4b17f4ce1f, RPC https://rpc.monad.xyz.

- Router proxy 0xd651346d7c789536ebf06dc72aE3C8502cd695CC ERC1967 implementation 0xf1635175914acf4db170395d524323225e1f1a04.
- Router orderBookImplementation() returns 0x5e3446c600524be453bbcefd46a9e4c9be8899a0.
- Failing market 0x764b4c2AF968c97b4ae95490d264c14d955129D5 ERC1967 implementation is the same 0x5e3446c600524be453bbcefd46a9e4c9be8899a0.
- Exact implementation runtime bytecode keccak256 0x6576ced90ca537c9aa058ea4a54ab5edd802ab78b834168b21fcc6d9ac392c0c.
- marketState() returns 1. Independently, storage slot 0x3d is 0x00000000000000000000009896800000000000000002540be400010000000076, and (slot >> 40) & 255 == 1.

## Guard proof from exact deployed bytecode

Runtime dispatch selector 0x7c51d6cf (market buy) -> PC 0x1235; selector 0x532c46db (market sell) -> PC 0x1655. Both ABI-decode then read (SLOAD(0x3d) >> 0x28) & 0xff. Both invoke enum range validation helper PC 0x297e, which rejects values >=3 with Panic(0x21). Both then JUMPI on nonzero state to PC 0x102f, before any trading body call. At PC 0x102f, PUSH3 0x25b2dd; PUSH1 0xe1; SHL; PUSH0; MSTORE; PUSH1 0x04; PUSH0; REVERT produces exact bytes 0x004b65ba, MarketStateError().

Getter selector 0x08fb1b77 dispatches to PC 0x26dd, reads identical storage slot/shift/mask and returns the value after the same enum validation helper.

Thus, for this exact runtime code hash, states 1 and 2 disable all validly encoded market buy/sell inputs before entering trading logic. Safe exclusion needs the reviewed delegate-proxy runtime hash, pinned-block implementation code hash, and direct pinned-block state evidence 1 or 2; decoding an error name alone is insufficient. Unknown implementation/code hash, unreadable state, unexpected state, or nested token errors must not become a silent exclusion.

## Official source and ABI provenance

https://github.com/Kuru-Labs/Kuru-contracts-dex-public/commit/2060bb2736080c175d80d568bfdb6226bb5abd04
https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/OrderBook.sol
https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/interfaces/IOrderBook.sol

Official source declares MarketState ACTIVE=0, SOFT_PAUSED=1, HARD_PAUSED=2, public marketState, marketActive requiring ACTIVE, and marketActive modifier on both market entrypoints. Runtime metadata reports solc 0.8.30, agreeing with official foundry.toml (via_ir=true, evm=prague, optimizer=true/runs=1000). This is supporting evidence, NOT an exact source verification.

Monadscan implementation page https://monadscan.com/address/0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0#code shows Verify and Publish and has empty editor_contractJsonData. Sourcify GET https://sourcify.dev/server/v2/contract/143/0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0?fields=all returns match:null. Exact compiler/source reproducibility remains unverified. Deployed bytecode guard proof above does not rely on it.

Repo abis.json old Router implementation 0x0F2A2a5c0A78c406c26Adb2F1681D3e47322A9CD and old orderbook template 0x4C0bA1BA8404076E2B09c7a5d014EC999c3a27e2 are stale. Existing vendored ABI derives from @kuru-labs/kuru-sdk@0.0.95 tarball sha256 44ba2d2c08c8cdf176555a23551e3504efb372dc7db7a487919cd9973002cd04 and omits getter marketState. The supplemental state ABI is derived from the complete verbatim `src/generated/abis.ts` from official Kuru-Labs/ts-sdk commit `8588784c4d54183a04029cb1b513910c806905a9`, retained under `abis-src/ts-sdk/` with SHA-256 metadata. Offline `gen:abis` extracts its full `orderBookAbi` export into `src/abis/kuru-state.ts`, with byte-for-byte test enforcement. This newer SDK has a different trading interface: only its `marketState()` getter is used. Existing quote and Receipt ABIs remain unchanged. The deployed selector, storage extraction and result encoding were separately checked below; matching an SDK getter ABI is not an assertion that the complete SDK ABI matches this deployment.

## Proxy trust boundary

The failing market proxy runtime at the same block has keccak256
`0xb3fcfca704395c210e969b841f35fff7483f99721de8d65b219615dd5e03f43b`.
Its executable portion is a straight-line ERC-1967 delegate proxy with no
selector-specific bypass: PC `0x1c` pushes the ERC-1967 implementation slot,
`0x3d` SLOADs it, and `0x3e` masks it to 160 address bits. PC `0x42` copies
calldata, `0x47` DELEGATECALLs that address, and `0x48`–`0x56` copies and
returns/reverts the exact returndata. The trailing bytes after `0x57` are
compiler metadata. Bind the proxy code hash as well as implementation hash:
an arbitrary contract could expose a decoy ERC-1967 slot and getter while
running different trading logic.

## Current Router evidence and remaining verification gap

Fresh checks on 2026-10-12 found the current Router implementation
`0xf1635175914acF4Db170395D524323225e1F1a04` **not source verified** on
[Monadscan](https://monadscan.com/address/0xf1635175914acF4Db170395D524323225e1F1a04#code):
the page offers “Verify and Publish” and contains empty source JSON.
[Sourcify's v2 response](https://sourcify.dev/server/v2/contract/143/0xf1635175914acF4Db170395D524323225e1F1a04?fields=all)
also returns `match:null`, `creationMatch:null`, and `runtimeMatch:null`.
Thus no independently explorer-verified full Router ABI was obtained. The
keyed explorer ABI equality gate remains a gate; a bytecode surface check
must not replace it or be described as equivalent verification.

At block 112692350 its runtime code keccak256 is
`0xee2c47d70994c70feea9e7ae98ce9810e0f1893f377b7d949f2b6ec6f0cc53dc`.
The required adapter surface appears in the deployed bytecode:

- `verifiedMarket(address)`: selector `0x5f71a07c` at PC `0x84`, dispatches
  to `0x1834`; the pinned live read described above also succeeds.
- `orderBookImplementation()`: selector `0xa0416499` at PC `0xc6`, dispatches
  to `0x1539`; the pinned live read returns the documented template.
- `anyToAnySwap(address[],bool[],bool[],address,address,uint256,uint256)`:
  selector `0xffa5210a` at PC `0x13e`, with selector comparison followed by
  calldata decoding at `0x148`.
- `KuruRouterSwap(address,address,address,uint256,uint256)`:
  topic `0xae71e8ae9695e4f3523d27453a24d99edc4738fea8130c1cb33eb9ef95f53354`
  occurs as PUSH32 at PC `0x21c`.

Presence of these selectors and event topic establishes only this narrow
surface. It does not establish complete ABI equivalence, event indexed-field
layout, output layout for untested functions, or every execution behavior.
The Router ABI therefore retains degraded, vendored-only provenance for this
new deployment pending actual independent source/ABI verification.

## Same-block failing quote reproduction

Router verifiedMarket() reports native MON as base (18 decimals), USDC
0x754704Bc059F8C67012fEd69BC8A327a5aafb603 as quote (6 decimals), pricePrecision
10000000 and sizePrecision 10000000000. A 1 MON sell therefore encodes size
10000000000. At the pinned block above, a read-only eth_call using that size,
minimum output zero, isMargin=false, isFillOrKill=false, value 1 MON, and a
simulated funded sender returns JSON-RPC error code 3 with exact revert bytes
0x004b65ba. This is a quote simulation, not an on-chain transaction.

## Keyless reproduction

Requires curl. All requests below are read-only and pinned to the
same block. The balance override changes only the simulated call state.

```sh
RPC=https://rpc.monad.xyz
BLOCK=0x6b78c7e
ROUTER=0xd651346d7c789536ebf06dc72aE3C8502cd695CC
MARKET=0x764b4c2AF968c97b4ae95490d264c14d955129D5
IMPL=0x5e3446c600524Be453bbCEFD46a9E4C9bE8899a0
SLOT=0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc
rpc() { curl --fail --silent --show-error "$RPC" -H 'Content-Type: application/json' --data "$1"; echo; }
rpc '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
for ADDRESS in "$ROUTER" "$MARKET"; do
  rpc "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getStorageAt\",\"params\":[\"$ADDRESS\",\"$SLOT\",\"$BLOCK\"]}"
done
rpc "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$ROUTER\",\"data\":\"0xa0416499\"},\"$BLOCK\"]}"
rpc "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"$IMPL\",\"$BLOCK\"]}"
rpc "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getStorageAt\",\"params\":[\"$MARKET\",\"0x3d\",\"$BLOCK\"]}"
rpc "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",\"params\":[{\"to\":\"$MARKET\",\"data\":\"0x08fb1b77\"},\"$BLOCK\"]}"
```

To reproduce the 1 MON sell, submit the following complete JSON body to the
same RPC with curl's `--data` argument:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "eth_call",
  "params": [
    {
      "to": "0x764b4c2AF968c97b4ae95490d264c14d955129D5",
      "from": "0x0000000000000000000000000000000000000001",
      "data": "0x532c46db00000000000000000000000000000000000000000000000000000002540be400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
      "value": "0xde0b6b3a7640000"
    },
    "0x6b78c7e",
    {
      "0x0000000000000000000000000000000000000001": {
        "balance": "0xde0b6b3a7640000"
      }
    }
  ]
}
```

Historical reads require the provider to retain the specified block. If a read
is unavailable, report missing verification; do not substitute latest-state
evidence for a pinned-block quote.

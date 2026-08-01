// ABI origin: vendored (ADR 0007)
//   Source:    https://apriori-docs.gitbook.io/apriori-docs/aprmon/smart-contract-integration
//              (aPriori's official aprMON integration reference; signatures
//              vendored verbatim)
//   Retrieved: 2026-07-26 (UTC)
//   Why not explorer: the aprMON EIP-1967 implementation
//   0x7D2F8dc5a67CA1911bb1A2429552CDf507d106F2 is UNVERIFIED on MonadScan
//   (and has no Sourcify match), so no explorer-verified artifact exists to
//   fetch or compare. The proxy itself IS verified on MonadScan
//   (TransparentUpgradeableProxy, labeled "aPriori: aprMON Token"):
//   https://monadscan.com/address/0x0c65A0BC65a5D819235B71F554D210D3F80E0852
//   If aPriori verifies the implementation, switch this package to the
//   explorer derivation with a keyed compareDeployedAbi cross-check
//   (see @themoss/protocol-kuru's abi-explorer suite).
//
// Derivation is test-enforced, not asserted (reproducible selector/topic
// record). `test-online/abi-explorer.test.ts` recomputes every selector and
// topic hash below from this artifact with viem and requires each one to
// appear in the deployed implementation bytecode, requires the proxy's
// EIP-1967 slot to resolve to the implementation recorded in abis.json, and
// checks name/symbol/decimals on chain. Live evidence for the event shapes:
// Deposit tx 0x0e949bd6cc0ccaf608c8b679459b4ef19e18a5a82f359c56e873986576f27327,
// RedeemRequest tx 0x68316b21056b865c5d54fd17808716693da59d83392bb6420c03d9f1615b810d,
// Redeem tx 0x7413c8200dbec7806270958c68619f6f1458f70411cff80c84d6fd4eb9ced13f.
//
//   deposit(uint256,address)                 0x6e553f65  payable, assets == msg.value
//   requestRedeem(uint256,address,address)   0x7d41c86e  (shares, controller, owner)
//   redeem(uint256[],address)                0x492e47d2  no return value, batch by requestID
//   convertToShares(uint256)                 0xc6e6f592  view
//   convertToAssets(uint256)                 0x07a2d13a  view
//   name()                                   0x06fdde03  "aPriori Monad LST"
//   symbol()                                 0x95d89b41  "aprMON"
//   decimals()                               0x313ce567  18
//   Deposit(address,address,uint256,uint256)
//     0xdcbc1c05240f31ff3ad067ef1ee35ce4997762752e3a095284754544f4c709d7
//   RedeemRequest(address,address,uint256,address,uint256,uint256)
//     0x110990b6c317a85848c161e269666a01fea23eb9e16150c2c46cae8c0faf4a9d
//   Redeem(address,address,uint256,uint256,uint256,uint256)
//     0x8caf04742286d017f9ac3924388e188c73e6e5094311c5e59a61a7ef86dda8bf
//
// The docs also describe view helpers (viewRedeemRequest, getUserRequestData)
// whose full parameter/return layouts are not machine-verifiable without a
// verified source artifact; they are deliberately not vendored. Every entry
// below is selector/topic-verified against the deployed bytecode.
import { parseAbi } from "viem";

export const AprMonAbi = parseAbi([
  "function deposit(uint256 assets, address receiver) payable returns (uint256 shares)",
  "function requestRedeem(uint256 shares, address controller, address owner) returns (uint256 requestId)",
  "function redeem(uint256[] requestIDs, address receiver)",
  "function convertToShares(uint256 assets) view returns (uint256)",
  "function convertToAssets(uint256 shares) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)",
  "event RedeemRequest(address indexed controller, address indexed owner, uint256 indexed requestId, address sender, uint256 shares, uint256 assets)",
  "event Redeem(address indexed controller, address indexed receiver, uint256 indexed requestId, uint256 shares, uint256 assets, uint256 fee)",
]);

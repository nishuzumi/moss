// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   @kuru-labs/kuru-sdk@0.0.95 (npm), abi/*.json — verbatim copies in ../../abis-src/
//   tarball:  sha256 44ba2d2c08c8cdf176555a23551e3504efb372dc7db7a487919cd9973002cd04
//   vendored: 2026-07-07 (release-age guard: 7d)
//   verification: functions exercised live on Monad mainnet via rpc.monad.xyz;
//   the adapter's e2e tests pin observable behavior. The Router ABI is also
//   cross-checked against the explorer-verified implementation by
//   `pnpm test:abi:online` (abis.json records the expected addresses).
//   caveat:   Kuru contracts are upgradeable proxies (ERC-1967). The OrderBook
//   ABI is vendored-only: this SDK version matches neither of the two deployed
//   implementations checked on 2026-07-20 — see test-online/abi-explorer.test.ts
//   for the required-surface verification record and the upgrade tripwire.

export const KuruRouterAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BaseAndQuoteAssetSame",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Create2EmptyBytecode",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FailedDeployment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ImplementationNotChanged",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMarket",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPricePrecision",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSizePrecision",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTickSize",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketTypeMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NewOwnerIsZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoHandoverRequest",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoMarketsPassed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlippageExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Uint96Overflow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedCallContext",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UpgradeFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddressNotAllowed",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "msgSender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "debitToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "creditToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "name": "KuruRouterSwap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "baseAsset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "quoteAsset",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "vaultAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "pricePrecision",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "sizePrecision",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "tickSize",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "minSize",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "maxSize",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "takerFeeBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "makerFeeBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "kuruAmmSpread",
        "type": "uint96"
      }
    ],
    "name": "MarketRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "previousImplementation",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      }
    ],
    "name": "OBImplementationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipHandoverCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipHandoverRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "implementation",
        "type": "address"
      }
    ],
    "name": "Upgraded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "previousImplementation",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      }
    ],
    "name": "VaultImplementationUpdated",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "TRUSTED_FORWARDER",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "_marketAddresses",
        "type": "address[]"
      },
      {
        "internalType": "bool[]",
        "name": "_isBuy",
        "type": "bool[]"
      },
      {
        "internalType": "bool[]",
        "name": "_nativeSend",
        "type": "bool[]"
      },
      {
        "internalType": "address",
        "name": "_debitToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_creditToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "anyToAnySwap",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "_amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelOwnershipHandover",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "completeOwnershipHandover",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_baseAssetAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_quoteAssetAddress",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "_sizePrecision",
        "type": "uint96"
      },
      {
        "internalType": "uint32",
        "name": "_pricePrecision",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_tickSize",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "_minSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "_maxSize",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "_takerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_makerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint96",
        "name": "_kuruAmmSpread",
        "type": "uint96"
      },
      {
        "internalType": "address",
        "name": "oldImplementation",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "old",
        "type": "bool"
      }
    ],
    "name": "computeAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "proxy",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_marketAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "oldImplementation",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "old",
        "type": "bool"
      }
    ],
    "name": "computeVaultAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "enum IOrderBook.OrderBookType",
        "name": "_type",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "_baseAssetAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_quoteAssetAddress",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "_sizePrecision",
        "type": "uint96"
      },
      {
        "internalType": "uint32",
        "name": "_pricePrecision",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_tickSize",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "_minSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "_maxSize",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "_takerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_makerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint96",
        "name": "_kuruAmmSpread",
        "type": "uint96"
      }
    ],
    "name": "deployProxy",
    "outputs": [
      {
        "internalType": "address",
        "name": "proxy",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_marginAccount",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_orderbookImplementation",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_kuruAmmVaultImplementation",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_trustedForwarder",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "kuruAmmVaultImplementation",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "marginAccountAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "orderBookImplementation",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "result",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "ownershipHandoverExpiresAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "result",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "proxiableUUID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestOwnershipHandover",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      },
      {
        "internalType": "enum IOrderBook.MarketState",
        "name": "state",
        "type": "uint8"
      }
    ],
    "name": "toggleMarkets",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "contracts",
        "type": "address[]"
      },
      {
        "internalType": "address",
        "name": "_newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnershipForContracts",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "proxies",
        "type": "address[]"
      },
      {
        "internalType": "bytes[]",
        "name": "data",
        "type": "bytes[]"
      }
    ],
    "name": "upgradeMultipleOrderBookProxies",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "proxies",
        "type": "address[]"
      },
      {
        "internalType": "bytes[]",
        "name": "data",
        "type": "bytes[]"
      }
    ],
    "name": "upgradeMultipleVaultProxies",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      }
    ],
    "name": "upgradeOrderBookImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "upgradeToAndCall",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      }
    ],
    "name": "upgradeVaultImplementation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "verifiedMarket",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "pricePrecision",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "sizePrecision",
        "type": "uint96"
      },
      {
        "internalType": "address",
        "name": "baseAssetAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "baseAssetDecimals",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "quoteAssetAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "quoteAssetDecimals",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "tickSize",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "minSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "maxSize",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "takerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "makerFeeBps",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

export const KuruOrderbookAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientLiquidity",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSpread",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketFeeError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MarketStateError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NativeAssetInsufficient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NativeAssetNotRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NativeAssetTransferFail",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NewOwnerIsZeroAddress",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoHandoverRequest",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyOwnerAllowedError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyVaultAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OrderAlreadyFilledOrCancelled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PostOnlyError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PriceError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProvisionError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SizeError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SlippageExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TickSizeError",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TooMuchSizeFilled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedCallContext",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UpgradeFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongOrderTypeCancel",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "orderId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "flippedId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "price",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "flippedPrice",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      }
    ],
    "name": "FlipOrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "orderId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      }
    ],
    "name": "FlipOrderUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40[]",
        "name": "orderIds",
        "type": "uint40[]"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "FlipOrdersCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "orderId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "flippedId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "price",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "flippedPrice",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      }
    ],
    "name": "FlippedOrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "version",
        "type": "uint64"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "orderId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "price",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      }
    ],
    "name": "OrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40[]",
        "name": "orderId",
        "type": "uint40[]"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OrdersCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipHandoverCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipHandoverRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint40",
        "name": "orderId",
        "type": "uint40"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "makerAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "price",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "updatedSize",
        "type": "uint96"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "takerAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "txOrigin",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "filledSize",
        "type": "uint96"
      }
    ],
    "name": "Trade",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "implementation",
        "type": "address"
      }
    ],
    "name": "Upgraded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_price",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "_postOnly",
        "type": "bool"
      }
    ],
    "name": "addBuyOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_price",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_flippedPrice",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "_size",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "_provisionOrRevert",
        "type": "bool"
      }
    ],
    "name": "addFlipBuyOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_price",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_flippedPrice",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "_size",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "_provisionOrRevert",
        "type": "bool"
      }
    ],
    "name": "addFlipSellOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_bidPrice",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_askPrice",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "_bidSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "_askSize",
        "type": "uint96"
      }
    ],
    "name": "addPairedLiquidity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "_price",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      },
      {
        "internalType": "bool",
        "name": "_postOnly",
        "type": "bool"
      }
    ],
    "name": "addSellOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32[]",
        "name": "bidPrices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint32[]",
        "name": "askPrices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint96[]",
        "name": "bidSizes",
        "type": "uint96[]"
      },
      {
        "internalType": "uint96[]",
        "name": "askSizes",
        "type": "uint96[]"
      }
    ],
    "name": "batchAddPairedLiquidity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint40[]",
        "name": "_orderIds",
        "type": "uint40[]"
      }
    ],
    "name": "batchCancelFlipOrders",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint40[]",
        "name": "_orderIds",
        "type": "uint40[]"
      }
    ],
    "name": "batchCancelOrders",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32[]",
        "name": "prices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint32[]",
        "name": "flipPrices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint96[]",
        "name": "sizes",
        "type": "uint96[]"
      },
      {
        "internalType": "bool[]",
        "name": "isBuy",
        "type": "bool[]"
      },
      {
        "internalType": "bool",
        "name": "_provisionOrRevert",
        "type": "bool"
      }
    ],
    "name": "batchProvisionLiquidity",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32[]",
        "name": "buyPrices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint96[]",
        "name": "buySizes",
        "type": "uint96[]"
      },
      {
        "internalType": "uint32[]",
        "name": "sellPrices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint96[]",
        "name": "sellSizes",
        "type": "uint96[]"
      },
      {
        "internalType": "uint40[]",
        "name": "orderIdsToCancel",
        "type": "uint40[]"
      },
      {
        "internalType": "bool",
        "name": "postOnly",
        "type": "bool"
      }
    ],
    "name": "batchUpdate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bestBidAsk",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelOwnershipHandover",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "collectFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "completeOwnershipHandover",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getL2Book",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMarketParams",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultParams",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "enum IOrderBook.OrderBookType",
        "name": "_type",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "_baseAssetAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_baseAssetDecimals",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_quoteAssetAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_quoteAssetDecimals",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_marginAccountAddress",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "_sizePrecision",
        "type": "uint96"
      },
      {
        "internalType": "uint32",
        "name": "_pricePrecision",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "_tickSize",
        "type": "uint32"
      },
      {
        "internalType": "uint96",
        "name": "_minSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "_maxSize",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "_takerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_makerFeeBps",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_kuruAmmVault",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "_kuruAmmSpread",
        "type": "uint96"
      },
      {
        "internalType": "address",
        "name": "__trustedForwarder",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "forwarder",
        "type": "address"
      }
    ],
    "name": "isTrustedForwarder",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "result",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      }
    ],
    "name": "ownershipHandoverExpiresAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "result",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint96",
        "name": "_quoteSize",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "_minAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_isMargin",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "_isFillOrKill",
        "type": "bool"
      }
    ],
    "name": "placeAndExecuteMarketBuy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint96",
        "name": "_size",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "_minAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "_isMargin",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "_isFillOrKill",
        "type": "bool"
      }
    ],
    "name": "placeAndExecuteMarketSell",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32[]",
        "name": "_prices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint96[]",
        "name": "_sizes",
        "type": "uint96[]"
      },
      {
        "internalType": "bool",
        "name": "_postOnly",
        "type": "bool"
      }
    ],
    "name": "placeMultipleBuyOrders",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32[]",
        "name": "_prices",
        "type": "uint32[]"
      },
      {
        "internalType": "uint96[]",
        "name": "_sizes",
        "type": "uint96[]"
      },
      {
        "internalType": "bool",
        "name": "_postOnly",
        "type": "bool"
      }
    ],
    "name": "placeMultipleSellOrders",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "proxiableUUID",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestOwnershipHandover",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "s_buyPricePoints",
    "outputs": [
      {
        "internalType": "uint40",
        "name": "head",
        "type": "uint40"
      },
      {
        "internalType": "uint40",
        "name": "tail",
        "type": "uint40"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_buyTree",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "level0",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_orderIdCounter",
    "outputs": [
      {
        "internalType": "uint40",
        "name": "",
        "type": "uint40"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint40",
        "name": "",
        "type": "uint40"
      }
    ],
    "name": "s_orders",
    "outputs": [
      {
        "internalType": "address",
        "name": "ownerAddress",
        "type": "address"
      },
      {
        "internalType": "uint96",
        "name": "size",
        "type": "uint96"
      },
      {
        "internalType": "uint40",
        "name": "prev",
        "type": "uint40"
      },
      {
        "internalType": "uint40",
        "name": "next",
        "type": "uint40"
      },
      {
        "internalType": "uint40",
        "name": "flippedId",
        "type": "uint40"
      },
      {
        "internalType": "uint32",
        "name": "price",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "flippedPrice",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "isBuy",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "s_sellPricePoints",
    "outputs": [
      {
        "internalType": "uint40",
        "name": "head",
        "type": "uint40"
      },
      {
        "internalType": "uint40",
        "name": "tail",
        "type": "uint40"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_sellTree",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "level0",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "_state",
        "type": "bool"
      }
    ],
    "name": "toggleMarkets",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint96",
        "name": "_vaultAskOrderSize",
        "type": "uint96"
      },
      {
        "internalType": "uint96",
        "name": "_vaultBidOrderSize",
        "type": "uint96"
      },
      {
        "internalType": "uint256",
        "name": "_askPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_bidPrice",
        "type": "uint256"
      }
    ],
    "name": "updateVaultOrdSz",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "upgradeToAndCall",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vaultAskOrderSize",
    "outputs": [
      {
        "internalType": "uint96",
        "name": "",
        "type": "uint96"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vaultBestAsk",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

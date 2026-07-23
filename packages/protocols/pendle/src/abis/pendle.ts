// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source: @pendle/core-v2@6.7.1 (npm, dist-tags.latest)
//   tarball: sha256 6b484c5b9ab8f5a2f9b51616fa7b4ddeff3bcb8fce68c95b9a0158e4445ad9ae
//   vendored: 2026-07-19 (release-age guard: 7d)
//   deployment: https://github.com/pendle-finance/pendle-core-v2-public/blob/6cd4773218e57dbda8925d10dfb672a0f594a9db/deployments/143-core.json
//   verification: the immutable manifest identifies chain 143,
//   marketFactoryV6, Router V4, and RouterStatic; live tests verify fixed-address bytecode.
//   Dynamic Market and SY addresses are intentionally not fixed in this package.
//   artifact: build/artifacts/contracts/interfaces/IPMarketFactory.sol/IPMarketFactory.json
//   role: marketFactoryV6 validation interface
export const PendleMarketFactoryAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "PT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "scalarRoot",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "initialAnchor",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lnFeeRateRoot",
        "type": "uint256"
      }
    ],
    "name": "CreateNewMarket",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "reserveFeePercent",
        "type": "uint8"
      }
    ],
    "name": "NewTreasuryAndFeeReserve",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "router",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint80",
        "name": "lnFeeRateRoot",
        "type": "uint80"
      }
    ],
    "name": "SetOverriddenFee",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "VERSION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "PT",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "scalarRoot",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "initialAnchor",
        "type": "int256"
      },
      {
        "internalType": "uint80",
        "name": "lnFeeRateRoot",
        "type": "uint80"
      }
    ],
    "name": "createNewMarket",
    "outputs": [
      {
        "internalType": "address",
        "name": "market",
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
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "router",
        "type": "address"
      }
    ],
    "name": "getMarketConfig",
    "outputs": [
      {
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      },
      {
        "internalType": "uint80",
        "name": "overriddenFee",
        "type": "uint80"
      },
      {
        "internalType": "uint8",
        "name": "reserveFeePercent",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "isValidMarket",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "router",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint80",
        "name": "newFee",
        "type": "uint80"
      }
    ],
    "name": "setOverriddenFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

//   artifact: build/artifacts/contracts/interfaces/IPMarket.sol/IPMarket.json
//   role: dynamically discovered Market reads and events
export const PendleMarketAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiverSy",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiverPt",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpBurned",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      }
    ],
    "name": "Burn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "observationCardinalityNextOld",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "observationCardinalityNextNew",
        "type": "uint16"
      }
    ],
    "name": "IncreaseObservationCardinalityNext",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpMinted",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      }
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "rewardsOut",
        "type": "uint256[]"
      }
    ],
    "name": "RedeemRewards",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netPtOut",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netSyOut",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyToReserve",
        "type": "uint256"
      }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "lnLastImpliedRate",
        "type": "uint256"
      }
    ],
    "name": "UpdateImpliedRate",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "VERSION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "_storage",
    "outputs": [
      {
        "internalType": "int128",
        "name": "totalPt",
        "type": "int128"
      },
      {
        "internalType": "int128",
        "name": "totalSy",
        "type": "int128"
      },
      {
        "internalType": "uint96",
        "name": "lastLnImpliedRate",
        "type": "uint96"
      },
      {
        "internalType": "uint16",
        "name": "observationIndex",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "observationCardinality",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "observationCardinalityNext",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "activeBalance",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "receiverSy",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "receiverPt",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToBurn",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "expiry",
    "outputs": [
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
    "name": "factory",
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
    "name": "getNonOverrideLnFeeRateRoot",
    "outputs": [
      {
        "internalType": "uint80",
        "name": "",
        "type": "uint80"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRewardTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "cardinalityNext",
        "type": "uint16"
      }
    ],
    "name": "increaseObservationsCardinalityNext",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isExpired",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtDesired",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "observations",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "blockTimestamp",
        "type": "uint32"
      },
      {
        "internalType": "uint216",
        "name": "lnImpliedRateCumulative",
        "type": "uint216"
      },
      {
        "internalType": "bool",
        "name": "initialized",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint32[]",
        "name": "secondsAgos",
        "type": "uint32[]"
      }
    ],
    "name": "observe",
    "outputs": [
      {
        "internalType": "uint216[]",
        "name": "lnImpliedRateCumulative",
        "type": "uint216[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "router",
        "type": "address"
      }
    ],
    "name": "readState",
    "outputs": [
      {
        "components": [
          {
            "internalType": "int256",
            "name": "totalPt",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalSy",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalLp",
            "type": "int256"
          },
          {
            "internalType": "address",
            "name": "treasury",
            "type": "address"
          },
          {
            "internalType": "int256",
            "name": "scalarRoot",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "expiry",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lnFeeRateRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveFeePercent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastLnImpliedRate",
            "type": "uint256"
          }
        ],
        "internalType": "struct MarketState",
        "name": "market",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "readTokens",
    "outputs": [
      {
        "internalType": "contract IStandardizedYield",
        "name": "_SY",
        "type": "address"
      },
      {
        "internalType": "contract IPPrincipalToken",
        "name": "_PT",
        "type": "address"
      },
      {
        "internalType": "contract IPYieldToken",
        "name": "_YT",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "redeemRewards",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reentrancyGuardEntered",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtIn",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "swapExactPtForSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "swapSyForExactPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalActiveSupply",
    "outputs": [
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
    "name": "totalSupply",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

//   artifact: build/artifacts/contracts/interfaces/IStandardizedYield.sol/IStandardizedYield.json
//   role: dynamically discovered SY token support and events
export const PendleStandardizedYieldAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "rewardTokens",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "rewardAmounts",
        "type": "uint256[]"
      }
    ],
    "name": "ClaimRewards",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountDeposited",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountSyOut",
        "type": "uint256"
      }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountSyToRedeem",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountTokenOut",
        "type": "uint256"
      }
    ],
    "name": "Redeem",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "accruedRewards",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "rewardAmounts",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "assetInfo",
    "outputs": [
      {
        "internalType": "enum IStandardizedYield.AssetType",
        "name": "assetType",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "assetAddress",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "assetDecimals",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "claimRewards",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "rewardAmounts",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountTokenToDeposit",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSharesOut",
        "type": "uint256"
      }
    ],
    "name": "deposit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountSharesOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "exchangeRate",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "res",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRewardTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokensIn",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "res",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokensOut",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "res",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "isValidTokenIn",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "isValidTokenOut",
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
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountTokenToDeposit",
        "type": "uint256"
      }
    ],
    "name": "previewDeposit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountSharesOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountSharesToRedeem",
        "type": "uint256"
      }
    ],
    "name": "previewRedeem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountSharesToRedeem",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "burnFromInternalBalance",
        "type": "bool"
      }
    ],
    "name": "redeem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardIndexesCurrent",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "indexes",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardIndexesStored",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "indexes",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yieldToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

//   artifact: build/artifacts/contracts/interfaces/IPAllActionV3.sol/IPAllActionV3.json
//   role: PendleRouterV4 selector-proxy composite interface
export const PendleRouterAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquidityDualSyAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "AddLiquidityDualTokenAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySinglePt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyMintPy",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleSyKeepYt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyMintPy",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleTokenKeepYt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPostExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPostExpToSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalTokenOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPostExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPostExpToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPyRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netYtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPreExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPreExpToSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalTokenOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPyRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netYtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPreExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPreExpToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      }
    ],
    "name": "MintPyFromSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "MintPyFromToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "MintSyFromToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
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
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "RedeemPyToSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "RedeemPyToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      }
    ],
    "name": "RedeemSyToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquidityDualSyAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquidityDualTokenAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquiditySinglePt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquiditySingleSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquiditySingleToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "facet",
        "type": "address"
      }
    ],
    "name": "SelectorToFacetSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netPtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netSyToAccount",
        "type": "int256"
      }
    ],
    "name": "SwapPtAndSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netPtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netTokenToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "SwapPtAndToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netYtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netSyToAccount",
        "type": "int256"
      }
    ],
    "name": "SwapYtAndSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netYtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netTokenToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "SwapYtAndToken",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      }
    ],
    "name": "addLiquidityDualSyAndPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "netPtDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      }
    ],
    "name": "addLiquidityDualTokenAndPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessPtSwapToSy",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "addLiquiditySinglePt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySinglePtSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessPtReceivedFromSy",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "addLiquiditySingleSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minYtOut",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySingleSyKeepYt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMintPy",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySingleSySimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessPtReceivedFromSy",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "addLiquiditySingleToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minYtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "addLiquiditySingleTokenKeepYt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMintPy",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minLpOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "addLiquiditySingleTokenSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      }
    ],
    "name": "boostMarkets",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "reflector",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "selfCall1",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "selfCall2",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "reflectCall",
        "type": "bytes"
      }
    ],
    "name": "callAndReflect",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "selfRes1",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "selfRes2",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "reflectRes",
        "type": "bytes"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      }
    ],
    "name": "exitPostExpToSy",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "internalType": "struct ExitPostExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      }
    ],
    "name": "exitPostExpToToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "internalType": "struct ExitPostExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "exitPreExpToSy",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPyRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netYtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "internalType": "struct ExitPreExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "exitPreExpToToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPyRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netYtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "internalType": "struct ExitPreExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "actualMaking",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualTaking",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalFee",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "limitRouterCallback",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minPyOut",
        "type": "uint256"
      }
    ],
    "name": "mintPyFromSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minPyOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "mintPyFromToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "mintSyFromToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "allowFailure",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "callData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IPActionMiscV3.Call3[]",
        "name": "calls",
        "type": "tuple[]"
      }
    ],
    "name": "multicall",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "success",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "returnData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IPActionMiscV3.Result[]",
        "name": "res",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
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
    "name": "pendingOwner",
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
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "address[]",
        "name": "sys",
        "type": "address[]"
      },
      {
        "internalType": "address[]",
        "name": "yts",
        "type": "address[]"
      },
      {
        "internalType": "address[]",
        "name": "markets",
        "type": "address[]"
      }
    ],
    "name": "redeemDueInterestAndRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IStandardizedYield[]",
        "name": "SYs",
        "type": "address[]"
      },
      {
        "components": [
          {
            "internalType": "contract IPYieldToken",
            "name": "yt",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "doRedeemInterest",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "doRedeemRewards",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenRedeemOut",
            "type": "uint256"
          }
        ],
        "internalType": "struct RedeemYtIncomeToTokenStruct[]",
        "name": "YTs",
        "type": "tuple[]"
      },
      {
        "internalType": "contract IPMarket[]",
        "name": "markets",
        "type": "address[]"
      },
      {
        "internalType": "contract IPSwapAggregator",
        "name": "pendleSwap",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minOut",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct SwapDataExtra[]",
        "name": "swaps",
        "type": "tuple[]"
      }
    ],
    "name": "redeemDueInterestAndRewardsV2",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "netOutFromSwaps",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "netInterests",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      }
    ],
    "name": "redeemPyToSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPyIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      }
    ],
    "name": "redeemPyToToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      }
    ],
    "name": "redeemSyToToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      }
    ],
    "name": "removeLiquidityDualSyAndPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      }
    ],
    "name": "removeLiquidityDualTokenAndPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessPtReceivedFromSy",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "removeLiquiditySinglePt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      }
    ],
    "name": "removeLiquiditySinglePtSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "removeLiquiditySingleSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "removeLiquiditySingleToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "selectorToFacet",
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
        "components": [
          {
            "internalType": "address",
            "name": "facet",
            "type": "address"
          },
          {
            "internalType": "bytes4[]",
            "name": "selectors",
            "type": "bytes4[]"
          }
        ],
        "internalType": "struct IPActionStorageV4.SelectorsToFacet[]",
        "name": "arr",
        "type": "tuple[]"
      }
    ],
    "name": "setSelectorToFacets",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "simulate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "ptToAccount",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "syToAccount",
        "type": "int256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "swapCallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactPtForSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactPtForToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessPtOut",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactSyForPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      }
    ],
    "name": "swapExactSyForPtSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minYtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessYtOut",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactSyForYt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minYtOut",
        "type": "uint256"
      }
    ],
    "name": "swapExactSyForYtSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessPtOut",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactTokenForPt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minPtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "swapExactTokenForPtSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minYtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "guessYtOut",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactTokenForYt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minYtOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "swapExactTokenForYtSimple",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactYtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minSyOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactYtForSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactYtIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minTokenOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenRedeemSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenOutput",
        "name": "output",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "limitRouter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "epsSkipMarket",
            "type": "uint256"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "normalFills",
            "type": "tuple[]"
          },
          {
            "components": [
              {
                "components": [
                  {
                    "internalType": "uint256",
                    "name": "salt",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "expiry",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "nonce",
                    "type": "uint256"
                  },
                  {
                    "internalType": "enum IPLimitOrderType.OrderType",
                    "name": "orderType",
                    "type": "uint8"
                  },
                  {
                    "internalType": "address",
                    "name": "token",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "YT",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "maker",
                    "type": "address"
                  },
                  {
                    "internalType": "address",
                    "name": "receiver",
                    "type": "address"
                  },
                  {
                    "internalType": "uint256",
                    "name": "makingAmount",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "lnImpliedRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "uint256",
                    "name": "failSafeRate",
                    "type": "uint256"
                  },
                  {
                    "internalType": "bytes",
                    "name": "permit",
                    "type": "bytes"
                  }
                ],
                "internalType": "struct Order",
                "name": "order",
                "type": "tuple"
              },
              {
                "internalType": "bytes",
                "name": "signature",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "makingAmount",
                "type": "uint256"
              }
            ],
            "internalType": "struct FillOrderParams[]",
            "name": "flashFills",
            "type": "tuple[]"
          },
          {
            "internalType": "bytes",
            "name": "optData",
            "type": "bytes"
          }
        ],
        "internalType": "struct LimitOrderData",
        "name": "limit",
        "type": "tuple"
      }
    ],
    "name": "swapExactYtForToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "netTokenIn",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenMintSy",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pendleSwap",
            "type": "address"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct TokenInput",
        "name": "input",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "tokenRedeemSy",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minTokenOut",
        "type": "uint256"
      }
    ],
    "name": "swapTokenToTokenViaSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IPSwapAggregator",
        "name": "pendleSwap",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minOut",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "enum SwapType",
                "name": "swapType",
                "type": "uint8"
              },
              {
                "internalType": "address",
                "name": "extRouter",
                "type": "address"
              },
              {
                "internalType": "bytes",
                "name": "extCalldata",
                "type": "bytes"
              },
              {
                "internalType": "bool",
                "name": "needScale",
                "type": "bool"
              }
            ],
            "internalType": "struct SwapData",
            "name": "swapData",
            "type": "tuple"
          }
        ],
        "internalType": "struct SwapDataExtra[]",
        "name": "swaps",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256[]",
        "name": "netSwaps",
        "type": "uint256[]"
      }
    ],
    "name": "swapTokensToTokens",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "netOutFromSwaps",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "direct",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "renounce",
        "type": "bool"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

//   artifact: build/artifacts/contracts/interfaces/IPRouterStatic.sol/IPRouterStatic.json
//   role: PendleRouterStatic selector-proxy quote interface
export const PendleRouterStaticAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquidityDualSyAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "AddLiquidityDualTokenAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySinglePt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyMintPy",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleSyKeepYt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyMintPy",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "AddLiquiditySingleTokenKeepYt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPostExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPostExpToSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalTokenOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPostExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPostExpToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPyRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netYtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPreExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPreExpToSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalTokenOut",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "netPtFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRemove",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPyRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromRedeem",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netPtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netYtSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFromSwap",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "netSyFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalSyOut",
            "type": "uint256"
          }
        ],
        "indexed": false,
        "internalType": "struct ExitPreExpReturnParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "ExitPreExpToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      }
    ],
    "name": "MintPyFromSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "MintPyFromToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "MintSyFromToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
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
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "RedeemPyToSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "RedeemPyToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      }
    ],
    "name": "RedeemSyToToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquidityDualSyAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquidityDualTokenAndPt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquiditySinglePt",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquiditySingleSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "RemoveLiquiditySingleToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "facet",
        "type": "address"
      }
    ],
    "name": "SelectorToFacetSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netPtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netSyToAccount",
        "type": "int256"
      }
    ],
    "name": "SwapPtAndSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netPtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netTokenToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "SwapPtAndToken",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netYtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netSyToAccount",
        "type": "int256"
      }
    ],
    "name": "SwapYtAndSy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netYtToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "netTokenToAccount",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netSyInterm",
        "type": "uint256"
      }
    ],
    "name": "SwapYtAndToken",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtDesired",
        "type": "uint256"
      }
    ],
    "name": "addLiquidityDualSyAndPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netTokenDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtDesired",
        "type": "uint256"
      }
    ],
    "name": "addLiquidityDualTokenAndPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netTokenUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyUsed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyDesired",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySinglePtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtToSwap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFromSwap",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySingleSyKeepYtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyToPY",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySingleSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtFromSwap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyToSwap",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySingleTokenKeepYtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMinted",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyToPY",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      }
    ],
    "name": "addLiquiditySingleTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netLpOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtFromSwap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMinted",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyToSwap",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "netPtOut",
        "type": "int256"
      }
    ],
    "name": "calcPriceImpactPY",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "netPtOut",
        "type": "int256"
      }
    ],
    "name": "calcPriceImpactPt",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "netPtOut",
        "type": "int256"
      }
    ],
    "name": "calcPriceImpactYt",
    "outputs": [
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
    "name": "claimOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "facetAddress",
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
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "name": "getAmountTokenToMintSy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDefaultApproxParams",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getLpToAssetRate",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getLpToSyRate",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getMarketState",
    "outputs": [
      {
        "internalType": "address",
        "name": "pt",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "yt",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "sy",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "impliedYield",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "marketExchangeRateExcludeFee",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "int256",
            "name": "totalPt",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalSy",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalLp",
            "type": "int256"
          },
          {
            "internalType": "address",
            "name": "treasury",
            "type": "address"
          },
          {
            "internalType": "int256",
            "name": "scalarRoot",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "expiry",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lnFeeRateRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveFeePercent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastLnImpliedRate",
            "type": "uint256"
          }
        ],
        "internalType": "struct MarketState",
        "name": "state",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getOwnerAndPendingOwner",
    "outputs": [
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_pendingOwner",
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
        "name": "py",
        "type": "address"
      }
    ],
    "name": "getPY",
    "outputs": [
      {
        "internalType": "address",
        "name": "pt",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "yt",
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
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getPtToAssetRate",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getPtToSyRate",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getTokensInOut",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "tokensIn",
        "type": "address[]"
      },
      {
        "internalType": "address[]",
        "name": "tokensOut",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "int256",
            "name": "totalPt",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalSy",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalLp",
            "type": "int256"
          },
          {
            "internalType": "address",
            "name": "treasury",
            "type": "address"
          },
          {
            "internalType": "int256",
            "name": "scalarRoot",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "expiry",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lnFeeRateRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveFeePercent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastLnImpliedRate",
            "type": "uint256"
          }
        ],
        "internalType": "struct MarketState",
        "name": "state",
        "type": "tuple"
      }
    ],
    "name": "getTradeExchangeRateExcludeFee",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "netPtOut",
        "type": "int256"
      }
    ],
    "name": "getTradeExchangeRateIncludeFee",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserMarketInfo",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "lpBalance",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "ptBalance",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "syBalance",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount[]",
            "name": "unclaimedRewards",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct IPActionInfoStatic.UserMarketInfo",
        "name": "res",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "py",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserPYInfo",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "ptBalance",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "ytBalance",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "unclaimedInterest",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount[]",
            "name": "unclaimedRewards",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct IPActionInfoStatic.UserPYInfo",
        "name": "res",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sy",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserSYInfo",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount",
            "name": "syBalance",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              }
            ],
            "internalType": "struct IPActionInfoStatic.TokenAmount[]",
            "name": "unclaimedRewards",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct IPActionInfoStatic.UserSYInfo",
        "name": "res",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getYieldTokenAndPtRate",
    "outputs": [
      {
        "internalType": "address",
        "name": "yieldToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYieldTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getYieldTokenAndYtRate",
    "outputs": [
      {
        "internalType": "address",
        "name": "yieldToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netYieldTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getYtToAssetRate",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "getYtToSyRate",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint128",
        "name": "additionalAmountToLock",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "newExpiry",
        "type": "uint128"
      }
    ],
    "name": "increaseLockPositionStatic",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "newVeBalance",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyToMint",
        "type": "uint256"
      }
    ],
    "name": "mintPyFromSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPYOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      }
    ],
    "name": "mintPyFromTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netTokenIn",
        "type": "uint256"
      }
    ],
    "name": "mintSyFromTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "pyIndexCurrentViewMarket",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "yt",
        "type": "address"
      }
    ],
    "name": "pyIndexCurrentViewYt",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      }
    ],
    "name": "readMarketState",
    "outputs": [
      {
        "components": [
          {
            "internalType": "int256",
            "name": "totalPt",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalSy",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "totalLp",
            "type": "int256"
          },
          {
            "internalType": "address",
            "name": "treasury",
            "type": "address"
          },
          {
            "internalType": "int256",
            "name": "scalarRoot",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "expiry",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lnFeeRateRoot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "reserveFeePercent",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastLnImpliedRate",
            "type": "uint256"
          }
        ],
        "internalType": "struct MarketState",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPYToRedeem",
        "type": "uint256"
      }
    ],
    "name": "redeemPyToSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "YT",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netPYToRedeem",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      }
    ],
    "name": "redeemPyToTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "SY",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      }
    ],
    "name": "redeemSyToTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      }
    ],
    "name": "removeLiquidityDualSyAndPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      }
    ],
    "name": "removeLiquidityDualTokenAndPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyToRedeem",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      }
    ],
    "name": "removeLiquiditySinglePtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtFromSwap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFromBurn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtFromBurn",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      }
    ],
    "name": "removeLiquiditySingleSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFromBurn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtFromBurn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFromSwap",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "netLpToRemove",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      }
    ],
    "name": "removeLiquiditySingleTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFromBurn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPtFromBurn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFromSwap",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "setDefaultApproxParams",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "facet",
            "type": "address"
          },
          {
            "internalType": "bytes4[]",
            "name": "selectors",
            "type": "bytes4[]"
          }
        ],
        "internalType": "struct IPMiniDiamond.SelectorsToFacet[]",
        "name": "arr",
        "type": "tuple[]"
      }
    ],
    "name": "setFacetForSelectors",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactPtForSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtIn",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      }
    ],
    "name": "swapExactPtForTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyToRedeem",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactPtForYtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalPtToSwap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactSyForPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "slippage",
        "type": "uint256"
      }
    ],
    "name": "swapExactSyForPtStaticAndGenerateApproxParams",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "approxParams",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactSyForYtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountTokenIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactTokenForPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMinted",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountTokenIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "slippage",
        "type": "uint256"
      }
    ],
    "name": "swapExactTokenForPtStaticAndGenerateApproxParams",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMinted",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "guessMin",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessMax",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "guessOffchain",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxIteration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "eps",
            "type": "uint256"
          }
        ],
        "internalType": "struct ApproxParams",
        "name": "approxParams",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountTokenIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactTokenForYtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyMinted",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactYtIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactYtForPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalPtSwapped",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactYtIn",
        "type": "uint256"
      }
    ],
    "name": "swapExactYtForSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyOwedInt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPYToRepaySyOwedInt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPYToRedeemSyOutInt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactYtIn",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "tokenOut",
        "type": "address"
      }
    ],
    "name": "swapExactYtForTokenStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netTokenOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyOwedInt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPYToRepaySyOwedInt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netPYToRedeemSyOutInt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyOut",
        "type": "uint256"
      }
    ],
    "name": "swapPtForExactSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netPtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactPtOut",
        "type": "uint256"
      }
    ],
    "name": "swapSyForExactPtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactYtOut",
        "type": "uint256"
      }
    ],
    "name": "swapSyForExactYtStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netSyIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyReceivedInt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalSyNeedInt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "market",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactSyOut",
        "type": "uint256"
      }
    ],
    "name": "swapYtForExactSyStatic",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "netYtIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netSyFee",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "priceImpact",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exchangeRateAfter",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "direct",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "renounce",
        "type": "bool"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

//   artifact: build/artifacts/contracts/interfaces/IPYieldToken.sol/IPYieldToken.json
//   role: dynamically discovered YT swap-trace event evidence
export const PendleYieldTokenAbi = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountPYToRedeem",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountSyOut",
        "type": "uint256"
      }
    ],
    "name": "Burn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountInterestFee",
        "type": "uint256"
      }
    ],
    "name": "CollectInterestFee",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "rewardToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountRewardFee",
        "type": "uint256"
      }
    ],
    "name": "CollectRewardFee",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiverPT",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiverYT",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountSyToMint",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountPYOut",
        "type": "uint256"
      }
    ],
    "name": "Mint",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "newIndex",
        "type": "uint256"
      }
    ],
    "name": "NewInterestIndex",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "interestOut",
        "type": "uint256"
      }
    ],
    "name": "RedeemInterest",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amountRewardsOut",
        "type": "uint256[]"
      }
    ],
    "name": "RedeemRewards",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "PT",
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
    "name": "SY",
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
    "name": "VERSION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
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
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "doCacheIndexSameBlock",
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
    "name": "expiry",
    "outputs": [
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
    "name": "factory",
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
    "name": "getRewardTokens",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isExpired",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "receiverPT",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "receiverYT",
        "type": "address"
      }
    ],
    "name": "mintPY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountPYOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pyIndexCurrent",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pyIndexLastUpdatedBlock",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pyIndexStored",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "redeemInterest",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "redeemRewards",
        "type": "bool"
      }
    ],
    "name": "redeemDueInterestAndRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "interestOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "rewardsOut",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "redeemPY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountSyOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "receivers",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amountPYToRedeems",
        "type": "uint256[]"
      }
    ],
    "name": "redeemPYMulti",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountSyOuts",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reentrancyGuardEntered",
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
    "name": "rewardIndexesCurrent",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
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
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "userInterest",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "lastPYIndex",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "accruedInterest",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "userReward",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "index",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "accrued",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;


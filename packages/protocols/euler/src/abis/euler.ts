// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007, sourceKind: git)
//   source:   https://github.com/euler-xyz/euler-interfaces
//             abis/*.json at commit df477f9d56a0c11542c26aabb63690219eecce6d (2026-07-07),
//             committed verbatim under ../../abis-src/ at their original
//             paths, with per-file fileSha256 in VENDOR.json
//   vendored: 2026-07-26 (commit-age guard: 7d)
//   why this source: euler-interfaces is Euler's canonical published record of
//   deployed addresses and ABIs, and it is the same artifact the addresses in
//   ../addresses.ts are read from — one pinned commit backs both.
//   verification: every fixed address is bytecode-checked on Monad mainnet and
//   the EVault ABI is cross-checked against the explorer-verified EVault
//   implementation by `pnpm test:abi:online` (abis.json records the expected
//   addresses, so a factory upgrade turns the check red).
//   caveat:   EVault instances are GenericFactory proxies delegating to one
//   shared implementation, and that implementation is itself modular — the
//   published EVault ABI is the union of its module surfaces, which is why the
//   cross-check targets the implementation rather than any vault proxy.

export const EVaultAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "integrations",
        "type": "tuple",
        "internalType": "struct Base.Integrations",
        "components": [
          {
            "name": "evc",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "protocolConfig",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "sequenceRegistry",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "balanceTracker",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "permit2",
            "type": "address",
            "internalType": "address"
          }
        ]
      },
      {
        "name": "modules",
        "type": "tuple",
        "internalType": "struct Dispatch.DeployedModules",
        "components": [
          {
            "name": "initialize",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "vault",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "borrowing",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "liquidation",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "riskManager",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "balanceForwarder",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "governance",
            "type": "address",
            "internalType": "address"
          }
        ]
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "EVC",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "LTVBorrow",
    "inputs": [
      {
        "name": "collateral",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "LTVFull",
    "inputs": [
      {
        "name": "collateral",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "borrowLTV",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "liquidationLTV",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "initialLiquidationLTV",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "targetTimestamp",
        "type": "uint48",
        "internalType": "uint48"
      },
      {
        "name": "rampDuration",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "LTVLiquidation",
    "inputs": [
      {
        "name": "collateral",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "LTVList",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_BALANCE_FORWARDER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_BORROWING",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_GOVERNANCE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_INITIALIZE",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_LIQUIDATION",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_RISKMANAGER",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_TOKEN",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MODULE_VAULT",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accountLiquidity",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "liquidation",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "collateralValue",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "liabilityValue",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accountLiquidityFull",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "liquidation",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "collaterals",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "collateralValues",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "liabilityValue",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accumulatedFees",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "accumulatedFeesAssets",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "holder",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "asset",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceForwarderEnabled",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceTrackerAddress",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "borrow",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "caps",
    "inputs": [],
    "outputs": [
      {
        "name": "supplyCap",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "borrowCap",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cash",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkAccountStatus",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "collaterals",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkLiquidation",
    "inputs": [
      {
        "name": "liquidator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "violator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "collateral",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "maxRepay",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxYield",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "checkVaultStatus",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "configFlags",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "convertFees",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "convertToAssets",
    "inputs": [
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "convertToShares",
    "inputs": [
      {
        "name": "assets",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "creator",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "dToken",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "debtOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "debtOfExact",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disableBalanceForwarder",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "disableController",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "enableBalanceForwarder",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "feeReceiver",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "flashLoan",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "governorAdmin",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hookConfig",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "proxyCreator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "interestAccumulator",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "interestFee",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "interestRate",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "interestRateModel",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "liquidate",
    "inputs": [
      {
        "name": "violator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "collateral",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "repayAssets",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "minYieldBalance",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "liquidationCoolOffTime",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxDeposit",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxLiquidationDiscount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxMint",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxRedeem",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "maxWithdraw",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "oracle",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "permit2Address",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "previewDeposit",
    "inputs": [
      {
        "name": "assets",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "previewMint",
    "inputs": [
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "previewRedeem",
    "inputs": [
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "previewWithdraw",
    "inputs": [
      {
        "name": "assets",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolConfigAddress",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolFeeReceiver",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolFeeShare",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pullDebt",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "redeem",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "repay",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "repayWithShares",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "shares",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "debt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setCaps",
    "inputs": [
      {
        "name": "supplyCap",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "borrowCap",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setConfigFlags",
    "inputs": [
      {
        "name": "newConfigFlags",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setFeeReceiver",
    "inputs": [
      {
        "name": "newFeeReceiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setGovernorAdmin",
    "inputs": [
      {
        "name": "newGovernorAdmin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setHookConfig",
    "inputs": [
      {
        "name": "newHookTarget",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newHookedOps",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setInterestFee",
    "inputs": [
      {
        "name": "newFee",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setInterestRateModel",
    "inputs": [
      {
        "name": "newModel",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setLTV",
    "inputs": [
      {
        "name": "collateral",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "borrowLTV",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "liquidationLTV",
        "type": "uint16",
        "internalType": "uint16"
      },
      {
        "name": "rampDuration",
        "type": "uint32",
        "internalType": "uint32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setLiquidationCoolOffTime",
    "inputs": [
      {
        "name": "newCoolOffTime",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMaxLiquidationDiscount",
    "inputs": [
      {
        "name": "newDiscount",
        "type": "uint16",
        "internalType": "uint16"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "skim",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalAssets",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalBorrows",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalBorrowsExact",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "touch",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFromMax",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unitOfAccount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "viewDelegate",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "BalanceForwarderStatus",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "status",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Borrow",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ConvertFees",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "protocolReceiver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "governorReceiver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "protocolShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "governorShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DebtSocialized",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Deposit",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "shares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EVaultCreated",
    "inputs": [
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "asset",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "dToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetCaps",
    "inputs": [
      {
        "name": "newSupplyCap",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "newBorrowCap",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetConfigFlags",
    "inputs": [
      {
        "name": "newConfigFlags",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetFeeReceiver",
    "inputs": [
      {
        "name": "newFeeReceiver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetGovernorAdmin",
    "inputs": [
      {
        "name": "newGovernorAdmin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetHookConfig",
    "inputs": [
      {
        "name": "newHookTarget",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newHookedOps",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetInterestFee",
    "inputs": [
      {
        "name": "newFee",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetInterestRateModel",
    "inputs": [
      {
        "name": "newInterestRateModel",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetLTV",
    "inputs": [
      {
        "name": "collateral",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "borrowLTV",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "liquidationLTV",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "initialLiquidationLTV",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      },
      {
        "name": "targetTimestamp",
        "type": "uint48",
        "indexed": false,
        "internalType": "uint48"
      },
      {
        "name": "rampDuration",
        "type": "uint32",
        "indexed": false,
        "internalType": "uint32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetLiquidationCoolOffTime",
    "inputs": [
      {
        "name": "newCoolOffTime",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "GovSetMaxLiquidationDiscount",
    "inputs": [
      {
        "name": "newDiscount",
        "type": "uint16",
        "indexed": false,
        "internalType": "uint16"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InterestAccrued",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Liquidate",
    "inputs": [
      {
        "name": "liquidator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "violator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "collateral",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "repayAssets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "yieldBalance",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PullDebt",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Repay",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VaultStatus",
    "inputs": [
      {
        "name": "totalShares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "totalBorrows",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "accumulatedFees",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "cash",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "interestAccumulator",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "interestRate",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdraw",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "receiver",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "assets",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "shares",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "E_AccountLiquidity",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_AmountTooLargeToEncode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadAssetReceiver",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadBorrowCap",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadCollateral",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadFee",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadMaxLiquidationDiscount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadSharesOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadSharesReceiver",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadSupplyCap",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BorrowCapExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_CheckUnauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_CollateralDisabled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ConfigAmountTooLargeToEncode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ControllerDisabled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_DebtAmountTooLargeToEncode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_EmptyError",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ExcessiveRepayAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_FlashLoanNotRepaid",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_Initialized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_InsufficientAllowance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_InsufficientAssets",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_InsufficientBalance",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_InsufficientCash",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_InsufficientDebt",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_InvalidLTVAsset",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_LTVBorrow",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_LTVLiquidation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_LiquidationCoolOff",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_MinYield",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_NoLiability",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_NoPriceOracle",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_NotController",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_NotHookTarget",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_NotSupported",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_OperationDisabled",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_OutstandingDebt",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ProxyMetadata",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_Reentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_RepayTooMuch",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_SelfLiquidation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_SelfTransfer",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_SupplyCapExceeded",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_TransientState",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_Unauthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ViolatorLiquidityDeferred",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ZeroAssets",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_ZeroShares",
    "inputs": []
  }
] as const;

export const EthereumVaultConnectorAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "areChecksDeferred",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "areChecksInProgress",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "batch",
    "inputs": [
      {
        "name": "items",
        "type": "tuple[]",
        "internalType": "struct IEVC.BatchItem[]",
        "components": [
          {
            "name": "targetContract",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "onBehalfOfAccount",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "batchRevert",
    "inputs": [
      {
        "name": "items",
        "type": "tuple[]",
        "internalType": "struct IEVC.BatchItem[]",
        "components": [
          {
            "name": "targetContract",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "onBehalfOfAccount",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "batchSimulation",
    "inputs": [
      {
        "name": "items",
        "type": "tuple[]",
        "internalType": "struct IEVC.BatchItem[]",
        "components": [
          {
            "name": "targetContract",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "onBehalfOfAccount",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "data",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "batchItemsResult",
        "type": "tuple[]",
        "internalType": "struct IEVC.BatchItemResult[]",
        "components": [
          {
            "name": "success",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "accountsStatusCheckResult",
        "type": "tuple[]",
        "internalType": "struct IEVC.StatusCheckResult[]",
        "components": [
          {
            "name": "checkedAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "isValid",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "vaultsStatusCheckResult",
        "type": "tuple[]",
        "internalType": "struct IEVC.StatusCheckResult[]",
        "components": [
          {
            "name": "checkedAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "isValid",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "call",
    "inputs": [
      {
        "name": "targetContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "onBehalfOfAccount",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "result",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "controlCollateral",
    "inputs": [
      {
        "name": "targetCollateral",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "onBehalfOfAccount",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "result",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "disableCollateral",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "disableController",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "enableCollateral",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "enableController",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "forgiveAccountStatusCheck",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "forgiveVaultStatusCheck",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getAccountOwner",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAddressPrefix",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes19",
        "internalType": "bytes19"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "getCollaterals",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getControllers",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getCurrentOnBehalfOfAccount",
    "inputs": [
      {
        "name": "controllerToCheck",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "onBehalfOfAccount",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "controllerEnabled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLastAccountStatusCheckTimestamp",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getNonce",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      },
      {
        "name": "nonceNamespace",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getOperator",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      },
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRawExecutionContext",
    "inputs": [],
    "outputs": [
      {
        "name": "context",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "haveCommonOwner",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "otherAccount",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "isAccountOperatorAuthorized",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isAccountStatusCheckDeferred",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isCollateralEnabled",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isControlCollateralInProgress",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isControllerEnabled",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isLockdownMode",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isOperatorAuthenticated",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isPermitDisabledMode",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isSimulationInProgress",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isVaultStatusCheckDeferred",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "permit",
    "inputs": [
      {
        "name": "signer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "nonceNamespace",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "signature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "reorderCollaterals",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "index1",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "index2",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "requireAccountAndVaultStatusCheck",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "requireAccountStatusCheck",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "requireVaultStatusCheck",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "setAccountOperator",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "authorized",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "setLockdownMode",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      },
      {
        "name": "enabled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "setNonce",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      },
      {
        "name": "nonceNamespace",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "setOperator",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      },
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "operatorBitField",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "setPermitDisabledMode",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "internalType": "bytes19"
      },
      {
        "name": "enabled",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "event",
    "name": "AccountStatusCheck",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "controller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CallWithContext",
    "inputs": [
      {
        "name": "caller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "onBehalfOfAddressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "onBehalfOfAccount",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "targetContract",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "selector",
        "type": "bytes4",
        "indexed": false,
        "internalType": "bytes4"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CollateralStatus",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "collateral",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "enabled",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ControllerStatus",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "controller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "enabled",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "LockdownModeStatus",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "enabled",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NonceStatus",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "nonceNamespace",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "oldNonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "newNonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "NonceUsed",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "nonceNamespace",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "nonce",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorStatus",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "operator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "accountOperatorAuthorized",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnerRegistered",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PermitDisabledModeStatus",
    "inputs": [
      {
        "name": "addressPrefix",
        "type": "bytes19",
        "indexed": true,
        "internalType": "bytes19"
      },
      {
        "name": "enabled",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VaultStatusCheck",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "EVC_BatchPanic",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_ChecksReentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_ControlCollateralReentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_ControllerViolation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_EmptyError",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_InvalidAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_InvalidData",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_InvalidNonce",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_InvalidOperatorStatus",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_InvalidTimestamp",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_InvalidValue",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_LockdownMode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_NotAuthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_OnBehalfOfAccountNotAuthenticated",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_PermitDisabledMode",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EVC_RevertedBatchResult",
    "inputs": [
      {
        "name": "batchItemsResult",
        "type": "tuple[]",
        "internalType": "struct IEVC.BatchItemResult[]",
        "components": [
          {
            "name": "success",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "accountsStatusResult",
        "type": "tuple[]",
        "internalType": "struct IEVC.StatusCheckResult[]",
        "components": [
          {
            "name": "checkedAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "isValid",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      },
      {
        "name": "vaultsStatusResult",
        "type": "tuple[]",
        "internalType": "struct IEVC.StatusCheckResult[]",
        "components": [
          {
            "name": "checkedAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "isValid",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "result",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ]
  },
  {
    "type": "error",
    "name": "EVC_SimulationBatchNested",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidIndex",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TooManyElements",
    "inputs": []
  }
] as const;

export const GenericFactoryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "admin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createProxy",
    "inputs": [
      {
        "name": "desiredImplementation",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "upgradeable",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "trailingData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getProxyConfig",
    "inputs": [
      {
        "name": "proxy",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "config",
        "type": "tuple",
        "internalType": "struct GenericFactory.ProxyConfig",
        "components": [
          {
            "name": "upgradeable",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "implementation",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "trailingData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getProxyListLength",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getProxyListSlice",
    "inputs": [
      {
        "name": "start",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "end",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "list",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "implementation",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isProxy",
    "inputs": [
      {
        "name": "proxy",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "proxyList",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setImplementation",
    "inputs": [
      {
        "name": "newImplementation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setUpgradeAdmin",
    "inputs": [
      {
        "name": "newUpgradeAdmin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "upgradeAdmin",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "Genesis",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProxyCreated",
    "inputs": [
      {
        "name": "proxy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "upgradeable",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "implementation",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "trailingData",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SetImplementation",
    "inputs": [
      {
        "name": "newImplementation",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "SetUpgradeAdmin",
    "inputs": [
      {
        "name": "newUpgradeAdmin",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "E_BadAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_BadQuery",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_DeploymentFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_Implementation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_Reentrancy",
    "inputs": []
  },
  {
    "type": "error",
    "name": "E_Unauthorized",
    "inputs": []
  }
] as const;

export const BasePerspectiveAbi = [
  {
    "type": "function",
    "name": "isVerified",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "perspectiveVerify",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "failEarly",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "vaultFactory",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract GenericFactory"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifiedArray",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifiedLength",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PerspectiveVerified",
    "inputs": [
      {
        "name": "vault",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "PerspectiveError",
    "inputs": [
      {
        "name": "perspective",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "vault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "codes",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "PerspectivePanic",
    "inputs": []
  }
] as const;

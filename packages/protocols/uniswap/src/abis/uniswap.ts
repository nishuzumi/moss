// GENERATED FILE. Do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   @uniswap/universal-router@2.0.0 (npm), tarball sha256 9b68a657b304708c4834878995e8d984b6889acfef4773e82038ab9ad094de14
//     UniversalRouter.json <- artifacts/contracts/UniversalRouter.sol/UniversalRouter.json (verbatim)
//     PoolManager.json <- artifacts/@uniswap/v4-core/src/PoolManager.sol/PoolManager.json (verbatim)
//     IAllowanceTransfer.json <- artifacts/permit2/src/interfaces/IAllowanceTransfer.sol/IAllowanceTransfer.json (verbatim)
//   source:   @uniswap/v4-periphery@1.0.3 (npm), tarball sha256 a044868e7476395e3687f78fceaf5b1a18cce98862891c2715d3e95887838994
//     V4Quoter.json <- foundry-out/V4Quoter.sol/V4Quoter.json (verbatim)
//   vendored: 2026-07-28 (release-age guard: 7d)
//   version policy: pinned to the releases whose artifacts match the DEPLOYED
//   Monad mainnet contracts, not dist-tags.latest. Uniswap's own deployment
//   record lists this Universal Router address separately from the newer
//   "Universal Router 2.1.1" deployment, and the 2.1-only ABI surface
//   (executeSigned, eip712Domain, per-hop slippage errors) is absent from the
//   deployed bytecode while the full 2.0.0 surface is present. The pins move
//   only when the recorded deployment does.
//   verification: abis.json pins each deployed address and its immutable
//   runtime bytecode keccak256; the live test recomputes the hashes via
//   rpc.monad.xyz and asserts every function selector and event topic this
//   adapter uses is present in the deployed bytecode. These deployments are
//   not proxies, so the pinned hashes cannot drift silently.

export const UniversalRouterAbi = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "permit2",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "weth9",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "v2Factory",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "v3Factory",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "pairInitCodeHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "poolInitCodeHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "v4PoolManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "v3NFTPositionManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "v4PositionManager",
            "type": "address"
          }
        ],
        "internalType": "struct RouterParameters",
        "name": "params",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "BalanceTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ContractLocked",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "Currency",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "DeltaNotNegative",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "Currency",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "DeltaNotPositive",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ETHNotAccepted",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "commandIndex",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "message",
        "type": "bytes"
      }
    ],
    "name": "ExecutionFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FromAddressIsNotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InputLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientETH",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "action",
        "type": "bytes4"
      }
    ],
    "name": "InvalidAction",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidBips",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "commandType",
        "type": "uint256"
      }
    ],
    "name": "InvalidCommandType",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidEthSender",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPath",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReserves",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LengthMismatch",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "NotAuthorizedForToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPoolManager",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OnlyMintAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SliceOutOfBounds",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransactionDeadlinePassed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnsafeCast",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "action",
        "type": "uint256"
      }
    ],
    "name": "UnsupportedAction",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V2InvalidPath",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V2TooLittleReceived",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V2TooMuchRequested",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V3InvalidAmountOut",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V3InvalidCaller",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V3InvalidSwap",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V3TooLittleReceived",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V3TooMuchRequested",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "minAmountOutReceived",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountReceived",
        "type": "uint256"
      }
    ],
    "name": "V4TooLittleReceived",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "maxAmountInRequested",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountRequested",
        "type": "uint256"
      }
    ],
    "name": "V4TooMuchRequested",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "V3_POSITION_MANAGER",
    "outputs": [
      {
        "internalType": "contract INonfungiblePositionManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "V4_POSITION_MANAGER",
    "outputs": [
      {
        "internalType": "contract IPositionManager",
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
        "internalType": "bytes",
        "name": "commands",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "inputs",
        "type": "bytes[]"
      }
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "commands",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "inputs",
        "type": "bytes[]"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "execute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "msgSender",
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
    "name": "poolManager",
    "outputs": [
      {
        "internalType": "contract IPoolManager",
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
        "internalType": "int256",
        "name": "amount0Delta",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "amount1Delta",
        "type": "int256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "uniswapV3SwapCallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "unlockCallback",
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
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

export const V4QuoterAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_poolManager",
        "type": "address",
        "internalType": "contract IPoolManager"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "_quoteExactInput",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactParams",
        "components": [
          {
            "name": "exactCurrency",
            "type": "address",
            "internalType": "Currency"
          },
          {
            "name": "path",
            "type": "tuple[]",
            "internalType": "struct PathKey[]",
            "components": [
              {
                "name": "intermediateCurrency",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              },
              {
                "name": "hookData",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "_quoteExactInputSingle",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactSingleParams",
        "components": [
          {
            "name": "poolKey",
            "type": "tuple",
            "internalType": "struct PoolKey",
            "components": [
              {
                "name": "currency0",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "currency1",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              }
            ]
          },
          {
            "name": "zeroForOne",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "hookData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "_quoteExactOutput",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactParams",
        "components": [
          {
            "name": "exactCurrency",
            "type": "address",
            "internalType": "Currency"
          },
          {
            "name": "path",
            "type": "tuple[]",
            "internalType": "struct PathKey[]",
            "components": [
              {
                "name": "intermediateCurrency",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              },
              {
                "name": "hookData",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "_quoteExactOutputSingle",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactSingleParams",
        "components": [
          {
            "name": "poolKey",
            "type": "tuple",
            "internalType": "struct PoolKey",
            "components": [
              {
                "name": "currency0",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "currency1",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              }
            ]
          },
          {
            "name": "zeroForOne",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "hookData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "msgSender",
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
    "name": "poolManager",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPoolManager"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "quoteExactInput",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactParams",
        "components": [
          {
            "name": "exactCurrency",
            "type": "address",
            "internalType": "Currency"
          },
          {
            "name": "path",
            "type": "tuple[]",
            "internalType": "struct PathKey[]",
            "components": [
              {
                "name": "intermediateCurrency",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              },
              {
                "name": "hookData",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasEstimate",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "quoteExactInputSingle",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactSingleParams",
        "components": [
          {
            "name": "poolKey",
            "type": "tuple",
            "internalType": "struct PoolKey",
            "components": [
              {
                "name": "currency0",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "currency1",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              }
            ]
          },
          {
            "name": "zeroForOne",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "hookData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountOut",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasEstimate",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "quoteExactOutput",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactParams",
        "components": [
          {
            "name": "exactCurrency",
            "type": "address",
            "internalType": "Currency"
          },
          {
            "name": "path",
            "type": "tuple[]",
            "internalType": "struct PathKey[]",
            "components": [
              {
                "name": "intermediateCurrency",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              },
              {
                "name": "hookData",
                "type": "bytes",
                "internalType": "bytes"
              }
            ]
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountIn",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasEstimate",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "quoteExactOutputSingle",
    "inputs": [
      {
        "name": "params",
        "type": "tuple",
        "internalType": "struct IV4Quoter.QuoteExactSingleParams",
        "components": [
          {
            "name": "poolKey",
            "type": "tuple",
            "internalType": "struct PoolKey",
            "components": [
              {
                "name": "currency0",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "currency1",
                "type": "address",
                "internalType": "Currency"
              },
              {
                "name": "fee",
                "type": "uint24",
                "internalType": "uint24"
              },
              {
                "name": "tickSpacing",
                "type": "int24",
                "internalType": "int24"
              },
              {
                "name": "hooks",
                "type": "address",
                "internalType": "contract IHooks"
              }
            ]
          },
          {
            "name": "zeroForOne",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "exactAmount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "hookData",
            "type": "bytes",
            "internalType": "bytes"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "amountIn",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "gasEstimate",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unlockCallback",
    "inputs": [
      {
        "name": "data",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "error",
    "name": "NotEnoughLiquidity",
    "inputs": [
      {
        "name": "poolId",
        "type": "bytes32",
        "internalType": "PoolId"
      }
    ]
  },
  {
    "type": "error",
    "name": "NotPoolManager",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotSelf",
    "inputs": []
  },
  {
    "type": "error",
    "name": "QuoteSwap",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnexpectedCallSuccess",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnexpectedRevertBytes",
    "inputs": [
      {
        "name": "revertData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ]
  }
] as const;

export const PoolManagerAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyUnlocked",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "currency0",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "currency1",
        "type": "address"
      }
    ],
    "name": "CurrenciesOutOfOrderOrEqual",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CurrencyNotSettled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DelegateCallNotAllowed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCaller",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ManagerLocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MustClearExactPositiveDelta",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NonzeroNativeValue",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PoolNotInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProtocolFeeCurrencySynced",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint24",
        "name": "fee",
        "type": "uint24"
      }
    ],
    "name": "ProtocolFeeTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SwapAmountCannotBeZero",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "int24",
        "name": "tickSpacing",
        "type": "int24"
      }
    ],
    "name": "TickSpacingTooLarge",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "int24",
        "name": "tickSpacing",
        "type": "int24"
      }
    ],
    "name": "TickSpacingTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedDynamicLPFeeUpdate",
    "type": "error"
  },
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
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
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
        "internalType": "PoolId",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount0",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount1",
        "type": "uint256"
      }
    ],
    "name": "Donate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "PoolId",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "Currency",
        "name": "currency0",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "Currency",
        "name": "currency1",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint24",
        "name": "fee",
        "type": "uint24"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tickSpacing",
        "type": "int24"
      },
      {
        "indexed": false,
        "internalType": "contract IHooks",
        "name": "hooks",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint160",
        "name": "sqrtPriceX96",
        "type": "uint160"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tick",
        "type": "int24"
      }
    ],
    "name": "Initialize",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "PoolId",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tickLower",
        "type": "int24"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tickUpper",
        "type": "int24"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "liquidityDelta",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      }
    ],
    "name": "ModifyLiquidity",
    "type": "event"
  },
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
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "OperatorSet",
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
        "name": "protocolFeeController",
        "type": "address"
      }
    ],
    "name": "ProtocolFeeControllerUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "PoolId",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint24",
        "name": "protocolFee",
        "type": "uint24"
      }
    ],
    "name": "ProtocolFeeUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "PoolId",
        "name": "id",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "int128",
        "name": "amount0",
        "type": "int128"
      },
      {
        "indexed": false,
        "internalType": "int128",
        "name": "amount1",
        "type": "int128"
      },
      {
        "indexed": false,
        "internalType": "uint160",
        "name": "sqrtPriceX96",
        "type": "uint160"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "liquidity",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "int24",
        "name": "tick",
        "type": "int24"
      },
      {
        "indexed": false,
        "internalType": "uint24",
        "name": "fee",
        "type": "uint24"
      }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
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
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
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
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
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
        "name": "id",
        "type": "uint256"
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
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balance",
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
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "Currency",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "clear",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "Currency",
        "name": "currency",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "collectProtocolFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountCollected",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "Currency",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "Currency",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "contract IHooks",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "internalType": "uint256",
        "name": "amount0",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount1",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "hookData",
        "type": "bytes"
      }
    ],
    "name": "donate",
    "outputs": [
      {
        "internalType": "BalanceDelta",
        "name": "delta",
        "type": "int256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "slot",
        "type": "bytes32"
      }
    ],
    "name": "extsload",
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "startSlot",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "nSlots",
        "type": "uint256"
      }
    ],
    "name": "extsload",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "slots",
        "type": "bytes32[]"
      }
    ],
    "name": "extsload",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32[]",
        "name": "slots",
        "type": "bytes32[]"
      }
    ],
    "name": "exttload",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "slot",
        "type": "bytes32"
      }
    ],
    "name": "exttload",
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
    "inputs": [
      {
        "components": [
          {
            "internalType": "Currency",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "Currency",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "contract IHooks",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "internalType": "uint160",
        "name": "sqrtPriceX96",
        "type": "uint160"
      }
    ],
    "name": "initialize",
    "outputs": [
      {
        "internalType": "int24",
        "name": "tick",
        "type": "int24"
      }
    ],
    "stateMutability": "nonpayable",
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
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isOperator",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isOperator",
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
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "Currency",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "Currency",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "contract IHooks",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "int24",
            "name": "tickLower",
            "type": "int24"
          },
          {
            "internalType": "int24",
            "name": "tickUpper",
            "type": "int24"
          },
          {
            "internalType": "int256",
            "name": "liquidityDelta",
            "type": "int256"
          },
          {
            "internalType": "bytes32",
            "name": "salt",
            "type": "bytes32"
          }
        ],
        "internalType": "struct IPoolManager.ModifyLiquidityParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "hookData",
        "type": "bytes"
      }
    ],
    "name": "modifyLiquidity",
    "outputs": [
      {
        "internalType": "BalanceDelta",
        "name": "callerDelta",
        "type": "int256"
      },
      {
        "internalType": "BalanceDelta",
        "name": "feesAccrued",
        "type": "int256"
      }
    ],
    "stateMutability": "nonpayable",
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
    "name": "protocolFeeController",
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
        "internalType": "Currency",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "protocolFeesAccrued",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
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
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setOperator",
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
        "components": [
          {
            "internalType": "Currency",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "Currency",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "contract IHooks",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "internalType": "uint24",
        "name": "newProtocolFee",
        "type": "uint24"
      }
    ],
    "name": "setProtocolFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "controller",
        "type": "address"
      }
    ],
    "name": "setProtocolFeeController",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "settle",
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
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "settleFor",
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
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
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
        "components": [
          {
            "internalType": "Currency",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "Currency",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "contract IHooks",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "zeroForOne",
            "type": "bool"
          },
          {
            "internalType": "int256",
            "name": "amountSpecified",
            "type": "int256"
          },
          {
            "internalType": "uint160",
            "name": "sqrtPriceLimitX96",
            "type": "uint160"
          }
        ],
        "internalType": "struct IPoolManager.SwapParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "hookData",
        "type": "bytes"
      }
    ],
    "name": "swap",
    "outputs": [
      {
        "internalType": "BalanceDelta",
        "name": "swapDelta",
        "type": "int256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "Currency",
        "name": "currency",
        "type": "address"
      }
    ],
    "name": "sync",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "Currency",
        "name": "currency",
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
    "name": "take",
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
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
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
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
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
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "unlock",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "result",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "Currency",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "Currency",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "contract IHooks",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "internalType": "uint24",
        "name": "newDynamicLPFee",
        "type": "uint24"
      }
    ],
    "name": "updateDynamicLPFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const Permit2Abi = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "AllowanceExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ExcessiveInvalidation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "InsufficientAllowance",
    "type": "error"
  },
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
        "name": "token",
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
        "internalType": "uint160",
        "name": "amount",
        "type": "uint160"
      },
      {
        "indexed": false,
        "internalType": "uint48",
        "name": "expiration",
        "type": "uint48"
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
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "Lockdown",
    "type": "event"
  },
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
        "name": "token",
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
        "internalType": "uint48",
        "name": "newNonce",
        "type": "uint48"
      },
      {
        "indexed": false,
        "internalType": "uint48",
        "name": "oldNonce",
        "type": "uint48"
      }
    ],
    "name": "NonceInvalidation",
    "type": "event"
  },
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
        "name": "token",
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
        "internalType": "uint160",
        "name": "amount",
        "type": "uint160"
      },
      {
        "indexed": false,
        "internalType": "uint48",
        "name": "expiration",
        "type": "uint48"
      },
      {
        "indexed": false,
        "internalType": "uint48",
        "name": "nonce",
        "type": "uint48"
      }
    ],
    "name": "Permit",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DOMAIN_SEPARATOR",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "token",
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
        "internalType": "uint160",
        "name": "amount",
        "type": "uint160"
      },
      {
        "internalType": "uint48",
        "name": "expiration",
        "type": "uint48"
      },
      {
        "internalType": "uint48",
        "name": "nonce",
        "type": "uint48"
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
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint160",
        "name": "amount",
        "type": "uint160"
      },
      {
        "internalType": "uint48",
        "name": "expiration",
        "type": "uint48"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
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
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint48",
        "name": "newNonce",
        "type": "uint48"
      }
    ],
    "name": "invalidateNonces",
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
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          }
        ],
        "internalType": "struct IAllowanceTransfer.TokenSpenderPair[]",
        "name": "approvals",
        "type": "tuple[]"
      }
    ],
    "name": "lockdown",
    "outputs": [],
    "stateMutability": "nonpayable",
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
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint160",
                "name": "amount",
                "type": "uint160"
              },
              {
                "internalType": "uint48",
                "name": "expiration",
                "type": "uint48"
              },
              {
                "internalType": "uint48",
                "name": "nonce",
                "type": "uint48"
              }
            ],
            "internalType": "struct IAllowanceTransfer.PermitDetails[]",
            "name": "details",
            "type": "tuple[]"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "sigDeadline",
            "type": "uint256"
          }
        ],
        "internalType": "struct IAllowanceTransfer.PermitBatch",
        "name": "permitBatch",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "permit",
    "outputs": [],
    "stateMutability": "nonpayable",
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
        "components": [
          {
            "components": [
              {
                "internalType": "address",
                "name": "token",
                "type": "address"
              },
              {
                "internalType": "uint160",
                "name": "amount",
                "type": "uint160"
              },
              {
                "internalType": "uint48",
                "name": "expiration",
                "type": "uint48"
              },
              {
                "internalType": "uint48",
                "name": "nonce",
                "type": "uint48"
              }
            ],
            "internalType": "struct IAllowanceTransfer.PermitDetails",
            "name": "details",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "sigDeadline",
            "type": "uint256"
          }
        ],
        "internalType": "struct IAllowanceTransfer.PermitSingle",
        "name": "permitSingle",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "permit",
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
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint160",
            "name": "amount",
            "type": "uint160"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          }
        ],
        "internalType": "struct IAllowanceTransfer.AllowanceTransferDetails[]",
        "name": "transferDetails",
        "type": "tuple[]"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
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
        "internalType": "uint160",
        "name": "amount",
        "type": "uint160"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

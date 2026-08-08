// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis [commit|latest]
// ABI origin: vendored (ADR 0007)
//   source:   balancer/balancer-deployments@master c1c3038a4fa214231af9099e4438998fccc30d59 (GitHub) — hardhat artifacts
//             copied verbatim into ../../abis-src/, no hand-edits
//   Router.json: sha256 cf269cf3a24e3d30182e4ba4ed7ccd5cc9f0bd8306ae3f4daa42e1fe8a466ed8
//   Vault.json: sha256 c4bdb00e1e3d2372a6a5073aa7cb63ef9b9e6fce093f50bfccfc52002fbf6f32
//   VaultExtension.json: sha256 be467f1e2aa2c7f775c7170b7851eca4329a3b6e2b03b53f6b78dd0f0fe2857d
//   VaultExplorer.json: sha256 05a2a259bb1924ec542a2abfae20aaba9159a9028b0679b721fa3a30ce755868
//   vendored: 2026-07-29
//   verification: swap/add/remove surfaces exercised live on Monad mainnet via
//   rpc.monad.xyz (the adapter's e2e tests pin observable behavior). The Router
//   and Vault ABIs are additionally cross-checked against explorer-verified
//   implementations by `pnpm test:abi:online` (see abis.json).

export const BeetsRouterAbi = [
  {
    "inputs": [
      {
        "internalType": "contract IVault",
        "name": "vault",
        "type": "address"
      },
      {
        "internalType": "contract IWETH",
        "name": "weth",
        "type": "address"
      },
      {
        "internalType": "contract IPermit2",
        "name": "permit2",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "routerVersion",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "name": "AddressEmptyCode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "AddressInsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ErrorSelectorNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EthTransfer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FailedInnerCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InputLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientEth",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint8",
        "name": "bits",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "SafeCastOverflowedUintDowncast",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "SenderIsNotVault",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SwapDeadline",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "maxAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "minBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "addLiquidityCustom",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
        "type": "bytes"
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
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "maxAmountsIn",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "minBptAmountOut",
            "type": "uint256"
          },
          {
            "internalType": "enum AddLiquidityKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouterCommon.AddLiquidityHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "addLiquidityHook",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "maxAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "addLiquidityProportional",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "addLiquiditySingleTokenExactOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "exactAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "minBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "addLiquidityUnbalanced",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPermit2",
    "outputs": [
      {
        "internalType": "contract IPermit2",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSender",
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
    "name": "getWeth",
    "outputs": [
      {
        "internalType": "contract IWETH",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20[]",
        "name": "tokens",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "exactAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "minBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "initialize",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
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
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "contract IERC20[]",
            "name": "tokens",
            "type": "address[]"
          },
          {
            "internalType": "uint256[]",
            "name": "exactAmountsIn",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "minBptAmountOut",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouter.InitializeHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "initializeHook",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes[]",
        "name": "data",
        "type": "bytes[]"
      }
    ],
    "name": "multicall",
    "outputs": [
      {
        "internalType": "bytes[]",
        "name": "results",
        "type": "bytes[]"
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
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
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
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "nonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          }
        ],
        "internalType": "struct IRouterCommon.PermitApproval[]",
        "name": "permitBatch",
        "type": "tuple[]"
      },
      {
        "internalType": "bytes[]",
        "name": "permitSignatures",
        "type": "bytes[]"
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
        "name": "permit2Batch",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "permit2Signature",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "multicallData",
        "type": "bytes[]"
      }
    ],
    "name": "permitBatchAndCall",
    "outputs": [
      {
        "internalType": "bytes[]",
        "name": "results",
        "type": "bytes[]"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "maxAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "minBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryAddLiquidityCustom",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "maxAmountsIn",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "minBptAmountOut",
            "type": "uint256"
          },
          {
            "internalType": "enum AddLiquidityKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouterCommon.AddLiquidityHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "queryAddLiquidityHook",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryAddLiquidityProportional",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryAddLiquiditySingleTokenExactOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256[]",
        "name": "exactAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryAddLiquidityUnbalanced",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "minAmountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryRemoveLiquidityCustom",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "minAmountsOut",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "maxBptAmountIn",
            "type": "uint256"
          },
          {
            "internalType": "enum RemoveLiquidityKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouterCommon.RemoveLiquidityHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "queryRemoveLiquidityHook",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryRemoveLiquidityProportional",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      }
    ],
    "name": "queryRemoveLiquidityRecovery",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      }
    ],
    "name": "queryRemoveLiquidityRecoveryHook",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryRemoveLiquiditySingleTokenExactIn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "queryRemoveLiquiditySingleTokenExactOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
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
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "enum SwapKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "contract IERC20",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "contract IERC20",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amountGiven",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "limit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouter.SwapSingleTokenHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "querySwapHook",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "querySwapSingleTokenExactIn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountCalculated",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "querySwapSingleTokenExactOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountCalculated",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "minAmountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "removeLiquidityCustom",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
        "type": "bytes"
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
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "minAmountsOut",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "maxBptAmountIn",
            "type": "uint256"
          },
          {
            "internalType": "enum RemoveLiquidityKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouterCommon.RemoveLiquidityHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "removeLiquidityHook",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "minAmountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "removeLiquidityProportional",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "minAmountsOut",
        "type": "uint256[]"
      }
    ],
    "name": "removeLiquidityRecovery",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "minAmountsOut",
        "type": "uint256[]"
      }
    ],
    "name": "removeLiquidityRecoveryHook",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "removeLiquiditySingleTokenExactIn",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "removeLiquiditySingleTokenExactOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "swapSingleTokenExactIn",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "wethIsEth",
        "type": "bool"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "swapSingleTokenExactOut",
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
        "components": [
          {
            "internalType": "address",
            "name": "sender",
            "type": "address"
          },
          {
            "internalType": "enum SwapKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "contract IERC20",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "contract IERC20",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amountGiven",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "limit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "wethIsEth",
            "type": "bool"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct IRouter.SwapSingleTokenHookParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "swapSingleTokenHook",
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
    "name": "version",
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
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

export const BeetsVaultAbi = [
  {
    "inputs": [
      {
        "internalType": "contract IVaultExtension",
        "name": "vaultExtension",
        "type": "address"
      },
      {
        "internalType": "contract IAuthorizer",
        "name": "authorizer",
        "type": "address"
      },
      {
        "internalType": "contract IProtocolFeeController",
        "name": "protocolFeeController",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "name": "AddressEmptyCode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "AddressInsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterAddLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterInitializeHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterRemoveLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterSwapHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AllZeroInputs",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AmountGivenZero",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      }
    ],
    "name": "AmountInAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "AmountOutBelowMin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BalanceNotSettled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BalanceOverflow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeAddLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeInitializeHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeRemoveLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeSwapHookFailed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      }
    ],
    "name": "BptAmountInAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "BptAmountOutBelowMin",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "BufferAlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "BufferNotInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BufferSharesInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BufferSharesInvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      }
    ],
    "name": "BufferTotalSupplyTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotReceiveEth",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotSwapSameToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportAddLiquidityCustom",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportDonation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportRemoveLiquidityCustom",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportUnbalancedLiquidity",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DynamicSwapFeeHookFailed",
    "type": "error"
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
        "name": "allowance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
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
    "name": "ERC20InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSpender",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FailedInnerCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeePrecisionTooHigh",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      }
    ],
    "name": "HookAdjustedAmountInAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "HookAdjustedAmountOutBelowMin",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "HookAdjustedSwapLimit",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "poolHooksContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "poolFactory",
        "type": "address"
      }
    ],
    "name": "HookRegistrationFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InputLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAddLiquidityKind",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRemoveLiquidityKind",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenConfiguration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenDecimals",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenType",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "InvalidUnderlyingToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "invariantRatio",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxInvariantRatio",
        "type": "uint256"
      }
    ],
    "name": "InvariantRatioAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "invariantRatio",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minInvariantRatio",
        "type": "uint256"
      }
    ],
    "name": "InvariantRatioBelowMin",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "issuedShares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minIssuedShares",
        "type": "uint256"
      }
    ],
    "name": "IssuedSharesBelowMin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MaxTokens",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MinTokens",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MultipleNonZeroInputs",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEnoughBufferShares",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expectedUnderlyingAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualUnderlyingAmount",
        "type": "uint256"
      }
    ],
    "name": "NotEnoughUnderlying",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expectedWrappedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualWrappedAmount",
        "type": "uint256"
      }
    ],
    "name": "NotEnoughWrapped",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotStaticCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotVaultDelegateCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PauseBufferPeriodDurationTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PercentageAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolAlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolInRecoveryMode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotInRecoveryMode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolPauseWindowExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      }
    ],
    "name": "PoolTotalSupplyTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProtocolFeesExceedTotalCollected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QueriesDisabled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QueriesDisabledPermanently",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QuoteResultSpoofed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RouterNotTrusted",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "value",
        "type": "int256"
      }
    ],
    "name": "SafeCastOverflowedIntToUint",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "SafeCastOverflowedUintToInt",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "SenderIsNotVault",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SwapFeePercentageTooHigh",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SwapFeePercentageTooLow",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "SwapLimit",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "TokenAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "TokenNotRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "expectedToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "actualToken",
        "type": "address"
      }
    ],
    "name": "TokensMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradeAmountTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultBuffersArePaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultIsNotUnlocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultNotPaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultPauseWindowDurationTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultPauseWindowExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "WrapAmountTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongProtocolFeeControllerDeployment",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "underlyingToken",
        "type": "address"
      }
    ],
    "name": "WrongUnderlyingToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongVaultAdminDeployment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongVaultExtensionDeployment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroDivision",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "aggregateSwapFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "AggregateSwapFeePercentageChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "aggregateYieldFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "AggregateYieldFeePercentageChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
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
        "internalType": "contract IAuthorizer",
        "name": "newAuthorizer",
        "type": "address"
      }
    ],
    "name": "AuthorizerChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "burnedShares",
        "type": "uint256"
      }
    ],
    "name": "BufferSharesBurned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
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
        "name": "issuedShares",
        "type": "uint256"
      }
    ],
    "name": "BufferSharesMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "liquidityProvider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum AddLiquidityKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amountsAddedRaw",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "swapFeeAmountsRaw",
        "type": "uint256[]"
      }
    ],
    "name": "LiquidityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountWrapped",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "LiquidityAddedToBuffer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "liquidityProvider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum RemoveLiquidityKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amountsRemovedRaw",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "swapFeeAmountsRaw",
        "type": "uint256[]"
      }
    ],
    "name": "LiquidityRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountWrapped",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "LiquidityRemovedFromBuffer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "PoolPausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "recoveryMode",
        "type": "bool"
      }
    ],
    "name": "PoolRecoveryModeStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "factory",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "contract IERC20",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "enum TokenType",
            "name": "tokenType",
            "type": "uint8"
          },
          {
            "internalType": "contract IRateProvider",
            "name": "rateProvider",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "paysYieldFees",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct TokenConfig[]",
        "name": "tokenConfig",
        "type": "tuple[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "pauseWindowEndTime",
        "type": "uint32"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "pauseManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "swapFeeManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "poolCreator",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct PoolRoleAccounts",
        "name": "roleAccounts",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "enableHookAdjustedAmounts",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallComputeDynamicSwapFee",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "hooksContract",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct HooksConfig",
        "name": "hooksConfig",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "disableUnbalancedLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableAddLiquidityCustom",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableRemoveLiquidityCustom",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableDonation",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct LiquidityManagement",
        "name": "liquidityManagement",
        "type": "tuple"
      }
    ],
    "name": "PoolRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IProtocolFeeController",
        "name": "newProtocolFeeController",
        "type": "address"
      }
    ],
    "name": "ProtocolFeeControllerChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "contract IERC20",
        "name": "tokenOut",
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
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeeAmount",
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
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "SwapFeePercentageChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
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
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "burnedShares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawnUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "Unwrap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "eventKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "eventData",
        "type": "bytes"
      }
    ],
    "name": "VaultAuxiliary",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "VaultBuffersPausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "VaultPausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "VaultQueriesDisabled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "VaultQueriesEnabled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "depositedUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "mintedShares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "Wrap",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "fallback"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "to",
            "type": "address"
          },
          {
            "internalType": "uint256[]",
            "name": "maxAmountsIn",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "minBptAmountOut",
            "type": "uint256"
          },
          {
            "internalType": "enum AddLiquidityKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct AddLiquidityParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "addLiquidity",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
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
            "internalType": "enum SwapKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "enum WrappingDirection",
            "name": "direction",
            "type": "uint8"
          },
          {
            "internalType": "contract IERC4626",
            "name": "wrappedToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amountGivenRaw",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "limitRaw",
            "type": "uint256"
          }
        ],
        "internalType": "struct BufferWrapOrUnwrapParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "erc4626BufferWrapOrUnwrap",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountCalculatedRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountInRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountOutRaw",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getPoolTokenCountAndIndexOfToken",
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
    "name": "getVaultExtension",
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
        "components": [
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "from",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "maxBptAmountIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256[]",
            "name": "minAmountsOut",
            "type": "uint256[]"
          },
          {
            "internalType": "enum RemoveLiquidityKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct RemoveLiquidityParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "removeLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "amountsOut",
        "type": "uint256[]"
      },
      {
        "internalType": "bytes",
        "name": "returnData",
        "type": "bytes"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
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
    "name": "sendTo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountHint",
        "type": "uint256"
      }
    ],
    "name": "settle",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "credit",
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
            "internalType": "enum SwapKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "contract IERC20",
            "name": "tokenIn",
            "type": "address"
          },
          {
            "internalType": "contract IERC20",
            "name": "tokenOut",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amountGivenRaw",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "limitRaw",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct VaultSwapParams",
        "name": "vaultSwapParams",
        "type": "tuple"
      }
    ],
    "name": "swap",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountCalculated",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountOut",
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
        "name": "owner",
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
        "name": "spender",
        "type": "address"
      },
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
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

export const BeetsVaultExtensionAbi = [
  {
    "inputs": [
      {
        "internalType": "contract IVault",
        "name": "mainVault",
        "type": "address"
      },
      {
        "internalType": "contract IVaultAdmin",
        "name": "vaultAdmin",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "name": "AddressEmptyCode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "AddressInsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterAddLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterInitializeHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterRemoveLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AfterSwapHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AmountGivenZero",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      }
    ],
    "name": "AmountInAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "AmountOutBelowMin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BalanceNotSettled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BalanceOverflow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeAddLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeInitializeHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeRemoveLiquidityHookFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BeforeSwapHookFailed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      }
    ],
    "name": "BptAmountInAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "BptAmountOutBelowMin",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "BufferAlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "BufferNotInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BufferSharesInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BufferSharesInvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      }
    ],
    "name": "BufferTotalSupplyTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotReceiveEth",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotSwapSameToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CodecOverflow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportAddLiquidityCustom",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportDonation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportRemoveLiquidityCustom",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DoesNotSupportUnbalancedLiquidity",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DynamicSwapFeeHookFailed",
    "type": "error"
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
        "name": "allowance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
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
    "name": "ERC20InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSpender",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ErrorSelectorNotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FailedInnerCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeePrecisionTooHigh",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxAmountIn",
        "type": "uint256"
      }
    ],
    "name": "HookAdjustedAmountInAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "tokenOut",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minAmountOut",
        "type": "uint256"
      }
    ],
    "name": "HookAdjustedAmountOutBelowMin",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "HookAdjustedSwapLimit",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "poolHooksContract",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "poolFactory",
        "type": "address"
      }
    ],
    "name": "HookRegistrationFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InputLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAddLiquidityKind",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRemoveLiquidityKind",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenConfiguration",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenDecimals",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTokenType",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "InvalidUnderlyingToken",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "issuedShares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minIssuedShares",
        "type": "uint256"
      }
    ],
    "name": "IssuedSharesBelowMin",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MaxTokens",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MinTokens",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEnoughBufferShares",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expectedUnderlyingAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualUnderlyingAmount",
        "type": "uint256"
      }
    ],
    "name": "NotEnoughUnderlying",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "expectedWrappedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actualWrappedAmount",
        "type": "uint256"
      }
    ],
    "name": "NotEnoughWrapped",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotStaticCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotVaultDelegateCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "OutOfBounds",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PauseBufferPeriodDurationTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PercentageAboveMax",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolAlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolInRecoveryMode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotInRecoveryMode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotInitialized",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolNotRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolPauseWindowExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      }
    ],
    "name": "PoolTotalSupplyTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProtocolFeesExceedTotalCollected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QueriesDisabled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QueriesDisabledPermanently",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "QuoteResultSpoofed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "result",
        "type": "bytes"
      }
    ],
    "name": "Result",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RouterNotTrusted",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "SafeCastOverflowedUintToInt",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "SenderIsNotVault",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SwapFeePercentageTooHigh",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SwapFeePercentageTooLow",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "SwapLimit",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "TokenAlreadyRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "TokenNotRegistered",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "expectedToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "actualToken",
        "type": "address"
      }
    ],
    "name": "TokensMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TokensNotSorted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TradeAmountTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultBuffersArePaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultIsNotUnlocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultNotPaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultPauseWindowDurationTooLarge",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultPauseWindowExpired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VaultPaused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "WrapAmountTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongProtocolFeeControllerDeployment",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "underlyingToken",
        "type": "address"
      }
    ],
    "name": "WrongUnderlyingToken",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongVaultAdminDeployment",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongVaultExtensionDeployment",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "aggregateSwapFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "AggregateSwapFeePercentageChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "aggregateYieldFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "AggregateYieldFeePercentageChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
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
        "internalType": "contract IAuthorizer",
        "name": "newAuthorizer",
        "type": "address"
      }
    ],
    "name": "AuthorizerChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "burnedShares",
        "type": "uint256"
      }
    ],
    "name": "BufferSharesBurned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
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
        "name": "issuedShares",
        "type": "uint256"
      }
    ],
    "name": "BufferSharesMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "liquidityProvider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum AddLiquidityKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amountsAddedRaw",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "swapFeeAmountsRaw",
        "type": "uint256[]"
      }
    ],
    "name": "LiquidityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountWrapped",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "LiquidityAddedToBuffer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "liquidityProvider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "enum RemoveLiquidityKind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amountsRemovedRaw",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "swapFeeAmountsRaw",
        "type": "uint256[]"
      }
    ],
    "name": "LiquidityRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountWrapped",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "LiquidityRemovedFromBuffer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolInitialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "PoolPausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "recoveryMode",
        "type": "bool"
      }
    ],
    "name": "PoolRecoveryModeStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "factory",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "contract IERC20",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "enum TokenType",
            "name": "tokenType",
            "type": "uint8"
          },
          {
            "internalType": "contract IRateProvider",
            "name": "rateProvider",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "paysYieldFees",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct TokenConfig[]",
        "name": "tokenConfig",
        "type": "tuple[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "pauseWindowEndTime",
        "type": "uint32"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "pauseManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "swapFeeManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "poolCreator",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct PoolRoleAccounts",
        "name": "roleAccounts",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "enableHookAdjustedAmounts",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallComputeDynamicSwapFee",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "hooksContract",
            "type": "address"
          }
        ],
        "indexed": false,
        "internalType": "struct HooksConfig",
        "name": "hooksConfig",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "disableUnbalancedLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableAddLiquidityCustom",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableRemoveLiquidityCustom",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableDonation",
            "type": "bool"
          }
        ],
        "indexed": false,
        "internalType": "struct LiquidityManagement",
        "name": "liquidityManagement",
        "type": "tuple"
      }
    ],
    "name": "PoolRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IProtocolFeeController",
        "name": "newProtocolFeeController",
        "type": "address"
      }
    ],
    "name": "ProtocolFeeControllerChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "contract IERC20",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "contract IERC20",
        "name": "tokenOut",
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
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeeAmount",
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
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "SwapFeePercentageChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
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
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "burnedShares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawnUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "Unwrap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "eventKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bytes",
        "name": "eventData",
        "type": "bytes"
      }
    ],
    "name": "VaultAuxiliary",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "VaultBuffersPausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      }
    ],
    "name": "VaultPausedStateChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "VaultQueriesDisabled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "VaultQueriesEnabled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "depositedUnderlying",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "mintedShares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "bufferBalances",
        "type": "bytes32"
      }
    ],
    "name": "Wrap",
    "type": "event"
  },
  {
    "stateMutability": "payable",
    "type": "fallback"
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
        "name": "token",
        "type": "address"
      },
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
        "name": "pool",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "enum SwapKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "amountGivenScaled18",
            "type": "uint256"
          },
          {
            "internalType": "uint256[]",
            "name": "balancesScaled18",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "indexIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "indexOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "router",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct PoolSwapParams",
        "name": "swapParams",
        "type": "tuple"
      }
    ],
    "name": "computeDynamicSwapFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "dynamicSwapFeePercentage",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "eventKey",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "eventData",
        "type": "bytes"
      }
    ],
    "name": "emitAuxiliaryEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getAddLiquidityCalledFlag",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getAggregateSwapFeeAmount",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getAggregateYieldFeeAmount",
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
    "name": "getAuthorizer",
    "outputs": [
      {
        "internalType": "contract IAuthorizer",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getBptRate",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "rate",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getCurrentLiveBalances",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "balancesLiveScaled18",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "getERC4626BufferAsset",
    "outputs": [
      {
        "internalType": "address",
        "name": "asset",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getHooksConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "enableHookAdjustedAmounts",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallComputeDynamicSwapFee",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "hooksContract",
            "type": "address"
          }
        ],
        "internalType": "struct HooksConfig",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNonzeroDeltaCount",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolConfig",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "bool",
                "name": "disableUnbalancedLiquidity",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "enableAddLiquidityCustom",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "enableRemoveLiquidityCustom",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "enableDonation",
                "type": "bool"
              }
            ],
            "internalType": "struct LiquidityManagement",
            "name": "liquidityManagement",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "staticSwapFeePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "aggregateSwapFeePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "aggregateYieldFeePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint40",
            "name": "tokenDecimalDiffs",
            "type": "uint40"
          },
          {
            "internalType": "uint32",
            "name": "pauseWindowEndTime",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "isPoolRegistered",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isPoolInitialized",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isPoolPaused",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isPoolInRecoveryMode",
            "type": "bool"
          }
        ],
        "internalType": "struct PoolConfig",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "PoolConfigBits",
            "name": "poolConfigBits",
            "type": "bytes32"
          },
          {
            "internalType": "contract IERC20[]",
            "name": "tokens",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "enum TokenType",
                "name": "tokenType",
                "type": "uint8"
              },
              {
                "internalType": "contract IRateProvider",
                "name": "rateProvider",
                "type": "address"
              },
              {
                "internalType": "bool",
                "name": "paysYieldFees",
                "type": "bool"
              }
            ],
            "internalType": "struct TokenInfo[]",
            "name": "tokenInfo",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256[]",
            "name": "balancesRaw",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "balancesLiveScaled18",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "tokenRates",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "decimalScalingFactors",
            "type": "uint256[]"
          }
        ],
        "internalType": "struct PoolData",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolPausedState",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      },
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      },
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolRoleAccounts",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "pauseManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "swapFeeManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "poolCreator",
            "type": "address"
          }
        ],
        "internalType": "struct PoolRoleAccounts",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolTokenInfo",
    "outputs": [
      {
        "internalType": "contract IERC20[]",
        "name": "tokens",
        "type": "address[]"
      },
      {
        "components": [
          {
            "internalType": "enum TokenType",
            "name": "tokenType",
            "type": "uint8"
          },
          {
            "internalType": "contract IRateProvider",
            "name": "rateProvider",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "paysYieldFees",
            "type": "bool"
          }
        ],
        "internalType": "struct TokenInfo[]",
        "name": "tokenInfo",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256[]",
        "name": "balancesRaw",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "lastBalancesLiveScaled18",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolTokenRates",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "decimalScalingFactors",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "tokenRates",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolTokens",
    "outputs": [
      {
        "internalType": "contract IERC20[]",
        "name": "tokens",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getProtocolFeeController",
    "outputs": [
      {
        "internalType": "contract IProtocolFeeController",
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
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getReservesOf",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getStaticSwapFeePercentage",
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
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getTokenDelta",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultAdmin",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "contract IERC20[]",
        "name": "tokens",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "exactAmountsIn",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256",
        "name": "minBptAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "initialize",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bptAmountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "isERC4626BufferInitialized",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolInRecoveryMode",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolInitialized",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolPaused",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolRegistered",
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
    "name": "isQueryDisabled",
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
    "name": "isQueryDisabledPermanently",
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
    "name": "isUnlocked",
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
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "quote",
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
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "quoteAndRevert",
    "outputs": [],
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
        "name": "pool",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "contract IERC20",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "enum TokenType",
            "name": "tokenType",
            "type": "uint8"
          },
          {
            "internalType": "contract IRateProvider",
            "name": "rateProvider",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "paysYieldFees",
            "type": "bool"
          }
        ],
        "internalType": "struct TokenConfig[]",
        "name": "tokenConfig",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      },
      {
        "internalType": "uint32",
        "name": "pauseWindowEndTime",
        "type": "uint32"
      },
      {
        "internalType": "bool",
        "name": "protocolFeeExempt",
        "type": "bool"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "pauseManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "swapFeeManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "poolCreator",
            "type": "address"
          }
        ],
        "internalType": "struct PoolRoleAccounts",
        "name": "roleAccounts",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "poolHooksContract",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "disableUnbalancedLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableAddLiquidityCustom",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableRemoveLiquidityCustom",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "enableDonation",
            "type": "bool"
          }
        ],
        "internalType": "struct LiquidityManagement",
        "name": "liquidityManagement",
        "type": "tuple"
      }
    ],
    "name": "registerPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "exactBptAmountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "minAmountsOut",
        "type": "uint256[]"
      }
    ],
    "name": "removeLiquidityRecovery",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "amountsOutRaw",
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
        "name": "token",
        "type": "address"
      }
    ],
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
    "inputs": [],
    "name": "vault",
    "outputs": [
      {
        "internalType": "contract IVault",
        "name": "",
        "type": "address"
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

export const BeetsVaultExplorerAbi = [
  {
    "inputs": [
      {
        "internalType": "contract IVault",
        "name": "vault",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
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
        "name": "tokenAllowance",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "areBuffersPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "buffersPaused",
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
      },
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
        "name": "tokenBalance",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "collectAggregateFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "enum SwapKind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "amountGivenScaled18",
            "type": "uint256"
          },
          {
            "internalType": "uint256[]",
            "name": "balancesScaled18",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "indexIn",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "indexOut",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "router",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "userData",
            "type": "bytes"
          }
        ],
        "internalType": "struct PoolSwapParams",
        "name": "swapParams",
        "type": "tuple"
      }
    ],
    "name": "computeDynamicSwapFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "dynamicSwapFeePercentage",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "enableRecoveryMode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getAddLiquidityCalledFlag",
    "outputs": [
      {
        "internalType": "bool",
        "name": "liquidityAdded",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getAggregateFeePercentages",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "aggregateSwapFeePercentage",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "aggregateYieldFeePercentage",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getAggregateSwapFeeAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "swapFeeAmount",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getAggregateYieldFeeAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "yieldFeeAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAuthorizer",
    "outputs": [
      {
        "internalType": "address",
        "name": "authorizer",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getBptRate",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "rate",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "getBufferAsset",
    "outputs": [
      {
        "internalType": "address",
        "name": "underlyingToken",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "getBufferBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "underlyingBalanceRaw",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "wrappedBalanceRaw",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBufferMinimumTotalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bufferMinimumTotalSupply",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "liquidityOwner",
        "type": "address"
      }
    ],
    "name": "getBufferOwnerShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "ownerShares",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBufferPeriodDuration",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "bufferPeriodDuration",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBufferPeriodEndTime",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "bufferPeriodEndTime",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "getBufferTotalShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bufferShares",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getCurrentLiveBalances",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "balancesLiveScaled18",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "getERC4626BufferAsset",
    "outputs": [
      {
        "internalType": "address",
        "name": "underlyingToken",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getHooksConfig",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "enableHookAdjustedAmounts",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterInitialize",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallComputeDynamicSwapFee",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterSwap",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterAddLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallBeforeRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "shouldCallAfterRemoveLiquidity",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "hooksContract",
            "type": "address"
          }
        ],
        "internalType": "struct HooksConfig",
        "name": "hooksConfig",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMaximumPoolTokens",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "maxTokens",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMinimumPoolTokens",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "minTokens",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMinimumTradeAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "minimumTradeAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMinimumWrapAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "minimumWrapAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNonzeroDeltaCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "nonzeroDeltaCount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPauseWindowEndTime",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "pauseWindowEndTime",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolConfig",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {
                "internalType": "bool",
                "name": "disableUnbalancedLiquidity",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "enableAddLiquidityCustom",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "enableRemoveLiquidityCustom",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "enableDonation",
                "type": "bool"
              }
            ],
            "internalType": "struct LiquidityManagement",
            "name": "liquidityManagement",
            "type": "tuple"
          },
          {
            "internalType": "uint256",
            "name": "staticSwapFeePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "aggregateSwapFeePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "aggregateYieldFeePercentage",
            "type": "uint256"
          },
          {
            "internalType": "uint40",
            "name": "tokenDecimalDiffs",
            "type": "uint40"
          },
          {
            "internalType": "uint32",
            "name": "pauseWindowEndTime",
            "type": "uint32"
          },
          {
            "internalType": "bool",
            "name": "isPoolRegistered",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isPoolInitialized",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isPoolPaused",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isPoolInRecoveryMode",
            "type": "bool"
          }
        ],
        "internalType": "struct PoolConfig",
        "name": "poolConfig",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "PoolConfigBits",
            "name": "poolConfigBits",
            "type": "bytes32"
          },
          {
            "internalType": "contract IERC20[]",
            "name": "tokens",
            "type": "address[]"
          },
          {
            "components": [
              {
                "internalType": "enum TokenType",
                "name": "tokenType",
                "type": "uint8"
              },
              {
                "internalType": "contract IRateProvider",
                "name": "rateProvider",
                "type": "address"
              },
              {
                "internalType": "bool",
                "name": "paysYieldFees",
                "type": "bool"
              }
            ],
            "internalType": "struct TokenInfo[]",
            "name": "tokenInfo",
            "type": "tuple[]"
          },
          {
            "internalType": "uint256[]",
            "name": "balancesRaw",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "balancesLiveScaled18",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "tokenRates",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256[]",
            "name": "decimalScalingFactors",
            "type": "uint256[]"
          }
        ],
        "internalType": "struct PoolData",
        "name": "poolData",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolMinimumTotalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "poolMinimumTotalSupply",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolPausedState",
    "outputs": [
      {
        "internalType": "bool",
        "name": "poolPaused",
        "type": "bool"
      },
      {
        "internalType": "uint32",
        "name": "poolPauseWindowEndTime",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "poolBufferPeriodEndTime",
        "type": "uint32"
      },
      {
        "internalType": "address",
        "name": "pauseManager",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolRoleAccounts",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "pauseManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "swapFeeManager",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "poolCreator",
            "type": "address"
          }
        ],
        "internalType": "struct PoolRoleAccounts",
        "name": "roleAccounts",
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
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getPoolTokenCountAndIndexOfToken",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "index",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolTokenInfo",
    "outputs": [
      {
        "internalType": "contract IERC20[]",
        "name": "tokens",
        "type": "address[]"
      },
      {
        "components": [
          {
            "internalType": "enum TokenType",
            "name": "tokenType",
            "type": "uint8"
          },
          {
            "internalType": "contract IRateProvider",
            "name": "rateProvider",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "paysYieldFees",
            "type": "bool"
          }
        ],
        "internalType": "struct TokenInfo[]",
        "name": "tokenInfo",
        "type": "tuple[]"
      },
      {
        "internalType": "uint256[]",
        "name": "balancesRaw",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "lastBalancesLiveScaled18",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolTokenRates",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "decimalScalingFactors",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "tokenRates",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getPoolTokens",
    "outputs": [
      {
        "internalType": "contract IERC20[]",
        "name": "tokens",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getProtocolFeeController",
    "outputs": [
      {
        "internalType": "address",
        "name": "protocolFeeController",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getReservesOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "reserveAmount",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "getStaticSwapFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "swapFeePercentage",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "getTokenDelta",
    "outputs": [
      {
        "internalType": "int256",
        "name": "tokenDelta",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVault",
    "outputs": [
      {
        "internalType": "address",
        "name": "vault",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultAdmin",
    "outputs": [
      {
        "internalType": "address",
        "name": "vaultAdmin",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultExtension",
    "outputs": [
      {
        "internalType": "address",
        "name": "vaultExtension",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVaultPausedState",
    "outputs": [
      {
        "internalType": "bool",
        "name": "vaultPaused",
        "type": "bool"
      },
      {
        "internalType": "uint32",
        "name": "vaultPauseWindowEndTime",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "vaultBufferPeriodEndTime",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IERC4626",
        "name": "wrappedToken",
        "type": "address"
      }
    ],
    "name": "isERC4626BufferInitialized",
    "outputs": [
      {
        "internalType": "bool",
        "name": "isBufferInitialized",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolInRecoveryMode",
    "outputs": [
      {
        "internalType": "bool",
        "name": "inRecoveryMode",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolInitialized",
    "outputs": [
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
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "poolPaused",
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
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "isPoolRegistered",
    "outputs": [
      {
        "internalType": "bool",
        "name": "registered",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isQueryDisabled",
    "outputs": [
      {
        "internalType": "bool",
        "name": "queryDisabled",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isQueryDisabledPermanently",
    "outputs": [
      {
        "internalType": "bool",
        "name": "queryDisabledPermanently",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isUnlocked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "unlocked",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isVaultPaused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "vaultPaused",
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
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenTotalSupply",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

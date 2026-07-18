// GENERATED FILE — do not edit by hand.
//   compile from npm tarball:  pnpm gen:abis
// ABI origin: vendored (ADR 0007)
//   source:   @uniswap/v4-core@1.0.2 (npm), foundry artifacts
//   tarball:  sha256 033d148fac5995874b83621afe35be94a28eb00bfd59bd0a8c9c030bea6a1aef
//   verification: contracts verified on Monad mainnet via rpc.monad.xyz;
//   the adapter's e2e tests pin observable behavior.
//   caveat:   V4 contracts are immutable once deployed (no upgrade pattern).
export const PoolManagerAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "amount",
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
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "balanceOf",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "burn",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "clear",
    "inputs": [
      {
        "name": "currency",
        "type": "address",
        "internalType": "Currency"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "collectProtocolFees",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "currency",
        "type": "address",
        "internalType": "Currency"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "amountCollected",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "donate",
    "inputs": [
      {
        "name": "key",
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
        "name": "amount0",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount1",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "hookData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "delta",
        "type": "int256",
        "internalType": "BalanceDelta"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "extsload",
    "inputs": [
      {
        "name": "slot",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "extsload",
    "inputs": [
      {
        "name": "startSlot",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "nSlots",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "extsload",
    "inputs": [
      {
        "name": "slots",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "exttload",
    "inputs": [
      {
        "name": "slots",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32[]",
        "internalType": "bytes32[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "exttload",
    "inputs": [
      {
        "name": "slot",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "initialize",
    "inputs": [
      {
        "name": "key",
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
        "name": "sqrtPriceX96",
        "type": "uint160",
        "internalType": "uint160"
      }
    ],
    "outputs": [
      {
        "name": "tick",
        "type": "int24",
        "internalType": "int24"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isOperator",
    "inputs": [
      {
        "name": "owner",
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
        "name": "isOperator",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "mint",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "modifyLiquidity",
    "inputs": [
      {
        "name": "key",
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
        "name": "params",
        "type": "tuple",
        "internalType": "struct ModifyLiquidityParams",
        "components": [
          {
            "name": "tickLower",
            "type": "int24",
            "internalType": "int24"
          },
          {
            "name": "tickUpper",
            "type": "int24",
            "internalType": "int24"
          },
          {
            "name": "liquidityDelta",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "salt",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      },
      {
        "name": "hookData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "callerDelta",
        "type": "int256",
        "internalType": "BalanceDelta"
      },
      {
        "name": "feesAccrued",
        "type": "int256",
        "internalType": "BalanceDelta"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "owner",
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
    "name": "protocolFeeController",
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
    "name": "protocolFeesAccrued",
    "inputs": [
      {
        "name": "currency",
        "type": "address",
        "internalType": "Currency"
      }
    ],
    "outputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setOperator",
    "inputs": [
      {
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
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
    "name": "setProtocolFee",
    "inputs": [
      {
        "name": "key",
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
        "name": "newProtocolFee",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setProtocolFeeController",
    "inputs": [
      {
        "name": "controller",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "settle",
    "inputs": [],
    "outputs": [
      {
        "name": "paid",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "settleFor",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "paid",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "supportsInterface",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
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
    "name": "swap",
    "inputs": [
      {
        "name": "key",
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
        "name": "params",
        "type": "tuple",
        "internalType": "struct SwapParams",
        "components": [
          {
            "name": "zeroForOne",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "amountSpecified",
            "type": "int256",
            "internalType": "int256"
          },
          {
            "name": "sqrtPriceLimitX96",
            "type": "uint160",
            "internalType": "uint160"
          }
        ]
      },
      {
        "name": "hookData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [
      {
        "name": "swapDelta",
        "type": "int256",
        "internalType": "BalanceDelta"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "sync",
    "inputs": [
      {
        "name": "currency",
        "type": "address",
        "internalType": "Currency"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "take",
    "inputs": [
      {
        "name": "currency",
        "type": "address",
        "internalType": "Currency"
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
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
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
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
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
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unlock",
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
    "type": "function",
    "name": "updateDynamicLPFee",
    "inputs": [
      {
        "name": "key",
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
        "name": "newDynamicLPFee",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "indexed": true,
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": true,
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": false,
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "indexed": false,
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Donate",
    "inputs": [
      {
        "indexed": true,
        "name": "id",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "indexed": true,
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": false,
        "name": "amount0",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "indexed": false,
        "name": "amount1",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Initialize",
    "inputs": [
      {
        "indexed": true,
        "name": "id",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "indexed": true,
        "name": "currency0",
        "type": "address",
        "internalType": "Currency"
      },
      {
        "indexed": true,
        "name": "currency1",
        "type": "address",
        "internalType": "Currency"
      },
      {
        "indexed": false,
        "name": "fee",
        "type": "uint24",
        "internalType": "uint24"
      },
      {
        "indexed": false,
        "name": "tickSpacing",
        "type": "int24",
        "internalType": "int24"
      },
      {
        "indexed": false,
        "name": "hooks",
        "type": "address",
        "internalType": "contract IHooks"
      },
      {
        "indexed": false,
        "name": "sqrtPriceX96",
        "type": "uint160",
        "internalType": "uint160"
      },
      {
        "indexed": false,
        "name": "tick",
        "type": "int24",
        "internalType": "int24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ModifyLiquidity",
    "inputs": [
      {
        "indexed": true,
        "name": "id",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "indexed": true,
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": false,
        "name": "tickLower",
        "type": "int24",
        "internalType": "int24"
      },
      {
        "indexed": false,
        "name": "tickUpper",
        "type": "int24",
        "internalType": "int24"
      },
      {
        "indexed": false,
        "name": "liquidityDelta",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "indexed": false,
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OperatorSet",
    "inputs": [
      {
        "indexed": true,
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": true,
        "name": "operator",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": false,
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "indexed": true,
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": true,
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProtocolFeeControllerUpdated",
    "inputs": [
      {
        "indexed": false,
        "name": "protocolFeeController",
        "type": "address",
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ProtocolFeeUpdated",
    "inputs": [
      {
        "indexed": true,
        "name": "id",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "indexed": false,
        "name": "protocolFee",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Swap",
    "inputs": [
      {
        "indexed": true,
        "name": "id",
        "type": "bytes32",
        "internalType": "PoolId"
      },
      {
        "indexed": true,
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": false,
        "name": "amount0",
        "type": "int128",
        "internalType": "int128"
      },
      {
        "indexed": false,
        "name": "amount1",
        "type": "int128",
        "internalType": "int128"
      },
      {
        "indexed": false,
        "name": "sqrtPriceX96",
        "type": "uint160",
        "internalType": "uint160"
      },
      {
        "indexed": false,
        "name": "liquidity",
        "type": "uint128",
        "internalType": "uint128"
      },
      {
        "indexed": false,
        "name": "tick",
        "type": "int24",
        "internalType": "int24"
      },
      {
        "indexed": false,
        "name": "fee",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "indexed": true,
        "name": "caller",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": true,
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": true,
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "indexed": false,
        "name": "id",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "indexed": false,
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "inputs": [
      {
        "name": "currency0",
        "type": "address",
        "internalType": "Currency"
      },
      {
        "name": "currency1",
        "type": "address",
        "internalType": "Currency"
      }
    ],
    "name": "CurrenciesOutOfOrderOrEqual"
  },
  {
    "type": "error",
    "inputs": [],
    "name": "CurrencyNotSettled"
  },
  {
    "type": "error",
    "inputs": [],
    "name": "ManagerLocked"
  },
  {
    "type": "error",
    "inputs": [],
    "name": "NonzeroNativeValue"
  },
  {
    "type": "error",
    "inputs": [],
    "name": "MustClearExactPositiveDelta"
  },
  {
    "type": "error",
    "inputs": [],
    "name": "PoolNotInitialized"
  },
  {
    "type": "error",
    "inputs": [],
    "name": "SwapAmountCannotBeZero"
  },
  {
    "type": "error",
    "inputs": [
      {
        "name": "tickSpacing",
        "type": "int24",
        "internalType": "int24"
      }
    ],
    "name": "TickSpacingTooLarge"
  },
  {
    "type": "error",
    "inputs": [
      {
        "name": "tickSpacing",
        "type": "int24",
        "internalType": "int24"
      }
    ],
    "name": "TickSpacingTooSmall"
  },
  {
    "type": "error",
    "inputs": [
      {
        "name": "fee",
        "type": "uint24",
        "internalType": "uint24"
      }
    ],
    "name": "UnorderedCurrencyFeeCollision"
  }
] as const;

/** Swap event signature hash for receipt parsing */
export const SWAP_EVENT_TOPIC = "0x7a107ae252ae577c7e90822f0aa2558a54b37b19a49f1b832616f2c18991635d" as const;

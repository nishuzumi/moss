// GENERATED FILE — do not edit by hand.
// ABI origin: vendored (ADR 0007). Full orderBookAbi from Kuru-Labs/ts-sdk
// commit 8588784c4d54183a04029cb1b513910c806905a9; see abis-src/ts-sdk/VENDOR.json.
// Only marketState is used; the newer trading interface is NOT used by this adapter.
import type { Abi } from "viem";

export const KuruStateOrderbookAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "__applyPostFillHookDecision",
    inputs: [
      {
        name: "refresh",
        type: "tuple",
        internalType: "struct OrderBookHooks.PostFillRefresh",
        components: [
          {
            name: "makerId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "filledSlotIdx",
            type: "uint8",
            internalType: "uint8"
          },
          {
            name: "filledOrderIsBuy",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "header",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "replenishWord",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "replacementWord",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "acceptOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "accountCore",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IAccountCore"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "authority",
    inputs: [],
    outputs: [
      {
        name: "beaconAuthority",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "baseSizeMultiplier",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "baseToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "batch",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "orders",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.NativeOrder[]",
        components: [
          {
            name: "side",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeSide"
          },
          {
            name: "quantity",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "price",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "tif",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeTif"
          },
          {
            name: "executionInstruction",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeExecInstruction"
          },
          {
            name: "minSizeAfterBlock",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "cancelSlotIdxs",
        type: "uint8[]",
        internalType: "uint8[]"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "batch",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "orders",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.NativeOrder[]",
        components: [
          {
            name: "side",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeSide"
          },
          {
            name: "quantity",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "price",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "tif",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeTif"
          },
          {
            name: "executionInstruction",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeExecInstruction"
          },
          {
            name: "minSizeAfterBlock",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "cancelSlotIdxs",
        type: "uint8[]",
        internalType: "uint8[]"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "builderConfig",
        type: "tuple",
        internalType: "struct ISpotOrderBook.BuilderConfig",
        components: [
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "feePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "batch",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "orders",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.NativeOrder[]",
        components: [
          {
            name: "side",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeSide"
          },
          {
            name: "quantity",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "price",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "tif",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeTif"
          },
          {
            name: "executionInstruction",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeExecInstruction"
          },
          {
            name: "minSizeAfterBlock",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "cancelSlotIdxs",
        type: "uint8[]",
        internalType: "uint8[]"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "batch",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "orders",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.NativeOrder[]",
        components: [
          {
            name: "side",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeSide"
          },
          {
            name: "quantity",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "price",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "tif",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeTif"
          },
          {
            name: "executionInstruction",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeExecInstruction"
          },
          {
            name: "minSizeAfterBlock",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "cancelSlotIdxs",
        type: "uint8[]",
        internalType: "uint8[]"
      },
      {
        name: "builderConfig",
        type: "tuple",
        internalType: "struct ISpotOrderBook.BuilderConfig",
        components: [
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "feePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "batchMintPassiveLiquidity",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "mints",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.PassiveMintParams[]",
        components: [
          {
            name: "lowPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "baseAmount",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "quoteAmount",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "minSharesOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.PassiveMintResult[]",
        components: [
          {
            name: "positionId",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "sharesOut",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "baseUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "quoteUsed",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bestBidAsk",
    inputs: [],
    outputs: [
      {
        name: "bid",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "ask",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "burnPassiveLiquidity",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "positionId",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "sharesToBurn",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [
      {
        name: "basePrincipalOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "quotePrincipalOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "baseFeeOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "quoteFeeOut",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancelAllOrders",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancelOwnershipTransfer",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "claimPassiveFees",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "positionId",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [
      {
        name: "baseFeeOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "quoteFeeOut",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "estimateSwap",
    inputs: [
      {
        name: "isBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "amountIn",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "builderFeePps",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        internalType: "struct ISpotOrderBook.SwapResult",
        components: [
          {
            name: "amountInUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "amountOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "estimateSwap",
    inputs: [
      {
        name: "isBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "amountIn",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        internalType: "struct ISpotOrderBook.SwapResult",
        components: [
          {
            name: "amountInUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "amountOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "estimateSwap",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "isBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "amountIn",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "builderFeePps",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        internalType: "struct ISpotOrderBook.SwapResult",
        components: [
          {
            name: "amountInUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "amountOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "estimateSwap",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "isBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "amountIn",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        internalType: "struct ISpotOrderBook.SwapResult",
        components: [
          {
            name: "amountInUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "amountOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getL2Book",
    inputs: [
      {
        name: "levels",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "bidPrices",
        type: "uint32[]",
        internalType: "uint32[]"
      },
      {
        name: "bidSizes",
        type: "uint96[]",
        internalType: "uint96[]"
      },
      {
        name: "askPrices",
        type: "uint32[]",
        internalType: "uint32[]"
      },
      {
        name: "askSizes",
        type: "uint96[]",
        internalType: "uint96[]"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getMarketParams",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getOrderId",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "slotIdx",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    outputs: [
      {
        name: "orderId",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getOrderMinSizeAfterBlock",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "slotIdx",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    outputs: [
      {
        name: "minSizeAfterBlock",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPassiveBand",
    inputs: [
      {
        name: "lowPrice",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    outputs: [
      {
        name: "band",
        type: "tuple",
        internalType: "struct ISpotOrderBook.PassiveBandView",
        components: [
          {
            name: "lowPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "highPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "quoteAtLow",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "baseAtHigh",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "totalShares",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "feeGrowthBasePerShareX128",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "feeGrowthQuotePerShareX128",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPassivePosition",
    inputs: [
      {
        name: "positionId",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [
      {
        name: "position",
        type: "tuple",
        internalType: "struct ISpotOrderBook.PassivePositionView",
        components: [
          {
            name: "ownerId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "lowPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "highPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "shares",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "lastFeeGrowthBaseX128",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "lastFeeGrowthQuoteX128",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPostFillHook",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "hook",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_owner",
        type: "address",
        internalType: "address"
      },
      {
        name: "_spotBalanceAccount",
        type: "address",
        internalType: "address"
      },
      {
        name: "_baseToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_quoteToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_sizePrecision",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "_pricePrecision",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_tickSize",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_passiveSpreadTicks",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_minQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "_maxQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "_takerFeePps",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_makerFeePps",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "lastTradeObservation",
    inputs: [],
    outputs: [
      {
        name: "priceX8",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "timestamp",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "makerFeePps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "makerLockedReserves",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "baseReserved",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "quoteReserved",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "marketState",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "enum IActiveOrderBook.MarketState"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "maxQuoteNotional",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "minQuoteNotional",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "mintPassiveLiquidity",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "lowPrice",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "baseAmount",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "quoteAmount",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [
      {
        name: "positionId",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "sharesOut",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "mintPassiveLiquidity",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "lowPrice",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "baseAmount",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "quoteAmount",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "minSharesOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [
      {
        name: "positionId",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "sharesOut",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "passiveSpreadTicks",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pendingOwner",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "postFillHookGasLimit",
    inputs: [],
    outputs: [
      {
        name: "gasLimit",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "postFillHookMinQuoteNotional",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "pricePrecision",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "primeMakerPage",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "slotsToPrime",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    outputs: [
      {
        name: "primedCount",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "primeQueuePages",
    inputs: [
      {
        name: "centerPrice",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "groupsAround",
        type: "uint8",
        internalType: "uint8"
      },
      {
        name: "wordsPerGroup",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    outputs: [
      {
        name: "pagesPrimed",
        type: "uint16",
        internalType: "uint16"
      },
      {
        name: "wordsPrimed",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "protocolCancelBySlots",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "slotIdxs",
        type: "uint8[]",
        internalType: "uint8[]"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "protocolCancelBySlots",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "slotIdxs",
        type: "uint8[]",
        internalType: "uint8[]"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "proxiableUUID",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "quoteToken",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "quoteTokenDecimals",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "replaceBySlotPacked",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "packedOps",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "builderConfig",
        type: "tuple",
        internalType: "struct ISpotOrderBook.BuilderConfig",
        components: [
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "feePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "replaceBySlotPacked",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "packedOps",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "replaceBySlotPacked",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "packedOps",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "builderConfig",
        type: "tuple",
        internalType: "struct ISpotOrderBook.BuilderConfig",
        components: [
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "feePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "replaceBySlotPacked",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "packedOps",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPostFillHook",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "hook",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPostFillHookGasLimit",
    inputs: [
      {
        name: "gasLimit",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPostFillHookMinQuoteNotional",
    inputs: [
      {
        name: "newMinQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "sizePrecision",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "spotBalanceAccount",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract ISpotBalanceAccount"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "spotBalanceAccountAddress",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "isBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "amountIn",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "minAmountOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "builderConfig",
        type: "tuple",
        internalType: "struct ISpotOrderBook.BuilderConfig",
        components: [
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "feePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        internalType: "struct ISpotOrderBook.SwapResult",
        components: [
          {
            name: "amountInUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "amountOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "swap",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "isBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "amountIn",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "minAmountOut",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "tuple",
        internalType: "struct ISpotOrderBook.SwapResult",
        components: [
          {
            name: "amountInUsed",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "amountOut",
            type: "uint128",
            internalType: "uint128"
          }
        ]
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "takerFeePps",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "tickSize",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "toggleMarket",
    inputs: [
      {
        name: "state",
        type: "uint8",
        internalType: "enum IActiveOrderBook.MarketState"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [
      {
        name: "newOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "upgradeToAndCall",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address"
      },
      {
        name: "data",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "event",
    name: "AuthorityUpdated",
    inputs: [
      {
        name: "oldAuthority",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newAuthority",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BookUpdatesPacked",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "packedUpdates",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MakerPagePrimed",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "primedCount",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MakerRegistered",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "MarketStateUpdated",
    inputs: [
      {
        name: "previousState",
        type: "uint8",
        indexed: false,
        internalType: "enum IActiveOrderBook.MarketState"
      },
      {
        name: "newState",
        type: "uint8",
        indexed: false,
        internalType: "enum IActiveOrderBook.MarketState"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferCanceled",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "canceledOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferStarted",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PassiveBandUpdated",
    inputs: [
      {
        name: "lowPrice",
        type: "uint32",
        indexed: true,
        internalType: "uint32"
      },
      {
        name: "baseAtHigh",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "quoteAtLow",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "totalShares",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PassiveFeesClaimed",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "positionId",
        type: "uint64",
        indexed: true,
        internalType: "uint64"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "baseFeeOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "quoteFeeOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PassiveLiquidityBurned",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "positionId",
        type: "uint64",
        indexed: true,
        internalType: "uint64"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "sharesBurned",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "basePrincipalOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "quotePrincipalOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "baseFeeOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "quoteFeeOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PassiveLiquidityMinted",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "positionId",
        type: "uint64",
        indexed: true,
        internalType: "uint64"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "lowPrice",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "baseAmount",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "quoteAmount",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "shares",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PostFillHookGasLimitUpdated",
    inputs: [
      {
        name: "oldGasLimit",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "newGasLimit",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "operator",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PostFillHookMinQuoteNotionalUpdated",
    inputs: [
      {
        name: "oldMinQuoteNotional",
        type: "uint96",
        indexed: false,
        internalType: "uint96"
      },
      {
        name: "newMinQuoteNotional",
        type: "uint96",
        indexed: false,
        internalType: "uint96"
      },
      {
        name: "operator",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PostFillHookUpdated",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "hook",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ProtocolOrdersCancelled",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "operator",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "slotIdxs",
        type: "uint8[]",
        indexed: false,
        internalType: "uint8[]"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "QueuePagesPrimed",
    inputs: [
      {
        name: "caller",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "centerPrice",
        type: "uint32",
        indexed: true,
        internalType: "uint32"
      },
      {
        name: "groupsAround",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      },
      {
        name: "wordsPerGroup",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      },
      {
        name: "pagesPrimed",
        type: "uint16",
        indexed: false,
        internalType: "uint16"
      },
      {
        name: "wordsPrimed",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SpotSwap",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "isBuy",
        type: "bool",
        indexed: true,
        internalType: "bool"
      },
      {
        name: "amountInUsed",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "amountOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "minAmountOut",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TradesPacked",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "executor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "effectiveTakerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "builder",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "builderFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "packedTrades",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Upgraded",
    inputs: [
      {
        name: "implementation",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "BuilderFeeTooHigh",
    inputs: []
  },
  {
    type: "error",
    name: "DuplicatePackedReplaceSlot",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientLiquidity",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidAuthority",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidBuilder",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidCollateral",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidExpireTime",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidMarketConfig",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidOwner",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPackedReplaceOp",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPostFillAction",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPostFillQuote",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPostFillReplacementSlot",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPostFillReplacementWord",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidPostFillReplenishWord",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidReserveBatch",
    inputs: []
  },
  {
    type: "error",
    name: "MarketFeeError",
    inputs: []
  },
  {
    type: "error",
    name: "MarketSizeError",
    inputs: []
  },
  {
    type: "error",
    name: "MarketStateError",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "OrderAlreadyFilledOrCancelled",
    inputs: []
  },
  {
    type: "error",
    name: "OrderSideMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "OrderSlotOccupied",
    inputs: []
  },
  {
    type: "error",
    name: "OwnershipTransferNotPending",
    inputs: []
  },
  {
    type: "error",
    name: "PassiveLiquidityCrossesBook",
    inputs: []
  },
  {
    type: "error",
    name: "PassiveShareRounding",
    inputs: []
  },
  {
    type: "error",
    name: "PassiveZeroConversion",
    inputs: []
  },
  {
    type: "error",
    name: "PositionNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "PostFillHookAccessDenied",
    inputs: []
  },
  {
    type: "error",
    name: "PostOnlyError",
    inputs: []
  },
  {
    type: "error",
    name: "PriceError",
    inputs: []
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: []
  },
  {
    type: "error",
    name: "SelfTrade",
    inputs: []
  },
  {
    type: "error",
    name: "SizeError",
    inputs: []
  },
  {
    type: "error",
    name: "SlippageExceeded",
    inputs: []
  },
  {
    type: "error",
    name: "SpotFeesExceedProceeds",
    inputs: []
  },
  {
    type: "error",
    name: "SpotMatchLifecycleError",
    inputs: []
  },
  {
    type: "error",
    name: "SpotTokenNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "TickSizeError",
    inputs: []
  },
  {
    type: "error",
    name: "TransientStorageCollision",
    inputs: []
  },
  {
    type: "error",
    name: "Uint128Overflow",
    inputs: []
  },
  {
    type: "error",
    name: "Uint96Overflow",
    inputs: []
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: []
  },
  {
    type: "error",
    name: "UnauthorizedCallContext",
    inputs: []
  },
  {
    type: "error",
    name: "UpgradeFailed",
    inputs: []
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: []
  },
  {
    type: "error",
    name: "ZeroAmount",
    inputs: []
  }
] as const satisfies Abi;

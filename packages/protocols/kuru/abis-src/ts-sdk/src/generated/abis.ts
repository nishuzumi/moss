// Committed ABIs from compiled contract artifacts.
import type { Abi } from "viem";

export const accountCoreAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "receive",
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "ACCOUNT_PERMISSION_ADMIN",
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
    name: "ACCOUNT_PERMISSION_INTERNAL_TRANSFER",
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
    name: "ACCOUNT_PERMISSION_TRADE",
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
    name: "ACCOUNT_PERMISSION_WITHDRAW",
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
    name: "APPROVED_WITHDRAWAL_TYPEHASH",
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
    name: "AUTHORIZE_ACCOUNT_SIGNER_TYPEHASH",
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
    name: "BUILDER_REFERRAL_AUTHORIZATION_TYPEHASH",
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
    name: "CREATE_SUBACCOUNT_TYPEHASH",
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
    name: "MAX_FEE_PPS",
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
    name: "MAX_SPOT_TOKEN_DECIMALS",
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
    name: "NATIVE_TOKEN_DECIMALS",
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
    name: "PPS_MULTIPLIER",
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
    name: "REVOKE_ACCOUNT_SIGNER_TYPEHASH",
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
    name: "accountAuthorizationEpoch",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
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
    name: "accountSignerAuthorizationNonces",
    inputs: [
      {
        name: "rootOwner",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "applySpotReserveDelta",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "reserveBid",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "reserveAsk",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "releaseBid",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "releaseAsk",
        type: "uint96",
        internalType: "uint96"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "approveBuilder",
    inputs: [
      {
        name: "builder",
        type: "address",
        internalType: "address"
      },
      {
        name: "maxFeePps",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "expiry",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "approvedWithdrawalNonces",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "authority",
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
    name: "authorizeAccountSigner",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      },
      {
        name: "signer",
        type: "address",
        internalType: "address"
      },
      {
        name: "permissions",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "expiry",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "authorizeAccountSignerBySig",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      },
      {
        name: "authorizer",
        type: "address",
        internalType: "address"
      },
      {
        name: "signer",
        type: "address",
        internalType: "address"
      },
      {
        name: "permissions",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "expiry",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bindWithdrawalLimiter",
    inputs: [
      {
        name: "limiter",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "builderReferralAuthorizationUsed",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "cancelOwnershipHandover",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "clearBuilderReferralByRootId",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "completeOwnershipHandover",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "configureSpotToken",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "enabled",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createSubaccount",
    inputs: [
      {
        name: "rootOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "subaccountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createSubaccountBySig",
    inputs: [
      {
        name: "rootOwner",
        type: "address",
        internalType: "address"
      },
      {
        name: "authorizer",
        type: "address",
        internalType: "address"
      },
      {
        name: "subaccountSeq",
        type: "uint16",
        internalType: "uint16"
      },
      {
        name: "authNonce",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "subaccountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "debitSpotPassiveInput",
    inputs: [
      {
        name: "takerId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "takerIsBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "rawInputAmount",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "defaultSpotFeesActive",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "defaultSpotMakerFeePps",
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
    name: "defaultSpotTakerFeePps",
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
    name: "deposit",
    inputs: [
      {
        name: "rootOwner",
        type: "address",
        internalType: "address"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "effectiveSpotMakerFeePps",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "marketMakerFeePps",
        type: "uint256",
        internalType: "uint256"
      }
    ],
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
    name: "effectiveSpotTakerFeePps",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "marketTakerFeePps",
        type: "uint256",
        internalType: "uint256"
      }
    ],
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
    name: "eip712Domain",
    inputs: [],
    outputs: [
      {
        name: "fields",
        type: "bytes1",
        internalType: "bytes1"
      },
      {
        name: "name",
        type: "string",
        internalType: "string"
      },
      {
        name: "version",
        type: "string",
        internalType: "string"
      },
      {
        name: "chainId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "verifyingContract",
        type: "address",
        internalType: "address"
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "extensions",
        type: "uint256[]",
        internalType: "uint256[]"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "enrollBuilderReferralBySig",
    inputs: [
      {
        name: "rootAccount",
        type: "address",
        internalType: "address"
      },
      {
        name: "builder",
        type: "address",
        internalType: "address"
      },
      {
        name: "makerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "takerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "referralExpiry",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "nonce",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "ensureRootAccount",
    inputs: [
      {
        name: "user",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "feeCollector",
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
    name: "finalizeSpotMatch",
    inputs: [
      {
        name: "activeFills",
        type: "tuple[]",
        internalType: "struct ISpotBalanceAccount.SpotFill[]",
        components: [
          {
            name: "userId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "baseAmount",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "quoteAmount",
            type: "uint128",
            internalType: "uint128"
          },
          {
            name: "makerIsBuy",
            type: "bool",
            internalType: "bool"
          },
          {
            name: "makerReserveConsumed",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "makerFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "passiveTotals",
        type: "tuple",
        internalType: "struct ISpotBalanceAccount.SpotPassiveTotals",
        components: [
          {
            name: "baseAmount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "quoteAmount",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      },
      {
        name: "takerId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "takerIsBuy",
        type: "bool",
        internalType: "bool"
      },
      {
        name: "effectiveTakerFeePps",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "builder",
        type: "address",
        internalType: "address"
      },
      {
        name: "builderFeePps",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    outputs: [
      {
        name: "amountInUsed",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "amountOut",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "fulfillApprovedWithdrawal",
    inputs: [
      {
        name: "withdrawal",
        type: "tuple",
        internalType: "struct IAccountCore.ApprovedWithdrawal",
        components: [
          {
            name: "account",
            type: "address",
            internalType: "address"
          },
          {
            name: "token",
            type: "address",
            internalType: "address"
          },
          {
            name: "recipient",
            type: "address",
            internalType: "address"
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "authorityEpoch",
            type: "uint64",
            internalType: "uint64"
          }
        ]
      },
      {
        name: "ownerSignature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getAccountFeeTierById",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "tier",
        type: "tuple",
        internalType: "struct IAccountCore.AccountFeeTier",
        components: [
          {
            name: "makerFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "takerFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "active",
            type: "bool",
            internalType: "bool"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getAccountOwner",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
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
    name: "getAccountRootId",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getAccountSubaccountSeq",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint16",
        internalType: "uint16"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "getBuilderApproval",
    inputs: [
      {
        name: "rootAccount",
        type: "address",
        internalType: "address"
      },
      {
        name: "builder",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IAccountCore.BuilderApproval",
        components: [
          {
            name: "maxFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "active",
            type: "bool",
            internalType: "bool"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getBuilderReferralById",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "referral",
        type: "tuple",
        internalType: "struct IAccountCore.BuilderReferral",
        components: [
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "makerFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "takerFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64"
          }
        ]
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getBuilderReferralTier",
    inputs: [
      {
        name: "builder",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct IAccountCore.BuilderReferralTier",
        components: [
          {
            name: "makerFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "takerFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "active",
            type: "bool",
            internalType: "bool"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getSpotReservedBalance",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "getSpotTokenDecimals",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "getSubaccounts",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint40[]",
        internalType: "uint40[]"
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
        name: "_feeCollector",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "invalidateApprovedWithdrawalNonce",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      },
      {
        name: "nextNonce",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "isAssetEnabledForSpot",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isAuthorizedAccountSignerById",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "signer",
        type: "address",
        internalType: "address"
      },
      {
        name: "permission",
        type: "uint32",
        internalType: "uint32"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "lockSpotPassiveLiquidity",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
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
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "result",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "ownershipHandoverExpiresAt",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "postFillHookAccess",
    inputs: [
      {
        name: "",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "protocolPaused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
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
    name: "registerSpotMarket",
    inputs: [
      {
        name: "orderBook",
        type: "address",
        internalType: "address"
      },
      {
        name: "baseToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "quoteToken",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "releaseSpotOrderReserve",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "releasedAmount",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "isBid",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "releaseSpotPassiveLiquidity",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        internalType: "uint40"
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
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "requestOwnershipHandover",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "revokeAccountSigner",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      },
      {
        name: "signer",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeAccountSignerBySig",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      },
      {
        name: "authorizer",
        type: "address",
        internalType: "address"
      },
      {
        name: "signer",
        type: "address",
        internalType: "address"
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeBuilder",
    inputs: [
      {
        name: "builder",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "revokeBuilderReferral",
    inputs: [
      {
        name: "rootAccount",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "rootAccountIdOf",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint40",
        internalType: "uint40"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setAccountFeeTierById",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "makerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "takerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setAccountFeeTiersById",
    inputs: [
      {
        name: "accountIds",
        type: "uint40[]",
        internalType: "uint40[]"
      },
      {
        name: "makerFeePps_",
        type: "uint32[]",
        internalType: "uint32[]"
      },
      {
        name: "takerFeePps_",
        type: "uint32[]",
        internalType: "uint32[]"
      },
      {
        name: "active",
        type: "bool[]",
        internalType: "bool[]"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setAuthority",
    inputs: [
      {
        name: "newAuthority",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setBuilderReferralTier",
    inputs: [
      {
        name: "builder",
        type: "address",
        internalType: "address"
      },
      {
        name: "makerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "takerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "expiry",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setDefaultSpotFees",
    inputs: [
      {
        name: "makerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "takerFeePps_",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "active",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setFeeCollector",
    inputs: [
      {
        name: "newFeeCollector",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPostFillHookAccess",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "allowed",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setSpotRouter",
    inputs: [
      {
        name: "newSpotRouter",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setTokenWithdrawalsFrozen",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "frozen",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setWithdrawalAuthority",
    inputs: [
      {
        name: "authority_",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setWithdrawalsFrozen",
    inputs: [
      {
        name: "frozen",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "spotOrderBookToBaseToken",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "spotOrderBookToQuoteToken",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "spotReservedBalance",
    inputs: [
      {
        name: "",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "spotRouterAddress",
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
    name: "spotTokenConfigs",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "decimals",
        type: "uint8",
        internalType: "uint8"
      },
      {
        name: "enabled",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "spotTokenEnabled",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "supportedSpotTokens",
    inputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
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
    name: "toggleProtocolState",
    inputs: [
      {
        name: "state",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "tokenWithdrawalsFrozen",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "transferBetweenAccounts",
    inputs: [
      {
        name: "fromAccountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "toAccountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
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
    stateMutability: "payable"
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
    type: "function",
    name: "validateBuilderConfigById",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
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
    ],
    outputs: [],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "verifiedSpotOrderBook",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "recipient",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "withdrawalAuthority",
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
    name: "withdrawalAuthorityEpoch",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "withdrawalLimiter",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IWithdrawalLimiter"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "withdrawalsFrozen",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "AccountFeeTierUpdated",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "makerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "takerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "AccountRegistered",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "rootAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "rootOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "subaccountSeq",
        type: "uint16",
        indexed: false,
        internalType: "uint16"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "AccountSignerAuthorized",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "signer",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "authorizer",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "permissions",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "expiry",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "AccountSignerRevoked",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "signer",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "authorizer",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ApprovedWithdrawalFulfilled",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ApprovedWithdrawalNonceUpdated",
    inputs: [
      {
        name: "account",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "nextNonce",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
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
    name: "BuilderApprovalUpdated",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "builder",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "maxFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "expiry",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BuilderFeeAccrued",
    inputs: [
      {
        name: "builder",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "asset",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "takerAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "orderBook",
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
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "BuilderReferralTierUpdated",
    inputs: [
      {
        name: "builder",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "makerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "takerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "expiry",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "BuilderReferralUpdated",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "builder",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "actor",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "makerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "takerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "expiry",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "DefaultSpotFeesUpdated",
    inputs: [
      {
        name: "makerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "takerFeePps",
        type: "uint24",
        indexed: false,
        internalType: "uint24"
      },
      {
        name: "active",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "Deposit",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "payer",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "FeeCollectorUpdated",
    inputs: [
      {
        name: "oldFeeCollector",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newFeeCollector",
        type: "address",
        indexed: true,
        internalType: "address"
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
    name: "InternalAccountTransfer",
    inputs: [
      {
        name: "fromAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "toAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "executor",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipHandoverCanceled",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipHandoverRequested",
    inputs: [
      {
        name: "pendingOwner",
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
        name: "oldOwner",
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
    name: "PostFillHookAccessUpdated",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "allowed",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "ProtocolStateUpdated",
    inputs: [
      {
        name: "previousPaused",
        type: "bool",
        indexed: false,
        internalType: "bool"
      },
      {
        name: "paused",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "SpotMarketRegistered",
    inputs: [
      {
        name: "orderBook",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "baseToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "quoteToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "registrar",
        type: "address",
        indexed: false,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SpotReserveUpdated",
    inputs: [
      {
        name: "userId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "freeBalance",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "reservedBalance",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SpotRouterUpdated",
    inputs: [
      {
        name: "oldRouter",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newRouter",
        type: "address",
        indexed: true,
        internalType: "address"
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
    name: "SpotTokenConfigured",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "decimals",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      },
      {
        name: "enabled",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "SubaccountCreated",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "subaccountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "authorizer",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenWithdrawalsFrozen",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "frozen",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    type: "event",
    name: "Withdrawal",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "recipient",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "WithdrawalAuthorityUpdated",
    inputs: [
      {
        name: "authority",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "epoch",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "WithdrawalLimiterBound",
    inputs: [
      {
        name: "limiter",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "WithdrawalsFrozen",
    inputs: [
      {
        name: "frozen",
        type: "bool",
        indexed: false,
        internalType: "bool"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "AccountNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "AlreadyInitialized",
    inputs: []
  },
  {
    type: "error",
    name: "AssetNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderApprovalExpired",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderApprovalNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderFeeTooHigh",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderReferralNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderReferralNotImproved",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderReferralTierMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "CannotAuthorizeOwner",
    inputs: []
  },
  {
    type: "error",
    name: "InexactAssetTransfer",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientBalance",
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
    name: "InvalidSignature",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalConfig",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalNonce",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalRecipient",
    inputs: []
  },
  {
    type: "error",
    name: "MarketFeeError",
    inputs: []
  },
  {
    type: "error",
    name: "NativeAssetMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "NewOwnerIsZeroAddress",
    inputs: []
  },
  {
    type: "error",
    name: "NoHandoverRequest",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "OnlySpotRouter",
    inputs: []
  },
  {
    type: "error",
    name: "OnlyVerifiedSpotOrderBook",
    inputs: []
  },
  {
    type: "error",
    name: "ProtocolPaused",
    inputs: []
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: []
  },
  {
    type: "error",
    name: "RootAccountRequired",
    inputs: []
  },
  {
    type: "error",
    name: "SameAccount",
    inputs: []
  },
  {
    type: "error",
    name: "SameRootRequired",
    inputs: []
  },
  {
    type: "error",
    name: "SpotFeesExceedProceeds",
    inputs: []
  },
  {
    type: "error",
    name: "SpotTokenNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "SubaccountLimitReached",
    inputs: []
  },
  {
    type: "error",
    name: "Unauthorized",
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
    name: "WithdrawalLimiterAlreadyBound",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalNotConfigured",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalsFrozen",
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

export const spotRouterAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "_assertInitializedSpotMarket",
    inputs: [
      {
        name: "proxy",
        type: "address",
        internalType: "address"
      },
      {
        name: "params",
        type: "tuple",
        internalType: "struct SpotRouter.SpotMarketParams",
        components: [
          {
            name: "baseToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "quoteToken",
            type: "address",
            internalType: "address"
          },
          {
            name: "pricePrecision",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "sizePrecision",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "tickSize",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "passiveSpreadTicks",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "minQuoteNotional",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "maxQuoteNotional",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "takerFeePps",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "makerFeePps",
            type: "uint256",
            internalType: "uint256"
          }
        ]
      }
    ],
    outputs: [],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "acceptOwnershipForContracts",
    inputs: [
      {
        name: "contracts",
        type: "address[]",
        internalType: "address[]"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "authority",
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
    name: "cancelOwnershipHandover",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "cancelOwnershipTransferForContracts",
    inputs: [
      {
        name: "contracts",
        type: "address[]",
        internalType: "address[]"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "completeOwnershipHandover",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "computeAddress",
    inputs: [
      {
        name: "baseToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "quoteToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "sizePrecision",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "pricePrecision",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "tickSize",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "passiveSpreadTicks",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "minQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "maxQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "takerFeePps",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "makerFeePps",
        type: "uint256",
        internalType: "uint256"
      }
    ],
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
    name: "deploySpotMarket",
    inputs: [
      {
        name: "baseToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "quoteToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "sizePrecision",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "pricePrecision",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "tickSize",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "passiveSpreadTicks",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "minQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "maxQuoteNotional",
        type: "uint96",
        internalType: "uint96"
      },
      {
        name: "takerFeePps",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "makerFeePps",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "proxy",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
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
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "result",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "ownershipHandoverExpiresAt",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
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
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "requestOwnershipHandover",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "setAuthority",
    inputs: [
      {
        name: "newAuthority",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setSpotOrderBookImplementation",
    inputs: [
      {
        name: "newImplementation",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
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
    name: "spotOrderBookImplementation",
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
    name: "toggleSpotMarkets",
    inputs: [
      {
        name: "orderBooks",
        type: "address[]",
        internalType: "address[]"
      },
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
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "transferOwnershipForContracts",
    inputs: [
      {
        name: "contracts",
        type: "address[]",
        internalType: "address[]"
      },
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
    name: "upgradeSpotMarkets",
    inputs: [
      {
        name: "orderBooks",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "newImplementation",
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
    type: "function",
    name: "verifiedSpotMarket",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "whitelistSpotToken",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "status",
        type: "bool",
        internalType: "bool"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "whitelistedSpotTokens",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
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
    name: "ManagedContractOwnershipTransferStarted",
    inputs: [
      {
        name: "managedContract",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "previousOwner",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
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
    name: "ManagedContractOwnershipTransferred",
    inputs: [
      {
        name: "managedContract",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "previousOwner",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
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
    name: "OwnershipHandoverCanceled",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipHandoverRequested",
    inputs: [
      {
        name: "pendingOwner",
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
        name: "oldOwner",
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
    name: "SpotMarketRegistered",
    inputs: [
      {
        name: "orderBook",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "baseToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "quoteToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "operator",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "sizePrecision",
        type: "uint96",
        indexed: false,
        internalType: "uint96"
      },
      {
        name: "pricePrecision",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "minQuoteNotional",
        type: "uint96",
        indexed: false,
        internalType: "uint96"
      },
      {
        name: "tickSize",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "passiveSpreadTicks",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "quoteTokenDecimals",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      },
      {
        name: "takerFeePps",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "makerFeePps",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SpotMarketStateUpdated",
    inputs: [
      {
        name: "orderBook",
        type: "address",
        indexed: true,
        internalType: "address"
      },
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
    name: "SpotMarketUpgraded",
    inputs: [
      {
        name: "orderBook",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newImplementation",
        type: "address",
        indexed: false,
        internalType: "address"
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
    name: "SpotOBImplementationUpdated",
    inputs: [
      {
        name: "oldImplementation",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "newImplementation",
        type: "address",
        indexed: false,
        internalType: "address"
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
    name: "SpotTokenWhitelisted",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "status",
        type: "bool",
        indexed: false,
        internalType: "bool"
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
    name: "AlreadyInitialized",
    inputs: []
  },
  {
    type: "error",
    name: "Create2EmptyBytecode",
    inputs: []
  },
  {
    type: "error",
    name: "FailedDeployment",
    inputs: []
  },
  {
    type: "error",
    name: "ImplementationNotChanged",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      {
        name: "balance",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "needed",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidAuthority",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidImplementation",
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
    name: "MarketNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "MarketStateError",
    inputs: []
  },
  {
    type: "error",
    name: "NewOwnerIsZeroAddress",
    inputs: []
  },
  {
    type: "error",
    name: "NoHandoverRequest",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "SpotTokenNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "SpotTokenNotWhitelisted",
    inputs: []
  },
  {
    type: "error",
    name: "Unauthorized",
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
  }
] as const satisfies Abi;

export const orderBookAbi = [
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

export const spotPeripheryAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_accountCore",
        type: "address",
        internalType: "contract IAccountCore"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "receive",
    stateMutability: "payable"
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
    name: "deposit",
    inputs: [
      {
        name: "rootOwner",
        type: "address",
        internalType: "address"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      {
        name: "rootAccountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "estimateSwap",
    inputs: [
      {
        name: "market",
        type: "address",
        internalType: "address"
      },
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
        name: "market",
        type: "address",
        internalType: "address"
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
    name: "estimateSwap",
    inputs: [
      {
        name: "market",
        type: "address",
        internalType: "address"
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
        name: "market",
        type: "address",
        internalType: "address"
      },
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
    name: "estimateSwaps",
    inputs: [
      {
        name: "markets",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "isBuy",
        type: "bool[]",
        internalType: "bool[]"
      },
      {
        name: "amountIn",
        type: "uint128[]",
        internalType: "uint128[]"
      },
      {
        name: "builderFeePps",
        type: "uint32[]",
        internalType: "uint32[]"
      }
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.SwapResult[]",
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
    name: "estimateSwaps",
    inputs: [
      {
        name: "markets",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "userIds",
        type: "uint40[]",
        internalType: "uint40[]"
      },
      {
        name: "isBuy",
        type: "bool[]",
        internalType: "bool[]"
      },
      {
        name: "amountIn",
        type: "uint128[]",
        internalType: "uint128[]"
      },
      {
        name: "builderFeePps",
        type: "uint32[]",
        internalType: "uint32[]"
      }
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.SwapResult[]",
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
    name: "estimateSwaps",
    inputs: [
      {
        name: "markets",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "userIds",
        type: "uint40[]",
        internalType: "uint40[]"
      },
      {
        name: "isBuy",
        type: "bool[]",
        internalType: "bool[]"
      },
      {
        name: "amountIn",
        type: "uint128[]",
        internalType: "uint128[]"
      }
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.SwapResult[]",
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
    name: "estimateSwaps",
    inputs: [
      {
        name: "markets",
        type: "address[]",
        internalType: "address[]"
      },
      {
        name: "isBuy",
        type: "bool[]",
        internalType: "bool[]"
      },
      {
        name: "amountIn",
        type: "uint128[]",
        internalType: "uint128[]"
      }
    ],
    outputs: [
      {
        name: "results",
        type: "tuple[]",
        internalType: "struct ISpotOrderBook.SwapResult[]",
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
    type: "error",
    name: "LengthMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "NativeAssetMismatch",
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

export const erc20MetadataAbi = [
  {
    type: "function",
    name: "allowance",
    inputs: [
      {
        name: "owner",
        type: "address",
        internalType: "address"
      },
      {
        name: "spender",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "approve",
    inputs: [
      {
        name: "spender",
        type: "address",
        internalType: "address"
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [
      {
        name: "account",
        type: "address",
        internalType: "address"
      }
    ],
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
    name: "decimals",
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
    name: "name",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "totalSupply",
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
    name: "transfer",
    inputs: [
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "transferFrom",
    inputs: [
      {
        name: "from",
        type: "address",
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        internalType: "address"
      },
      {
        name: "value",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "event",
    name: "Approval",
    inputs: [
      {
        name: "owner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "spender",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "value",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  }
] as const satisfies Abi;

export const kuruTradingWalletAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_accountCore",
        type: "address",
        internalType: "contract IAccountCore"
      },
      {
        name: "_keeperAuthority",
        type: "address",
        internalType: "contract IKeeperAuthority"
      },
      {
        name: "_maxFutureNonceSkewMillis",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "ACCOUNT_PERMISSION_TRADE",
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
    name: "ANY_ORDER_ID",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "BATCH_INTENT_TYPEHASH",
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
    name: "CANCEL_ALL_TYPEHASH",
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
    name: "CANCEL_ORDERS_BY_ID_TYPEHASH",
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
    name: "CANCEL_TRIGGER_TYPEHASH",
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
    name: "CANCEL_TWAP_TYPEHASH",
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
    name: "CREATE_BATCH_TRIGGER_TYPEHASH",
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
    name: "CREATE_FOK_SWAP_TRIGGER_TYPEHASH",
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
    name: "CREATE_REPLACE_TRIGGER_TYPEHASH",
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
    name: "CREATE_TWAP_TYPEHASH",
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
    name: "EMIT_SIGNED_DATA_TYPEHASH",
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
    name: "FOK_SWAP_TYPEHASH",
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
    name: "REPLACE_BY_SLOT_INTENT_TYPEHASH",
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
    name: "cancelTrigger",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "authNonce",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "nonce",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "triggerId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancelTwap",
    inputs: [
      {
        name: "accountId",
        type: "uint40",
        internalType: "uint40"
      },
      {
        name: "authNonce",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "nonce",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "twapId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createBatchTrigger",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "triggerExpiry",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "conditionHash",
        type: "bytes32",
        internalType: "bytes32"
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
        name: "expectedOrderIds",
        type: "uint64[]",
        internalType: "uint64[]"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "triggerId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createFokSwapTrigger",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "triggerExpiry",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "conditionHash",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "order",
        type: "tuple",
        internalType: "struct KuruTradingWallet.FokOrder",
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
            name: "limitPrice",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "triggerId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createReplaceTrigger",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "triggerExpiry",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "conditionHash",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "packedOps",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "expectedOrderIds",
        type: "uint64[]",
        internalType: "uint64[]"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "triggerId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createTwap",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "config",
        type: "tuple",
        internalType: "struct KuruTradingWallet.TwapConfig",
        components: [
          {
            name: "side",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeSide"
          },
          {
            name: "totalQuantity",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "limitPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "startTime",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "intervalSeconds",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "sliceCount",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "twapId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "eip712Domain",
    inputs: [],
    outputs: [
      {
        name: "fields",
        type: "bytes1",
        internalType: "bytes1"
      },
      {
        name: "name",
        type: "string",
        internalType: "string"
      },
      {
        name: "version",
        type: "string",
        internalType: "string"
      },
      {
        name: "chainId",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "verifyingContract",
        type: "address",
        internalType: "address"
      },
      {
        name: "salt",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "extensions",
        type: "uint256[]",
        internalType: "uint256[]"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "emitSignedData",
    inputs: [
      {
        name: "data",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "nonce",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "deadline",
        type: "uint64",
        internalType: "uint64"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "digest",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeBatch",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
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
        name: "expectedOrderIds",
        type: "uint64[]",
        internalType: "uint64[]"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "intentHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeCancelAll",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "intentHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeCancelOrdersById",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "orderIds",
        type: "uint64[]",
        internalType: "uint64[]"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "intentHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeFokSwap",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "order",
        type: "tuple",
        internalType: "struct KuruTradingWallet.FokOrder",
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
            name: "limitPrice",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "intentHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeReplaceBySlotPacked",
    inputs: [
      {
        name: "header",
        type: "tuple",
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "packedOps",
        type: "bytes",
        internalType: "bytes"
      },
      {
        name: "expectedOrderIds",
        type: "uint64[]",
        internalType: "uint64[]"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "intentHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeTrigger",
    inputs: [
      {
        name: "triggerId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "executionReportHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "executeTwapSlice",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "executionReportHash",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "finalizeTwap",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getTrigger",
    inputs: [
      {
        name: "triggerId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct KuruTradingWallet.TriggerOrder",
        components: [
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "action",
            type: "uint8",
            internalType: "enum KuruTradingWallet.TriggerAction"
          },
          {
            name: "status",
            type: "uint8",
            internalType: "enum KuruTradingWallet.TriggerStatus"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "expiry",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "payload",
            type: "bytes",
            internalType: "bytes"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getTwap",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        internalType: "bytes32"
      }
    ],
    outputs: [
      {
        name: "twap",
        type: "tuple",
        internalType: "struct KuruTradingWallet.TwapState",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "config",
            type: "tuple",
            internalType: "struct KuruTradingWallet.TwapConfig",
            components: [
              {
                name: "side",
                type: "uint8",
                internalType: "enum ISpotOrderBook.NativeSide"
              },
              {
                name: "totalQuantity",
                type: "uint96",
                internalType: "uint96"
              },
              {
                name: "limitPrice",
                type: "uint32",
                internalType: "uint32"
              },
              {
                name: "startTime",
                type: "uint64",
                internalType: "uint64"
              },
              {
                name: "intervalSeconds",
                type: "uint32",
                internalType: "uint32"
              },
              {
                name: "sliceCount",
                type: "uint32",
                internalType: "uint32"
              }
            ]
          },
          {
            name: "status",
            type: "uint8",
            internalType: "enum KuruTradingWallet.TwapStatus"
          },
          {
            name: "nextSliceIndex",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "successfulSliceCount",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isValidSignature",
    inputs: [
      {
        name: "hash",
        type: "bytes32",
        internalType: "bytes32"
      },
      {
        name: "signature",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bytes4",
        internalType: "bytes4"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "keeperAuthority",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract IKeeperAuthority"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "lastSeenOrderNonce",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "maxFutureNonceSkewMillis",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "signedDataNonce",
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
    name: "usedTriggerNonce",
    inputs: [
      {
        name: "nonce",
        type: "uint64",
        internalType: "uint64"
      }
    ],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "IntentExecuted",
    inputs: [
      {
        name: "intentHash",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "market",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "nonce",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "SignedDataEmitted",
    inputs: [
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "nonce",
        type: "uint256",
        indexed: true,
        internalType: "uint256"
      },
      {
        name: "data",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TriggerCanceled",
    inputs: [
      {
        name: "triggerId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TriggerCreated",
    inputs: [
      {
        name: "triggerId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "market",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "clientOrderId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "nonce",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "expiry",
        type: "uint64",
        indexed: false,
        internalType: "uint64"
      },
      {
        name: "conditionHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "action",
        type: "uint8",
        indexed: false,
        internalType: "enum KuruTradingWallet.TriggerAction"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TriggerExpired",
    inputs: [
      {
        name: "triggerId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TriggerFired",
    inputs: [
      {
        name: "triggerId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "keeper",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "executionReportHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TwapCanceled",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TwapCreated",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "wallet",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "accountId",
        type: "uint40",
        indexed: true,
        internalType: "uint40"
      },
      {
        name: "header",
        type: "tuple",
        indexed: false,
        internalType: "struct KuruTradingWallet.IntentHeader",
        components: [
          {
            name: "accountId",
            type: "uint40",
            internalType: "uint40"
          },
          {
            name: "market",
            type: "address",
            internalType: "address"
          },
          {
            name: "authNonce",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "nonce",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "deadline",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "clientOrderId",
            type: "bytes32",
            internalType: "bytes32"
          },
          {
            name: "builder",
            type: "address",
            internalType: "address"
          },
          {
            name: "builderFeePps",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      },
      {
        name: "config",
        type: "tuple",
        indexed: false,
        internalType: "struct KuruTradingWallet.TwapConfig",
        components: [
          {
            name: "side",
            type: "uint8",
            internalType: "enum ISpotOrderBook.NativeSide"
          },
          {
            name: "totalQuantity",
            type: "uint96",
            internalType: "uint96"
          },
          {
            name: "limitPrice",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "startTime",
            type: "uint64",
            internalType: "uint64"
          },
          {
            name: "intervalSeconds",
            type: "uint32",
            internalType: "uint32"
          },
          {
            name: "sliceCount",
            type: "uint32",
            internalType: "uint32"
          }
        ]
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TwapFinished",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "successfulSliceCount",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "skippedSliceCount",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TwapSliceExecuted",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "keeper",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "sliceIndex",
        type: "uint32",
        indexed: true,
        internalType: "uint32"
      },
      {
        name: "requestedQuantity",
        type: "uint96",
        indexed: false,
        internalType: "uint96"
      },
      {
        name: "childClientOrderId",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      },
      {
        name: "executionReportHash",
        type: "bytes32",
        indexed: false,
        internalType: "bytes32"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TwapSlicesSkipped",
    inputs: [
      {
        name: "twapId",
        type: "bytes32",
        indexed: true,
        internalType: "bytes32"
      },
      {
        name: "fromSlice",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "toSlice",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "AccountNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "DeadlineExpired",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidBuilder",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidExpireTime",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidOrderIds",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidSignature",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidSignedDataNonce",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidTwapSchedule",
    inputs: []
  },
  {
    type: "error",
    name: "NonceTooFarInFuture",
    inputs: []
  },
  {
    type: "error",
    name: "NonceTooLow",
    inputs: []
  },
  {
    type: "error",
    name: "OrderIdBindingLengthMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "OrderIdNotFound",
    inputs: [
      {
        name: "orderId",
        type: "uint64",
        internalType: "uint64"
      }
    ]
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: []
  },
  {
    type: "error",
    name: "StaleAuthorizationEpoch",
    inputs: []
  },
  {
    type: "error",
    name: "TriggerNonceUsed",
    inputs: []
  },
  {
    type: "error",
    name: "TriggerNotActive",
    inputs: []
  },
  {
    type: "error",
    name: "TwapExpired",
    inputs: []
  },
  {
    type: "error",
    name: "TwapNotActive",
    inputs: []
  },
  {
    type: "error",
    name: "TwapNotDue",
    inputs: []
  },
  {
    type: "error",
    name: "TwapNotExpired",
    inputs: []
  },
  {
    type: "error",
    name: "TwapSliceAlreadyExecuted",
    inputs: []
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: []
  },
  {
    type: "error",
    name: "UnauthorizedKeeper",
    inputs: []
  },
  {
    type: "error",
    name: "UnexpectedSlotOrderId",
    inputs: []
  },
  {
    type: "error",
    name: "UnverifiedSpotMarket",
    inputs: []
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: []
  }
] as const satisfies Abi;

export const withdrawalLimiterAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "accountCore_",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "CHECKPOINT_CAPACITY",
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
    name: "WINDOW",
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
    name: "accountCore",
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
    name: "cancelOwnershipHandover",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "capacityUsd18",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "checkApprovedWithdrawal",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "completeOwnershipHandover",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "flowStarted",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getCapacityState",
    inputs: [],
    outputs: [
      {
        name: "state",
        type: "tuple",
        internalType: "struct IWithdrawalLimiter.CapacityState",
        components: [
          {
            name: "depositCreditUsd36",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "dripCreditUsd36",
            type: "uint256",
            internalType: "uint256"
          },
          {
            name: "availableUsd36",
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
    name: "initialize",
    inputs: [
      {
        name: "owner_",
        type: "address",
        internalType: "address"
      },
      {
        name: "capacityUsd18_",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "ratePerSecondUsd18_",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [
      {
        name: "result",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "ownershipHandoverExpiresAt",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "result",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "previewWithdrawal",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [
      {
        name: "requiredUsd36",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "availableUsd36",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "withinLimit",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "priceSource",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "source",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
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
    name: "ratePerSecondUsd18",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "recordDeposit",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "decimals",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "recordWithdrawal",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "decimals",
        type: "uint8",
        internalType: "uint8"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "renounceOwnership",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "requestOwnershipHandover",
    inputs: [],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "requireFreshPrice",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setDripConfig",
    inputs: [
      {
        name: "capacityUsd18_",
        type: "uint128",
        internalType: "uint128"
      },
      {
        name: "ratePerSecondUsd18_",
        type: "uint128",
        internalType: "uint128"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setPriceSource",
    inputs: [
      {
        name: "token",
        type: "address",
        internalType: "address"
      },
      {
        name: "source",
        type: "address",
        internalType: "address"
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
    stateMutability: "payable"
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
    name: "DepositCreditRecorded",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "valueUsd36",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "cumulativeDepositsUsd36",
        type: "uint192",
        indexed: false,
        internalType: "uint192"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "DripConfigUpdated",
    inputs: [
      {
        name: "capacityUsd18",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
      },
      {
        name: "ratePerSecondUsd18",
        type: "uint128",
        indexed: false,
        internalType: "uint128"
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
    name: "OwnershipHandoverCanceled",
    inputs: [
      {
        name: "pendingOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "OwnershipHandoverRequested",
    inputs: [
      {
        name: "pendingOwner",
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
        name: "oldOwner",
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
    name: "PriceSourceUpdated",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "oldSource",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newSource",
        type: "address",
        indexed: true,
        internalType: "address"
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
    type: "event",
    name: "WithdrawalCapacityConsumed",
    inputs: [
      {
        name: "token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "valueUsd36",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "depositUsedUsd36",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "dripUsedUsd36",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false
  },
  {
    type: "error",
    name: "AlreadyInitialized",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidInitialization",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalConfig",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalHistory",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalPrice",
    inputs: []
  },
  {
    type: "error",
    name: "NewOwnerIsZeroAddress",
    inputs: []
  },
  {
    type: "error",
    name: "NoHandoverRequest",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "OnlyAccountCore",
    inputs: []
  },
  {
    type: "error",
    name: "Unauthorized",
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
    name: "WithdrawalFlowStarted",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalLimitExceeded",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalValueOverflow",
    inputs: []
  },
  {
    type: "error",
    name: "ZeroAddress",
    inputs: []
  }
] as const satisfies Abi;

export const contractAbis = {
  AccountCore: accountCoreAbi,
  SpotRouter: spotRouterAbi,
  OrderBook: orderBookAbi,
  SpotPeriphery: spotPeripheryAbi,
  IERC20Metadata: erc20MetadataAbi,
  KuruTradingWallet: kuruTradingWalletAbi,
  WithdrawalLimiter: withdrawalLimiterAbi
} as const;
export type ContractName = keyof typeof contractAbis;

export const kuruErrorAbi = [
  {
    type: "error",
    name: "AccountNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "AlreadyInitialized",
    inputs: []
  },
  {
    type: "error",
    name: "AssetNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderApprovalExpired",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderApprovalNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderFeeTooHigh",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderReferralNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderReferralNotImproved",
    inputs: []
  },
  {
    type: "error",
    name: "BuilderReferralTierMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "CannotAuthorizeOwner",
    inputs: []
  },
  {
    type: "error",
    name: "InexactAssetTransfer",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientBalance",
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
    name: "InvalidSignature",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalConfig",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalNonce",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalRecipient",
    inputs: []
  },
  {
    type: "error",
    name: "MarketFeeError",
    inputs: []
  },
  {
    type: "error",
    name: "NativeAssetMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "NewOwnerIsZeroAddress",
    inputs: []
  },
  {
    type: "error",
    name: "NoHandoverRequest",
    inputs: []
  },
  {
    type: "error",
    name: "NotInitializing",
    inputs: []
  },
  {
    type: "error",
    name: "OnlySpotRouter",
    inputs: []
  },
  {
    type: "error",
    name: "OnlyVerifiedSpotOrderBook",
    inputs: []
  },
  {
    type: "error",
    name: "ProtocolPaused",
    inputs: []
  },
  {
    type: "error",
    name: "Reentrancy",
    inputs: []
  },
  {
    type: "error",
    name: "RootAccountRequired",
    inputs: []
  },
  {
    type: "error",
    name: "SameAccount",
    inputs: []
  },
  {
    type: "error",
    name: "SameRootRequired",
    inputs: []
  },
  {
    type: "error",
    name: "SpotFeesExceedProceeds",
    inputs: []
  },
  {
    type: "error",
    name: "SpotTokenNotEnabled",
    inputs: []
  },
  {
    type: "error",
    name: "SubaccountLimitReached",
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
    name: "WithdrawalLimiterAlreadyBound",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalNotConfigured",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalsFrozen",
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
  },
  {
    type: "error",
    name: "Create2EmptyBytecode",
    inputs: []
  },
  {
    type: "error",
    name: "FailedDeployment",
    inputs: []
  },
  {
    type: "error",
    name: "ImplementationNotChanged",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      {
        name: "balance",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "needed",
        type: "uint256",
        internalType: "uint256"
      }
    ]
  },
  {
    type: "error",
    name: "InvalidImplementation",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidOwner",
    inputs: []
  },
  {
    type: "error",
    name: "MarketNotFound",
    inputs: []
  },
  {
    type: "error",
    name: "MarketStateError",
    inputs: []
  },
  {
    type: "error",
    name: "SpotTokenNotWhitelisted",
    inputs: []
  },
  {
    type: "error",
    name: "DuplicatePackedReplaceSlot",
    inputs: []
  },
  {
    type: "error",
    name: "InsufficientLiquidity",
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
    name: "MarketSizeError",
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
    name: "SpotMatchLifecycleError",
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
    name: "LengthMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "DeadlineExpired",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidOrderIds",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidSignedDataNonce",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidTwapSchedule",
    inputs: []
  },
  {
    type: "error",
    name: "NonceTooFarInFuture",
    inputs: []
  },
  {
    type: "error",
    name: "NonceTooLow",
    inputs: []
  },
  {
    type: "error",
    name: "OrderIdBindingLengthMismatch",
    inputs: []
  },
  {
    type: "error",
    name: "OrderIdNotFound",
    inputs: [
      {
        name: "orderId",
        type: "uint64",
        internalType: "uint64"
      }
    ]
  },
  {
    type: "error",
    name: "StaleAuthorizationEpoch",
    inputs: []
  },
  {
    type: "error",
    name: "TriggerNonceUsed",
    inputs: []
  },
  {
    type: "error",
    name: "TriggerNotActive",
    inputs: []
  },
  {
    type: "error",
    name: "TwapExpired",
    inputs: []
  },
  {
    type: "error",
    name: "TwapNotActive",
    inputs: []
  },
  {
    type: "error",
    name: "TwapNotDue",
    inputs: []
  },
  {
    type: "error",
    name: "TwapNotExpired",
    inputs: []
  },
  {
    type: "error",
    name: "TwapSliceAlreadyExecuted",
    inputs: []
  },
  {
    type: "error",
    name: "UnauthorizedKeeper",
    inputs: []
  },
  {
    type: "error",
    name: "UnexpectedSlotOrderId",
    inputs: []
  },
  {
    type: "error",
    name: "UnverifiedSpotMarket",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalHistory",
    inputs: []
  },
  {
    type: "error",
    name: "InvalidWithdrawalPrice",
    inputs: []
  },
  {
    type: "error",
    name: "OnlyAccountCore",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalFlowStarted",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalLimitExceeded",
    inputs: []
  },
  {
    type: "error",
    name: "WithdrawalValueOverflow",
    inputs: []
  }
] as const satisfies Abi;

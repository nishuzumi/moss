// ABI origin: explorer (ADR 0007)
//   Source:    https://monadscan.com/address/0x856A4019228c265DEE336DF705277607c4A18e1B
//   Endpoint:  Etherscan V2 (chainid=143, module=contract, action=getabi)
//   Retrieved: 2026-07-23 (UTC)

export const ShMonadAbi = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "AgentInstantUncommittingDisallowed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "accountsLength",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountsLength",
        "type": "uint256"
      }
    ],
    "name": "BatchHoldAccountAmountLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "accountsLength",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountsLength",
        "type": "uint256"
      }
    ],
    "name": "BatchReleaseAccountAmountLengthMismatch",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotUnstakeZeroShares",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "CoinbaseAlreadyDeployed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CommissionMustBeBelow100Percent",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CommitRecipientCannotBeZeroAddress",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "currentEpoch",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "completionEpoch",
        "type": "uint256"
      }
    ],
    "name": "CompletionEpochNotReached",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Create2Failed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      }
    ],
    "name": "CustomCoinbaseCantBeContract",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "ERC2612ExpiredSignature",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "signer",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ERC2612InvalidSigner",
    "type": "error"
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
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "max",
        "type": "uint256"
      }
    ],
    "name": "ERC4626ExceededMaxDeposit",
    "type": "error"
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
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "max",
        "type": "uint256"
      }
    ],
    "name": "ERC4626ExceededMaxMint",
    "type": "error"
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
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "max",
        "type": "uint256"
      }
    ],
    "name": "ERC4626ExceededMaxRedeem",
    "type": "error"
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
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "max",
        "type": "uint256"
      }
    ],
    "name": "ERC4626ExceededMaxWithdraw",
    "type": "error"
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
        "name": "netAssets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minNetAssets",
        "type": "uint256"
      }
    ],
    "name": "ERC4626RedeemSlippageExceeded",
    "type": "error"
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
        "name": "sharesRequired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maxBurntShares",
        "type": "uint256"
      }
    ],
    "name": "ERC4626WithdrawSlippageExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FeeCurveFullUtilizationExceedsRay",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IncorrectNativeTokenAmountSent",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requested",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      }
    ],
    "name": "InsufficientAccumulatedCommission",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requestedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "availableAmount",
        "type": "uint256"
      }
    ],
    "name": "InsufficientBalanceAtomicUnstakingPool",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientBalanceForUnstake",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "committed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "holdRequested",
        "type": "uint256"
      }
    ],
    "name": "InsufficientCommittedForHold",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "committed",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "uncommitting",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "held",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "requested",
        "type": "uint128"
      }
    ],
    "name": "InsufficientFunds",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requested",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      }
    ],
    "name": "InsufficientPoolLiquidity",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "requestedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "availableReserved",
        "type": "uint256"
      }
    ],
    "name": "InsufficientReservedLiquidity",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "approved",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "requested",
        "type": "uint256"
      }
    ],
    "name": "InsufficientUncommitApproval",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "requested",
        "type": "uint256"
      }
    ],
    "name": "InsufficientUncommittedBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "requested",
        "type": "uint256"
      }
    ],
    "name": "InsufficientUncommittingBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint128",
        "name": "committed",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "held",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "requested",
        "type": "uint128"
      }
    ],
    "name": "InsufficientUnheldCommittedBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "requested",
        "type": "uint256"
      }
    ],
    "name": "InsufficientZeroYieldBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "currentNonce",
        "type": "uint256"
      }
    ],
    "name": "InvalidAccountNonce",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "feeRate",
        "type": "uint256"
      }
    ],
    "name": "InvalidFeeRate",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidUncommitCompletor",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "InvalidValidatorAddress",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      }
    ],
    "name": "InvalidValidatorId",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LegacyAtomicStateDetected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LegacyDelegationsDetected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LegacyDelegationsPaginationIncomplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LegacyLiabilitiesDetected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LegacyStakeDetected",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoUnstakeRequestFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitializing",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "NotPolicyAgent",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotWhenClosed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotWhenFrozen",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "OnlyCoinbaseAuth",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
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
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PercentageMustBeBelow100Percent",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "PolicyAgentAlreadyExists",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "PolicyAgentNotFound",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "name": "PolicyInactive",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "name": "PolicyNeedsAtLeastOneAgent",
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
    "inputs": [],
    "name": "SlopeRateExceedsRay",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TargetLiquidityCannotExceed100Percent",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint32",
        "name": "requestedPeriodDuration",
        "type": "uint32"
      },
      {
        "internalType": "uint32",
        "name": "minPeriodDuration",
        "type": "uint32"
      }
    ],
    "name": "TopUpPeriodDurationTooShort",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedInitializer",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "uncommittingCompleteBlock",
        "type": "uint256"
      }
    ],
    "name": "UncommittingPeriodIncomplete",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ValidatorAlreadyAdded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ValidatorAlreadyDeactivated",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "availableMON",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "targetStakeMON",
        "type": "uint256"
      }
    ],
    "name": "ValidatorAvailableExceedsTargetStake",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ValidatorDeactivationNotQueued",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ValidatorDeactivationQueuedIncomplete",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "ValidatorNotFoundInPrecompile",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ValidatorNotFullyRemoved",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WillOverflowOnBitshift",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "YInterceptExceedsRay",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "AddPolicyAgent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "AdminCommissionClaimedAsShares",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "payor",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "agent",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "msgValue",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gasLimit",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actualPayorCost",
        "type": "uint256"
      }
    ],
    "name": "AgentExecuteWithSponsor",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
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
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "AgentTransferFromCommitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
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
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "AgentTransferToUncommitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
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
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "AgentWithdrawFromCommitted",
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
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "yieldOriginator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "sharesBurned",
        "type": "bool"
      }
    ],
    "name": "BoostYield",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "oldCoinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "newCoinbase",
        "type": "address"
      }
    ],
    "name": "CoinbaseContractUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "Commit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "CompleteUncommit",
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
        "internalType": "uint256",
        "name": "amountMon",
        "type": "uint256"
      }
    ],
    "name": "CompleteUnstake",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "CrankSkippedOnValidatorIdZero",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint48",
        "name": "escrowDuration",
        "type": "uint48"
      }
    ],
    "name": "CreatePolicy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "vShares",
        "type": "uint256"
      }
    ],
    "name": "Delegate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
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
        "name": "sender",
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
        "name": "assets",
        "type": "uint256"
      }
    ],
    "name": "DepositToZeroYieldTranche",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "name": "DisablePolicy",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "EIP712DomainChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldSlopeRateRay",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldYInterceptRay",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newSlopeRateRay",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newYInterceptRay",
        "type": "uint256"
      }
    ],
    "name": "FeeCurveUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "InactiveValidatorRewardsRedirected",
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
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "globalEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedWithdrawAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actualWithdrawAmount",
        "type": "uint256"
      }
    ],
    "name": "InsufficientActiveDelegatedBalance",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actualAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalSupply",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actionIndex",
        "type": "uint256"
      }
    ],
    "name": "InsufficientLocalBalance",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "globalEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "targetStakeAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "netAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "inActiveSetCurrent",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "inActiveSetLast",
        "type": "bool"
      }
    ],
    "name": "LowValidatorStakeDeltaNetZero",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "globalEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "targetStakeAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "netAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "inActiveSetCurrent",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "inActiveSetLast",
        "type": "bool"
      }
    ],
    "name": "LowValidatorStakeDeltaOnDecrease",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "globalEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "targetStakeAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "netAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "inActiveSetCurrent",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "inActiveSetLast",
        "type": "bool"
      }
    ],
    "name": "LowValidatorStakeDeltaOnIncrease",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountRequested",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountUnstaked",
        "type": "uint256"
      }
    ],
    "name": "ManualUnstakeInitiation",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "redeemedAmount",
        "type": "uint256"
      }
    ],
    "name": "ManualUnstakeRedemption",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "epochNumber",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "requestedUnstakeAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "redeemedUnstakeAmount",
        "type": "uint256"
      }
    ],
    "name": "NewEpoch",
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
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint120",
        "name": "amountSent",
        "type": "uint120"
      },
      {
        "indexed": false,
        "internalType": "uint120",
        "name": "amountRequested",
        "type": "uint120"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      }
    ],
    "name": "PartialValidatorRewardsPayment",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "currentLiquidity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "targetLiquidity",
        "type": "uint256"
      }
    ],
    "name": "PoolLiquidityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldPercentage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newPercentage",
        "type": "uint256"
      }
    ],
    "name": "PoolTargetLiquidityPercentageSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "offsetAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "globalUnstakableAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueForUnstake",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "globalStakableAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueToStake",
        "type": "uint256"
      }
    ],
    "name": "QueuesOffsetViaNet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "RemovePolicyAgent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedUncommitCompleteBlock",
        "type": "uint256"
      }
    ],
    "name": "RequestUncommit",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountMon",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "completionEpoch",
        "type": "uint256"
      }
    ],
    "name": "RequestUnstake",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netToReserves",
        "type": "uint256"
      }
    ],
    "name": "ReservesIncreasedByExcessQueueCapacity",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netToReserves",
        "type": "uint256"
      }
    ],
    "name": "ReservesIncreasedBySurplusDeposits",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "validatorPayout",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "feeTaken",
        "type": "uint256"
      }
    ],
    "name": "SendValidatorRewards",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "minCommitted",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "maxTopUpPerPeriod",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "topUpPeriodDuration",
        "type": "uint32"
      }
    ],
    "name": "SetTopUp",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountRequested",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountStaked",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "poolLiquidityRemaining",
        "type": "uint256"
      }
    ],
    "name": "StakeFromPoolLiquidity",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueToStake",
        "type": "uint256"
      }
    ],
    "name": "StakeUnassignableNoGlobalRevenue",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueToStake",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stakableAmount",
        "type": "uint256"
      }
    ],
    "name": "StakingQueueExceedsStakableAmount",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "completor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint96",
        "name": "shares",
        "type": "uint96"
      }
    ],
    "name": "UncommitApprovalUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "vShares",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "Undelegate",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "shMonEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "activeExpected",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "activeActual",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedActiveStakeExpectedIsNotActual",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "shMonEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "netUnavailable",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stakeIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unstakeOut",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueToStake",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueForUnstake",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "distributedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldAllocatedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newAllocatedAmount",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedAtomicSettlementUnavailableAssets",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actualAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actionIndex",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedDeficitOnUnstakeSettle",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "nextTargetStakeAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "netAmount",
        "type": "uint128"
      }
    ],
    "name": "UnexpectedFailureInitiateStake",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "nextTargetStakeAmount",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "netAmount",
        "type": "uint128"
      }
    ],
    "name": "UnexpectedFailureInitiateUnstake",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "goodwillAmount",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedGoodwill",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueToStakeRolled",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueForUnstakeRolled",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedNoValidators",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "shMonEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pendingStake",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedTotalStake",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedPendingStakeExceedsExpectedActive",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "shMonEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pendingExpected",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "pendingActual",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedPendingStakeExpectedIsNotActual",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amountReceived",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actionIndex",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedStakeSettlementError",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "shMonEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawalsExpected",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawalsActual",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedStakeWithdrawalsExpectedIsNotActual",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actualAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actionIndex",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedSurplusOnUnstakeSettle",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "shMonEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalExpected",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalActual",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawalsExpected",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawalsActual",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "depositsExpected",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "depositsActual",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedTotalStakeExpectedIsNotActual",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "validatorRewardsPayable",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "addressThisBalance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actionIndex",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedValidatorRewardsPayError",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "valId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "amountRewarded",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "addressThisBalance",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "actionIndex",
        "type": "uint256"
      }
    ],
    "name": "UnexpectedYieldSettlementError",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rewardsSentToValidator",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "revenueToShMonad",
        "type": "uint256"
      }
    ],
    "name": "UnregisteredValidatorRevenue",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "enabled",
        "type": "bool"
      }
    ],
    "name": "UnstakeFeeEnabledSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "queueForUnstake",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "unstakableAmount",
        "type": "uint256"
      }
    ],
    "name": "UnstakingQueueExceedsUnstakableAmount",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "ValidatorAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      }
    ],
    "name": "ValidatorDeactivated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "internalEpoch",
        "type": "uint64"
      }
    ],
    "name": "ValidatorMarkedInactive",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "internalEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "detectionIndex",
        "type": "uint256"
      }
    ],
    "name": "ValidatorNotFoundInActiveSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "authAddress",
        "type": "address"
      }
    ],
    "name": "ValidatorRegisteredByAuth",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      }
    ],
    "name": "ValidatorRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "ValidatorStakeAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "withdrawId",
        "type": "uint256"
      }
    ],
    "name": "ValidatorUnstakeCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "withdrawEpoch",
        "type": "uint64"
      },
      {
        "indexed": true,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "withdrawId",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "ValidatorUnstakeRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "validators",
        "type": "uint256[]"
      },
      {
        "indexed": false,
        "internalType": "uint16[]",
        "name": "targetWeights",
        "type": "uint16[]"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "totalWeight",
        "type": "uint256"
      }
    ],
    "name": "ValidatorWeightsUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
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
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "Withdraw",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "globalEpoch",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expectedWithdrawAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "availableWithdrawAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "withdrawalId",
        "type": "uint8"
      }
    ],
    "name": "WithdrawSettlementDelayed",
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
        "name": "assets",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "ZeroYieldBalanceConvertedToShares",
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
    "inputs": [],
    "name": "STAKING_PRECOMPILE",
    "outputs": [
      {
        "internalType": "contract IMonadStaking",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "addPolicyAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "addValidator",
    "outputs": [
      {
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "addValidator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
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
      },
      {
        "internalType": "uint256",
        "name": "fromReleaseAmount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "inUnderlying",
        "type": "bool"
      }
    ],
    "name": "agentTransferFromCommitted",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
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
      },
      {
        "internalType": "uint256",
        "name": "fromReleaseAmount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "inUnderlying",
        "type": "bool"
      }
    ],
    "name": "agentTransferToUncommitted",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
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
      },
      {
        "internalType": "uint256",
        "name": "fromReleaseAmount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "amountSpecifiedInUnderlying",
        "type": "bool"
      }
    ],
    "name": "agentWithdrawFromCommitted",
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
        "name": "value",
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
    "name": "asset",
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
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOfCommitted",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOfCommitted",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOfUncommitting",
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
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOfZeroYieldTranche",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address[]",
        "name": "accounts",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "batchHold",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address[]",
        "name": "accounts",
        "type": "address[]"
      },
      {
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "batchRelease",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "yieldOriginator",
        "type": "address"
      }
    ],
    "name": "boostYield",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "yieldOriginator",
        "type": "address"
      }
    ],
    "name": "boostYield",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "claimOwnerCommissionAsShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "commitRecipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "commit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "committedTotalSupply",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "completeUncommit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "fromPolicyID",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "toPolicyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "sharesRecipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "completeUncommitAndRecommit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "completeUncommitAndRedeem",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "completeUncommitWithApproval",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "completeUnstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "convertToAssets",
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
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      }
    ],
    "name": "convertToShares",
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
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "convertZeroYieldTrancheToShares",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "crank",
    "outputs": [
      {
        "internalType": "bool",
        "name": "complete",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint48",
        "name": "escrowDuration",
        "type": "uint48"
      }
    ],
    "name": "createPolicy",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "deactivateValidator",
    "outputs": [],
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
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "deposit",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "sharesRecipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "sharesToCommit",
        "type": "uint256"
      }
    ],
    "name": "depositAndCommit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "sharesMinted",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "depositToZeroYieldTranche",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "name": "disablePolicy",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eip712Domain",
    "outputs": [
      {
        "internalType": "bytes1",
        "name": "fields",
        "type": "bytes1"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "version",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "chainId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "verifyingContract",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "salt",
        "type": "bytes32"
      },
      {
        "internalType": "uint256[]",
        "name": "extensions",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getActiveValidatorCount",
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
    "name": "getAdminValues",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "internalEpoch",
        "type": "uint64"
      },
      {
        "internalType": "uint16",
        "name": "targetLiquidityPercentage",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "incentiveAlignmentPercentage",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "stakingCommission",
        "type": "uint16"
      },
      {
        "internalType": "uint16",
        "name": "boostCommissionRate",
        "type": "uint16"
      },
      {
        "internalType": "uint128",
        "name": "totalZeroYieldPayable",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAtomicCapital",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "allocatedAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "distributedAmount",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAtomicPoolUtilization",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "utilized",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "allocated",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "utilizationWad",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAtomicUtilizationWad",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "utilizationWad",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getCommittedData",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "committed",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "minCommitted",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentAssets",
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
    "name": "getCurrentLiquidity",
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
    "name": "getCurrentUnstakeFeeRateRay",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "feeRateRay",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getEpochInfo",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "epochNumber",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "epochStartBlock",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getFeeCurveParams",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "slopeRateRayOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "yInterceptRayOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getGlobalAmountAvailableToUnstake",
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
        "internalType": "int256",
        "name": "epochPointer",
        "type": "int256"
      }
    ],
    "name": "getGlobalCashFlows",
    "outputs": [
      {
        "internalType": "uint120",
        "name": "queueToStake",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "queueForUnstake",
        "type": "uint120"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "epochPointer",
        "type": "int256"
      }
    ],
    "name": "getGlobalEpoch",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "internalType": "uint8",
        "name": "withdrawalId",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "hasWithdrawal",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "hasDeposit",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "crankedInBoundaryPeriod",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "wasCranked",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "frozen",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "closed",
        "type": "bool"
      },
      {
        "internalType": "uint128",
        "name": "targetStakeAmount",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getGlobalPending",
    "outputs": [
      {
        "internalType": "uint120",
        "name": "pendingStaking",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "pendingUnstaking",
        "type": "uint120"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getGlobalPendingLast",
    "outputs": [
      {
        "internalType": "uint120",
        "name": "pendingStaking",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "pendingUnstaking",
        "type": "uint120"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "epochPointer",
        "type": "int256"
      }
    ],
    "name": "getGlobalRevenue",
    "outputs": [
      {
        "internalType": "uint120",
        "name": "allocatedRevenue",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "earnedRevenue",
        "type": "uint120"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "int256",
        "name": "epochPointer",
        "type": "int256"
      }
    ],
    "name": "getGlobalStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "frozen",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "closed",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getHoldAmount",
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
    "name": "getInternalEpoch",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getNextValidatorToCrank",
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
    "name": "getPendingTargetLiquidity",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "name": "getPolicy",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint48",
            "name": "escrowDuration",
            "type": "uint48"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "primaryAgent",
            "type": "address"
          }
        ],
        "internalType": "struct Policy",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      }
    ],
    "name": "getPolicyAgents",
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
    "name": "getScaledTargetLiquidityPercentage",
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
    "name": "getTargetLiquidity",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getTopUpSettings",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "maxTopUpPerPeriod",
        "type": "uint128"
      },
      {
        "internalType": "uint32",
        "name": "topUpPeriodDuration",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getUncommitApproval",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "completor",
            "type": "address"
          },
          {
            "internalType": "uint96",
            "name": "shares",
            "type": "uint96"
          }
        ],
        "internalType": "struct UncommitApproval",
        "name": "approval",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getUncommittingData",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "uncommitting",
        "type": "uint128"
      },
      {
        "internalType": "uint48",
        "name": "uncommitStartBlock",
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
        "name": "account",
        "type": "address"
      }
    ],
    "name": "getUnstakeRequest",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "amountMon",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "completionEpoch",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "validatorId",
        "type": "uint256"
      }
    ],
    "name": "getValidatorCoinbase",
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
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "getValidatorData",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "epoch",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "id",
        "type": "uint64"
      },
      {
        "internalType": "bool",
        "name": "isPlaceholder",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "inActiveSet_Current",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "inActiveSet_Last",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "coinbase",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "getValidatorEpochs",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "lastEpoch",
        "type": "uint64"
      },
      {
        "internalType": "uint128",
        "name": "lastTargetStakeAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint64",
        "name": "currentEpoch",
        "type": "uint64"
      },
      {
        "internalType": "uint128",
        "name": "currentTargetStakeAmount",
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
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "getValidatorIdForCoinbase",
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
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "getValidatorNeighbors",
    "outputs": [
      {
        "internalType": "address",
        "name": "previous",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "next",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "getValidatorPendingEscrow",
    "outputs": [
      {
        "internalType": "uint120",
        "name": "lastPendingStaking",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "lastPendingUnstaking",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "currentPendingStaking",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "currentPendingUnstaking",
        "type": "uint120"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "getValidatorRewards",
    "outputs": [
      {
        "internalType": "uint120",
        "name": "lastRewardsPayable",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "lastEarnedRevenue",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "currentRewardsPayable",
        "type": "uint120"
      },
      {
        "internalType": "uint120",
        "name": "currentEarnedRevenue",
        "type": "uint120"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "getValidatorStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "coinbase",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "lastEpoch",
            "type": "uint64"
          },
          {
            "internalType": "uint128",
            "name": "targetStakeAmount",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "rewardsPayableLast",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "earnedRevenueLast",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "rewardsPayableCurrent",
            "type": "uint128"
          },
          {
            "internalType": "uint128",
            "name": "earnedRevenueCurrent",
            "type": "uint128"
          }
        ],
        "internalType": "struct ValidatorStats",
        "name": "stats",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getWorkingCapital",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "stakedAmount",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "reservedAmount",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "globalLiabilities",
    "outputs": [
      {
        "internalType": "uint128",
        "name": "rewardsPayable",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "redemptionsPayable",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "totalZeroYieldPayable",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "hold",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "deployer",
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
    "name": "isGlobalCrankAvailable",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "isPolicyAgent",
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
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "isValidatorActive",
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
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "isValidatorCrankAvailable",
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
    "name": "listActiveValidators",
    "outputs": [
      {
        "internalType": "uint64[]",
        "name": "validatorIds",
        "type": "uint64[]"
      },
      {
        "internalType": "address[]",
        "name": "coinbases",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "maxDeposit",
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
        "name": "",
        "type": "address"
      }
    ],
    "name": "maxMint",
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
      }
    ],
    "name": "maxRedeem",
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
      }
    ],
    "name": "maxWithdraw",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "mint",
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
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "nonces",
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
        "name": "value",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "v",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "r",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "s",
        "type": "bytes32"
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "inUnderlying",
        "type": "bool"
      }
    ],
    "name": "policyBalanceAvailable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "balanceAvailable",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "policyCount",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "previewCoinbaseAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "predicted",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      }
    ],
    "name": "previewDeposit",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "previewMint",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "previewRedeem",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "previewRedeemDetailed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "grossAssets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "feeAssets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "netAssets",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "previewUnstake",
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
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      }
    ],
    "name": "previewWithdraw",
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
        "internalType": "uint256",
        "name": "netAssets",
        "type": "uint256"
      }
    ],
    "name": "previewWithdrawDetailed",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "grossAssets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "feeAssets",
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
        "name": "coinbase",
        "type": "address"
      }
    ],
    "name": "processCoinbaseByAuth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "processCoinbaseByAuth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "realTotalSupply",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "redeem",
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
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minAssetsOut",
        "type": "uint256"
      }
    ],
    "name": "redeemWithSlippageProtection",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "agent",
        "type": "address"
      }
    ],
    "name": "removePolicyAgent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newMinBalance",
        "type": "uint256"
      }
    ],
    "name": "requestUncommit",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "uncommitCompleteBlock",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newMinBalance",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "completor",
        "type": "address"
      }
    ],
    "name": "requestUncommitWithApprovedCompletor",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "uncommitCompleteBlock",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "requestUnstake",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "completionEpoch",
        "type": "uint64"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "feeRate",
        "type": "uint256"
      }
    ],
    "name": "sendValidatorRewards",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "isClosed",
        "type": "bool"
      }
    ],
    "name": "setClosedStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bool",
        "name": "isFrozen",
        "type": "bool"
      }
    ],
    "name": "setFrozenStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "uint128",
        "name": "minCommitted",
        "type": "uint128"
      },
      {
        "internalType": "uint128",
        "name": "maxTopUpPerPeriod",
        "type": "uint128"
      },
      {
        "internalType": "uint32",
        "name": "topUpPeriodDuration",
        "type": "uint32"
      }
    ],
    "name": "setMinCommittedBalance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newPercentageScaled",
        "type": "uint256"
      }
    ],
    "name": "setPoolTargetLiquidityPercentage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "completor",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      }
    ],
    "name": "setUncommitApproval",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newSlopeRateRay",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newYInterceptRay",
        "type": "uint256"
      }
    ],
    "name": "setUnstakeFeeCurve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "slopeRateRay",
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
    "inputs": [
      {
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "inUnderlying",
        "type": "bool"
      }
    ],
    "name": "topUpAvailable",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountAvailable",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalAssets",
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
        "name": "value",
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
        "name": "value",
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
    "inputs": [],
    "name": "unclaimedOwnerCommission",
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
        "internalType": "uint64",
        "name": "policyID",
        "type": "uint64"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "uncommittingCompleteBlock",
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
        "internalType": "uint16",
        "name": "feeInBps",
        "type": "uint16"
      }
    ],
    "name": "updateBoostCommission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "validatorId",
        "type": "uint64"
      }
    ],
    "name": "updateCoinbaseForExistingValidator",
    "outputs": [
      {
        "internalType": "address",
        "name": "newCoinbase",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "percentageInBps",
        "type": "uint16"
      }
    ],
    "name": "updateIncentiveAlignmentPercentage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint16",
        "name": "feeInBps",
        "type": "uint16"
      }
    ],
    "name": "updateStakingCommission",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "withdraw",
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
        "internalType": "uint256",
        "name": "assets",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "maxBurntShares",
        "type": "uint256"
      }
    ],
    "name": "withdrawWithSlippageProtection",
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
    "name": "yInterceptRay",
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
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

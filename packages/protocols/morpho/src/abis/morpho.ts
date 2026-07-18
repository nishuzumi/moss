// GENERATED FILE - do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   @morpho-org/morpho-ts@2.8.0 (npm), full upstream ABI constants
//   tarball:  sha256 be0bb0e608b73d44983f20735503f9352ef52d289b11b40ef8a0479cab6eb1b1
//   vendored: 2026-07-18 (release-age guard: 7d)
//   verification: the fixed factory deployment and exercised functions are
//   checked live on Monad mainnet; the adapter's e2e tests pin observable behavior.

export const MorphoVaultV2Abi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "_asset",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "DOMAIN_SEPARATOR",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "_totalAssets",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint128",
                internalType: "uint128",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "abdicate",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                internalType: "bytes4",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "abdicated",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                internalType: "bytes4",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "absoluteCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "accrueInterest",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "accrueInterestView",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "adapterRegistry",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "adapters",
        inputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "adaptersLength",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "addAdapter",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "allocate",
        inputs: [
            {
                name: "adapter",
                type: "address",
                internalType: "address",
            },
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "allocation",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "allowance",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "approve",
        inputs: [
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "asset",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "balanceOf",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "canReceiveAssets",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "canReceiveShares",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "canSendAssets",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "canSendShares",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "convertToAssets",
        inputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "convertToShares",
        inputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "curator",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "deallocate",
        inputs: [
            {
                name: "adapter",
                type: "address",
                internalType: "address",
            },
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "decimals",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint8",
                internalType: "uint8",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "decreaseAbsoluteCap",
        inputs: [
            {
                name: "idData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "newAbsoluteCap",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "decreaseRelativeCap",
        inputs: [
            {
                name: "idData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "newRelativeCap",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "decreaseTimelock",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                internalType: "bytes4",
            },
            {
                name: "newDuration",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "deposit",
        inputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "onBehalf",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "executableAt",
        inputs: [
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "firstTotalAssets",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "forceDeallocate",
        inputs: [
            {
                name: "adapter",
                type: "address",
                internalType: "address",
            },
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "onBehalf",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "forceDeallocatePenalty",
        inputs: [
            {
                name: "adapter",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "increaseAbsoluteCap",
        inputs: [
            {
                name: "idData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "newAbsoluteCap",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "increaseRelativeCap",
        inputs: [
            {
                name: "idData",
                type: "bytes",
                internalType: "bytes",
            },
            {
                name: "newRelativeCap",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "increaseTimelock",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                internalType: "bytes4",
            },
            {
                name: "newDuration",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "isAdapter",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isAllocator",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isSentinel",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "lastUpdate",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint64",
                internalType: "uint64",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "liquidityAdapter",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "liquidityData",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "managementFee",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint96",
                internalType: "uint96",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "managementFeeRecipient",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "maxDeposit",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "pure",
    },
    {
        type: "function",
        name: "maxMint",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "pure",
    },
    {
        type: "function",
        name: "maxRate",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint64",
                internalType: "uint64",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "maxRedeem",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "pure",
    },
    {
        type: "function",
        name: "maxWithdraw",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "pure",
    },
    {
        type: "function",
        name: "mint",
        inputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "onBehalf",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "multicall",
        inputs: [
            {
                name: "data",
                type: "bytes[]",
                internalType: "bytes[]",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "name",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "nonces",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "owner",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "performanceFee",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint96",
                internalType: "uint96",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "performanceFeeRecipient",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "permit",
        inputs: [
            {
                name: "_owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "deadline",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "v",
                type: "uint8",
                internalType: "uint8",
            },
            {
                name: "r",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "s",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "previewDeposit",
        inputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "previewMint",
        inputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "previewRedeem",
        inputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "previewWithdraw",
        inputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "receiveAssetsGate",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "receiveSharesGate",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "redeem",
        inputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "receiver",
                type: "address",
                internalType: "address",
            },
            {
                name: "onBehalf",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "relativeCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "removeAdapter",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revoke",
        inputs: [
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "sendAssetsGate",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "sendSharesGate",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "setAdapterRegistry",
        inputs: [
            {
                name: "newAdapterRegistry",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setCurator",
        inputs: [
            {
                name: "newCurator",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setForceDeallocatePenalty",
        inputs: [
            {
                name: "adapter",
                type: "address",
                internalType: "address",
            },
            {
                name: "newForceDeallocatePenalty",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setIsAllocator",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
            {
                name: "newIsAllocator",
                type: "bool",
                internalType: "bool",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setIsSentinel",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
            {
                name: "newIsSentinel",
                type: "bool",
                internalType: "bool",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setLiquidityAdapterAndData",
        inputs: [
            {
                name: "newLiquidityAdapter",
                type: "address",
                internalType: "address",
            },
            {
                name: "newLiquidityData",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setManagementFee",
        inputs: [
            {
                name: "newManagementFee",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setManagementFeeRecipient",
        inputs: [
            {
                name: "newManagementFeeRecipient",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setMaxRate",
        inputs: [
            {
                name: "newMaxRate",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setName",
        inputs: [
            {
                name: "newName",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setOwner",
        inputs: [
            {
                name: "newOwner",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setPerformanceFee",
        inputs: [
            {
                name: "newPerformanceFee",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setPerformanceFeeRecipient",
        inputs: [
            {
                name: "newPerformanceFeeRecipient",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setReceiveAssetsGate",
        inputs: [
            {
                name: "newReceiveAssetsGate",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setReceiveSharesGate",
        inputs: [
            {
                name: "newReceiveSharesGate",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setSendAssetsGate",
        inputs: [
            {
                name: "newSendAssetsGate",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setSendSharesGate",
        inputs: [
            {
                name: "newSendSharesGate",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setSymbol",
        inputs: [
            {
                name: "newSymbol",
                type: "string",
                internalType: "string",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "submit",
        inputs: [
            {
                name: "data",
                type: "bytes",
                internalType: "bytes",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "symbol",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "timelock",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                internalType: "bytes4",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "totalAssets",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "totalSupply",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "transfer",
        inputs: [
            {
                name: "to",
                type: "address",
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "transferFrom",
        inputs: [
            {
                name: "from",
                type: "address",
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "virtualShares",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "withdraw",
        inputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "receiver",
                type: "address",
                internalType: "address",
            },
            {
                name: "onBehalf",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "event",
        name: "Abdicate",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Accept",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4",
            },
            {
                name: "data",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "AccrueInterest",
        inputs: [
            {
                name: "previousTotalAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "newTotalAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "performanceFeeShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "managementFeeShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "AddAdapter",
        inputs: [
            {
                name: "account",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Allocate",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "adapter",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "ids",
                type: "bytes32[]",
                indexed: false,
                internalType: "bytes32[]",
            },
            {
                name: "change",
                type: "int256",
                indexed: false,
                internalType: "int256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "AllowanceUpdatedByTransferFrom",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Approval",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Constructor",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "asset",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Deallocate",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "adapter",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "ids",
                type: "bytes32[]",
                indexed: false,
                internalType: "bytes32[]",
            },
            {
                name: "change",
                type: "int256",
                indexed: false,
                internalType: "int256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "DecreaseAbsoluteCap",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "idData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
            {
                name: "newAbsoluteCap",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "DecreaseRelativeCap",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "idData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
            {
                name: "newRelativeCap",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "DecreaseTimelock",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4",
            },
            {
                name: "newDuration",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Deposit",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "onBehalf",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "shares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ForceDeallocate",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "adapter",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "onBehalf",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "ids",
                type: "bytes32[]",
                indexed: false,
                internalType: "bytes32[]",
            },
            {
                name: "penaltyAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "IncreaseAbsoluteCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "idData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
            {
                name: "newAbsoluteCap",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "IncreaseRelativeCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "bytes32",
            },
            {
                name: "idData",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
            {
                name: "newRelativeCap",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "IncreaseTimelock",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4",
            },
            {
                name: "newDuration",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Permit",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "spender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "nonce",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "deadline",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RemoveAdapter",
        inputs: [
            {
                name: "account",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Revoke",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4",
            },
            {
                name: "data",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetAdapterRegistry",
        inputs: [
            {
                name: "newAdapterRegistry",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetCurator",
        inputs: [
            {
                name: "newCurator",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetForceDeallocatePenalty",
        inputs: [
            {
                name: "adapter",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "forceDeallocatePenalty",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetIsAllocator",
        inputs: [
            {
                name: "account",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newIsAllocator",
                type: "bool",
                indexed: false,
                internalType: "bool",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetIsSentinel",
        inputs: [
            {
                name: "account",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newIsSentinel",
                type: "bool",
                indexed: false,
                internalType: "bool",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetLiquidityAdapterAndData",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newLiquidityAdapter",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newLiquidityData",
                type: "bytes",
                indexed: true,
                internalType: "bytes",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetManagementFee",
        inputs: [
            {
                name: "newManagementFee",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetManagementFeeRecipient",
        inputs: [
            {
                name: "newManagementFeeRecipient",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetMaxRate",
        inputs: [
            {
                name: "newMaxRate",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetName",
        inputs: [
            {
                name: "newName",
                type: "string",
                indexed: false,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetOwner",
        inputs: [
            {
                name: "newOwner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetPerformanceFee",
        inputs: [
            {
                name: "newPerformanceFee",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetPerformanceFeeRecipient",
        inputs: [
            {
                name: "newPerformanceFeeRecipient",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetReceiveAssetsGate",
        inputs: [
            {
                name: "newReceiveAssetsGate",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetReceiveSharesGate",
        inputs: [
            {
                name: "newReceiveSharesGate",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetSendAssetsGate",
        inputs: [
            {
                name: "newSendAssetsGate",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetSendSharesGate",
        inputs: [
            {
                name: "newSendSharesGate",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetSymbol",
        inputs: [
            {
                name: "newSymbol",
                type: "string",
                indexed: false,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Submit",
        inputs: [
            {
                name: "selector",
                type: "bytes4",
                indexed: true,
                internalType: "bytes4",
            },
            {
                name: "data",
                type: "bytes",
                indexed: false,
                internalType: "bytes",
            },
            {
                name: "executableAt",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Transfer",
        inputs: [
            {
                name: "from",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "to",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Withdraw",
        inputs: [
            {
                name: "sender",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "receiver",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "onBehalf",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "shares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "error",
        name: "Abdicated",
        inputs: [],
    },
    {
        type: "error",
        name: "AbsoluteCapExceeded",
        inputs: [],
    },
    {
        type: "error",
        name: "AbsoluteCapNotDecreasing",
        inputs: [],
    },
    {
        type: "error",
        name: "AbsoluteCapNotIncreasing",
        inputs: [],
    },
    {
        type: "error",
        name: "AutomaticallyTimelocked",
        inputs: [],
    },
    {
        type: "error",
        name: "CannotReceiveAssets",
        inputs: [],
    },
    {
        type: "error",
        name: "CannotReceiveShares",
        inputs: [],
    },
    {
        type: "error",
        name: "CannotSendAssets",
        inputs: [],
    },
    {
        type: "error",
        name: "CannotSendShares",
        inputs: [],
    },
    {
        type: "error",
        name: "CastOverflow",
        inputs: [],
    },
    {
        type: "error",
        name: "DataAlreadyPending",
        inputs: [],
    },
    {
        type: "error",
        name: "DataNotTimelocked",
        inputs: [],
    },
    {
        type: "error",
        name: "FeeInvariantBroken",
        inputs: [],
    },
    {
        type: "error",
        name: "FeeTooHigh",
        inputs: [],
    },
    {
        type: "error",
        name: "InvalidSigner",
        inputs: [],
    },
    {
        type: "error",
        name: "MaxRateTooHigh",
        inputs: [],
    },
    {
        type: "error",
        name: "NoCode",
        inputs: [],
    },
    {
        type: "error",
        name: "NotAdapter",
        inputs: [],
    },
    {
        type: "error",
        name: "NotInAdapterRegistry",
        inputs: [],
    },
    {
        type: "error",
        name: "PenaltyTooHigh",
        inputs: [],
    },
    {
        type: "error",
        name: "PermitDeadlineExpired",
        inputs: [],
    },
    {
        type: "error",
        name: "RelativeCapAboveOne",
        inputs: [],
    },
    {
        type: "error",
        name: "RelativeCapExceeded",
        inputs: [],
    },
    {
        type: "error",
        name: "RelativeCapNotDecreasing",
        inputs: [],
    },
    {
        type: "error",
        name: "RelativeCapNotIncreasing",
        inputs: [],
    },
    {
        type: "error",
        name: "TimelockNotDecreasing",
        inputs: [],
    },
    {
        type: "error",
        name: "TimelockNotExpired",
        inputs: [],
    },
    {
        type: "error",
        name: "TimelockNotIncreasing",
        inputs: [],
    },
    {
        type: "error",
        name: "TransferFromReturnedFalse",
        inputs: [],
    },
    {
        type: "error",
        name: "TransferFromReverted",
        inputs: [],
    },
    {
        type: "error",
        name: "TransferReturnedFalse",
        inputs: [],
    },
    {
        type: "error",
        name: "TransferReverted",
        inputs: [],
    },
    {
        type: "error",
        name: "Unauthorized",
        inputs: [],
    },
    {
        type: "error",
        name: "ZeroAbsoluteCap",
        inputs: [],
    },
    {
        type: "error",
        name: "ZeroAddress",
        inputs: [],
    },
    {
        type: "error",
        name: "ZeroAllocation",
        inputs: [],
    },
] as const;

export const MorphoVaultV2FactoryAbi = [
    {
        type: "function",
        name: "createVaultV2",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "asset",
                type: "address",
                internalType: "address",
            },
            {
                name: "salt",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "isVaultV2",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "",
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "vaultV2",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "asset",
                type: "address",
                internalType: "address",
            },
            {
                name: "salt",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "CreateVaultV2",
        inputs: [
            {
                name: "owner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "asset",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "salt",
                type: "bytes32",
                indexed: false,
                internalType: "bytes32",
            },
            {
                name: "newVaultV2",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
] as const;

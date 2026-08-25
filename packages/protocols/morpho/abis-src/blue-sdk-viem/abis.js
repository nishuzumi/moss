export { erc2612Abi, erc5267Abi, metaMorphoAbi, metaMorphoFactoryAbi, morphoMarketV1AdapterAbi, morphoMarketV1AdapterFactoryAbi, morphoMarketV1AdapterV2Abi, morphoMarketV1AdapterV2FactoryAbi, morphoVaultV1AdapterAbi, morphoVaultV1AdapterFactoryAbi, permissionedErc20WrapperAbi, permit2Abi, publicAllocatorAbi, vaultV1AdapterAbi, vaultV1AdapterFactoryAbi, vaultV2Abi, vaultV2FactoryAbi, whitelistControllerAggregatorV2Abi, wrappedBackedTokenAbi, wstEthAbi, } from "@morpho-org/morpho-ts/abis";
/** Morpho Blue ABI used for market, position, authorization, and nonce reads. */
export const blueAbi = [
    {
        type: "event",
        name: "AccrueInterest",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "prevBorrowRate",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "interest",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "feeShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Borrow",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "onBehalf",
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
        name: "CreateMarket",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "marketParams",
                type: "tuple",
                indexed: false,
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "EnableIrm",
        inputs: [
            {
                name: "irm",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "EnableLltv",
        inputs: [
            {
                name: "lltv",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "FlashLoan",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "token",
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
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "IncrementNonce",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "authorizer",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "usedNonce",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Liquidate",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "borrower",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "repaidAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "repaidShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "seizedAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "badDebtAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "badDebtShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Repay",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
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
        name: "SetAuthorization",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "authorizer",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "authorized",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newIsAuthorized",
                type: "bool",
                indexed: false,
                internalType: "bool",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetFee",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "newFee",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetFeeRecipient",
        inputs: [
            {
                name: "newFeeRecipient",
                type: "address",
                indexed: true,
                internalType: "address",
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
        name: "Supply",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
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
        name: "SupplyCollateral",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
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
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Withdraw",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "onBehalf",
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
        name: "WithdrawCollateral",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "caller",
                type: "address",
                indexed: false,
                internalType: "address",
            },
            {
                name: "onBehalf",
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
                name: "assets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "constructor",
        inputs: [
            {
                name: "newOwner",
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
        name: "accrueInterest",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "borrow",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
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
            {
                name: "receiver",
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
        name: "createMarket",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "enableIrm",
        inputs: [
            {
                name: "irm",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "enableLltv",
        inputs: [
            {
                name: "lltv",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "extSloads",
        inputs: [
            {
                name: "slots",
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
        ],
        outputs: [
            {
                name: "res",
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "feeRecipient",
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
        name: "flashLoan",
        inputs: [
            {
                name: "token",
                type: "address",
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
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
        name: "idToMarketParams",
        inputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "Id",
            },
        ],
        outputs: [
            {
                name: "loanToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "collateralToken",
                type: "address",
                internalType: "address",
            },
            {
                name: "oracle",
                type: "address",
                internalType: "address",
            },
            {
                name: "irm",
                type: "address",
                internalType: "address",
            },
            {
                name: "lltv",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isAuthorized",
        inputs: [
            {
                name: "",
                type: "address",
                internalType: "address",
            },
            {
                name: "",
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
        name: "isIrmEnabled",
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
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "isLltvEnabled",
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
                type: "bool",
                internalType: "bool",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "liquidate",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "borrower",
                type: "address",
                internalType: "address",
            },
            {
                name: "seizedAssets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "repaidShares",
                type: "uint256",
                internalType: "uint256",
            },
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
        name: "market",
        inputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "Id",
            },
        ],
        outputs: [
            {
                name: "totalSupplyAssets",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "totalSupplyShares",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "totalBorrowAssets",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "totalBorrowShares",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "lastUpdate",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "fee",
                type: "uint128",
                internalType: "uint128",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "nonce",
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
        name: "position",
        inputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "Id",
            },
            {
                name: "",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "supplyShares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "borrowShares",
                type: "uint128",
                internalType: "uint128",
            },
            {
                name: "collateral",
                type: "uint128",
                internalType: "uint128",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "repay",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
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
        name: "setAuthorization",
        inputs: [
            {
                name: "authorized",
                type: "address",
                internalType: "address",
            },
            {
                name: "newIsAuthorized",
                type: "bool",
                internalType: "bool",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setAuthorizationWithSig",
        inputs: [
            {
                name: "authorization",
                type: "tuple",
                internalType: "struct Authorization",
                components: [
                    {
                        name: "authorizer",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "authorized",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "isAuthorized",
                        type: "bool",
                        internalType: "bool",
                    },
                    {
                        name: "nonce",
                        type: "uint256",
                        internalType: "uint256",
                    },
                    {
                        name: "deadline",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "signature",
                type: "tuple",
                internalType: "struct Signature",
                components: [
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
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setFee",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "newFee",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setFeeRecipient",
        inputs: [
            {
                name: "newFeeRecipient",
                type: "address",
                internalType: "address",
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
        name: "supply",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
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
        name: "supplyCollateral",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
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
        name: "withdraw",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
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
            {
                name: "receiver",
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
        name: "withdrawCollateral",
        inputs: [
            {
                name: "marketParams",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "oracle",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "irm",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "lltv",
                        type: "uint256",
                        internalType: "uint256",
                    },
                ],
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
            {
                name: "receiver",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
];
/** AdaptiveCurveIRM ABI used to read market rates at target. */
export const adaptiveCurveIrmAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "morpho",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "id",
                type: "bytes32",
                indexed: true,
            },
            {
                internalType: "uint256",
                name: "avgBorrowRate",
                type: "uint256",
                indexed: false,
            },
            {
                internalType: "uint256",
                name: "rateAtTarget",
                type: "uint256",
                indexed: false,
            },
        ],
        type: "event",
        name: "BorrowRateUpdate",
        anonymous: false,
    },
    {
        inputs: [],
        stateMutability: "view",
        type: "function",
        name: "MORPHO",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct MarketParams",
                name: "marketParams",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "loanToken",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "collateralToken",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "oracle",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "irm",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "lltv",
                        type: "uint256",
                    },
                ],
            },
            {
                internalType: "struct Market",
                name: "market",
                type: "tuple",
                components: [
                    {
                        internalType: "uint128",
                        name: "totalSupplyAssets",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "totalSupplyShares",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "totalBorrowAssets",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "totalBorrowShares",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "lastUpdate",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "fee",
                        type: "uint128",
                    },
                ],
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
        name: "borrowRate",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "struct MarketParams",
                name: "marketParams",
                type: "tuple",
                components: [
                    {
                        internalType: "address",
                        name: "loanToken",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "collateralToken",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "oracle",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "irm",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "lltv",
                        type: "uint256",
                    },
                ],
            },
            {
                internalType: "struct Market",
                name: "market",
                type: "tuple",
                components: [
                    {
                        internalType: "uint128",
                        name: "totalSupplyAssets",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "totalSupplyShares",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "totalBorrowAssets",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "totalBorrowShares",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "lastUpdate",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "fee",
                        type: "uint128",
                    },
                ],
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "borrowRateView",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
        name: "rateAtTarget",
        outputs: [
            {
                internalType: "int256",
                name: "",
                type: "int256",
            },
        ],
    },
];
/** Morpho Blue oracle ABI used to read market prices. */
export const blueOracleAbi = [
    {
        type: "function",
        name: "price",
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
];
/** Pre-liquidation factory ABI used to verify pre-liquidation factory membership. */
export const preLiquidationFactoryAbi = [
    {
        type: "constructor",
        inputs: [{ name: "morpho", type: "address", internalType: "address" }],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "MORPHO",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "contract IMorpho" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "createPreLiquidation",
        inputs: [
            { name: "id", type: "bytes32", internalType: "Id" },
            {
                name: "preLiquidationParams",
                type: "tuple",
                internalType: "struct PreLiquidationParams",
                components: [
                    { name: "preLltv", type: "uint256", internalType: "uint256" },
                    { name: "preLCF1", type: "uint256", internalType: "uint256" },
                    { name: "preLCF2", type: "uint256", internalType: "uint256" },
                    { name: "preLIF1", type: "uint256", internalType: "uint256" },
                    { name: "preLIF2", type: "uint256", internalType: "uint256" },
                    {
                        name: "preLiquidationOracle",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IPreLiquidation",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "isPreLiquidation",
        inputs: [{ name: "", type: "address", internalType: "address" }],
        outputs: [{ name: "", type: "bool", internalType: "bool" }],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "CreatePreLiquidation",
        inputs: [
            {
                name: "preLiquidation",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: false,
                internalType: "Id",
            },
            {
                name: "preLiquidationParams",
                type: "tuple",
                indexed: false,
                internalType: "struct PreLiquidationParams",
                components: [
                    { name: "preLltv", type: "uint256", internalType: "uint256" },
                    { name: "preLCF1", type: "uint256", internalType: "uint256" },
                    { name: "preLCF2", type: "uint256", internalType: "uint256" },
                    { name: "preLIF1", type: "uint256", internalType: "uint256" },
                    { name: "preLIF2", type: "uint256", internalType: "uint256" },
                    {
                        name: "preLiquidationOracle",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        anonymous: false,
    },
    { type: "error", name: "ZeroAddress", inputs: [] },
];
/** Pre-liquidation ABI used to read pre-liquidation parameters. */
export const preLiquidationAbi = [
    {
        type: "constructor",
        inputs: [
            { name: "morpho", type: "address", internalType: "address" },
            { name: "id", type: "bytes32", internalType: "Id" },
            {
                name: "_preLiquidationParams",
                type: "tuple",
                internalType: "struct PreLiquidationParams",
                components: [
                    { name: "preLltv", type: "uint256", internalType: "uint256" },
                    { name: "preLCF1", type: "uint256", internalType: "uint256" },
                    { name: "preLCF2", type: "uint256", internalType: "uint256" },
                    { name: "preLIF1", type: "uint256", internalType: "uint256" },
                    { name: "preLIF2", type: "uint256", internalType: "uint256" },
                    {
                        name: "preLiquidationOracle",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "ID",
        inputs: [],
        outputs: [{ name: "", type: "bytes32", internalType: "Id" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "MORPHO",
        inputs: [],
        outputs: [{ name: "", type: "address", internalType: "contract IMorpho" }],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "marketParams",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct MarketParams",
                components: [
                    {
                        name: "loanToken",
                        type: "address",
                        internalType: "address",
                    },
                    {
                        name: "collateralToken",
                        type: "address",
                        internalType: "address",
                    },
                    { name: "oracle", type: "address", internalType: "address" },
                    { name: "irm", type: "address", internalType: "address" },
                    { name: "lltv", type: "uint256", internalType: "uint256" },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "onMorphoRepay",
        inputs: [
            {
                name: "repaidAssets",
                type: "uint256",
                internalType: "uint256",
            },
            { name: "callbackData", type: "bytes", internalType: "bytes" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "preLiquidate",
        inputs: [
            { name: "borrower", type: "address", internalType: "address" },
            {
                name: "seizedAssets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "repaidShares",
                type: "uint256",
                internalType: "uint256",
            },
            { name: "data", type: "bytes", internalType: "bytes" },
        ],
        outputs: [
            { name: "", type: "uint256", internalType: "uint256" },
            { name: "", type: "uint256", internalType: "uint256" },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "preLiquidationParams",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "tuple",
                internalType: "struct PreLiquidationParams",
                components: [
                    { name: "preLltv", type: "uint256", internalType: "uint256" },
                    { name: "preLCF1", type: "uint256", internalType: "uint256" },
                    { name: "preLCF2", type: "uint256", internalType: "uint256" },
                    { name: "preLIF1", type: "uint256", internalType: "uint256" },
                    { name: "preLIF2", type: "uint256", internalType: "uint256" },
                    {
                        name: "preLiquidationOracle",
                        type: "address",
                        internalType: "address",
                    },
                ],
            },
        ],
        stateMutability: "view",
    },
    {
        type: "event",
        name: "PreLiquidate",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "liquidator",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "borrower",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "repaidAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "repaidShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "seizedAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    { type: "error", name: "InconsistentInput", inputs: [] },
    { type: "error", name: "LiquidatablePosition", inputs: [] },
    { type: "error", name: "NonexistentMarket", inputs: [] },
    { type: "error", name: "NotMorpho", inputs: [] },
    { type: "error", name: "NotPreLiquidatablePosition", inputs: [] },
    { type: "error", name: "PreLCFDecreasing", inputs: [] },
    { type: "error", name: "PreLCFTooHigh", inputs: [] },
    { type: "error", name: "PreLIFDecreasing", inputs: [] },
    { type: "error", name: "PreLIFTooHigh", inputs: [] },
    { type: "error", name: "PreLIFTooLow", inputs: [] },
    {
        type: "error",
        name: "PreLiquidationTooLarge",
        inputs: [
            {
                name: "repaidShares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "repayableShares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    { type: "error", name: "PreLltvTooHigh", inputs: [] },
];

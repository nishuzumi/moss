/** ERC-2612 permit ABI fragment used for nonce reads and permit calldata. */
export const erc2612Abi = [
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "nonces",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
/** Uniswap Permit2 ABI used for allowance reads and Permit2 signature helpers. */
export const permit2Abi = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "AllowanceExpired",
        type: "error",
    },
    {
        inputs: [],
        name: "ExcessiveInvalidation",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "InsufficientAllowance",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "maxAmount",
                type: "uint256",
            },
        ],
        name: "InvalidAmount",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidContractSignature",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidNonce",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidSignature",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidSignatureLength",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidSigner",
        type: "error",
    },
    {
        inputs: [],
        name: "LengthMismatch",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "signatureDeadline",
                type: "uint256",
            },
        ],
        name: "SignatureExpired",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint160",
                name: "amount",
                type: "uint160",
            },
            {
                indexed: false,
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "Lockdown",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint48",
                name: "newNonce",
                type: "uint48",
            },
            {
                indexed: false,
                internalType: "uint48",
                name: "oldNonce",
                type: "uint48",
            },
        ],
        name: "NonceInvalidation",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint160",
                name: "amount",
                type: "uint160",
            },
            {
                indexed: false,
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
            },
            {
                indexed: false,
                internalType: "uint48",
                name: "nonce",
                type: "uint48",
            },
        ],
        name: "Permit",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "word",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "mask",
                type: "uint256",
            },
        ],
        name: "UnorderedNonceInvalidation",
        type: "event",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
            },
            {
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
            },
            {
                internalType: "uint48",
                name: "nonce",
                type: "uint48",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
            },
            {
                internalType: "uint48",
                name: "expiration",
                type: "uint48",
            },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint48",
                name: "newNonce",
                type: "uint48",
            },
        ],
        name: "invalidateNonces",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "wordPos",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "mask",
                type: "uint256",
            },
        ],
        name: "invalidateUnorderedNonces",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "token",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "spender",
                        type: "address",
                    },
                ],
                internalType: "struct IAllowanceTransfer.TokenSpenderPair[]",
                name: "approvals",
                type: "tuple[]",
            },
        ],
        name: "lockdown",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        name: "nonceBitmap",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint160",
                                name: "amount",
                                type: "uint160",
                            },
                            {
                                internalType: "uint48",
                                name: "expiration",
                                type: "uint48",
                            },
                            {
                                internalType: "uint48",
                                name: "nonce",
                                type: "uint48",
                            },
                        ],
                        internalType: "struct IAllowanceTransfer.PermitDetails",
                        name: "details",
                        type: "tuple",
                    },
                    {
                        internalType: "address",
                        name: "spender",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "sigDeadline",
                        type: "uint256",
                    },
                ],
                internalType: "struct IAllowanceTransfer.PermitSingle",
                name: "permitSingle",
                type: "tuple",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct ISignatureTransfer.TokenPermissions",
                        name: "permitted",
                        type: "tuple",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "deadline",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.PermitTransferFrom",
                name: "permit",
                type: "tuple",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "to",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "requestedAmount",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.SignatureTransferDetails",
                name: "transferDetails",
                type: "tuple",
            },
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
        ],
        name: "permitTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct ISignatureTransfer.TokenPermissions[]",
                        name: "permitted",
                        type: "tuple[]",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "deadline",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.PermitBatchTransferFrom",
                name: "permit",
                type: "tuple",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "to",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "requestedAmount",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.SignatureTransferDetails[]",
                name: "transferDetails",
                type: "tuple[]",
            },
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
        ],
        name: "permitTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct ISignatureTransfer.TokenPermissions",
                        name: "permitted",
                        type: "tuple",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "deadline",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.PermitTransferFrom",
                name: "permit",
                type: "tuple",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "to",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "requestedAmount",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.SignatureTransferDetails",
                name: "transferDetails",
                type: "tuple",
            },
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "bytes32",
                name: "witness",
                type: "bytes32",
            },
            {
                internalType: "string",
                name: "witnessTypeString",
                type: "string",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
        ],
        name: "permitWitnessTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "address",
                                name: "token",
                                type: "address",
                            },
                            {
                                internalType: "uint256",
                                name: "amount",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct ISignatureTransfer.TokenPermissions[]",
                        name: "permitted",
                        type: "tuple[]",
                    },
                    {
                        internalType: "uint256",
                        name: "nonce",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "deadline",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.PermitBatchTransferFrom",
                name: "permit",
                type: "tuple",
            },
            {
                components: [
                    {
                        internalType: "address",
                        name: "to",
                        type: "address",
                    },
                    {
                        internalType: "uint256",
                        name: "requestedAmount",
                        type: "uint256",
                    },
                ],
                internalType: "struct ISignatureTransfer.SignatureTransferDetails[]",
                name: "transferDetails",
                type: "tuple[]",
            },
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "bytes32",
                name: "witness",
                type: "bytes32",
            },
            {
                internalType: "string",
                name: "witnessTypeString",
                type: "string",
            },
            {
                internalType: "bytes",
                name: "signature",
                type: "bytes",
            },
        ],
        name: "permitWitnessTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "address",
                        name: "from",
                        type: "address",
                    },
                    {
                        internalType: "address",
                        name: "to",
                        type: "address",
                    },
                    {
                        internalType: "uint160",
                        name: "amount",
                        type: "uint160",
                    },
                    {
                        internalType: "address",
                        name: "token",
                        type: "address",
                    },
                ],
                internalType: "struct IAllowanceTransfer.AllowanceTransferDetails[]",
                name: "transferDetails",
                type: "tuple[]",
            },
        ],
        name: "transferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint160",
                name: "amount",
                type: "uint160",
            },
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "transferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
/** wstETH ABI fragment used to read the stETH exchange rate. */
export const wstEthAbi = [
    {
        inputs: [
            {
                internalType: "contract IStETH",
                name: "_stETH",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "approve",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "subtractedValue",
                type: "uint256",
            },
        ],
        name: "decreaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_wstETHAmount",
                type: "uint256",
            },
        ],
        name: "getStETHByWstETH",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_stETHAmount",
                type: "uint256",
            },
        ],
        name: "getWstETHByStETH",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "addedValue",
                type: "uint256",
            },
        ],
        name: "increaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "nonces",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "stETH",
        outputs: [
            {
                internalType: "contract IStETH",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "stEthPerToken",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "tokensPerStEth",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "recipient",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transfer",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                internalType: "address",
                name: "recipient",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transferFrom",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_wstETHAmount",
                type: "uint256",
            },
        ],
        name: "unwrap",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_stETHAmount",
                type: "uint256",
            },
        ],
        name: "wrap",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        stateMutability: "payable",
        type: "receive",
    },
];
/** MetaMorpho factory ABI used to verify vault factory membership. */
export const metaMorphoFactoryAbi = [
    {
        inputs: [{ internalType: "address", name: "morpho", type: "address" }],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    { inputs: [], name: "ZeroAddress", type: "error" },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "metaMorpho",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "caller",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "initialOwner",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "initialTimelock",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "asset",
                type: "address",
            },
            { indexed: false, internalType: "string", name: "name", type: "string" },
            {
                indexed: false,
                internalType: "string",
                name: "symbol",
                type: "string",
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "salt",
                type: "bytes32",
            },
        ],
        name: "CreateMetaMorpho",
        type: "event",
    },
    {
        inputs: [],
        name: "MORPHO",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "initialOwner", type: "address" },
            { internalType: "uint256", name: "initialTimelock", type: "uint256" },
            { internalType: "address", name: "asset", type: "address" },
            { internalType: "string", name: "name", type: "string" },
            { internalType: "string", name: "symbol", type: "string" },
            { internalType: "bytes32", name: "salt", type: "bytes32" },
        ],
        name: "createMetaMorpho",
        outputs: [
            {
                internalType: "contract IMetaMorphoV1_1",
                name: "metaMorpho",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "isMetaMorpho",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
];
/** MetaMorpho vault ABI used for vault reads and MetaMorpho action encoding. */
export const metaMorphoAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "morpho",
                type: "address",
                internalType: "address",
            },
            {
                name: "initialTimelock",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "_asset",
                type: "address",
                internalType: "address",
            },
            {
                name: "_name",
                type: "string",
                internalType: "string",
            },
            {
                name: "_symbol",
                type: "string",
                internalType: "string",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "DECIMALS_OFFSET",
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
        name: "MORPHO",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "address",
                internalType: "contract IMorpho",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "acceptCap",
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
        name: "acceptGuardian",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "acceptOwnership",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "acceptTimelock",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
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
                name: "value",
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
        name: "config",
        inputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "Id",
            },
        ],
        outputs: [
            {
                name: "cap",
                type: "uint184",
                internalType: "uint184",
            },
            {
                name: "enabled",
                type: "bool",
                internalType: "bool",
            },
            {
                name: "removableAt",
                type: "uint64",
                internalType: "uint64",
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
        name: "deposit",
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
        ],
        outputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "eip712Domain",
        inputs: [],
        outputs: [
            {
                name: "fields",
                type: "bytes1",
                internalType: "bytes1",
            },
            {
                name: "name",
                type: "string",
                internalType: "string",
            },
            {
                name: "version",
                type: "string",
                internalType: "string",
            },
            {
                name: "chainId",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "verifyingContract",
                type: "address",
                internalType: "address",
            },
            {
                name: "salt",
                type: "bytes32",
                internalType: "bytes32",
            },
            {
                name: "extensions",
                type: "uint256[]",
                internalType: "uint256[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "fee",
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
        name: "guardian",
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
        name: "isAllocator",
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
        name: "lastTotalAssets",
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
        name: "lostAssets", // Only defined for MetaMorpho V1.1 vaults.
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
        stateMutability: "view",
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
        stateMutability: "view",
    },
    {
        type: "function",
        name: "maxRedeem",
        inputs: [
            {
                name: "owner",
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
        name: "maxWithdraw",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "view",
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
                name: "receiver",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "assets",
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
        outputs: [
            {
                name: "results",
                type: "bytes[]",
                internalType: "bytes[]",
            },
        ],
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
                name: "owner",
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
        name: "pendingCap",
        inputs: [
            {
                name: "",
                type: "bytes32",
                internalType: "Id",
            },
        ],
        outputs: [
            {
                name: "value",
                type: "uint192",
                internalType: "uint192",
            },
            {
                name: "validAt",
                type: "uint64",
                internalType: "uint64",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "pendingGuardian",
        inputs: [],
        outputs: [
            {
                name: "value",
                type: "address",
                internalType: "address",
            },
            {
                name: "validAt",
                type: "uint64",
                internalType: "uint64",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "pendingOwner",
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
        name: "pendingTimelock",
        inputs: [],
        outputs: [
            {
                name: "value",
                type: "uint192",
                internalType: "uint192",
            },
            {
                name: "validAt",
                type: "uint64",
                internalType: "uint64",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "permit",
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
            {
                name: "value",
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
        name: "reallocate",
        inputs: [
            {
                name: "allocations",
                type: "tuple[]",
                internalType: "struct MarketAllocation[]",
                components: [
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
                ],
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
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
                name: "owner",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "renounceOwnership",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokePendingCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokePendingGuardian",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokePendingMarketRemoval",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "revokePendingTimelock",
        inputs: [],
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
        name: "setFee",
        inputs: [
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
        name: "setIsAllocator",
        inputs: [
            {
                name: "newAllocator",
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
        name: "setSkimRecipient",
        inputs: [
            {
                name: "newSkimRecipient",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "setSupplyQueue",
        inputs: [
            {
                name: "newSupplyQueue",
                type: "bytes32[]",
                internalType: "Id[]",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "skim",
        inputs: [
            {
                name: "token",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "skimRecipient",
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
        name: "submitCap",
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
                name: "newSupplyCap",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "submitGuardian",
        inputs: [
            {
                name: "newGuardian",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "submitMarketRemoval",
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
        name: "submitTimelock",
        inputs: [
            {
                name: "newTimelock",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "supplyQueue",
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
                type: "bytes32",
                internalType: "Id",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "supplyQueueLength",
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
        name: "totalAssets",
        inputs: [],
        outputs: [
            {
                name: "assets",
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
                name: "value",
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
                name: "value",
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
        name: "transferOwnership",
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
        name: "updateWithdrawQueue",
        inputs: [
            {
                name: "indexes",
                type: "uint256[]",
                internalType: "uint256[]",
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
                name: "owner",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "withdrawQueue",
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
                type: "bytes32",
                internalType: "Id",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "withdrawQueueLength",
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
        type: "event",
        name: "AccrueInterest",
        inputs: [
            {
                name: "newTotalAssets",
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
                name: "value",
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
                name: "owner",
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
        name: "EIP712DomainChanged",
        inputs: [],
        anonymous: false,
    },
    {
        type: "event",
        name: "OwnershipTransferStarted",
        inputs: [
            {
                name: "previousOwner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
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
        name: "OwnershipTransferred",
        inputs: [
            {
                name: "previousOwner",
                type: "address",
                indexed: true,
                internalType: "address",
            },
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
        name: "ReallocateSupply",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "suppliedAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "suppliedShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "ReallocateWithdraw",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "withdrawnAssets",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
            {
                name: "withdrawnShares",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RevokePendingCap",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RevokePendingGuardian",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RevokePendingMarketRemoval",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "RevokePendingTimelock",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetCap",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "cap",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
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
        name: "SetFee",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
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
        name: "SetGuardian",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "guardian",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetIsAllocator",
        inputs: [
            {
                name: "allocator",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "isAllocator",
                type: "bool",
                indexed: false,
                internalType: "bool",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetName",
        inputs: [
            {
                name: "name",
                type: "string",
                indexed: false,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetSymbol",
        inputs: [
            {
                name: "symbol",
                type: "string",
                indexed: false,
                internalType: "string",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetSkimRecipient",
        inputs: [
            {
                name: "newSkimRecipient",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetSupplyQueue",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newSupplyQueue",
                type: "bytes32[]",
                indexed: false,
                internalType: "Id[]",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetTimelock",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newTimelock",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SetWithdrawQueue",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "newWithdrawQueue",
                type: "bytes32[]",
                indexed: false,
                internalType: "Id[]",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Skim",
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
                name: "amount",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SubmitCap",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
            {
                name: "cap",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SubmitGuardian",
        inputs: [
            {
                name: "newGuardian",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SubmitMarketRemoval",
        inputs: [
            {
                name: "caller",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "id",
                type: "bytes32",
                indexed: true,
                internalType: "Id",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "SubmitTimelock",
        inputs: [
            {
                name: "newTimelock",
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
                name: "value",
                type: "uint256",
                indexed: false,
                internalType: "uint256",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "UpdateLastTotalAssets",
        inputs: [
            {
                name: "updatedTotalAssets",
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
                name: "owner",
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
        name: "AboveMaxTimelock",
        inputs: [],
    },
    {
        type: "error",
        name: "AddressEmptyCode",
        inputs: [
            {
                name: "target",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "AddressInsufficientBalance",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "AllCapsReached",
        inputs: [],
    },
    {
        type: "error",
        name: "AlreadyPending",
        inputs: [],
    },
    {
        type: "error",
        name: "AlreadySet",
        inputs: [],
    },
    {
        type: "error",
        name: "BelowMinTimelock",
        inputs: [],
    },
    {
        type: "error",
        name: "DuplicateMarket",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "ECDSAInvalidSignature",
        inputs: [],
    },
    {
        type: "error",
        name: "ECDSAInvalidSignatureLength",
        inputs: [
            {
                name: "length",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ECDSAInvalidSignatureS",
        inputs: [
            {
                name: "s",
                type: "bytes32",
                internalType: "bytes32",
            },
        ],
    },
    {
        type: "error",
        name: "ERC20InsufficientAllowance",
        inputs: [
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
            {
                name: "allowance",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "needed",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ERC20InsufficientBalance",
        inputs: [
            {
                name: "sender",
                type: "address",
                internalType: "address",
            },
            {
                name: "balance",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "needed",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ERC20InvalidApprover",
        inputs: [
            {
                name: "approver",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "ERC20InvalidReceiver",
        inputs: [
            {
                name: "receiver",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "ERC20InvalidSender",
        inputs: [
            {
                name: "sender",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "ERC20InvalidSpender",
        inputs: [
            {
                name: "spender",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "ERC2612ExpiredSignature",
        inputs: [
            {
                name: "deadline",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ERC2612InvalidSigner",
        inputs: [
            {
                name: "signer",
                type: "address",
                internalType: "address",
            },
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "ERC4626ExceededMaxDeposit",
        inputs: [
            {
                name: "receiver",
                type: "address",
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "max",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ERC4626ExceededMaxMint",
        inputs: [
            {
                name: "receiver",
                type: "address",
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "max",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ERC4626ExceededMaxRedeem",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "shares",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "max",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "ERC4626ExceededMaxWithdraw",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
            {
                name: "assets",
                type: "uint256",
                internalType: "uint256",
            },
            {
                name: "max",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "FailedInnerCall",
        inputs: [],
    },
    {
        type: "error",
        name: "InconsistentAsset",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "InconsistentReallocation",
        inputs: [],
    },
    {
        type: "error",
        name: "InvalidAccountNonce",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
            {
                name: "currentNonce",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "InvalidMarketRemovalNonZeroCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "InvalidMarketRemovalNonZeroSupply",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "InvalidMarketRemovalTimelockNotElapsed",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "InvalidShortString",
        inputs: [],
    },
    {
        type: "error",
        name: "MarketNotCreated",
        inputs: [],
    },
    {
        type: "error",
        name: "MarketNotEnabled",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "MathOverflowedMulDiv",
        inputs: [],
    },
    {
        type: "error",
        name: "MaxFeeExceeded",
        inputs: [],
    },
    {
        type: "error",
        name: "MaxQueueLengthExceeded",
        inputs: [],
    },
    {
        type: "error",
        name: "NoPendingValue",
        inputs: [],
    },
    {
        type: "error",
        name: "NonZeroCap",
        inputs: [],
    },
    {
        type: "error",
        name: "NotAllocatorRole",
        inputs: [],
    },
    {
        type: "error",
        name: "NotCuratorNorGuardianRole",
        inputs: [],
    },
    {
        type: "error",
        name: "NotCuratorRole",
        inputs: [],
    },
    {
        type: "error",
        name: "NotEnoughLiquidity",
        inputs: [],
    },
    {
        type: "error",
        name: "NotGuardianRole",
        inputs: [],
    },
    {
        type: "error",
        name: "OwnableInvalidOwner",
        inputs: [
            {
                name: "owner",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "OwnableUnauthorizedAccount",
        inputs: [
            {
                name: "account",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "PendingCap",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "PendingRemoval",
        inputs: [],
    },
    {
        type: "error",
        name: "SafeCastOverflowedUintDowncast",
        inputs: [
            {
                name: "bits",
                type: "uint8",
                internalType: "uint8",
            },
            {
                name: "value",
                type: "uint256",
                internalType: "uint256",
            },
        ],
    },
    {
        type: "error",
        name: "SafeERC20FailedOperation",
        inputs: [
            {
                name: "token",
                type: "address",
                internalType: "address",
            },
        ],
    },
    {
        type: "error",
        name: "StringTooLong",
        inputs: [
            {
                name: "str",
                type: "string",
                internalType: "string",
            },
        ],
    },
    {
        type: "error",
        name: "SupplyCapExceeded",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "TimelockNotElapsed",
        inputs: [],
    },
    {
        type: "error",
        name: "UnauthorizedMarket",
        inputs: [
            {
                name: "id",
                type: "bytes32",
                internalType: "Id",
            },
        ],
    },
    {
        type: "error",
        name: "ZeroAddress",
        inputs: [],
    },
    {
        type: "error",
        name: "ZeroFeeRecipient",
        inputs: [],
    },
];
/** PublicAllocator ABI used to read vault allocator configuration and flow caps. */
export const publicAllocatorAbi = [
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
        inputs: [],
        name: "AlreadySet",
        type: "error",
    },
    {
        inputs: [],
        name: "DepositMarketInWithdrawals",
        type: "error",
    },
    {
        inputs: [],
        name: "EmptyWithdrawals",
        type: "error",
    },
    {
        inputs: [],
        name: "InconsistentWithdrawals",
        type: "error",
    },
    {
        inputs: [],
        name: "IncorrectFee",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "id",
                type: "bytes32",
            },
        ],
        name: "MarketNotEnabled",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "id",
                type: "bytes32",
            },
        ],
        name: "MaxInflowExceeded",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "id",
                type: "bytes32",
            },
        ],
        name: "MaxOutflowExceeded",
        type: "error",
    },
    {
        inputs: [],
        name: "MaxSettableFlowCapExceeded",
        type: "error",
    },
    {
        inputs: [],
        name: "NotAdminNorVaultOwner",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "id",
                type: "bytes32",
            },
        ],
        name: "NotEnoughSupply",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "Id",
                name: "id",
                type: "bytes32",
            },
        ],
        name: "WithdrawZero",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                indexed: true,
                internalType: "Id",
                name: "supplyMarketId",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "suppliedAssets",
                type: "uint256",
            },
        ],
        name: "PublicReallocateTo",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                indexed: true,
                internalType: "Id",
                name: "id",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "withdrawnAssets",
                type: "uint256",
            },
        ],
        name: "PublicWithdrawal",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "admin",
                type: "address",
            },
        ],
        name: "SetAdmin",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "fee",
                type: "uint256",
            },
        ],
        name: "SetFee",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                components: [
                    {
                        internalType: "Id",
                        name: "id",
                        type: "bytes32",
                    },
                    {
                        components: [
                            {
                                internalType: "uint128",
                                name: "maxIn",
                                type: "uint128",
                            },
                            {
                                internalType: "uint128",
                                name: "maxOut",
                                type: "uint128",
                            },
                        ],
                        internalType: "struct FlowCaps",
                        name: "caps",
                        type: "tuple",
                    },
                ],
                indexed: false,
                internalType: "struct FlowCapsConfig[]",
                name: "config",
                type: "tuple[]",
            },
        ],
        name: "SetFlowCaps",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                indexed: true,
                internalType: "address",
                name: "feeRecipient",
                type: "address",
            },
        ],
        name: "TransferFee",
        type: "event",
    },
    {
        inputs: [],
        name: "MORPHO",
        outputs: [
            {
                internalType: "contract IMorpho",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "accruedFee",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "admin",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "fee",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "Id",
                name: "",
                type: "bytes32",
            },
        ],
        name: "flowCaps",
        outputs: [
            {
                internalType: "uint128",
                name: "maxIn",
                type: "uint128",
            },
            {
                internalType: "uint128",
                name: "maxOut",
                type: "uint128",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                components: [
                    {
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
                        internalType: "struct MarketParams",
                        name: "marketParams",
                        type: "tuple",
                    },
                    {
                        internalType: "uint128",
                        name: "amount",
                        type: "uint128",
                    },
                ],
                internalType: "struct Withdrawal[]",
                name: "withdrawals",
                type: "tuple[]",
            },
            {
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
                internalType: "struct MarketParams",
                name: "supplyMarketParams",
                type: "tuple",
            },
        ],
        name: "reallocateTo",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                internalType: "address",
                name: "newAdmin",
                type: "address",
            },
        ],
        name: "setAdmin",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "newFee",
                type: "uint256",
            },
        ],
        name: "setFee",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                components: [
                    {
                        internalType: "Id",
                        name: "id",
                        type: "bytes32",
                    },
                    {
                        components: [
                            {
                                internalType: "uint128",
                                name: "maxIn",
                                type: "uint128",
                            },
                            {
                                internalType: "uint128",
                                name: "maxOut",
                                type: "uint128",
                            },
                        ],
                        internalType: "struct FlowCaps",
                        name: "caps",
                        type: "tuple",
                    },
                ],
                internalType: "struct FlowCapsConfig[]",
                name: "config",
                type: "tuple[]",
            },
        ],
        name: "setFlowCaps",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "vault",
                type: "address",
            },
            {
                internalType: "address payable",
                name: "feeRecipient",
                type: "address",
            },
        ],
        name: "transferFee",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
/** Wrapped Backed token ABI used to discover permissioning controllers. */
export const wrappedBackedTokenAbi = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
        ],
        name: "NonWhitelistedFromAddress",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
        ],
        name: "NonWhitelistedToAddress",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [],
        name: "EIP712DomainChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint8",
                name: "version",
                type: "uint8",
            },
        ],
        name: "Initialized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "Paused",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "whitelistedBy",
                type: "address",
            },
        ],
        name: "TransferDestinationAuthorized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "whitelistedBy",
                type: "address",
            },
        ],
        name: "TransferOriginatorAuthorized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "Unpaused",
        type: "event",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "approve",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "subtractedValue",
                type: "uint256",
            },
        ],
        name: "decreaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "depositFor",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "eip712Domain",
        outputs: [
            {
                internalType: "bytes1",
                name: "fields",
                type: "bytes1",
            },
            {
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                internalType: "string",
                name: "version",
                type: "string",
            },
            {
                internalType: "uint256",
                name: "chainId",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "verifyingContract",
                type: "address",
            },
            {
                internalType: "bytes32",
                name: "salt",
                type: "bytes32",
            },
            {
                internalType: "uint256[]",
                name: "extensions",
                type: "uint256[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "addedValue",
                type: "uint256",
            },
        ],
        name: "increaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "underlyingToken",
                type: "address",
            },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "nonces",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "pause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "paused",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "controllerAggregator",
                type: "address",
            },
        ],
        name: "setWhitelistController",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transfer",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transferFrom",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "underlying",
        outputs: [
            {
                internalType: "contract IERC20Upgradeable",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "unpause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "whitelistControllerAggregator",
        outputs: [
            {
                internalType: "contract WhitelistControllerAggregator",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "withdrawTo",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
];
/** WhitelistControllerAggregatorV2 ABI used to read transfer permission status. */
export const whitelistControllerAggregatorV2Abi = [
    {
        inputs: [],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "controller",
                type: "address",
            },
        ],
        name: "AddedController",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint8",
                name: "version",
                type: "uint8",
            },
        ],
        name: "Initialized",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "controller",
                type: "address",
            },
        ],
        name: "RemovedController",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "controller",
                type: "address",
            },
        ],
        name: "add",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        name: "controllers",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "addressToCheck",
                type: "address",
            },
        ],
        name: "isWhitelisted",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "index",
                type: "uint256",
            },
        ],
        name: "remove",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
/** Permissioned ERC20 wrapper ABI used to read account transfer permission status. */
export const permissionedErc20WrapperAbi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "target",
                type: "address",
            },
        ],
        name: "AddressEmptyCode",
        type: "error",
    },
    {
        inputs: [],
        name: "ECDSAInvalidSignature",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "length",
                type: "uint256",
            },
        ],
        name: "ECDSAInvalidSignatureLength",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "ECDSAInvalidSignatureS",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "allowance",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "needed",
                type: "uint256",
            },
        ],
        name: "ERC20InsufficientAllowance",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "balance",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "needed",
                type: "uint256",
            },
        ],
        name: "ERC20InsufficientBalance",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "approver",
                type: "address",
            },
        ],
        name: "ERC20InvalidApprover",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "receiver",
                type: "address",
            },
        ],
        name: "ERC20InvalidReceiver",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "ERC20InvalidSender",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "ERC20InvalidSpender",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "ERC20InvalidUnderlying",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
        ],
        name: "ERC2612ExpiredSignature",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "signer",
                type: "address",
            },
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "ERC2612InvalidSigner",
        type: "error",
    },
    {
        inputs: [],
        name: "FailedCall",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "balance",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "needed",
                type: "uint256",
            },
        ],
        name: "InsufficientBalance",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "currentNonce",
                type: "uint256",
            },
        ],
        name: "InvalidAccountNonce",
        type: "error",
    },
    {
        inputs: [],
        name: "InvalidShortString",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "NoPermission",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "token",
                type: "address",
            },
        ],
        name: "SafeERC20FailedOperation",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "string",
                name: "str",
                type: "string",
            },
        ],
        name: "StringTooLong",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [],
        name: "EIP712DomainChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        inputs: [],
        name: "BUNDLER",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "DOMAIN_SEPARATOR",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "MORPHO",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "approve",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
        outputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "depositFor",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "eip712Domain",
        outputs: [
            {
                internalType: "bytes1",
                name: "fields",
                type: "bytes1",
            },
            {
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                internalType: "string",
                name: "version",
                type: "string",
            },
            {
                internalType: "uint256",
                name: "chainId",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "verifyingContract",
                type: "address",
            },
            {
                internalType: "bytes32",
                name: "salt",
                type: "bytes32",
            },
            {
                internalType: "uint256[]",
                name: "extensions",
                type: "uint256[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "hasPermission",
        outputs: [
            {
                internalType: "bool",
                name: "attested",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
        ],
        name: "nonces",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256",
            },
            {
                internalType: "uint8",
                name: "v",
                type: "uint8",
            },
            {
                internalType: "bytes32",
                name: "r",
                type: "bytes32",
            },
            {
                internalType: "bytes32",
                name: "s",
                type: "bytes32",
            },
        ],
        name: "permit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "transfer",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "transferFrom",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "underlying",
        outputs: [
            {
                internalType: "contract IERC20",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "withdrawTo",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
];
/** EIP-5267 ABI used to read ERC20 EIP-712 domain metadata. */
export const erc5267Abi = [
    {
        inputs: [],
        name: "eip712Domain",
        outputs: [
            {
                internalType: "bytes1",
                name: "fields",
                type: "bytes1",
            },
            {
                internalType: "string",
                name: "name",
                type: "string",
            },
            {
                internalType: "string",
                name: "version",
                type: "string",
            },
            {
                internalType: "uint256",
                name: "chainId",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "verifyingContract",
                type: "address",
            },
            {
                internalType: "bytes32",
                name: "salt",
                type: "bytes32",
            },
            {
                internalType: "uint256[]",
                name: "extensions",
                type: "uint256[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
/** VaultV2 ABI used to read vault accounting, adapter, and allocation state. */
export const vaultV2Abi = [
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
];
/** VaultV2 factory ABI used to verify VaultV2 factory membership. */
export const vaultV2FactoryAbi = [
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
];
/** MorphoVaultV1Adapter factory ABI used to verify adapter factory membership. */
export const morphoVaultV1AdapterFactoryAbi = [
    {
        type: "function",
        name: "createMorphoVaultV1Adapter",
        inputs: [
            {
                name: "parentVault",
                type: "address",
                internalType: "address",
            },
            {
                name: "morphoVaultV1",
                type: "address",
                internalType: "address",
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
        name: "isMorphoVaultV1Adapter",
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
        name: "morphoVaultV1Adapter",
        inputs: [
            {
                name: "parentVault",
                type: "address",
                internalType: "address",
            },
            {
                name: "morphoVaultV1",
                type: "address",
                internalType: "address",
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
        name: "CreateMorphoVaultV1Adapter",
        inputs: [
            {
                name: "parentVault",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "morphoVaultV1",
                type: "address",
                indexed: true,
                internalType: "address",
            },
            {
                name: "morphoVaultV1Adapter",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
];
/** MorphoVaultV1Adapter ABI used to read VaultV2 adapter state. */
export const morphoVaultV1AdapterAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_parentVault",
                type: "address",
                internalType: "address",
            },
            {
                name: "_morphoVaultV1",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "adapterId",
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
        name: "allocate",
        inputs: [
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
                name: "",
                type: "bytes4",
                internalType: "bytes4",
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
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
            {
                name: "",
                type: "int256",
                internalType: "int256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "allocation",
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
        name: "deallocate",
        inputs: [
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
                name: "",
                type: "bytes4",
                internalType: "bytes4",
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
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
            {
                name: "",
                type: "int256",
                internalType: "int256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "factory",
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
        name: "ids",
        inputs: [],
        outputs: [
            {
                name: "",
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "morphoVaultV1",
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
        name: "parentVault",
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
        name: "realAssets",
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
        name: "setSkimRecipient",
        inputs: [
            {
                name: "newSkimRecipient",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "skim",
        inputs: [
            {
                name: "token",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "skimRecipient",
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
        type: "event",
        name: "SetSkimRecipient",
        inputs: [
            {
                name: "newSkimRecipient",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Skim",
        inputs: [
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
        type: "error",
        name: "ApproveReturnedFalse",
        inputs: [],
    },
    {
        type: "error",
        name: "ApproveReverted",
        inputs: [],
    },
    {
        type: "error",
        name: "AssetMismatch",
        inputs: [],
    },
    {
        type: "error",
        name: "CannotSkimMorphoVaultV1Shares",
        inputs: [],
    },
    {
        type: "error",
        name: "InvalidData",
        inputs: [],
    },
    {
        type: "error",
        name: "NoCode",
        inputs: [],
    },
    {
        type: "error",
        name: "NotAuthorized",
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
];
/** MorphoMarketV1Adapter ABI used to read VaultV2 market adapter state. */
export const morphoMarketV1AdapterAbi = [
    {
        type: "constructor",
        inputs: [
            {
                name: "_parentVault",
                type: "address",
                internalType: "address",
            },
            {
                name: "_morpho",
                type: "address",
                internalType: "address",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "adapterId",
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
        name: "allocate",
        inputs: [
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
                name: "",
                type: "bytes4",
                internalType: "bytes4",
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
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
            {
                name: "",
                type: "int256",
                internalType: "int256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "allocation",
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
        name: "deallocate",
        inputs: [
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
                name: "",
                type: "bytes4",
                internalType: "bytes4",
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
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
            {
                name: "",
                type: "int256",
                internalType: "int256",
            },
        ],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "factory",
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
        name: "ids",
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
        outputs: [
            {
                name: "",
                type: "bytes32[]",
                internalType: "bytes32[]",
            },
        ],
        stateMutability: "view",
    },
    {
        type: "function",
        name: "marketParamsList",
        inputs: [
            {
                name: "",
                type: "uint256",
                internalType: "uint256",
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
        name: "marketParamsListLength",
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
        name: "morpho",
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
        name: "parentVault",
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
        name: "realAssets",
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
        name: "setSkimRecipient",
        inputs: [
            {
                name: "newSkimRecipient",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "skim",
        inputs: [
            {
                name: "token",
                type: "address",
                internalType: "address",
            },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        type: "function",
        name: "skimRecipient",
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
        type: "event",
        name: "SetSkimRecipient",
        inputs: [
            {
                name: "newSkimRecipient",
                type: "address",
                indexed: true,
                internalType: "address",
            },
        ],
        anonymous: false,
    },
    {
        type: "event",
        name: "Skim",
        inputs: [
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
        type: "error",
        name: "ApproveReturnedFalse",
        inputs: [],
    },
    {
        type: "error",
        name: "ApproveReverted",
        inputs: [],
    },
    {
        type: "error",
        name: "LoanAssetMismatch",
        inputs: [],
    },
    {
        type: "error",
        name: "NoCode",
        inputs: [],
    },
    {
        type: "error",
        name: "NotAuthorized",
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
];
/** MorphoMarketV1Adapter factory ABI used to verify adapter factory membership. */
export const morphoMarketV1AdapterFactoryAbi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "parentVault",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "morpho",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "morphoMarketV1Adapter",
                type: "address",
            },
        ],
        name: "CreateMorphoMarketV1Adapter",
        type: "event",
    },
    {
        inputs: [
            { internalType: "address", name: "parentVault", type: "address" },
            { internalType: "address", name: "morpho", type: "address" },
        ],
        name: "createMorphoMarketV1Adapter",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "isMorphoMarketV1Adapter",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "parentVault", type: "address" },
            { internalType: "address", name: "morpho", type: "address" },
        ],
        name: "morphoMarketV1Adapter",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
];
/**
 * Alias for the MorphoVaultV1Adapter factory ABI.
 *
 * @deprecated Use `morphoVaultV1AdapterFactoryAbi` instead.
 */
export const vaultV1AdapterFactoryAbi = morphoVaultV1AdapterFactoryAbi;
/**
 * Alias for the MorphoVaultV1Adapter ABI.
 *
 * @deprecated Use `morphoVaultV1AdapterAbi` instead.
 */
export const vaultV1AdapterAbi = morphoVaultV1AdapterAbi;
/** MorphoMarketV1AdapterV2 ABI used to read VaultV2 market adapter state. */
export const morphoMarketV1AdapterV2Abi = [
    {
        inputs: [
            { internalType: "address", name: "_parentVault", type: "address" },
            { internalType: "address", name: "_morpho", type: "address" },
            { internalType: "address", name: "_adaptiveCurveIrm", type: "address" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    { inputs: [], name: "Abdicated", type: "error" },
    { inputs: [], name: "ApproveReturnedFalse", type: "error" },
    { inputs: [], name: "ApproveReverted", type: "error" },
    { inputs: [], name: "AutomaticallyTimelocked", type: "error" },
    { inputs: [], name: "DataAlreadyPending", type: "error" },
    { inputs: [], name: "DataNotTimelocked", type: "error" },
    { inputs: [], name: "IrmMismatch", type: "error" },
    { inputs: [], name: "LoanAssetMismatch", type: "error" },
    { inputs: [], name: "NoCode", type: "error" },
    { inputs: [], name: "SharePriceAboveOne", type: "error" },
    { inputs: [], name: "TimelockNotDecreasing", type: "error" },
    { inputs: [], name: "TimelockNotExpired", type: "error" },
    { inputs: [], name: "TimelockNotIncreasing", type: "error" },
    { inputs: [], name: "TransferReturnedFalse", type: "error" },
    { inputs: [], name: "TransferReverted", type: "error" },
    { inputs: [], name: "Unauthorized", type: "error" },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
        ],
        name: "Abdicate",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
            { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
        ],
        name: "Accept",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "marketId",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newAllocation",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "mintedShares",
                type: "uint256",
            },
        ],
        name: "Allocate",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "marketId",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "supplyShares",
                type: "uint256",
            },
        ],
        name: "BurnShares",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "marketId",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newAllocation",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "burnedShares",
                type: "uint256",
            },
        ],
        name: "Deallocate",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newDuration",
                type: "uint256",
            },
        ],
        name: "DecreaseTimelock",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "newDuration",
                type: "uint256",
            },
        ],
        name: "IncreaseTimelock",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
            { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
        ],
        name: "Revoke",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "newSkimRecipient",
                type: "address",
            },
        ],
        name: "SetSkimRecipient",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "token",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "assets",
                type: "uint256",
            },
        ],
        name: "Skim",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes4",
                name: "selector",
                type: "bytes4",
            },
            { indexed: false, internalType: "bytes", name: "data", type: "bytes" },
            {
                indexed: false,
                internalType: "uint256",
                name: "executableAt",
                type: "uint256",
            },
        ],
        name: "Submit",
        type: "event",
    },
    {
        inputs: [{ internalType: "bytes4", name: "selector", type: "bytes4" }],
        name: "abdicate",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes4", name: "selector", type: "bytes4" }],
        name: "abdicated",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "adapterId",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "adaptiveCurveIrm",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bytes", name: "data", type: "bytes" },
            { internalType: "uint256", name: "assets", type: "uint256" },
            { internalType: "bytes4", name: "", type: "bytes4" },
            { internalType: "address", name: "", type: "address" },
        ],
        name: "allocate",
        outputs: [
            { internalType: "bytes32[]", name: "", type: "bytes32[]" },
            { internalType: "int256", name: "", type: "int256" },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    { internalType: "address", name: "loanToken", type: "address" },
                    { internalType: "address", name: "collateralToken", type: "address" },
                    { internalType: "address", name: "oracle", type: "address" },
                    { internalType: "address", name: "irm", type: "address" },
                    { internalType: "uint256", name: "lltv", type: "uint256" },
                ],
                internalType: "struct MarketParams",
                name: "marketParams",
                type: "tuple",
            },
        ],
        name: "allocation",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "asset",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes32", name: "marketId", type: "bytes32" }],
        name: "burnShares",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bytes", name: "data", type: "bytes" },
            { internalType: "uint256", name: "assets", type: "uint256" },
            { internalType: "bytes4", name: "", type: "bytes4" },
            { internalType: "address", name: "", type: "address" },
        ],
        name: "deallocate",
        outputs: [
            { internalType: "bytes32[]", name: "", type: "bytes32[]" },
            { internalType: "int256", name: "", type: "int256" },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bytes4", name: "selector", type: "bytes4" },
            { internalType: "uint256", name: "newDuration", type: "uint256" },
        ],
        name: "decreaseTimelock",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
        name: "executableAt",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes32", name: "marketId", type: "bytes32" }],
        name: "expectedSupplyAssets",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "factory",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    { internalType: "address", name: "loanToken", type: "address" },
                    { internalType: "address", name: "collateralToken", type: "address" },
                    { internalType: "address", name: "oracle", type: "address" },
                    { internalType: "address", name: "irm", type: "address" },
                    { internalType: "uint256", name: "lltv", type: "uint256" },
                ],
                internalType: "struct MarketParams",
                name: "marketParams",
                type: "tuple",
            },
        ],
        name: "ids",
        outputs: [{ internalType: "bytes32[]", name: "", type: "bytes32[]" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            { internalType: "bytes4", name: "selector", type: "bytes4" },
            { internalType: "uint256", name: "newDuration", type: "uint256" },
        ],
        name: "increaseTimelock",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        name: "marketIds",
        outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "marketIdsLength",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "morpho",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "parentVault",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "realAssets",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
        name: "revoke",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            { internalType: "address", name: "newSkimRecipient", type: "address" },
        ],
        name: "setSkimRecipient",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "token", type: "address" }],
        name: "skim",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "skimRecipient",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes", name: "data", type: "bytes" }],
        name: "submit",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes32", name: "marketId", type: "bytes32" }],
        name: "supplyShares",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "bytes4", name: "selector", type: "bytes4" }],
        name: "timelock",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
    },
];
/** MorphoMarketV1AdapterV2 factory ABI used to verify adapter factory membership. */
export const morphoMarketV1AdapterV2FactoryAbi = [
    {
        inputs: [
            { internalType: "address", name: "_morpho", type: "address" },
            { internalType: "address", name: "_adaptiveCurveIrm", type: "address" },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "parentVault",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "morphoMarketV1AdapterV2",
                type: "address",
            },
        ],
        name: "CreateMorphoMarketV1AdapterV2",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "morpho",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "adaptiveCurveIrm",
                type: "address",
            },
        ],
        name: "CreateMorphoMarketV1AdapterV2Factory",
        type: "event",
    },
    {
        inputs: [],
        name: "adaptiveCurveIrm",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "parentVault", type: "address" }],
        name: "createMorphoMarketV1AdapterV2",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "isMorphoMarketV1AdapterV2",
        outputs: [{ internalType: "bool", name: "", type: "bool" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "morpho",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [{ internalType: "address", name: "parentVault", type: "address" }],
        name: "morphoMarketV1AdapterV2",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
    },
];

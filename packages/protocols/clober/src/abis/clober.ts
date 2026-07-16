// GENERATED FILE - do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// ABI origin: vendored (ADR 0007)
//   source:   @clober/v2-sdk@1.0.3 (npm), full upstream ABI constants
//   tarball:  sha256 971c3819199cad74f3d5c61d62a632791dafbd2c246d1772268ed84541656de7
//   vendored: 2026-07-16 (release-age guard: 7d)
//   verification: fixed deployments and exercised functions are checked live on Monad mainnet.

export const CloberControllerAbi = [
    {
        inputs: [
            {
                internalType: 'address',
                name: 'bookManager_',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'target',
                type: 'address',
            },
        ],
        name: 'AddressEmptyCode',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ControllerSlippage',
        type: 'error',
    },
    {
        inputs: [],
        name: 'Deadline',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ERC20TransferFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'FailedCall',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'balance',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'needed',
                type: 'uint256',
            },
        ],
        name: 'InsufficientBalance',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidAccess',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidAction',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidLength',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidPrice',
        type: 'error',
    },
    {
        inputs: [],
        name: 'InvalidTick',
        type: 'error',
    },
    {
        inputs: [],
        name: 'NativeTransferFailed',
        type: 'error',
    },
    {
        inputs: [],
        name: 'ReentrancyGuardReentrantCall',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint8',
                name: 'bits',
                type: 'uint8',
            },
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'SafeCastOverflowedUintDowncast',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'token',
                type: 'address',
            },
        ],
        name: 'SafeERC20FailedOperation',
        type: 'error',
    },
    {
        inputs: [],
        name: 'bookManager',
        outputs: [
            {
                internalType: 'contract IBookManager',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'OrderId',
                        name: 'id',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'leftQuoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.CancelOrderParams[]',
                name: 'orderParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC721PermitParams[]',
                name: 'permitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'cancel',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'OrderId',
                        name: 'id',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.ClaimOrderParams[]',
                name: 'orderParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC721PermitParams[]',
                name: 'permitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'claim',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'enum IController.Action[]',
                name: 'actionList',
                type: 'uint8[]',
            },
            {
                internalType: 'bytes[]',
                name: 'paramsDataList',
                type: 'bytes[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'permitAmount',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC20PermitParams[]',
                name: 'erc20PermitParamsList',
                type: 'tuple[]',
            },
            {
                components: [
                    {
                        internalType: 'uint256',
                        name: 'tokenId',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC721PermitParams[]',
                name: 'erc721PermitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'execute',
        outputs: [
            {
                internalType: 'OrderId[]',
                name: 'ids',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'price',
                type: 'uint256',
            },
        ],
        name: 'fromPrice',
        outputs: [
            {
                internalType: 'Tick',
                name: '',
                type: 'int24',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'BookId',
                name: 'id',
                type: 'uint192',
            },
            {
                internalType: 'Tick',
                name: 'tick',
                type: 'int24',
            },
        ],
        name: 'getDepth',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'BookId',
                name: 'id',
                type: 'uint192',
            },
        ],
        name: 'getHighestPrice',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'OrderId',
                name: 'orderId',
                type: 'uint256',
            },
        ],
        name: 'getOrder',
        outputs: [
            {
                internalType: 'address',
                name: 'provider',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'price',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'openAmount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'claimableAmount',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'BookId',
                        name: 'takeBookId',
                        type: 'uint192',
                    },
                    {
                        internalType: 'BookId',
                        name: 'makeBookId',
                        type: 'uint192',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limitPrice',
                        type: 'uint256',
                    },
                    {
                        internalType: 'Tick',
                        name: 'tick',
                        type: 'int24',
                    },
                    {
                        internalType: 'uint256',
                        name: 'quoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'provider',
                        type: 'address',
                    },
                    {
                        internalType: 'bytes',
                        name: 'takeHookData',
                        type: 'bytes',
                    },
                    {
                        internalType: 'bytes',
                        name: 'makeHookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.LimitOrderParams[]',
                name: 'orderParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'permitAmount',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC20PermitParams[]',
                name: 'permitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'limit',
        outputs: [
            {
                internalType: 'OrderId[]',
                name: 'ids',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'sender',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        name: 'lockAcquired',
        outputs: [
            {
                internalType: 'bytes',
                name: 'returnData',
                type: 'bytes',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'BookId',
                        name: 'id',
                        type: 'uint192',
                    },
                    {
                        internalType: 'Tick',
                        name: 'tick',
                        type: 'int24',
                    },
                    {
                        internalType: 'uint256',
                        name: 'quoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'address',
                        name: 'provider',
                        type: 'address',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.MakeOrderParams[]',
                name: 'orderParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'permitAmount',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC20PermitParams[]',
                name: 'permitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'make',
        outputs: [
            {
                internalType: 'OrderId[]',
                name: 'ids',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        components: [
                            {
                                internalType: 'Currency',
                                name: 'base',
                                type: 'address',
                            },
                            {
                                internalType: 'uint64',
                                name: 'unitSize',
                                type: 'uint64',
                            },
                            {
                                internalType: 'Currency',
                                name: 'quote',
                                type: 'address',
                            },
                            {
                                internalType: 'FeePolicy',
                                name: 'makerPolicy',
                                type: 'uint24',
                            },
                            {
                                internalType: 'contract IHooks',
                                name: 'hooks',
                                type: 'address',
                            },
                            {
                                internalType: 'FeePolicy',
                                name: 'takerPolicy',
                                type: 'uint24',
                            },
                        ],
                        internalType: 'struct IBookManager.BookKey',
                        name: 'key',
                        type: 'tuple',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.OpenBookParams[]',
                name: 'openBookParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'open',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'BookId',
                        name: 'id',
                        type: 'uint192',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limitPrice',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'baseAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minQuoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.SpendOrderParams[]',
                name: 'orderParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'permitAmount',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC20PermitParams[]',
                name: 'permitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'spend',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'BookId',
                        name: 'id',
                        type: 'uint192',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limitPrice',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'quoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxBaseAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.TakeOrderParams[]',
                name: 'orderParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'address[]',
                name: 'tokensToSettle',
                type: 'address[]',
            },
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'token',
                        type: 'address',
                    },
                    {
                        internalType: 'uint256',
                        name: 'permitAmount',
                        type: 'uint256',
                    },
                    {
                        components: [
                            {
                                internalType: 'uint256',
                                name: 'deadline',
                                type: 'uint256',
                            },
                            {
                                internalType: 'uint8',
                                name: 'v',
                                type: 'uint8',
                            },
                            {
                                internalType: 'bytes32',
                                name: 'r',
                                type: 'bytes32',
                            },
                            {
                                internalType: 'bytes32',
                                name: 's',
                                type: 'bytes32',
                            },
                        ],
                        internalType: 'struct IController.PermitSignature',
                        name: 'signature',
                        type: 'tuple',
                    },
                ],
                internalType: 'struct IController.ERC20PermitParams[]',
                name: 'permitParamsList',
                type: 'tuple[]',
            },
            {
                internalType: 'uint64',
                name: 'deadline',
                type: 'uint64',
            },
        ],
        name: 'take',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'Tick',
                name: 'tick',
                type: 'int24',
            },
        ],
        name: 'toPrice',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    },
] as const;

export const CloberBookManagerAbi = [
    {
        inputs: [
            {
                internalType: 'OrderId',
                name: 'id',
                type: 'uint256',
            },
        ],
        name: 'getOrder',
        outputs: [
            {
                components: [
                    {
                        internalType: 'address',
                        name: 'provider',
                        type: 'address',
                    },
                    {
                        internalType: 'uint64',
                        name: 'open',
                        type: 'uint64',
                    },
                    {
                        internalType: 'uint64',
                        name: 'claimable',
                        type: 'uint64',
                    },
                ],
                internalType: 'struct IBookManager.OrderInfo',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'ownerOf',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'BookId',
                name: 'id',
                type: 'uint192',
            },
        ],
        name: 'getBookKey',
        outputs: [
            {
                components: [
                    {
                        internalType: 'Currency',
                        name: 'base',
                        type: 'address',
                    },
                    {
                        internalType: 'uint64',
                        name: 'unitSize',
                        type: 'uint64',
                    },
                    {
                        internalType: 'Currency',
                        name: 'quote',
                        type: 'address',
                    },
                    {
                        internalType: 'FeePolicy',
                        name: 'makerPolicy',
                        type: 'uint24',
                    },
                    {
                        internalType: 'contract IHooks',
                        name: 'hooks',
                        type: 'address',
                    },
                    {
                        internalType: 'FeePolicy',
                        name: 'takerPolicy',
                        type: 'uint24',
                    },
                ],
                internalType: 'struct IBookManager.BookKey',
                name: '',
                type: 'tuple',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        type: 'event',
        name: 'Make',
        inputs: [
            {
                name: 'bookId',
                type: 'uint192',
                indexed: true,
                internalType: 'BookId',
            },
            { name: 'user', type: 'address', indexed: true, internalType: 'address' },
            { name: 'tick', type: 'int24', indexed: false, internalType: 'Tick' },
            {
                name: 'orderIndex',
                type: 'uint256',
                indexed: false,
                internalType: 'uint256',
            },
            { name: 'unit', type: 'uint64', indexed: false, internalType: 'uint64' },
            {
                name: 'provider',
                type: 'address',
                indexed: false,
                internalType: 'address',
            },
        ],
        anonymous: false,
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'BookId',
                name: 'bookId',
                type: 'uint192',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'user',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'Tick',
                name: 'tick',
                type: 'int24',
            },
            {
                indexed: false,
                internalType: 'uint64',
                name: 'unit',
                type: 'uint64',
            },
        ],
        name: 'Take',
        type: 'event',
    },
] as const;

export const CloberBookViewerAbi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'previousOwner',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'OwnershipTransferred',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'previousImplementation',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'newImplementation',
                type: 'address',
            },
        ],
        name: 'ProxyImplementationUpdated',
        type: 'event',
    },
    {
        stateMutability: 'payable',
        type: 'fallback',
    },
    {
        inputs: [],
        name: 'owner',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes4',
                name: 'id',
                type: 'bytes4',
            },
        ],
        name: 'supportsInterface',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newOwner',
                type: 'address',
            },
        ],
        name: 'transferOwnership',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newImplementation',
                type: 'address',
            },
        ],
        name: 'upgradeTo',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'newImplementation',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        name: 'upgradeToAndCall',
        outputs: [],
        stateMutability: 'payable',
        type: 'function',
    },
    {
        stateMutability: 'payable',
        type: 'receive',
    },
    {
        inputs: [],
        name: 'InvalidTick',
        type: 'error',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'SafeCastOverflowedUintToInt',
        type: 'error',
    },
    {
        inputs: [],
        name: 'bookManager',
        outputs: [
            {
                internalType: 'contract IBookManager',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'BookId',
                        name: 'id',
                        type: 'uint192',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limitPrice',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'quoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'maxBaseAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.TakeOrderParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'getExpectedInput',
        outputs: [
            {
                internalType: 'uint256',
                name: 'takenQuoteAmount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'spentBaseAmount',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: 'BookId',
                        name: 'id',
                        type: 'uint192',
                    },
                    {
                        internalType: 'uint256',
                        name: 'limitPrice',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'baseAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'uint256',
                        name: 'minQuoteAmount',
                        type: 'uint256',
                    },
                    {
                        internalType: 'bytes',
                        name: 'hookData',
                        type: 'bytes',
                    },
                ],
                internalType: 'struct IController.SpendOrderParams',
                name: 'params',
                type: 'tuple',
            },
        ],
        name: 'getExpectedOutput',
        outputs: [
            {
                internalType: 'uint256',
                name: 'takenQuoteAmount',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'spentBaseAmount',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'BookId',
                name: 'id',
                type: 'uint192',
            },
            {
                internalType: 'Tick',
                name: 'tick',
                type: 'int24',
            },
            {
                internalType: 'uint256',
                name: 'n',
                type: 'uint256',
            },
        ],
        name: 'getLiquidity',
        outputs: [
            {
                components: [
                    {
                        internalType: 'Tick',
                        name: 'tick',
                        type: 'int24',
                    },
                    {
                        internalType: 'uint64',
                        name: 'depth',
                        type: 'uint64',
                    },
                ],
                internalType: 'struct IBookViewer.Liquidity[]',
                name: 'liquidity',
                type: 'tuple[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'implementationAddress',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'ownerAddress',
                type: 'address',
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        stateMutability: 'payable',
        type: 'constructor',
    },
] as const;

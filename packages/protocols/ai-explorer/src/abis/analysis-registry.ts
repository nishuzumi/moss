// ABI origin: vendored (ADR 0007)
//   source:   github.com/Chichuzxy/ai-monad-explorer@8757c1a613e3fde9678c1eab892502ba7e199dc8
//             Foundry artifact out/AnalysisRegistry.sol/AnalysisRegistry.json
//             (AnalysisRegistry.sol, solc 0.8.20, full ABI incl. public getters)
//   vendored: 2026-08-19
//   chain:    Monad Testnet (10143) deployment
//             0x82344C1BD7720cfddbD5aec33E99571DC6628EA5 bytecode-verified against
//             this artifact. NOT deployed on Monad mainnet (143) yet; this package
//             must not ship until a reviewed mainnet deployment exists and the
//             address below is updated.
// Derivation is test-enforced: test/abis.test.ts regenerates this module from the
// committed fixture (test/fixtures/analysis-registry.abi.json) and requires the
// committed bytes to match exactly.
export const AnalysisRegistryAbi = [
  {
    "type": "function",
    "name": "analyses",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "submitter",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "txHash",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "aiSummary",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAnalysis",
    "inputs": [
      {
        "name": "_id",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct AnalysisRegistry.Analysis",
        "components": [
          {
            "name": "submitter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "txHash",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "aiSummary",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLatestAnalyses",
    "inputs": [
      {
        "name": "_count",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct AnalysisRegistry.Analysis[]",
        "components": [
          {
            "name": "submitter",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "txHash",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "aiSummary",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "timestamp",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserAnalyses",
    "inputs": [
      {
        "name": "_user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "submitAnalysis",
    "inputs": [
      {
        "name": "_txHash",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "_aiSummary",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "totalAnalyses",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "userAnalyses",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "AnalysisSubmitted",
    "inputs": [
      {
        "name": "id",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "submitter",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "txHash",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "summary",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
] as const;

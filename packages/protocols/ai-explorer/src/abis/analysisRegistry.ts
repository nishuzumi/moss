import { parseAbi } from "viem";

// AnalysisRegistry ABI — compiled from Solidity 0.8.20 source
// Contract: 0x82344C1BD7720cfddbD5aec33E99571DC6628EA5 on Monad Testnet
// Source: https://github.com/Chichuzxy/ai-monad-explorer
export const AnalysisRegistryAbi = parseAbi([
  "function submitAnalysis(string txHash, string aiSummary) external",
  "function getAnalysis(uint256 id) view returns (tuple(address submitter, string txHash, string aiSummary, uint256 timestamp))",
  "function getUserAnalyses(address user) view returns (uint256[])",
  "function getLatestAnalyses(uint256 count) view returns (tuple(address submitter, string txHash, string aiSummary, uint256 timestamp)[])",
  "function totalAnalyses() view returns (uint256)",
  "event AnalysisSubmitted(uint256 indexed id, address indexed submitter, string txHash, string summary, uint256 timestamp)",
]);

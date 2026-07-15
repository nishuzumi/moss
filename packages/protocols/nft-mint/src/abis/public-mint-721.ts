// ABI origin: compiled interface (ADR 0007).
//
// This is the minimal interface Moss needs for ERC-721 collections that expose
// a public payable mint taking the recipient address plus token URI, and a
// mintPrice() read. Concrete collection projects should verify their deployed
// contract supports these exact selectors before live e2e simulation.
import { parseAbi } from "viem";

export const PublicMint721Abi = parseAbi([
  "function mint(address to, string uri) payable",
  "function mintPrice() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
]);

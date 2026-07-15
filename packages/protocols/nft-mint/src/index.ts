import { defineProtocolPackage } from "@themoss/core";
import { PublicMint721 } from "./adapter.js";
import { TOKENS } from "./tokens.js";

export { PublicMint721 } from "./adapter.js";
export { TOKENS } from "./tokens.js";

export const nftMintManifest = defineProtocolPackage({
  name: "nft-mint",
  protocols: [PublicMint721],
  tokens: TOKENS,
});

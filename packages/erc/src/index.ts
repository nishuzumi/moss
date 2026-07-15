import { defineProtocolPackage } from "@themoss/core";
import { ERC20 } from "./erc20.js";
import { ERC721 } from "./erc721.js";
import { ERC1155 } from "./erc1155.js";

export {
  ierc20Abi as ERC20Abi,
  ierc721Abi as ERC721Abi,
  ierc1155Abi as ERC1155Abi,
  iweth9Abi as WETH9Abi,
} from "./abis/erc.js";
export { approveStep, erc20MetadataSource } from "./steps.js";
export { ERC20, ERC721, ERC1155 };

/** The ERC standards package: introduces no tokens of its own. */
export const ercManifest = defineProtocolPackage({
  name: "erc",
  protocols: [ERC20, ERC721, ERC1155],
  tokens: [],
});

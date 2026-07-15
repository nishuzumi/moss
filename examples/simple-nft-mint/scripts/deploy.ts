import { ethers } from "hardhat";

async function main() {
  const name = process.env.DEMO_NFT_NAME ?? "Moss Demo Mint NFT";
  const symbol = process.env.DEMO_NFT_SYMBOL ?? "MOSSDEMO";
  const priceMon = process.env.DEMO_NFT_PRICE_MON ?? "0.01";
  const mintPrice = ethers.parseEther(priceMon);

  const factory = await ethers.getContractFactory("DemoMintPriceNFT");
  const contract = await factory.deploy(name, symbol, mintPrice);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("DemoMintPriceNFT deployed");
  console.log("address:", address);
  console.log("name:", name);
  console.log("symbol:", symbol);
  console.log("mintPriceWei:", mintPrice.toString());
  console.log("mintPriceMon:", priceMon);
  console.log("");
  console.log("Verify:");
  console.log(
    `pnpm --filter @themoss/example-simple-nft-mint verify:testnet ${address} "${name}" "${symbol}" ${mintPrice.toString()}`,
  );
  console.log("");
  console.log("Use with Moss simple-mint:");
  console.log(
    `MOSS_COLLECTION=${address} MOSS_TOKEN_URI=ipfs://example-token MOSS_RPC_URL=https://testnet-rpc.monad.xyz pnpm --filter @themoss/example-simple-nft-mint mint:testnet`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

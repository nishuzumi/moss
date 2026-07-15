import { ethers } from "hardhat";

async function main() {
  const address = process.env.DEMO_NFT_ADDRESS;
  if (!address) throw new Error("set DEMO_NFT_ADDRESS in .env or the shell");

  // biome-ignore lint/suspicious/noExplicitAny: TypeChain is intentionally not generated in this tiny demo project
  const contract = (await ethers.getContractAt("DemoMintPriceNFT", address)) as any;
  const price = await contract.mintPrice();

  console.log("collection:", address);
  console.log("priceWei:", price.toString());
  console.log("priceMon:", ethers.formatEther(price));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

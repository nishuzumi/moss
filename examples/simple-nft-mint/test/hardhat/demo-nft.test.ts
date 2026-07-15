import { strict as assert } from "node:assert";
import { ethers } from "hardhat";

describe("DemoMintPriceNFT", () => {
  it("returns mintPrice and mints with mint(address,string)", async () => {
    const [deployer, minter] = await ethers.getSigners();
    assert.ok(deployer);
    assert.ok(minter);

    const price = ethers.parseEther("0.01");
    const factory = await ethers.getContractFactory("DemoMintPriceNFT");
    // biome-ignore lint/suspicious/noExplicitAny: TypeChain is intentionally not generated in this tiny demo project
    const nft = (await factory.deploy("Moss Demo Mint NFT", "MOSSDEMO", price)) as any;
    await nft.waitForDeployment();

    assert.equal((await nft.mintPrice()).toString(), price.toString());

    await nft.connect(minter).mint(minter.address, "ipfs://example-token", { value: price });

    assert.equal(await nft.ownerOf(1n), minter.address);
    assert.equal((await nft.balanceOf(minter.address)).toString(), "1");
    assert.equal(await nft.tokenURI(1n), "ipfs://example-token");
  });
});

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice OpenZeppelin ERC-721 demo collection for Moss public-mint adapter tests.
/// @dev Supports exactly the surface the adapter needs: mint(address,string)
///      payable and mintPrice() returning a uint256 price in wei.
contract DemoMintPriceNFT is ERC721URIStorage, Ownable {
    uint256 public totalSupply;
    uint256 private _mintPrice;

    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);

    error WrongPayment(uint256 expected, uint256 actual);

    constructor(string memory name_, string memory symbol_, uint256 mintPrice_)
        ERC721(name_, symbol_)
        Ownable(msg.sender)
    {
        _mintPrice = mintPrice_;
    }

    function mintPrice() external view returns (uint256) {
        return _mintPrice;
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = _mintPrice;
        _mintPrice = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    function mint(address to, string memory uri) external payable returns (uint256 tokenId) {
        if (msg.value != _mintPrice) revert WrongPayment(_mintPrice, msg.value);

        tokenId = ++totalSupply;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }

    function withdraw(address payable to) external onlyOwner {
        to.transfer(address(this).balance);
    }
}

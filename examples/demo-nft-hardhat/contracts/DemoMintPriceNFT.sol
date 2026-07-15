// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Minimal ERC-721 demo collection for Moss public-mint adapter tests.
/// @dev Supports exactly the surface the adapter needs: mint(address,string)
///      payable and mintPrice() returning a uint256 price in wei.
contract DemoMintPriceNFT {
    string public name;
    string public symbol;
    uint256 public totalSupply;

    address public owner;
    uint256 private _mintPrice;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenUris;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);

    error NotOwner();
    error WrongPayment(uint256 expected, uint256 actual);
    error ZeroAddress();
    error NonexistentToken(uint256 tokenId);

    constructor(string memory name_, string memory symbol_, uint256 mintPrice_) {
        name = name_;
        symbol = symbol_;
        owner = msg.sender;
        _mintPrice = mintPrice_;
    }

    function mintPrice() external view returns (uint256) {
        return _mintPrice;
    }

    function setMintPrice(uint256 newPrice) external {
        if (msg.sender != owner) revert NotOwner();
        uint256 oldPrice = _mintPrice;
        _mintPrice = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    function mint(address to, string memory uri) external payable returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (msg.value != _mintPrice) revert WrongPayment(_mintPrice, msg.value);

        tokenId = ++totalSupply;
        _owners[tokenId] = to;
        _balances[to] += 1;
        _tokenUris[tokenId] = uri;

        emit Transfer(address(0), to, tokenId);
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert NonexistentToken(tokenId);
        return tokenOwner;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) revert ZeroAddress();
        return _balances[account];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NonexistentToken(tokenId);
        return _tokenUris[tokenId];
    }

    function withdraw(address payable to) external {
        if (msg.sender != owner) revert NotOwner();
        if (to == address(0)) revert ZeroAddress();
        to.transfer(address(this).balance);
    }
}

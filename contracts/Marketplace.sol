// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title TriMarket
 * @author Mayank Vats
 * @notice A marketplace contract to buy and sell Tri NFTs with Tri token
 * @notice There is still a room for improvements like:
 * @notice 1. Admin functions to set max or min expiry time
 * @notice 2. Admin function to set the max or min price
 * @notice 3. We can also set whether we want to take any fees from the trade
 * @notice 4. We can stake the fees collected to create another utility token.
 * @notice    that utility token can be earned by users or can be used to mint buildings or avatars
 */
contract TriMarket {
    struct Listing {
        uint256 tokenId;
        uint256 price;
        bool active;
        uint256 expiryTime;
        address seller;
    }

    IERC20 public triToken;
    IERC721 public tNFT;

    // NFT id to listing mapping
    mapping(uint256 => Listing) public listing;

    event TokenListed(address indexed seller, uint256 tokenId);
    event TokenBought(address indexed buyer, uint256 tokenId);

    constructor(address _token, address _nft) {
        require(_token != address(0), "TriMarket: Zero address");
        require(_nft != address(0), "TriMarket: Zero address");

        triToken = IERC20(_token);
        tNFT = IERC721(_nft);
    }

    /**
     * @notice function to list NFT to sell within a given time frame
     * @param _tokenId id of the NFT to sell
     * @param _price the price of NFT in 18 decimals
     * @param _expiryTime time when the listing will expiry (epoch time in future)
     */
    function listToken(
        uint256 _tokenId,
        uint256 _price,
        uint256 _expiryTime
    ) external {
        require(
            tNFT.getApproved(_tokenId) == address(this),
            "TriMarket: NFT not approved"
        );

        require(
            tNFT.ownerOf(_tokenId) == msg.sender,
            "TriMarket: caller not owner"
        );

        require(
            _expiryTime >= block.timestamp + 1 hours,
            "TriMarket: expiry below range"
        );

        listing[_tokenId] = Listing({
            tokenId: _tokenId,
            price: _price,
            active: true,
            expiryTime: _expiryTime,
            seller: msg.sender
        });

        emit TokenListed(msg.sender, _tokenId);
    }

    /**
     * @notice function to buy the listed NFT
     * @param _tokenId id of the nft to buy
     */
    function buyToken(uint256 _tokenId) external {
        require(_isExists(_tokenId), "TriMarket: No listing found");
        require(_isActive(_tokenId), "TriMarket: Listing expired");

        Listing storage _listing = listing[_tokenId];
        address buyer = msg.sender;

        require(
            triToken.allowance(buyer, address(this)) > _listing.price,
            "TriMarket: Insufficient allowance"
        );

        _listing.active = false;

        tNFT.transferFrom(_listing.seller, buyer, _tokenId);

        emit TokenBought(buyer, _tokenId);
    }

    /**
     * @notice internal function to check if the listing exists (or seller still has the NFT)
     * @param _tokenId id of the NFT to check
     */
    function _isExists(uint256 _tokenId) internal view returns (bool) {
        bool isApproved = tNFT.getApproved(_tokenId) == address(this);
        return listing[_tokenId].seller != address(0) && isApproved;
    }

    /**
     * @notice internal function to check if the listing is still active or not
     * @param _tokenId id of the NFT to check
     */
    function _isActive(uint256 _tokenId) internal view returns (bool) {
        return listing[_tokenId].expiryTime > block.timestamp;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TriToken is ERC20, Ownable {
    constructor() ERC20("TriToken", "TRI") {}

    /**
     * @notice function to get triToken equal to the amount of ether supplied
     */
    function getToken() external payable {
        _mint(msg.sender, msg.value);
    }

    /**
     * @notice function to withdraw ether sent to this address
     * @param _to address to withdraw ether to
     */
    function withdrawEther(address _to) external onlyOwner {
        (bool sent, ) = _to.call{value: address(this).balance}("");
        require(sent, "Failed to send Ether");
    }
}

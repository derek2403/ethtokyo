// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Counter {
    uint256 public count;
    address public owner;

    event CountIncremented(uint256 newCount, address indexed caller);
    event CountDecremented(uint256 newCount, address indexed caller);
    event CountReset(uint256 newCount, address indexed caller);

    constructor() {
        count = 0;
        owner = msg.sender;
    }

    function increment() public {
        count += 1;
        emit CountIncremented(count, msg.sender);
    }

    function decrement() public {
        require(count > 0, "Count cannot be negative");
        count -= 1;
        emit CountDecremented(count, msg.sender);
    }

    function reset() public {
        require(msg.sender == owner, "Only owner can reset");
        count = 0;
        emit CountReset(count, msg.sender);
    }

    function getCount() public view returns (uint256) {
        return count;
    }
}

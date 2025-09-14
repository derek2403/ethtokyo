// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

interface IMizuhikiSBT {
    function balanceOf(address owner) external view returns (uint256);
}

contract Subscription {
    struct SubscriptionPlan {
        uint256 price;
        uint256 duration; // in seconds
        bool active;
    }
    
    struct UserSubscription {
        uint256 planId;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }
    
    address public owner;
    uint256 public nextPlanId;

    /**
     * @notice Mizuhiki SBT contract address (Kaigan mainnet: 0x606F72657e72cd1218444C69eF9D366c62C54978)
     * Can be updated by the owner to support different environments.
     */
    address public mizuhikiSbtContract;
    
    mapping(uint256 => SubscriptionPlan) public plans;
    mapping(address => UserSubscription) public userSubscriptions;
    
    event PlanCreated(uint256 indexed planId, uint256 price, uint256 duration);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 endTime);
    event SubscriptionCancelled(address indexed user);
    event MizuhikiSbtContractUpdated(address indexed newContract);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    /**
     * @dev Ensures the caller holds the Mizuhiki Verified SBT
     */
    modifier onlyVerifiedSender() {
        require(mizuhikiSbtContract != address(0), "Mizuhiki SBT not set");
        require(IMizuhikiSBT(mizuhikiSbtContract).balanceOf(msg.sender) > 0, "Sender must hold Mizuhiki Verified SBT");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        nextPlanId = 1;
        // Optional: set default to Kaigan SBT contract. Can be changed by owner if deploying elsewhere.
        mizuhikiSbtContract = 0x606F72657e72cd1218444C69eF9D366c62C54978;
        emit MizuhikiSbtContractUpdated(mizuhikiSbtContract);
    }

    /**
     * @notice Update the Mizuhiki SBT contract address (only owner)
     */
    function updateMizuhikiSbtContract(address _mizuhikiSbtContract) external onlyOwner {
        mizuhikiSbtContract = _mizuhikiSbtContract;
        emit MizuhikiSbtContractUpdated(_mizuhikiSbtContract);
    }
    
    function createPlan(uint256 _price, uint256 _duration) public onlyOwner {
        plans[nextPlanId] = SubscriptionPlan({
            price: _price,
            duration: _duration,
            active: true
        });
        
        emit PlanCreated(nextPlanId, _price, _duration);
        nextPlanId++;
    }
    
    function subscribe(uint256 _planId) public payable onlyVerifiedSender {
        require(plans[_planId].active, "Plan does not exist or is inactive");
        require(msg.value >= plans[_planId].price, "Insufficient payment");
        require(!userSubscriptions[msg.sender].active, "User already has an active subscription");
        
        uint256 endTime = block.timestamp + plans[_planId].duration;
        
        userSubscriptions[msg.sender] = UserSubscription({
            planId: _planId,
            startTime: block.timestamp,
            endTime: endTime,
            active: true
        });
        
        emit Subscribed(msg.sender, _planId, endTime);
    }
    
    function cancelSubscription() public {
        require(userSubscriptions[msg.sender].active, "No active subscription to cancel");
        
        userSubscriptions[msg.sender].active = false;
        emit SubscriptionCancelled(msg.sender);
    }
    
    function isSubscriptionActive(address _user) public view returns (bool) {
        UserSubscription memory userSub = userSubscriptions[_user];
        return userSub.active && block.timestamp <= userSub.endTime;
    }

    /**
     * @notice Check if a user is both Mizuhiki verified and currently subscribed
     */
    function isVerifiedAndSubscribed(address _user) public view returns (bool) {
        if (mizuhikiSbtContract == address(0)) return false;
        bool verified = IMizuhikiSBT(mizuhikiSbtContract).balanceOf(_user) > 0;
        return verified && isSubscriptionActive(_user);
    }

    /**
     * @notice Convenience function for msg.sender
     */
    function isCallerVerifiedAndSubscribed() external view returns (bool) {
        return isVerifiedAndSubscribed(msg.sender);
    }
    
    function getSubscription(address _user) public view returns (UserSubscription memory) {
        return userSubscriptions[_user];
    }
    
    function getPlan(uint256 _planId) public view returns (SubscriptionPlan memory) {
        return plans[_planId];
    }
    
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}

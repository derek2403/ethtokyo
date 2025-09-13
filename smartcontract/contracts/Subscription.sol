// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

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
    
    mapping(uint256 => SubscriptionPlan) public plans;
    mapping(address => UserSubscription) public userSubscriptions;
    
    event PlanCreated(uint256 indexed planId, uint256 price, uint256 duration);
    event Subscribed(address indexed user, uint256 indexed planId, uint256 endTime);
    event SubscriptionCancelled(address indexed user);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        nextPlanId = 1;
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
    
    function subscribe(uint256 _planId) public payable {
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

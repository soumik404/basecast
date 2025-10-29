// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PredictionMarket
 * @notice A decentralized prediction market with two-step verification
 * @dev Supports both ETH and ERC20 tokens (USDC) for betting
 */
contract PredictionMarket is ReentrancyGuard, Ownable(msg.sender) {
    using SafeERC20 for IERC20;

    // Enums
    enum PredictionStatus { Active, PendingVerification, Resolved, Cancelled }
    enum BetChoice { Yes, No }

    // Structs
    struct Prediction {
        uint256 id;
        string title;
        string description;
        address creator;
        address token; // address(0) for ETH, otherwise ERC20 token
        uint256 deadline;
        uint256 maxCapacity;
        uint256 totalYes;
        uint256 totalNo;
        PredictionStatus status;
        BetChoice proposedResult;
        address proposedBy;
        uint256 proposedAt;
        BetChoice finalResult;
        address verifiedBy;
        uint256 verifiedAt;
        string rejectionReason;
    }

    struct Bet {
        uint256 id;
        uint256 predictionId;
        address user;
        BetChoice choice;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
        uint256 payout;
    }

    // State variables
    uint256 public nextPredictionId = 1;
    uint256 public nextBetId = 1;
    
    mapping(uint256 => Prediction) public predictions;
    mapping(uint256 => Bet) public bets;
    mapping(address => bool) public verifiers;
    mapping(uint256 => uint256[]) public predictionBets; // predictionId => betIds[]
    mapping(address => uint256[]) public userBets; // user => betIds[]
    
    address public immutable USDC_ADDRESS;
    uint256 public constant PLATFORM_FEE_BPS = 200; // 2% platform fee
    address public feeCollector;

    // Events
    event PredictionCreated(
        uint256 indexed predictionId,
        address indexed creator,
        string title,
        address token,
        uint256 deadline,
        uint256 maxCapacity
    );
    
    event BetPlaced(
        uint256 indexed betId,
        uint256 indexed predictionId,
        address indexed user,
        BetChoice choice,
        uint256 amount
    );
    
    event ResultProposed(
        uint256 indexed predictionId,
        BetChoice proposedResult,
        address indexed proposer
    );
    
    event ResultVerified(
        uint256 indexed predictionId,
        BetChoice finalResult,
        address indexed verifier
    );
    
    event ResultRejected(
        uint256 indexed predictionId,
        address indexed verifier,
        string reason
    );
    
    event RewardClaimed(
        uint256 indexed betId,
        address indexed user,
        uint256 amount
    );
    
    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    // Modifiers
    modifier onlyVerifier() {
        require(verifiers[msg.sender], "Not a verifier");
        _;
    }

    modifier predictionExists(uint256 predictionId) {
        require(predictions[predictionId].id != 0, "Prediction does not exist");
        _;
    }

    constructor(address _usdcAddress, address _feeCollector) {
        USDC_ADDRESS = _usdcAddress;
        feeCollector = _feeCollector;
        
        // Add deployer as initial verifier
        verifiers[msg.sender] = true;
        emit VerifierAdded(msg.sender);
    }

    /**
     * @notice Create a new prediction market
     */
    function createPrediction(
        string memory title,
        string memory description,
        address token,
        uint256 deadline,
        uint256 maxCapacity
    ) external returns (uint256) {
        require(deadline > block.timestamp, "Deadline must be in future");
        require(
            token == address(0) || token == USDC_ADDRESS,
            "Invalid token"
        );

        uint256 predictionId = nextPredictionId++;
        
        predictions[predictionId] = Prediction({
            id: predictionId,
            title: title,
            description: description,
            creator: msg.sender,
            token: token,
            deadline: deadline,
            maxCapacity: maxCapacity,
            totalYes: 0,
            totalNo: 0,
            status: PredictionStatus.Active,
            proposedResult: BetChoice.Yes,
            proposedBy: address(0),
            proposedAt: 0,
            finalResult: BetChoice.Yes,
            verifiedBy: address(0),
            verifiedAt: 0,
            rejectionReason: ""
        });

        emit PredictionCreated(
            predictionId,
            msg.sender,
            title,
            token,
            deadline,
            maxCapacity
        );

        return predictionId;
    }

    /**
     * @notice Place a bet on a prediction
     */
    function placeBet(
        uint256 predictionId,
        BetChoice choice,
        uint256 amount
    ) external payable nonReentrant predictionExists(predictionId) returns (uint256) {
        Prediction storage prediction = predictions[predictionId];
        
        require(prediction.status == PredictionStatus.Active, "Prediction not active");
        require(block.timestamp < prediction.deadline, "Betting closed");
        require(amount > 0, "Amount must be greater than 0");
        
        // Check capacity
        uint256 newTotal = prediction.totalYes + prediction.totalNo + amount;
        if (prediction.maxCapacity > 0) {
            require(newTotal <= prediction.maxCapacity, "Capacity exceeded");
        }

        // Handle payment
        if (prediction.token == address(0)) {
            // ETH payment
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            // ERC20 payment
            require(msg.value == 0, "Do not send ETH for ERC20 bets");
            IERC20(prediction.token).safeTransferFrom(
                msg.sender,
                address(this),
                amount
            );
        }

        // Update totals
        if (choice == BetChoice.Yes) {
            prediction.totalYes += amount;
        } else {
            prediction.totalNo += amount;
        }

        // Create bet
        uint256 betId = nextBetId++;
        bets[betId] = Bet({
            id: betId,
            predictionId: predictionId,
            user: msg.sender,
            choice: choice,
            amount: amount,
            timestamp: block.timestamp,
            claimed: false,
            payout: 0
        });

        predictionBets[predictionId].push(betId);
        userBets[msg.sender].push(betId);

        emit BetPlaced(betId, predictionId, msg.sender, choice, amount);

        return betId;
    }

    /**
     * @notice Creator proposes a result (Step 1 of 2)
     */
    function proposeResult(
        uint256 predictionId,
        BetChoice result
    ) external predictionExists(predictionId) {
        Prediction storage prediction = predictions[predictionId];
        
        require(msg.sender == prediction.creator, "Only creator can propose");
        require(prediction.status == PredictionStatus.Active, "Prediction not active");
        require(block.timestamp >= prediction.deadline, "Deadline not passed");

        prediction.status = PredictionStatus.PendingVerification;
        prediction.proposedResult = result;
        prediction.proposedBy = msg.sender;
        prediction.proposedAt = block.timestamp;

        emit ResultProposed(predictionId, result, msg.sender);
    }

    /**
     * @notice Verifier confirms or rejects the proposed result (Step 2 of 2)
     */
    function verifyResult(
        uint256 predictionId,
        bool approve,
        string memory rejectionReason
    ) external onlyVerifier predictionExists(predictionId) {
        Prediction storage prediction = predictions[predictionId];
        
        require(
            prediction.status == PredictionStatus.PendingVerification,
            "Not pending verification"
        );

        if (approve) {
            // Approve and finalize
            prediction.status = PredictionStatus.Resolved;
            prediction.finalResult = prediction.proposedResult;
            prediction.verifiedBy = msg.sender;
            prediction.verifiedAt = block.timestamp;
            
            // Calculate payouts for all bets
            _calculatePayouts(predictionId);

            emit ResultVerified(predictionId, prediction.finalResult, msg.sender);
        } else {
            // Reject and revert to active
            prediction.status = PredictionStatus.Active;
            prediction.rejectionReason = rejectionReason;
            prediction.proposedBy = address(0);
            prediction.proposedAt = 0;

            emit ResultRejected(predictionId, msg.sender, rejectionReason);
        }
    }

    /**
     * @notice Calculate payouts for all bets on a resolved prediction
     */
    function _calculatePayouts(uint256 predictionId) internal {
        Prediction storage prediction = predictions[predictionId];
        
        uint256 totalPool = prediction.totalYes + prediction.totalNo;
        uint256 winningPool = prediction.finalResult == BetChoice.Yes
            ? prediction.totalYes
            : prediction.totalNo;

        if (winningPool == 0) return; // No winners

        // Calculate platform fee
        uint256 platformFee = (totalPool * PLATFORM_FEE_BPS) / 10000;
        uint256 payoutPool = totalPool - platformFee;

        // Update each bet with payout
        uint256[] storage betIds = predictionBets[predictionId];
        for (uint256 i = 0; i < betIds.length; i++) {
            Bet storage bet = bets[betIds[i]];
            
            if (bet.choice == prediction.finalResult) {
                // Winner gets proportional share
                bet.payout = (bet.amount * payoutPool) / winningPool;
            } else {
                // Loser gets nothing
                bet.payout = 0;
            }
        }
    }

    /**
     * @notice Claim reward for a winning bet
     */
    function claimReward(uint256 betId) external nonReentrant {
        Bet storage bet = bets[betId];
        
        require(bet.id != 0, "Bet does not exist");
        require(bet.user == msg.sender, "Not your bet");
        require(!bet.claimed, "Already claimed");
        require(bet.payout > 0, "No payout available");

        Prediction storage prediction = predictions[bet.predictionId];
        require(prediction.status == PredictionStatus.Resolved, "Not resolved");

        bet.claimed = true;

        // Transfer payout
        if (prediction.token == address(0)) {
            // ETH payout
            (bool success, ) = payable(msg.sender).call{value: bet.payout}("");
            require(success, "ETH transfer failed");
        } else {
            // ERC20 payout
            IERC20(prediction.token).safeTransfer(msg.sender, bet.payout);
        }

        emit RewardClaimed(betId, msg.sender, bet.payout);
    }

    /**
     * @notice Collect platform fees
     */
    function collectFees(address token, uint256 amount) external {
        require(msg.sender == feeCollector || msg.sender == owner(), "Not authorized");
        
        if (token == address(0)) {
            (bool success, ) = payable(feeCollector).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20(token).safeTransfer(feeCollector, amount);
        }
    }

    /**
     * @notice Add a verifier
     */
    function addVerifier(address verifier) external onlyOwner {
        require(!verifiers[verifier], "Already a verifier");
        verifiers[verifier] = true;
        emit VerifierAdded(verifier);
    }

    /**
     * @notice Remove a verifier
     */
    function removeVerifier(address verifier) external onlyOwner {
        require(verifiers[verifier], "Not a verifier");
        verifiers[verifier] = false;
        emit VerifierRemoved(verifier);
    }

    /**
     * @notice Get prediction details
     */
    function getPrediction(uint256 predictionId)
        external
        view
        predictionExists(predictionId)
        returns (Prediction memory)
    {
        return predictions[predictionId];
    }

    /**
     * @notice Get bet details
     */
    function getBet(uint256 betId) external view returns (Bet memory) {
        require(bets[betId].id != 0, "Bet does not exist");
        return bets[betId];
    }

    /**
     * @notice Get all bets for a prediction
     */
    function getPredictionBets(uint256 predictionId)
        external
        view
        predictionExists(predictionId)
        returns (uint256[] memory)
    {
        return predictionBets[predictionId];
    }

    /**
     * @notice Get all bets for a user
     */
    function getUserBets(address user) external view returns (uint256[] memory) {
        return userBets[user];
    }

    /**
     * @notice Calculate potential payout before betting
     */
    function calculatePotentialPayout(
        uint256 predictionId,
        BetChoice choice,
        uint256 amount
    ) external view predictionExists(predictionId) returns (uint256) {
        Prediction storage prediction = predictions[predictionId];
        
        uint256 totalPool = prediction.totalYes + prediction.totalNo + amount;
        uint256 winningPool = choice == BetChoice.Yes
            ? prediction.totalYes + amount
            : prediction.totalNo + amount;

        if (winningPool == 0) return 0;

        uint256 platformFee = (totalPool * PLATFORM_FEE_BPS) / 10000;
        uint256 payoutPool = totalPool - platformFee;

        return (amount * payoutPool) / winningPool;
    }

    /**
     * @notice Emergency withdrawal (only owner, only if no active predictions)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            IERC20(token).safeTransfer(
                owner(),
                IERC20(token).balanceOf(address(this))
            );
        }
    }

    // Allow contract to receive ETH
    receive() external payable {}
}

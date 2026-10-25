// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IReputationSBT {
    function mint(address to, uint256 dealId, string calldata jobTitle) external returns (uint256);
}

/// @title GigEscrow
/// @notice Web3 escrow contract for SwipeGig deals.
/// @dev Holds buyer deposits, requires two-party completion approval, releases funds to the seller,
///      and triggers Soulbound Token (SBT) reputation minting.
contract GigEscrow is ReentrancyGuard, Ownable {
    // Exact enum required: Created, Funded, Completed, Released, Refunded, Disputed
    enum DealState {
        Created,
        Funded,
        Completed,
        Released,
        Refunded,
        Disputed
    }

    struct Deal {
        uint256 dealId;
        address payable buyer;
        address payable seller;
        uint256 amount;
        uint256 deadline;
        string jobTitle;
        DealState state;
        bool buyerApproved;
        bool sellerApproved;
    }

    uint256 public nextDealId;
    IReputationSBT public sbtContract;

    // Default escrow timeout: 14 days
    uint256 public constant DEFAULT_DURATION = 14 days;

    // dealId => Deal
    mapping(uint256 => Deal) public deals;

    // ── Events ─────────────────────────────────────────────────────────────
    event DealCreated(uint256 indexed dealId, address indexed buyer, address indexed seller, uint256 amount);
    event DealFunded(uint256 indexed dealId, address indexed buyer, address indexed seller, uint256 amount, uint256 deadline);
    event CompletionApproved(uint256 indexed dealId, address indexed approver, bool isBuyer);
    event DealCompleted(uint256 indexed dealId);
    event DealReleased(uint256 indexed dealId, address indexed seller, uint256 amount, uint256 sbtTokenId);
    event DealRefunded(uint256 indexed dealId, address indexed buyer, uint256 amount);
    event DealDisputed(uint256 indexed dealId, address indexed initiator);
    event DealResolved(uint256 indexed dealId, uint256 buyerAmount, uint256 sellerAmount);
    event SBTContractUpdated(address indexed previousSBT, address indexed newSBT);

    // ── Errors ──────────────────────────────────────────────────────────────
    error InvalidAmount();
    error InvalidParties();
    error DealNotFound();
    error Unauthorized();
    error InvalidState(DealState current, DealState expected);
    error AlreadyApproved();
    error DeadlineNotReached(uint256 current, uint256 deadline);
    error TransferFailed();
    error DealFrozenInDispute();
    error InvalidSplit();
    error ZeroAddress();

    constructor(address _sbtContract, address initialOwner) Ownable(initialOwner) {
        if (_sbtContract != address(0)) {
            sbtContract = IReputationSBT(_sbtContract);
        }
    }

    /// @notice Update the ReputationSBT contract address.
    function setSBTContract(address _sbtContract) external onlyOwner {
        if (_sbtContract == address(0)) revert ZeroAddress();
        address old = address(sbtContract);
        sbtContract = IReputationSBT(_sbtContract);
        emit SBTContractUpdated(old, _sbtContract);
    }

    /// @notice Create and fund a deal in ETH (testnet MVP version; USDC upgradeable via ERC-20 transferFrom).
    /// @param seller The worker's receiving address.
    /// @param amount The agreed deal price matching msg.value.
    function createDeal(address payable seller, uint256 amount) external payable returns (uint256) {
        return _createDealInternal(seller, amount, "Freelance Gig", DEFAULT_DURATION);
    }

    /// @notice Overload allowing custom job title and deadline duration.
    function createDealWithDetails(
        address payable seller,
        string calldata jobTitle,
        uint256 deadlineDuration
    ) external payable returns (uint256) {
        return _createDealInternal(seller, msg.value, jobTitle, deadlineDuration);
    }

    function _createDealInternal(
        address payable seller,
        uint256 amount,
        string memory jobTitle,
        uint256 duration
    ) internal returns (uint256) {
        if (msg.value == 0 || msg.value != amount) revert InvalidAmount();
        if (seller == address(0) || seller == msg.sender) revert InvalidParties();

        uint256 dealId = ++nextDealId;
        uint256 deadline = block.timestamp + (duration > 0 ? duration : DEFAULT_DURATION);

        deals[dealId] = Deal({
            dealId: dealId,
            buyer: payable(msg.sender),
            seller: seller,
            amount: amount,
            deadline: deadline,
            jobTitle: jobTitle,
            state: DealState.Funded,
            buyerApproved: false,
            sellerApproved: false
        });

        emit DealCreated(dealId, msg.sender, seller, amount);
        emit DealFunded(dealId, msg.sender, seller, amount, deadline);

        return dealId;
    }

    /// @notice Both the buyer and the seller must call approveCompletion(dealId).
    function approveCompletion(uint256 dealId) external {
        Deal storage deal = deals[dealId];
        if (deal.dealId == 0) revert DealNotFound();
        if (deal.state == DealState.Disputed) revert DealFrozenInDispute();
        if (deal.state != DealState.Funded) revert InvalidState(deal.state, DealState.Funded);

        bool isBuyer = (msg.sender == deal.buyer);
        bool isSeller = (msg.sender == deal.seller);

        if (!isBuyer && !isSeller) revert Unauthorized();

        if (isBuyer) {
            if (deal.buyerApproved) revert AlreadyApproved();
            deal.buyerApproved = true;
            emit CompletionApproved(dealId, msg.sender, true);
        } else {
            if (deal.sellerApproved) revert AlreadyApproved();
            deal.sellerApproved = true;
            emit CompletionApproved(dealId, msg.sender, false);
        }

        // When both parties have approved, mark as Completed
        if (deal.buyerApproved && deal.sellerApproved) {
            deal.state = DealState.Completed;
            emit DealCompleted(dealId);
        }
    }

    /// @notice When both parties have approved, release(dealId) sends funds to the seller and mints the SBT.
    function release(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.dealId == 0) revert DealNotFound();
        if (deal.state != DealState.Completed) revert InvalidState(deal.state, DealState.Completed);

        // 1. Checks-effects: Update state to Released BEFORE sending funds or external calls
        deal.state = DealState.Released;
        uint256 payout = deal.amount;
        address payable seller = deal.seller;
        string memory jobTitle = deal.jobTitle;

        // 2. Mint Soulbound Token (SBT) reputation to the seller
        uint256 sbtTokenId = 0;
        if (address(sbtContract) != address(0)) {
            try sbtContract.mint(seller, dealId, jobTitle) returns (uint256 tokenId) {
                sbtTokenId = tokenId;
            } catch {
                // Escrow release does not fail if SBT contract reverts
            }
        }

        emit DealReleased(dealId, seller, payout, sbtTokenId);

        // 3. Interactions: Transfer payout to seller
        (bool success, ) = seller.call{value: payout}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Returns funds to the buyer after the deadline if the deal was not completed.
    function refund(uint256 dealId) external nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.dealId == 0) revert DealNotFound();
        if (deal.state == DealState.Disputed) revert DealFrozenInDispute();
        if (deal.state != DealState.Funded) revert InvalidState(deal.state, DealState.Funded);
        if (msg.sender != deal.buyer) revert Unauthorized();
        if (block.timestamp < deal.deadline) revert DeadlineNotReached(block.timestamp, deal.deadline);

        // Checks-effects: update state
        deal.state = DealState.Refunded;
        uint256 refundAmount = deal.amount;
        address payable buyer = deal.buyer;

        emit DealRefunded(dealId, buyer, refundAmount);

        // Interaction
        (bool success, ) = buyer.call{value: refundAmount}("");
        if (!success) revert TransferFailed();
    }

    /// @notice Dispute path: freezes the deal if either party raises an issue.
    function raiseDispute(uint256 dealId) external {
        Deal storage deal = deals[dealId];
        if (deal.dealId == 0) revert DealNotFound();
        if (deal.state != DealState.Funded) revert InvalidState(deal.state, DealState.Funded);
        if (msg.sender != deal.buyer && msg.sender != deal.seller) revert Unauthorized();

        deal.state = DealState.Disputed;
        emit DealDisputed(dealId, msg.sender);
    }

    /// @notice Dispute resolution by contract owner/arbiter.
    /// @dev Splits funds between buyer and seller according to ruling.
    function resolveDispute(
        uint256 dealId,
        uint256 buyerAmount,
        uint256 sellerAmount
    ) external onlyOwner nonReentrant {
        Deal storage deal = deals[dealId];
        if (deal.dealId == 0) revert DealNotFound();
        if (deal.state != DealState.Disputed) revert InvalidState(deal.state, DealState.Disputed);
        if (buyerAmount + sellerAmount != deal.amount) revert InvalidSplit();

        // Checks-effects: transition state
        deal.state = (sellerAmount > 0) ? DealState.Released : DealState.Refunded;
        address payable buyer = deal.buyer;
        address payable seller = deal.seller;

        emit DealResolved(dealId, buyerAmount, sellerAmount);

        // Interactions
        if (buyerAmount > 0) {
            (bool successBuyer, ) = buyer.call{value: buyerAmount}("");
            if (!successBuyer) revert TransferFailed();
        }
        if (sellerAmount > 0) {
            (bool successSeller, ) = seller.call{value: sellerAmount}("");
            if (!successSeller) revert TransferFailed();
        }
    }

    /// @notice Helper to inspect deal details.
    function getDeal(uint256 dealId) external view returns (Deal memory) {
        return deals[dealId];
    }
}

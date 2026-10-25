// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/GigEscrow.sol";
import "../src/ReputationSBT.sol";

/// @notice Malicious contract attempting reentrancy attack on release()
contract ReentrancyAttacker {
    GigEscrow public escrow;
    uint256 public targetDealId;
    bool public attackAttempted;
    bool public reentrancySucceeded;

    constructor(address _escrow) {
        escrow = GigEscrow(_escrow);
    }

    function setTargetDeal(uint256 _dealId) external {
        targetDealId = _dealId;
    }

    receive() external payable {
        if (!attackAttempted && targetDealId != 0) {
            attackAttempted = true;
            // Attempt to re-enter release while funds are being sent
            try escrow.release(targetDealId) {
                reentrancySucceeded = true;
            } catch {
                // Blocked by ReentrancyGuard!
                reentrancySucceeded = false;
            }
        }
    }
}

contract GigEscrowTest is Test {
    GigEscrow public escrow;
    ReputationSBT public sbt;

    address payable public buyer = payable(makeAddr("buyer"));
    address payable public seller = payable(makeAddr("seller"));
    address public thirdParty = makeAddr("thirdParty");

    uint256 public constant DEAL_AMOUNT = 1 ether;
    uint256 public constant DEAL_DURATION = 7 days;

    function setUp() public {
        vm.deal(buyer, 100 ether);
        vm.deal(seller, 10 ether);

        // Deploy Reputation SBT
        sbt = new ReputationSBT(address(this));

        // Deploy GigEscrow
        escrow = new GigEscrow(address(sbt), address(this));

        // Authorize escrow to mint SBTs
        sbt.setEscrowContract(address(escrow));
    }

    // ── Test 1: Happy Path ──────────────────────────────────────────────────
    function test_HappyPath_FundApproveReleaseMint() public {
        // 1. Buyer creates and funds deal
        vm.prank(buyer);
        uint256 dealId = escrow.createDealWithDetails{value: DEAL_AMOUNT}(
            seller,
            "Build DeFi Swap UI",
            DEAL_DURATION
        );

        GigEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Funded));
        assertEq(d.amount, DEAL_AMOUNT);
        assertEq(address(escrow).balance, DEAL_AMOUNT);

        // 2. Buyer approves completion
        vm.prank(buyer);
        escrow.approveCompletion(dealId);

        d = escrow.getDeal(dealId);
        assertTrue(d.buyerApproved);
        assertFalse(d.sellerApproved);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Funded));

        // 3. Seller approves completion -> state changes to Completed
        vm.prank(seller);
        escrow.approveCompletion(dealId);

        d = escrow.getDeal(dealId);
        assertTrue(d.buyerApproved);
        assertTrue(d.sellerApproved);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Completed));

        // 4. Release funds to seller
        uint256 sellerBalanceBefore = seller.balance;
        escrow.release(dealId);

        // Verify seller received funds
        assertEq(seller.balance, sellerBalanceBefore + DEAL_AMOUNT);
        assertEq(address(escrow).balance, 0);

        d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Released));

        // 5. Verify Soulbound Token (SBT) was minted to seller
        assertEq(sbt.balanceOf(seller), 1);
        assertEq(sbt.ownerOf(1), seller);
        assertTrue(sbt.locked(1));

        (uint256 recDealId, string memory jobTitle, , address recSeller) = sbt.jobRecords(1);
        assertEq(recDealId, dealId);
        assertEq(jobTitle, "Build DeFi Swap UI");
        assertEq(recSeller, seller);
    }

    // ── Test 2: Refund After Deadline ───────────────────────────────────────
    function test_RefundAfterDeadline() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDealWithDetails{value: DEAL_AMOUNT}(
            seller,
            "Smart Contract Audit",
            DEAL_DURATION
        );

        // Attempting refund BEFORE deadline must revert
        vm.prank(buyer);
        vm.expectRevert();
        escrow.refund(dealId);

        // Warp time past deadline
        vm.warp(block.timestamp + DEAL_DURATION + 1);

        uint256 buyerBalanceBefore = buyer.balance;

        // Buyer calls refund
        vm.prank(buyer);
        escrow.refund(dealId);

        // Buyer gets full deposit back
        assertEq(buyer.balance, buyerBalanceBefore + DEAL_AMOUNT);
        assertEq(address(escrow).balance, 0);

        GigEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Refunded));
    }

    // ── Test 3: Third Party & Unauthorized Approvals Revert ─────────────────
    function test_OnlyBuyerOrSellerCanApprove() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(seller, DEAL_AMOUNT);

        // Third party attempt reverts
        vm.prank(thirdParty);
        vm.expectRevert(GigEscrow.Unauthorized.selector);
        escrow.approveCompletion(dealId);

        // Non-existent deal ID reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.DealNotFound.selector);
        escrow.approveCompletion(999);

        // Buyer approves once
        vm.prank(buyer);
        escrow.approveCompletion(dealId);

        // Buyer approving a second time reverts AlreadyApproved
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.AlreadyApproved.selector);
        escrow.approveCompletion(dealId);

        // Seller approves once
        vm.prank(seller);
        escrow.approveCompletion(dealId);

        // Seller approving a second time reverts InvalidState (already completed)
        vm.prank(seller);
        vm.expectRevert();
        escrow.approveCompletion(dealId);
    }

    // ── Test 4: Transfers of the SBT Revert ─────────────────────────────────
    function test_SBTTransfersRevert() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(seller, DEAL_AMOUNT);

        vm.prank(buyer);
        escrow.approveCompletion(dealId);
        vm.prank(seller);
        escrow.approveCompletion(dealId);
        escrow.release(dealId);

        uint256 tokenId = 1;
        assertEq(sbt.ownerOf(tokenId), seller);
        assertTrue(sbt.locked(tokenId));

        // Attempt transfer from seller to thirdParty via transferFrom
        vm.prank(seller);
        vm.expectRevert(ReputationSBT.TransfersDisabled.selector);
        sbt.transferFrom(seller, thirdParty, tokenId);

        // Attempt transfer via safeTransferFrom
        vm.prank(seller);
        vm.expectRevert(ReputationSBT.TransfersDisabled.selector);
        sbt.safeTransferFrom(seller, thirdParty, tokenId);
    }

    // ── Test 5: Reentrancy Attack on Release Path ────────────────────────────
    function test_ReentrancyAttackBlocked() public {
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(escrow));
        address payable attackerAddr = payable(address(attacker));

        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(attackerAddr, DEAL_AMOUNT);

        attacker.setTargetDeal(dealId);

        vm.prank(buyer);
        escrow.approveCompletion(dealId);

        vm.prank(attackerAddr);
        escrow.approveCompletion(dealId);

        escrow.release(dealId);

        assertTrue(attacker.attackAttempted(), "Attacker should have attempted reentrancy");
        assertFalse(attacker.reentrancySucceeded(), "Reentrancy attack should have failed");

        GigEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Released));
        assertEq(address(attacker).balance, DEAL_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }

    // ── Test 6: Deal Creation Input Validation ──────────────────────────────
    function test_CreateDeal_ValidationReverts() public {
        // Zero amount reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.InvalidAmount.selector);
        escrow.createDeal{value: 0}(seller, 0);

        // Mismatched amount reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.InvalidAmount.selector);
        escrow.createDeal{value: 1 ether}(seller, 2 ether);

        // Zero address seller reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.InvalidParties.selector);
        escrow.createDeal{value: 1 ether}(payable(address(0)), 1 ether);

        // Buyer as seller reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.InvalidParties.selector);
        escrow.createDeal{value: 1 ether}(buyer, 1 ether);
    }

    // ── Test 7: Release on Incomplete Deal Reverts ───────────────────────────
    function test_Release_InvalidStateReverts() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(seller, DEAL_AMOUNT);

        // Deal is Funded, not Completed -> release must revert
        vm.expectRevert();
        escrow.release(dealId);

        // Release non-existent deal reverts
        vm.expectRevert(GigEscrow.DealNotFound.selector);
        escrow.release(999);
    }

    // ── Test 8: Refund Edge Cases ───────────────────────────────────────────
    function test_Refund_EdgeCases() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(seller, DEAL_AMOUNT);

        // Third party calling refund reverts Unauthorized
        vm.warp(block.timestamp + 15 days);
        vm.prank(thirdParty);
        vm.expectRevert(GigEscrow.Unauthorized.selector);
        escrow.refund(dealId);

        // Non-existent deal reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.DealNotFound.selector);
        escrow.refund(999);
    }

    // ── Test 9: Dispute Lifecycle and Resolution ────────────────────────────
    function test_DisputeLifecycleAndResolution() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(seller, DEAL_AMOUNT);

        // Third party cannot dispute
        vm.prank(thirdParty);
        vm.expectRevert(GigEscrow.Unauthorized.selector);
        escrow.raiseDispute(dealId);

        // Buyer raises dispute
        vm.prank(buyer);
        escrow.raiseDispute(dealId);

        GigEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Disputed));

        // When in dispute, approvals revert
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.DealFrozenInDispute.selector);
        escrow.approveCompletion(dealId);

        // When in dispute, refund reverts even after deadline
        vm.warp(block.timestamp + 20 days);
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.DealFrozenInDispute.selector);
        escrow.refund(dealId);

        // Non-owner cannot resolve dispute
        vm.prank(thirdParty);
        vm.expectRevert();
        escrow.resolveDispute(dealId, 0.5 ether, 0.5 ether);

        // Invalid split sum reverts
        vm.expectRevert(GigEscrow.InvalidSplit.selector);
        escrow.resolveDispute(dealId, 0.4 ether, 0.4 ether); // 0.8 != 1.0

        // Owner resolves dispute: 0.3 ether to buyer, 0.7 ether to seller
        uint256 buyerPre = buyer.balance;
        uint256 sellerPre = seller.balance;

        escrow.resolveDispute(dealId, 0.3 ether, 0.7 ether);

        assertEq(buyer.balance, buyerPre + 0.3 ether);
        assertEq(seller.balance, sellerPre + 0.7 ether);
        assertEq(address(escrow).balance, 0);

        d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Released));
    }

    // ── Test 10: Owner Configuration & Admin Functions ──────────────────────
    function test_AdminFunctions() public {
        // Update SBT contract
        address newSBT = makeAddr("newSBT");
        escrow.setSBTContract(newSBT);
        assertEq(address(escrow.sbtContract()), newSBT);

        // Zero address reverts
        vm.expectRevert(GigEscrow.ZeroAddress.selector);
        escrow.setSBTContract(address(0));

        // Non-owner cannot set SBT contract
        vm.prank(thirdParty);
        vm.expectRevert();
        escrow.setSBTContract(newSBT);

        // ReputationSBT admin checks
        vm.prank(thirdParty);
        vm.expectRevert();
        sbt.setEscrowContract(makeAddr("test"));

        vm.expectRevert(ReputationSBT.ZeroAddress.selector);
        sbt.setEscrowContract(address(0));

        // Mint directly from non-escrow reverts
        vm.prank(thirdParty);
        vm.expectRevert(ReputationSBT.OnlyEscrowAllowed.selector);
        sbt.mint(seller, 10, "Direct mint attempt");

        // Mint to zero address reverts
        vm.prank(address(escrow));
        vm.expectRevert(ReputationSBT.ZeroAddress.selector);
        sbt.mint(address(0), 10, "Zero recipient");

        // Total minted check
        assertEq(sbt.totalMinted(), 0);

        // ERC-5192 interface support
        assertTrue(sbt.supportsInterface(0xb45a3c0e));
    }
}

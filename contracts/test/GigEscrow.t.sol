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

    // ── Test 3: Third Party Approval Reverts ─────────────────────────────────
    function test_OnlyBuyerOrSellerCanApprove() public {
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(seller, DEAL_AMOUNT);

        // Third party attempt
        vm.prank(thirdParty);
        vm.expectRevert(GigEscrow.Unauthorized.selector);
        escrow.approveCompletion(dealId);

        // Non-existent deal ID reverts
        vm.prank(buyer);
        vm.expectRevert(GigEscrow.DealNotFound.selector);
        escrow.approveCompletion(999);
    }

    // ── Test 4: Transfers of the SBT Revert ─────────────────────────────────
    function test_SBTTransfersRevert() public {
        // Mint an SBT to seller via happy path
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
        // Deploy attacker contract as seller
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(escrow));
        address payable attackerAddr = payable(address(attacker));

        // Buyer creates deal with attacker
        vm.prank(buyer);
        uint256 dealId = escrow.createDeal{value: DEAL_AMOUNT}(attackerAddr, DEAL_AMOUNT);

        attacker.setTargetDeal(dealId);

        // Both approve completion
        vm.prank(buyer);
        escrow.approveCompletion(dealId);

        vm.prank(attackerAddr);
        escrow.approveCompletion(dealId);

        // Release: triggers attacker's receive() which attempts reentrant call to release()
        escrow.release(dealId);

        // Verify reentrancy was blocked and did NOT succeed
        assertTrue(attacker.attackAttempted(), "Attacker should have attempted reentrancy");
        assertFalse(attacker.reentrancySucceeded(), "Reentrancy attack should have failed");

        // Verify deal state is Released and attacker only received the initial amount
        GigEscrow.Deal memory d = escrow.getDeal(dealId);
        assertEq(uint256(d.state), uint256(GigEscrow.DealState.Released));
        assertEq(address(attacker).balance, DEAL_AMOUNT);
        assertEq(address(escrow).balance, 0);
    }
}

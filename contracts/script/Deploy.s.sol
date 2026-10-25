// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ReputationSBT.sol";
import "../src/GigEscrow.sol";

contract DeployScript is Script {
    function run() external {
        // Read private key from environment variable
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        address deployer = vm.addr(deployerPrivateKey);

        console.log("==================================================");
        console.log("Deploying SwipeGig Web3 Escrow & SBT to Sepolia");
        console.log("Deployer address:", deployer);
        console.log("==================================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Reputation SBT
        ReputationSBT sbt = new ReputationSBT(deployer);
        console.log("ReputationSBT deployed at:", address(sbt));

        // 2. Deploy GigEscrow
        GigEscrow escrow = new GigEscrow(address(sbt), deployer);
        console.log("GigEscrow deployed at:    ", address(escrow));

        // 3. Wire SBT minter permission to GigEscrow
        sbt.setEscrowContract(address(escrow));
        console.log("Configured SBT escrow to: ", address(escrow));

        vm.stopBroadcast();

        console.log("==================================================");
        console.log("Deployment complete! Addresses ready for frontend.");
        console.log("==================================================");
    }
}

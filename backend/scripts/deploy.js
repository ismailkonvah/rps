// scripts/deploy.js
// Hardhat deployment script for PrivateRPSFHE contract

const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying PrivateRPSFHE contract to Sepolia...\n");

    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance === 0n) {
        console.error("❌ Error: Deployer account has no ETH!");
        console.log("Get Sepolia ETH from: https://sepoliafaucet.com/");
        process.exit(1);
    }

    // Deploy the contract
    console.log("📝 Compiling contract...");
    const PrivateRPSFHE = await hre.ethers.getContractFactory("PrivateRPSFHE");

    console.log("⏳ Deploying contract (admin will be deployer)...");
    const contract = await PrivateRPSFHE.deploy(deployer.address);

    console.log("⏳ Waiting for deployment transaction to be mined...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log("\n✅ Contract deployed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📍 Contract Address:", contractAddress);
    console.log("👤 Admin Address:", deployer.address);
    console.log("🔗 Network: Sepolia");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📋 Next Steps:");
    console.log("1. Update VITE_CONTRACT_ADDRESS in frontend .env:");
    console.log(`   VITE_CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n2. Update CONTRACT_ADDRESS in backend/.env:");
    console.log(`   CONTRACT_ADDRESS=${contractAddress}`);
    console.log("\n3. Verify on Etherscan (optional):");
    console.log(`   npx hardhat verify --network sepolia ${contractAddress} ${deployer.address}`);
    console.log("\n4. Start the backend finalizer:");
    console.log("   npm run finalizer");
    console.log("\n5. Start the frontend:");
    console.log("   cd .. && npm run dev\n");

    // Save deployment info
    const fs = require('fs');
    const deploymentInfo = {
        contractAddress,
        adminAddress: deployer.address,
        network: "sepolia",
        deployedAt: new Date().toISOString(),
        transactionHash: contract.deploymentTransaction().hash
    };

    fs.writeFileSync(
        './deployment-info.json',
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("💾 Deployment info saved to deployment-info.json\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment failed:");
        console.error(error);
        process.exit(1);
    });

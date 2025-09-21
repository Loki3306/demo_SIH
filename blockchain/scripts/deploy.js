const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Tourist Digital ID Contract Deployment...");
  
  try {
    // Check if we're connected to Ganache
    const provider = hre.ethers.provider;
    const network = await provider.getNetwork();
    console.log(`📡 Connected to network: ${network.name} (chainId: ${network.chainId})`);
    
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`💼 Deploying with account: ${deployer.address}`);
    
    // Check deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);
    
    if (balance < hre.ethers.parseEther("0.1")) {
      console.warn("⚠️  Warning: Low account balance. Make sure you have enough ETH for deployment.");
    }
    
    // Store deployer private key in environment for blockchain service
    // Note: In Hardhat, we can't directly access private keys from signers
    // The private key will need to be manually set in .env.blockchain
    console.log(`🔐 Deployer account ready for blockchain service`);
    console.log(`📝 Note: Please manually set ADMIN_PRIVATE_KEY in .env.blockchain with Account 0 private key from Ganache GUI`);
    
    // Compile contracts
    console.log("🔨 Compiling contracts...");
    await hre.run("compile");
    
    // Deploy the contract
    console.log("📄 Deploying TouristDigitalID contract...");
    const TouristDigitalID = await hre.ethers.getContractFactory("TouristDigitalID");
    const contract = await TouristDigitalID.deploy();
    
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    
    console.log(`✅ TouristDigitalID deployed to: ${contractAddress}`);
    console.log(`🔗 Transaction hash: ${contract.deploymentTransaction().hash}`);
    
    // Verify initial state
    console.log("🔍 Verifying initial contract state...");
    const owner = await contract.owner();
    const [totalIDs, activeIDs] = await contract.getContractStats();
    const paused = await contract.paused();
    
    console.log(`👑 Contract owner: ${owner}`);
    console.log(`📊 Total IDs: ${totalIDs}, Active IDs: ${activeIDs}`);
    console.log(`⏸️  Contract paused: ${paused}`);
    
    // Save contract address to environment file
    const envPath = path.join(__dirname, "..", ".env.blockchain");
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }
    
    // Update or add CONTRACT_ADDRESS
    const addressLine = `CONTRACT_ADDRESS=${contractAddress}`;
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, addressLine);
    } else {
      envContent += `\n${addressLine}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log(`💾 Contract address saved to .env.blockchain`);
    
    // Save deployment info
    const deploymentInfo = {
      address: contractAddress,
      transactionHash: contract.deploymentTransaction().hash,
      deployer: deployer.address,
      network: network.name,
      chainId: Number(network.chainId),
      timestamp: new Date().toISOString(),
      blockNumber: Number(contract.deploymentTransaction().blockNumber || 0)
    };
    
    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`📋 Deployment info saved to deployment.json`);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Make sure Ganache GUI is running");
    console.log("2. Run 'pnpm blockchain:seed' to populate test data");
    console.log("3. Start the blockchain service with 'pnpm dev:blockchain:real'");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    if (error.message.includes("CONNECTION_REFUSED") || error.message.includes("ECONNREFUSED")) {
      console.log("\n🔧 Troubleshooting:");
      console.log("- Make sure Ganache GUI is running on http://127.0.0.1:7545");
      console.log("- Check that the network configuration is correct");
      console.log("- Verify the ADMIN_PRIVATE_KEY in .env.blockchain");
    }
    
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = main;
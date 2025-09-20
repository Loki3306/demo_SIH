const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

async function main() {
  console.log("🌱 Starting seed data creation for Tourist Digital IDs...");
  
  try {
    // Load contract address from deployment
    const envPath = path.join(__dirname, "..", ".env.blockchain");
    if (!fs.existsSync(envPath)) {
      throw new Error("❌ .env.blockchain file not found. Please run deployment first.");
    }
    
    const envContent = fs.readFileSync(envPath, "utf8");
    const contractAddressMatch = envContent.match(/CONTRACT_ADDRESS=(.*)/);
    
    if (!contractAddressMatch || !contractAddressMatch[1]) {
      throw new Error("❌ CONTRACT_ADDRESS not found in .env.blockchain. Please run deployment first.");
    }
    
    const contractAddress = contractAddressMatch[1].trim();
    console.log(`📄 Using contract at: ${contractAddress}`);
    
    // Get contract instance
    const TouristDigitalID = await hre.ethers.getContractFactory("TouristDigitalID");
    const contract = TouristDigitalID.attach(contractAddress);
    
    // Load tourist seed data
    const seedDataPath = path.join(__dirname, "..", "..", "seed_data", "tourists.json");
    if (!fs.existsSync(seedDataPath)) {
      throw new Error("❌ Tourist seed data not found at ../seed_data/tourists.json");
    }
    
    const tourists = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));
    console.log(`📊 Loaded ${tourists.length} tourists from seed data`);
    
    // Filter verified tourists for blockchain ID creation
    const verifiedTourists = tourists.filter(t => t.verificationStatus === "verified");
    console.log(`✅ Found ${verifiedTourists.length} verified tourists for blockchain ID creation`);
    
    if (verifiedTourists.length === 0) {
      console.log("ℹ️  No verified tourists found. Creating sample test data...");
      
      // Create a test tourist with blockchain ID
      const testTouristId = "t999_seed";
      const testName = "Test Verified Tourist";
      const testKycHash = crypto.createHash('sha256').update(`test_kyc_${Date.now()}`).digest();
      const testPersonalHash = crypto.createHash('sha256').update(`test_personal_${Date.now()}`).digest();
      const expirationTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
      
      console.log("🔨 Creating test digital ID...");
      const tx = await contract.createDigitalID(
        testTouristId,
        testName,
        testKycHash,
        testPersonalHash,
        expirationTimestamp,
        3 // verification level
      );
      
      await tx.wait();
      console.log(`✅ Test digital ID created with transaction: ${tx.hash}`);
      
    } else {
      console.log("🔨 Creating blockchain IDs for verified tourists...");
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const tourist of verifiedTourists) {
        try {
          // Check if digital ID already exists
          const existingId = await contract.getIDByTouristId(tourist._id);
          if (existingId > 0) {
            console.log(`⏭️  Digital ID already exists for ${tourist.name} (${tourist._id})`);
            continue;
          }
          
          // Generate hashes for blockchain
          const kycHash = crypto.createHash('sha256')
            .update(`${tourist.kyc?.type || 'passport'}_${tourist.kyc?.number_hash || 'default'}`)
            .digest();
          
          const personalHash = crypto.createHash('sha256')
            .update(`${tourist.name}_${tourist.email}_${tourist.phone || ''}`)
            .digest();
          
          // Set expiration to 1 year from now
          const expirationTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
          
          // Determine verification level based on document type
          const verificationLevel = tourist.kyc?.type === 'passport' ? 4 : 3;
          
          console.log(`📝 Creating digital ID for ${tourist.name} (${tourist._id})...`);
          
          const tx = await contract.createDigitalID(
            tourist._id,
            tourist.name,
            kycHash,
            personalHash,
            expirationTimestamp,
            verificationLevel
          );
          
          await tx.wait();
          const digitalId = await contract.getIDByTouristId(tourist._id);
          
          console.log(`✅ Digital ID ${digitalId} created for ${tourist.name} - TX: ${tx.hash}`);
          successCount++;
          
          // Update tourist data with blockchain information
          tourist.blockchainId = digitalId.toString();
          tourist.transactionHash = tx.hash;
          tourist.blockchainStatus = "created";
          
        } catch (error) {
          console.error(`❌ Failed to create digital ID for ${tourist.name}:`, error.message);
          errorCount++;
        }
      }
      
      console.log(`\n📊 Seed data creation summary:`);
      console.log(`✅ Successfully created: ${successCount} digital IDs`);
      console.log(`❌ Failed: ${errorCount} creations`);
      
      // Update seed data file with blockchain information
      if (successCount > 0) {
        console.log("💾 Updating seed data with blockchain information...");
        fs.writeFileSync(seedDataPath, JSON.stringify(tourists, null, 2));
        console.log("✅ Seed data updated successfully");
      }
    }
    
    // Display contract statistics
    console.log("\n📊 Final contract statistics:");
    const [totalIDs, activeIDs] = await contract.getContractStats();
    console.log(`Total Digital IDs: ${totalIDs}`);
    console.log(`Active Digital IDs: ${activeIDs}`);
    
    // Create a summary report
    const summaryReport = {
      timestamp: new Date().toISOString(),
      contractAddress: contractAddress,
      totalTourists: tourists.length,
      verifiedTourists: verifiedTourists.length,
      digitalIDsCreated: Number(totalIDs),
      activeDigitalIDs: Number(activeIDs),
      network: (await hre.ethers.provider.getNetwork()).name
    };
    
    const reportPath = path.join(__dirname, "..", "seed-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2));
    console.log(`📋 Seed report saved to seed-report.json`);
    
    console.log("\n🎉 Seed data creation completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Start the blockchain service: 'pnpm dev:blockchain:real'");
    console.log("2. Test the integration with: 'pnpm start:all:blockchain'");
    
  } catch (error) {
    console.error("❌ Seed data creation failed:", error);
    
    if (error.message.includes("revert")) {
      console.log("\n🔧 Smart contract revert error:");
      console.log("- Check if the contract is deployed correctly");
      console.log("- Verify you're using the correct network");
      console.log("- Ensure the deployer account has sufficient gas");
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
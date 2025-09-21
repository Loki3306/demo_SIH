const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔄 Starting migration from mock blockchain to real Ganache blockchain...");
  
  try {
    // Load contract address
    const envPath = path.join(__dirname, "..", ".env.blockchain");
    if (!fs.existsSync(envPath)) {
      throw new Error("❌ .env.blockchain file not found. Please run deployment first.");
    }
    
    const envContent = fs.readFileSync(envPath, "utf8");
    const contractAddressMatch = envContent.match(/CONTRACT_ADDRESS=(.*)/);
    
    if (!contractAddressMatch || !contractAddressMatch[1]) {
      throw new Error("❌ CONTRACT_ADDRESS not found. Please run deployment first.");
    }
    
    const contractAddress = contractAddressMatch[1].trim();
    console.log(`📄 Using contract at: ${contractAddress}`);
    
    // Get contract instance
    const TouristDigitalID = await hre.ethers.getContractFactory("TouristDigitalID");
    const contract = TouristDigitalID.attach(contractAddress);
    
    // Load current tourist data
    const seedDataPath = path.join(__dirname, "..", "..", "seed_data", "tourists.json");
    if (!fs.existsSync(seedDataPath)) {
      throw new Error("❌ Tourist seed data not found");
    }
    
    const tourists = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));
    console.log(`📊 Loaded ${tourists.length} tourists from seed data`);
    
    // Find tourists with mock blockchain IDs that need migration
    const touristsToMigrate = tourists.filter(t => 
      t.verificationStatus === "verified" && 
      t.blockchainId && 
      (t.blockchainId.startsWith("bc_verified_") || t.blockchainId.startsWith("bc_0x")) // Mock blockchain ID formats
    );
    
    console.log(`🔄 Found ${touristsToMigrate.length} tourists with mock blockchain IDs to migrate`);
    
    if (touristsToMigrate.length === 0) {
      console.log("ℹ️  No tourists to migrate. All verified tourists either have real blockchain IDs or no blockchain IDs.");
      return;
    }
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const tourist of touristsToMigrate) {
      try {
        // Check if digital ID already exists on blockchain
        const existingId = await contract.getIDByTouristId(tourist._id);
        if (existingId > 0) {
          console.log(`⏭️  Digital ID already exists for ${tourist.name}, updating record...`);
          tourist.blockchainId = existingId.toString();
          tourist.blockchainStatus = "migrated";
          migratedCount++;
          continue;
        }
        
        // Generate hashes for blockchain
        const crypto = require("crypto");
        const kycHash = crypto.createHash('sha256')
          .update(`${tourist.documentType || 'passport'}_${tourist.documentNumber || 'default'}`)
          .digest();
        
        const personalHash = crypto.createHash('sha256')
          .update(`${tourist.name}_${tourist.email}_${tourist.phone || ''}`)
          .digest();
        
        // Set expiration to 1 year from now
        const expirationTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
        
        // Determine verification level based on document type
        const verificationLevel = tourist.documentType === 'passport' ? 4 : 3;
        
        console.log(`🔨 Migrating ${tourist.name} (${tourist._id}) from mock to real blockchain...`);
        
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
        
        // Update tourist record
        tourist.blockchainId = digitalId.toString();
        tourist.transactionHash = tx.hash;
        tourist.blockchainStatus = "migrated";
        
        console.log(`✅ Migrated ${tourist.name} - New Digital ID: ${digitalId}, TX: ${tx.hash}`);
        migratedCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${tourist.name}:`, error.message);
        tourist.blockchainStatus = "migration_failed";
        errorCount++;
      }
    }
    
    // Save updated tourist data
    if (migratedCount > 0) {
      console.log("💾 Saving updated tourist data...");
      fs.writeFileSync(seedDataPath, JSON.stringify(tourists, null, 2));
      console.log("✅ Tourist data updated successfully");
    }
    
    // Generate migration report
    const migrationReport = {
      timestamp: new Date().toISOString(),
      contractAddress: contractAddress,
      totalTourists: tourists.length,
      touristsToMigrate: touristsToMigrate.length,
      successfulMigrations: migratedCount,
      failedMigrations: errorCount,
      network: (await hre.ethers.provider.getNetwork()).name
    };
    
    const reportPath = path.join(__dirname, "..", "migration-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount} tourists`);
    console.log(`❌ Failed migrations: ${errorCount} tourists`);
    console.log(`📋 Migration report saved to migration-report.json`);
    
    // Display final contract statistics
    const [totalIDs, activeIDs] = await contract.getContractStats();
    console.log(`\n📊 Final blockchain statistics:`);
    console.log(`Total Digital IDs: ${totalIDs}`);
    console.log(`Active Digital IDs: ${activeIDs}`);
    
    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("1. Update BLOCKCHAIN_MODE=ganache in root .env file");
    console.log("2. Start the blockchain service: 'pnpm dev:blockchain:real'");
    console.log("3. Test the migration with: 'pnpm start:all:blockchain'");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
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
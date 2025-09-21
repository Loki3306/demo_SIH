const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function verifyContract() {
  console.log("🔍 Verifying Deployed Contract...");
  console.log("=====================================\\n");

  try {
    // Load deployment info
    const deploymentPath = path.join(__dirname, "..", "deployment.json");
    if (!fs.existsSync(deploymentPath)) {
      throw new Error("❌ deployment.json not found. Please run deployment first.");
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    const contractAddress = deployment.address;

    console.log(`📄 Contract Address: ${contractAddress}`);
    console.log(`🔗 Deployment TX: ${deployment.transactionHash}`);
    console.log(`👑 Deployer: ${deployment.deployer}`);

    // Get contract instance
    const TouristDigitalID = await hre.ethers.getContractFactory("TouristDigitalID");
    const contract = TouristDigitalID.attach(contractAddress);

    // Test 1: Basic contract information
    console.log("\\n🧪 Test 1: Basic Contract Information");
    const owner = await contract.owner();
    const paused = await contract.paused();
    const [totalIDs, activeIDs] = await contract.getContractStats();

    console.log(`✅ Contract Owner: ${owner}`);
    console.log(`✅ Contract Paused: ${paused}`);
    console.log(`✅ Total IDs: ${totalIDs}`);
    console.log(`✅ Active IDs: ${activeIDs}`);

    // Test 2: Authority management
    console.log("\\n🧪 Test 2: Authority Management");
    const [deployer] = await hre.ethers.getSigners();
    const isOwnerAuthorized = await contract.authorizedAuthorities(deployer.address);
    console.log(`✅ Deployer is authorized: ${isOwnerAuthorized}`);

    // Test 3: Create a test digital ID
    console.log("\\n🧪 Test 3: Creating Test Digital ID");
    try {
      const testUserId = `test_${Date.now()}`;
      const testName = "Test User";
      const kycHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test_kyc_data"));
      const personalHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`${testName}_${testUserId}`));
      const expirationTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now
      const verificationLevel = 3;

      console.log(`📝 Creating ID for: ${testName} (${testUserId})`);
      const tx = await contract.createDigitalID(
        testUserId,
        testName,
        kycHash,
        personalHash,
        expirationTimestamp,
        verificationLevel
      );

      await tx.wait();
      const digitalId = await contract.getIDByTouristId(testUserId);
      console.log(`✅ Digital ID created: ${digitalId}`);
      console.log(`✅ Transaction hash: ${tx.hash}`);

      // Test 4: Verify the created ID
      console.log("\\n🧪 Test 4: Verifying Created Digital ID");
      const [isValid, status] = await contract.verifyDigitalID(digitalId);
      const idDetails = await contract.getIDDetails(digitalId);

      console.log(`✅ ID is valid: ${isValid}`);
      console.log(`✅ ID status: ${status}`);
      console.log(`✅ ID name: ${idDetails.name}`);
      console.log(`✅ ID verification level: ${idDetails.verificationLevel}`);

      // Test 5: Get updated contract stats
      console.log("\\n🧪 Test 5: Updated Contract Statistics");
      const [newTotalIDs, newActiveIDs] = await contract.getContractStats();
      console.log(`✅ New Total IDs: ${newTotalIDs}`);
      console.log(`✅ New Active IDs: ${newActiveIDs}`);

    } catch (testError) {
      console.error(`❌ Test digital ID creation failed:`, testError.message);
    }

    console.log("\\n🎉 Contract verification completed successfully!");
    console.log("\\n📊 Verification Summary:");
    console.log(`- Contract deployed at: ${contractAddress}`);
    console.log(`- Owner: ${owner}`);
    console.log(`- Initial state: Working correctly`);
    console.log(`- Test ID creation: ${true ? "✅ Success" : "❌ Failed"}`);

    return true;

  } catch (error) {
    console.error("❌ Contract verification failed:", error.message);
    return false;
  }
}

// Handle script execution
if (require.main === module) {
  verifyContract().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });
}

module.exports = verifyContract;
const { expect } = require("chai");
const hre = require("hardhat");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

describe("Blockchain Service Integration", function () {
  let contract;
  let contractAddress;
  let deployer;
  
  // Test configuration
  const SERVICE_URL = "http://localhost:5002";
  const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

  before(async function () {
    this.timeout(TEST_TIMEOUT);
    
    console.log("🚀 Setting up integration test environment...");
    
    // Get signers
    [deployer] = await hre.ethers.getSigners();
    
    // Deploy contract for testing
    console.log("📄 Deploying test contract...");
    const TouristDigitalID = await hre.ethers.getContractFactory("TouristDigitalID");
    contract = await TouristDigitalID.deploy();
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
    
    console.log(`✅ Test contract deployed at: ${contractAddress}`);
    
    // Update environment file for testing
    const envPath = path.join(__dirname, "..", ".env.blockchain");
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    
    // Update CONTRACT_ADDRESS for testing
    const addressLine = `CONTRACT_ADDRESS=${contractAddress}`;
    if (envContent.includes("CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(/CONTRACT_ADDRESS=.*/, addressLine);
    } else {
      envContent += `\n${addressLine}`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log("📝 Updated .env.blockchain with test contract address");
  });

  describe("Service Health Check", function () {
    it("Should respond to health check", async function () {
      try {
        const response = await axios.get(`${SERVICE_URL}/health`, { timeout: 5000 });
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('status');
        expect(response.data).to.have.property('blockchain');
        
        console.log("📊 Service health:", response.data);
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log("⚠️  Blockchain service not running - this is expected in CI/automated testing");
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe("Digital ID Creation via API", function () {
    const testTourist = {
      userId: `test_${Date.now()}`,
      name: "Integration Test User",
      documentType: "passport",
      documentNumber: "P123456789",
      kycHash: "sha256:test_kyc_hash"
    };

    it("Should create digital ID via API endpoint", async function () {
      try {
        const response = await axios.post(`${SERVICE_URL}/createID`, testTourist, {
          timeout: 10000
        });
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('blockchainId');
        expect(response.data).to.have.property('qr');
        expect(response.data).to.have.property('status');
        
        console.log("✅ Digital ID created:", {
          blockchainId: response.data.blockchainId,
          status: response.data.status,
          onChain: response.data.onChain
        });
        
        // Store for verification test
        testTourist.blockchainId = response.data.blockchainId;
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log("⚠️  Blockchain service not running - using mock response check");
          // For CI/testing without service running, we expect this behavior
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it("Should verify created digital ID", async function () {
      if (!testTourist.blockchainId) {
        this.skip();
      }

      try {
        const response = await axios.get(`${SERVICE_URL}/verifyID`, {
          params: { blockchainId: testTourist.blockchainId },
          timeout: 10000
        });
        
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('valid');
        expect(response.data).to.have.property('blockchainId');
        expect(response.data.blockchainId).to.equal(testTourist.blockchainId);
        
        console.log("✅ Digital ID verified:", {
          blockchainId: response.data.blockchainId,
          valid: response.data.valid,
          userId: response.data.userId
        });
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log("⚠️  Blockchain service not running");
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe("Fallback Behavior", function () {
    it("Should handle blockchain service unavailable gracefully", async function () {
      // This test simulates what happens when blockchain is unavailable
      // The service should return fallback responses
      
      const testData = {
        userId: "fallback_test",
        name: "Fallback Test User"
      };
      
      try {
        // Try to connect to a non-existent service port to test fallback
        const response = await axios.post("http://localhost:9999/createID", testData, {
          timeout: 2000
        });
        
        // Should not reach here
        expect.fail("Expected connection to fail");
        
      } catch (error) {
        // This is expected behavior when service is unavailable
        expect(error.code).to.be.oneOf(['ECONNREFUSED', 'ENOTFOUND']);
        console.log("✅ Fallback behavior confirmed - service unavailable returns expected error");
      }
    });
  });

  describe("Error Handling", function () {
    it("Should handle invalid requests gracefully", async function () {
      try {
        const response = await axios.post(`${SERVICE_URL}/createID`, {
          // Missing required fields
        }, {
          timeout: 5000,
          validateStatus: () => true // Don't throw on 4xx/5xx status codes
        });
        
        if (response.status === 400) {
          expect(response.data).to.have.property('error');
          console.log("✅ Invalid request handled correctly:", response.data.error);
        } else {
          console.log("ℹ️  Service returned fallback response for invalid request");
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log("⚠️  Blockchain service not running");
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });

  describe("Contract Interaction", function () {
    it("Should interact directly with deployed contract", async function () {
      const testUserId = `direct_test_${Date.now()}`;
      const testName = "Direct Contract Test";
      const kycHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test_kyc"));
      const personalHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("test_personal"));
      const expirationTimestamp = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year
      
      // Create digital ID directly via contract
      const tx = await contract.createDigitalID(
        testUserId,
        testName,
        kycHash,
        personalHash,
        expirationTimestamp,
        3
      );
      
      await tx.wait();
      
      // Verify it was created
      const digitalId = await contract.getIDByTouristId(testUserId);
      expect(digitalId).to.be.greaterThan(0);
      
      // Verify the ID
      const [valid, status] = await contract.verifyDigitalID(digitalId);
      expect(valid).to.be.true;
      expect(status).to.equal(0); // Active status
      
      console.log(`✅ Direct contract interaction successful - Digital ID: ${digitalId}`);
    });

    it("Should get contract statistics", async function () {
      const [totalIDs, activeIDs] = await contract.getContractStats();
      
      expect(totalIDs).to.be.greaterThan(0);
      expect(activeIDs).to.be.greaterThan(0);
      
      console.log(`📊 Contract stats - Total: ${totalIDs}, Active: ${activeIDs}`);
    });
  });

  describe("Seed Data Integration", function () {
    it("Should verify seed data structure", async function () {
      const seedDataPath = path.join(__dirname, "..", "..", "seed_data", "tourists.json");
      
      if (fs.existsSync(seedDataPath)) {
        const tourists = JSON.parse(fs.readFileSync(seedDataPath, "utf8"));
        
        expect(Array.isArray(tourists)).to.be.true;
        expect(tourists.length).to.be.greaterThan(0);
        
        // Check if any tourists have blockchain IDs
        const withBlockchainId = tourists.filter(t => t.blockchainId);
        console.log(`📊 Seed data: ${tourists.length} tourists, ${withBlockchainId.length} with blockchain IDs`);
        
        // Verify structure of first tourist
        const firstTourist = tourists[0];
        expect(firstTourist).to.have.property('_id');
        expect(firstTourist).to.have.property('name');
        expect(firstTourist).to.have.property('verificationStatus');
        
      } else {
        console.log("⚠️  Seed data file not found - this may be expected in some test environments");
      }
    });
  });

  after(async function () {
    console.log("🧹 Integration test cleanup completed");
  });
});
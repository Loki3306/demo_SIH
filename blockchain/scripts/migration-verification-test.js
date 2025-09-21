#!/usr/bin/env node

/**
 * Migration Verification Test
 * Verifies that the migration from mock blockchain to real blockchain was successful
 */

const fs = require('fs');
const path = require('path');
const Web3 = require('web3');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.blockchain') });

// Configuration
const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;

// Initialize Web3 and contract
let web3;
let contract;

// Contract ABI for testing
const CONTRACT_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_digitalId", "type": "uint256" }],
    "name": "getIDDetails",
    "outputs": [{
      "components": [
        { "internalType": "uint256", "name": "digitalId", "type": "uint256" },
        { "internalType": "string", "name": "touristUserId", "type": "string" },
        { "internalType": "string", "name": "name", "type": "string" },
        { "internalType": "address", "name": "authorityAddress", "type": "address" },
        { "internalType": "bytes32", "name": "kycDocumentHash", "type": "bytes32" },
        { "internalType": "bytes32", "name": "personalDataHash", "type": "bytes32" },
        { "internalType": "uint256", "name": "issueTimestamp", "type": "uint256" },
        { "internalType": "uint256", "name": "expirationTimestamp", "type": "uint256" },
        { "internalType": "uint8", "name": "status", "type": "uint8" },
        { "internalType": "uint8", "name": "verificationLevel", "type": "uint8" },
        { "internalType": "bool", "name": "exists", "type": "bool" }
      ],
      "internalType": "struct TouristDigitalID.DigitalID",
      "name": "digitalID",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "_digitalId", "type": "uint256" }],
    "name": "verifyDigitalID",
    "outputs": [
      { "internalType": "bool", "name": "valid", "type": "bool" },
      { "internalType": "uint8", "name": "status", "type": "uint8" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getContractStats",
    "outputs": [
      { "internalType": "uint256", "name": "totalIDs", "type": "uint256" },
      { "internalType": "uint256", "name": "activeIDs", "type": "uint256" },
      { "internalType": "uint256", "name": "totalAuthorities", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Initialize blockchain connection
async function initializeBlockchain() {
  try {
    console.log('🚀 Starting Ganache Blockchain Service...');
    console.log('🔗 Connecting to Ganache at:', GANACHE_URL);
    
    web3 = new Web3(GANACHE_URL);
    
    // Test connection
    const isListening = await web3.eth.net.isListening();
    if (!isListening) {
      throw new Error('Cannot connect to Ganache');
    }
    
    // Initialize contract
    if (!CONTRACT_ADDRESS) {
      throw new Error('CONTRACT_ADDRESS not found in environment');
    }
    
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    return true;
    
  } catch (error) {
    console.error('❌ Blockchain initialization failed:', error.message);
    return false;
  }
}

// Check blockchain connection
async function checkConnection() {
  try {
    if (!web3) return false;
    return await web3.eth.net.isListening();
  } catch {
    return false;
  }
}

// Get digital ID details
async function getDigitalId(blockchainId) {
  try {
    if (!contract) throw new Error('Contract not initialized');
    
    const details = await contract.methods.getIDDetails(blockchainId).call();
    
    if (!details.exists) {
      return null;
    }
    
    return {
      digitalId: details.digitalId,
      name: details.name,
      documentType: 'passport', // Simplified for testing
      documentNumber: details.touristUserId,
      isActive: details.status === '0', // 0 = Active
      createdAt: details.issueTimestamp,
      expiresAt: details.expirationTimestamp
    };
    
  } catch (error) {
    throw new Error(`Failed to get digital ID: ${error.message}`);
  }
}

// Get contract address
function getContractAddress() {
  return CONTRACT_ADDRESS;
}

async function runMigrationVerificationTest() {
  console.log('🧪 Starting Migration Verification Test...');
  console.log('==========================================\n');

  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  };

  function test(name, testFn) {
    testResults.total++;
    try {
      console.log(`🔍 Test: ${name}`);
      const result = testFn();
      if (result instanceof Promise) {
        return result.then(() => {
          console.log(`✅ PASSED: ${name}\n`);
          testResults.passed++;
        }).catch((error) => {
          console.error(`❌ FAILED: ${name}`);
          console.error(`   Error: ${error.message}\n`);
          testResults.failed++;
          testResults.errors.push({ test: name, error: error.message });
        });
      } else {
        console.log(`✅ PASSED: ${name}\n`);
        testResults.passed++;
      }
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}\n`);
      testResults.failed++;
      testResults.errors.push({ test: name, error: error.message });
    }
  }

  // Test 1: Migration Report Exists
  await test('Migration Report Exists', () => {
    const reportPath = path.join(__dirname, '..', 'migration-report.json');
    
    if (!fs.existsSync(reportPath)) {
      throw new Error('migration-report.json not found');
    }
    
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    
    if (!report.timestamp) {
      throw new Error('Migration report missing timestamp');
    }
    
    if (!report.contractAddress) {
      throw new Error('Migration report missing contract address');
    }
    
    if (report.failedMigrations > 0) {
      throw new Error(`Migration report shows ${report.failedMigrations} failed migrations`);
    }
    
    console.log(`   📅 Migration Date: ${report.timestamp}`);
    console.log(`   📄 Contract: ${report.contractAddress}`);
    console.log(`   ✅ Successful: ${report.successfulMigrations}`);
    console.log(`   ❌ Failed: ${report.failedMigrations}`);
  });

  // Test 2: Tourist Data Integrity
  await test('Tourist Data Integrity', () => {
    const seedDataPath = path.join(__dirname, '..', '..', 'seed_data', 'tourists.json');
    
    if (!fs.existsSync(seedDataPath)) {
      throw new Error('tourists.json not found');
    }
    
    const tourists = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
    
    // Check for migrated tourists
    const migratedTourists = tourists.filter(t => 
      t.verificationStatus === 'verified' && 
      t.blockchainStatus === 'migrated'
    );
    
    if (migratedTourists.length === 0) {
      throw new Error('No migrated tourists found');
    }
    
    // Verify each migrated tourist has proper blockchain data
    for (const tourist of migratedTourists) {
      if (!tourist.blockchainId || tourist.blockchainId.toString().startsWith('bc_')) {
        throw new Error(`Tourist ${tourist.name} has invalid blockchain ID: ${tourist.blockchainId}`);
      }
      
      if (!tourist.transactionHash || !tourist.transactionHash.startsWith('0x')) {
        throw new Error(`Tourist ${tourist.name} has invalid transaction hash: ${tourist.transactionHash}`);
      }
    }
    
    console.log(`   👥 Total Tourists: ${tourists.length}`);
    console.log(`   ✅ Migrated Tourists: ${migratedTourists.length}`);
    console.log(`   📊 Migration Status: Complete`);
    
    // Store migrated tourist IDs for blockchain verification
    global.migratedIds = migratedTourists.map(t => parseInt(t.blockchainId));
  });

  // Test 3: Blockchain Service Connection
  await test('Blockchain Service Connection', async () => {
    const blockchainReady = await initializeBlockchain();
    if (!blockchainReady) {
      throw new Error('Cannot initialize blockchain connection');
    }
    
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('Cannot connect to Ganache blockchain');
    }
    
    console.log(`   🔗 Blockchain Connection: ✅ Connected`);
    console.log(`   📄 Contract Address: ${getContractAddress()}`);
  });

  // Test 4: Migrated Digital ID Verification
  await test('Migrated Digital ID Verification', async () => {
    if (!global.migratedIds || global.migratedIds.length === 0) {
      throw new Error('No migrated IDs found from previous test');
    }
    
    let allVerified = true;
    
    for (const blockchainId of global.migratedIds) {
      console.log(`   🔍 Verifying blockchain ID: ${blockchainId}`);
      
      try {
        const digitalId = await getDigitalId(blockchainId);
        
        if (!digitalId || !digitalId.isActive) {
          console.log(`   ❌ Digital ID ${blockchainId} not found or inactive`);
          allVerified = false;
          continue;
        }
        
        console.log(`   ✅ Digital ID ${blockchainId} verified:`);
        console.log(`      - Name: ${digitalId.name}`);
        console.log(`      - Document: ${digitalId.documentType} ${digitalId.documentNumber}`);
        console.log(`      - Status: ${digitalId.isActive ? 'Active' : 'Inactive'}`);
        console.log(`      - Created: ${new Date(digitalId.createdAt * 1000).toISOString()}`);
        
      } catch (error) {
        console.log(`   ❌ Error verifying Digital ID ${blockchainId}: ${error.message}`);
        allVerified = false;
      }
    }
    
    if (!allVerified) {
      throw new Error('Some migrated digital ID verifications failed');
    }
    
    console.log(`   🎯 All ${global.migratedIds.length} migrated digital IDs verified successfully`);
  });

  // Test 5: Environment Configuration
  await test('Environment Configuration', () => {
    const envPath = path.join(__dirname, '..', '.env.blockchain');
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env.blockchain not found');
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    const requiredVars = ['CONTRACT_ADDRESS=', 'GANACHE_URL=', 'ADMIN_PRIVATE_KEY='];
    for (const varName of requiredVars) {
      if (!envContent.includes(varName)) {
        throw new Error(`${varName} not found in .env.blockchain`);
      }
    }
    
    console.log(`   ⚙️  Environment file contains all required variables`);
  });

  // Test 6: Deployment File Integrity
  await test('Deployment File Integrity', () => {
    const deploymentPath = path.join(__dirname, '..', 'deployment.json');
    
    if (!fs.existsSync(deploymentPath)) {
      throw new Error('deployment.json not found');
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    if (!deployment.address) {
      throw new Error('Contract address not found in deployment.json');
    }
    
    if (!deployment.transactionHash) {
      throw new Error('Transaction hash not found in deployment.json');
    }
    
    if (!deployment.deployer) {
      throw new Error('Deployer address not found in deployment.json');
    }
    
    console.log(`   📄 Contract Address: ${deployment.address}`);
    console.log(`   🔗 Transaction Hash: ${deployment.transactionHash}`);
    console.log(`   👑 Deployer: ${deployment.deployer}`);
    console.log(`   ⛽ Gas Used: ${deployment.gasUsed || 'N/A'}`);
  });

  // Generate Test Report
  console.log('📊 Migration Verification Test Results');
  console.log('======================================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }

  const success = testResults.failed === 0;
  console.log(`\n🎯 Overall Result: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  return success;
}

// Handle script execution
if (require.main === module) {
  runMigrationVerificationTest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Migration verification test suite failed:', error);
    process.exit(1);
  });
}

module.exports = runMigrationVerificationTest;
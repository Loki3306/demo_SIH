#!/usr/bin/env node

/**
 * End-to-End Integration Test
 * Tests complete tourist registration and approval flow with real blockchain
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runE2ETest() {
  console.log('🧪 Starting End-to-End Integration Test...');
  console.log('=====================================\n');

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
      testFn();
      console.log(`✅ PASSED: ${name}\n`);
      testResults.passed++;
    } catch (error) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error: ${error.message}\n`);
      testResults.failed++;
      testResults.errors.push({ test: name, error: error.message });
    }
  }

  // Test 1: Blockchain Service Health
  test('Blockchain Service Health Check', () => {
    try {
      const response = execSync('curl -s http://localhost:5002/health', { encoding: 'utf8' });
      const health = JSON.parse(response);
      
      if (health.status !== 'ok') {
        throw new Error(`Service status is ${health.status}, expected 'ok'`);
      }
      
      if (!health.blockchain.connected) {
        throw new Error('Blockchain not connected');
      }
      
      console.log(`   📊 Service Status: ${health.status}`);
      console.log(`   🔗 Blockchain Connected: ${health.blockchain.connected}`);
      console.log(`   📄 Contract Address: ${health.blockchain.contractAddress}`);
    } catch (e) {
      throw new Error(`Health check failed: ${e.message}`);
    }
  });

  // Test 2: Contract Deployment Verification
  test('Contract Deployment Verification', () => {
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
    
    console.log(`   📄 Contract Address: ${deployment.address}`);
    console.log(`   🔗 Transaction Hash: ${deployment.transactionHash}`);
    console.log(`   👑 Deployer: ${deployment.deployer}`);
  });

  // Test 3: Digital ID Creation via API
  test('Digital ID Creation via Blockchain API', () => {
    const testUserId = `e2e_test_${Date.now()}`;
    const testName = 'E2E Test User';
    
    try {
      // Use curl for cross-platform compatibility
      const payload = JSON.stringify({
        userId: testUserId,
        name: testName,
        documentType: 'passport',
        documentNumber: 'E2E123456'
      });
      
      const command = `curl -s -X POST http://localhost:5002/createID -H "Content-Type: application/json" -d '${payload}'`;
      const response = execSync(command, { encoding: 'utf8' });
      
      let result;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        throw new Error(`Failed to parse API response: ${response}`);
      }
      
      if (!result.blockchainId) {
        throw new Error('No blockchainId returned from API');
      }
      
      if (!result.status || result.status !== 'created') {
        throw new Error(`Expected status 'created', got '${result.status}'`);
      }
      
      console.log(`   🆔 Blockchain ID: ${result.blockchainId}`);
      console.log(`   📊 Status: ${result.status}`);
      console.log(`   🔗 On-Chain: ${result.onChain || 'N/A'}`);
      
      // Store for next test
      global.testBlockchainId = result.blockchainId;
      global.testUserId = testUserId;
      
    } catch (e) {
      throw new Error(`API call failed: ${e.message}`);
    }
  });

  // Test 4: Digital ID Verification
  test('Digital ID Verification via API', () => {
    if (!global.testBlockchainId) {
      throw new Error('No blockchain ID from previous test');
    }
    
    try {
      const command = `curl -s "http://localhost:5002/verifyID?blockchainId=${global.testBlockchainId}"`;
      const response = execSync(command, { encoding: 'utf8' });
      
      let result;
      try {
        result = JSON.parse(response);
      } catch (parseError) {
        throw new Error(`Failed to parse verification response: ${response}`);
      }
      
      if (!result.blockchainId) {
        throw new Error('No blockchainId returned from verification');
      }
      
      if (result.blockchainId !== global.testBlockchainId) {
        throw new Error(`Blockchain ID mismatch: expected ${global.testBlockchainId}, got ${result.blockchainId}`);
      }
      
      console.log(`   🆔 Verified ID: ${result.blockchainId}`);
      console.log(`   ✅ Valid: ${result.valid || 'N/A'}`);
      console.log(`   👤 User ID: ${result.userId || 'N/A'}`);
      console.log(`   📛 Name: ${result.name || 'N/A'}`);
      
    } catch (e) {
      throw new Error(`Verification failed: ${e.message}`);
    }
  });

  // Test 5: Migration Data Integrity Check
  test('Migration Data Integrity Check', () => {
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
      if (!tourist.blockchainId || tourist.blockchainId.startsWith('bc_')) {
        throw new Error(`Tourist ${tourist.name} has invalid blockchain ID: ${tourist.blockchainId}`);
      }
      
      if (!tourist.transactionHash || !tourist.transactionHash.startsWith('0x')) {
        throw new Error(`Tourist ${tourist.name} has invalid transaction hash: ${tourist.transactionHash}`);
      }
    }
    
    console.log(`   👥 Total Tourists: ${tourists.length}`);
    console.log(`   ✅ Migrated Tourists: ${migratedTourists.length}`);
    console.log(`   📊 Migration Status: Complete`);
  });

  // Test 6: Migration Report Validation
  test('Migration Report Validation', () => {
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

  // Test 7: Environment Configuration Check
  test('Environment Configuration Check', () => {
    const envPath = path.join(__dirname, '..', '.env.blockchain');
    
    if (!fs.existsSync(envPath)) {
      throw new Error('.env.blockchain not found');
    }
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    if (!envContent.includes('CONTRACT_ADDRESS=')) {
      throw new Error('CONTRACT_ADDRESS not found in .env.blockchain');
    }
    
    if (!envContent.includes('GANACHE_URL=')) {
      throw new Error('GANACHE_URL not found in .env.blockchain');
    }
    
    console.log(`   ⚙️  Environment file exists and contains required variables`);
  });

  // Generate Test Report
  console.log('📊 End-to-End Test Results');
  console.log('===========================');
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
  runE2ETest().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ E2E test suite failed:', error);
    process.exit(1);
  });
}

module.exports = runE2ETest;
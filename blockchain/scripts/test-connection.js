#!/usr/bin/env node

/**
 * Ganache Connection Test Script
 * Tests connectivity to Ganache GUI and validates network configuration
 */

require('dotenv').config({ path: '.env.blockchain' });
const Web3 = require('web3');

async function testGanacheConnection() {
  console.log('🔗 Testing Ganache GUI Connection...');
  console.log('=====================================\n');

  const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:7545';
  
  try {
    // Initialize Web3 connection
    console.log(`📡 Connecting to Ganache at: ${GANACHE_URL}`);
    const web3 = new Web3(GANACHE_URL);
    
    // Test 1: Check if connected to network
    console.log('🧪 Test 1: Network connectivity...');
    const isConnected = await web3.eth.net.isListening();
    if (!isConnected) {
      throw new Error('Cannot connect to Ganache network');
    }
    console.log('✅ Connected to Ganache successfully');
    
    // Test 2: Get network information
    console.log('🧪 Test 2: Network information...');
    const networkId = await web3.eth.net.getId();
    const chainId = await web3.eth.getChainId();
    console.log(`📊 Network ID: ${networkId}`);
    console.log(`🔗 Chain ID: ${chainId}`);
    
    // Test 3: Check accounts
    console.log('🧪 Test 3: Account validation...');
    const accounts = await web3.eth.getAccounts();
    console.log(`👥 Available accounts: ${accounts.length}`);
    
    if (accounts.length === 0) {
      throw new Error('No accounts found in Ganache');
    }
    
    // Test 4: Check admin account balance
    if (process.env.ADMIN_PRIVATE_KEY) {
      const adminAccount = web3.eth.accounts.privateKeyToAccount(process.env.ADMIN_PRIVATE_KEY);
      const balance = await web3.eth.getBalance(adminAccount.address);
      const balanceEth = web3.utils.fromWei(balance, 'ether');
      
      console.log(`👑 Admin account: ${adminAccount.address}`);
      console.log(`💰 Admin balance: ${balanceEth} ETH`);
      
      if (parseFloat(balanceEth) < 1) {
        console.warn('⚠️  Warning: Low admin account balance. Consider adding more ETH in Ganache.');
      }
    } else {
      console.warn('⚠️  ADMIN_PRIVATE_KEY not set. Cannot validate admin account.');
    }
    
    // Test 5: Check block information
    console.log('🧪 Test 5: Block information...');
    const latestBlock = await web3.eth.getBlockNumber();
    const blockInfo = await web3.eth.getBlock(latestBlock);
    console.log(`📦 Latest block: #${latestBlock}`);
    console.log(`⏰ Block timestamp: ${new Date(Number(blockInfo.timestamp) * 1000).toISOString()}`);
    
    // Summary
    console.log('\n🎉 All connection tests passed!');
    console.log('\n📋 Network Summary:');
    console.log(`- Ganache URL: ${GANACHE_URL}`);
    console.log(`- Network ID: ${networkId}`);
    console.log(`- Chain ID: ${chainId}`);
    console.log(`- Accounts: ${accounts.length}`);
    console.log(`- Latest block: #${latestBlock}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    
    if (error.message.includes('CONNECTION_REFUSED') || error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Make sure Ganache GUI is installed and running');
      console.log('2. Verify Ganache is running on http://127.0.0.1:7545');
      console.log('3. Check that no firewall is blocking the connection');
      console.log('4. Try restarting Ganache GUI');
      console.log('\n📖 Ganache GUI setup instructions:');
      console.log('- Download from: https://trufflesuite.com/ganache/');
      console.log('- Create a new workspace or use Quickstart');
      console.log('- Ensure Server tab shows: HTTP://127.0.0.1:7545');
    }
    
    return false;
  }
}

// Handle script execution
if (require.main === module) {
  testGanacheConnection().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  });
}

module.exports = testGanacheConnection;
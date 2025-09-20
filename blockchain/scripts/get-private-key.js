const hre = require("hardhat");
const Web3 = require('web3');

async function getAccountPrivateKey() {
  console.log("🔑 Getting Account Private Key from Ganache...");
  
  try {
    // Connect to Ganache
    const web3 = new Web3('http://127.0.0.1:7545');
    const accounts = await web3.eth.getAccounts();
    
    console.log("📋 Available accounts:");
    for (let i = 0; i < Math.min(accounts.length, 3); i++) {
      console.log(`Account ${i}: ${accounts[i]}`);
    }
    
    // Check deployer account from deployment.json
    const fs = require('fs');
    const path = require('path');
    const deploymentPath = path.join(__dirname, '..', 'deployment.json');
    
    if (fs.existsSync(deploymentPath)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      console.log(`\\n👑 Deployer account: ${deployment.deployer}`);
      
      // Find the deployer account index
      const deployerIndex = accounts.findIndex(acc => acc.toLowerCase() === deployment.deployer.toLowerCase());
      if (deployerIndex !== -1) {
        console.log(`📍 Deployer is Account ${deployerIndex} in Ganache`);
        console.log("\\n📝 To get the private key:");
        console.log(`1. Open Ganache GUI`);
        console.log(`2. Click the key icon next to Account ${deployerIndex}`);
        console.log(`3. Copy the private key`);
        console.log(`4. Update .env.blockchain with: ADMIN_PRIVATE_KEY=<private_key>`);
      }
    }
    
    console.log("\\n⚠️  For development purposes, you can use any of the Ganache account private keys");
    console.log("   Just make sure to use the same account that deployed the contract");
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getAccountPrivateKey();
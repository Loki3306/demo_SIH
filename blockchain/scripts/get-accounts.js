const hre = require("hardhat");
const Web3 = require('web3');

async function getGanacheAccounts() {
  console.log("🔑 Getting Ganache Account Information...");
  
  try {
    // Use Web3 for account listing
    const web3 = new Web3('http://127.0.0.1:7545');
    const accounts = await web3.eth.getAccounts();
    
    console.log(`Found ${accounts.length} accounts:`);
    for (let i = 0; i < Math.min(accounts.length, 3); i++) {
      const balance = await web3.eth.getBalance(accounts[i]);
      const balanceEth = web3.utils.fromWei(balance, 'ether');
      console.log(`Account ${i}: ${accounts[i]} (${balanceEth} ETH)`);
    }
    
    console.log("\n📋 To set up admin account:");
    console.log("1. Copy Account 0 address above");
    console.log("2. In Ganache GUI, click the key icon next to Account 0");
    console.log("3. Copy the private key");
    console.log("4. Update .env.blockchain with: ADMIN_PRIVATE_KEY=<your_private_key>");
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

getGanacheAccounts();
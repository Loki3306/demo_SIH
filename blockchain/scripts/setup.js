#!/usr/bin/env node

/**
 * Blockchain Setup Script
 * Automates the setup process for the Tourist Digital ID blockchain system
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function execCommand(command, description) {
  console.log(`🔨 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description} found`);
    return true;
  } else {
    console.log(`❌ ${description} not found at ${filePath}`);
    return false;
  }
}

async function setupBlockchainEnvironment() {
  console.log('🚀 Tourist Digital ID Blockchain Setup');
  console.log('=====================================\n');

  // Check if blockchain directory exists
  const blockchainDir = path.join(__dirname, '..');
  if (!fs.existsSync(blockchainDir)) {
    console.error('❌ Blockchain directory not found');
    process.exit(1);
  }

  // Step 1: Install dependencies
  console.log('📦 Step 1: Installing blockchain dependencies...');
  if (!execCommand('npm install', 'Installing npm packages')) {
    console.error('Failed to install dependencies. Please check your npm installation.');
    process.exit(1);
  }

  // Step 2: Check Ganache setup
  console.log('\n🔗 Step 2: Ganache GUI Setup');
  console.log('Please ensure Ganache GUI is installed and running with the following settings:');
  console.log('- Server: HTTP://127.0.0.1:7545');
  console.log('- Network ID: 5777');
  console.log('- Chain ID: 1337');
  console.log('- Gas Limit: 6721975');
  console.log('- Gas Price: 20000000000 (20 Gwei)');

  const ganacheReady = await question('\nIs Ganache GUI running with correct settings? (y/n): ');
  if (ganacheReady.toLowerCase() !== 'y') {
    console.log('\n📋 Please set up Ganache GUI:');
    console.log('1. Download Ganache GUI from https://trufflesuite.com/ganache/');
    console.log('2. Create a new workspace or quickstart');
    console.log('3. Ensure the server settings match the above configuration');
    console.log('4. Start the workspace');
    console.log('\nRun this setup script again when Ganache is ready.');
    process.exit(0);
  }

  // Step 3: Environment configuration
  console.log('\n⚙️  Step 3: Environment Configuration');
  const envPath = path.join(__dirname, '..', '.env.blockchain');
  
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env.blockchain file...');
    const envTemplate = `# Blockchain environment configuration for Ganache GUI integration
# Copy Account 0 private key from Ganache GUI here
ADMIN_PRIVATE_KEY=

# Ganache network configuration (defaults)
GANACHE_URL=http://127.0.0.1:7545
NETWORK_ID=5777

# Contract deployment address (auto-populated after deployment)
CONTRACT_ADDRESS=

# Blockchain service configuration
BLOCKCHAIN_MODE=ganache
SERVICE_PORT=5002`;
    
    fs.writeFileSync(envPath, envTemplate);
    console.log('✅ .env.blockchain file created');
  }

  // Get admin private key from user
  console.log('\n🔑 Admin Private Key Setup:');
  console.log('1. Open Ganache GUI');
  console.log('2. Click on the key icon next to Account 0');
  console.log('3. Copy the Private Key');
  
  const privateKey = await question('\nPaste Account 0 Private Key (starts with 0x): ');
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    console.error('❌ Invalid private key format. Please ensure it starts with 0x and is 64 characters long.');
    process.exit(1);
  }

  // Update environment file
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/ADMIN_PRIVATE_KEY=.*/, `ADMIN_PRIVATE_KEY=${privateKey}`);
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Private key saved to .env.blockchain');

  // Step 4: Compile contracts
  console.log('\n🔨 Step 4: Compiling Smart Contracts');
  if (!execCommand('npx hardhat compile', 'Compiling contracts')) {
    process.exit(1);
  }

  // Step 5: Deploy contracts
  console.log('\n🚀 Step 5: Deploying Contracts to Ganache');
  if (!execCommand('npx hardhat run scripts/deploy.js --network ganache', 'Deploying contracts')) {
    console.error('\n🔧 Deployment troubleshooting:');
    console.error('- Ensure Ganache GUI is running');
    console.error('- Check that the private key is correct');
    console.error('- Verify Account 0 has sufficient ETH balance');
    process.exit(1);
  }

  // Step 6: Seed data
  console.log('\n🌱 Step 6: Creating Seed Data');
  const seedData = await question('Create blockchain IDs for verified tourists in seed data? (y/n): ');
  if (seedData.toLowerCase() === 'y') {
    execCommand('npx hardhat run scripts/seed-data.js --network ganache', 'Creating seed data');
  }

  // Step 7: Test deployment
  console.log('\n🧪 Step 7: Testing Deployment');
  const runTests = await question('Run smart contract tests? (y/n): ');
  if (runTests.toLowerCase() === 'y') {
    execCommand('npx hardhat test', 'Running tests');
  }

  // Step 8: Update main project configuration
  console.log('\n⚙️  Step 8: Updating Main Project Configuration');
  const mainEnvPath = path.join(__dirname, '..', '..', '.env');
  let mainEnvContent = '';
  
  if (fs.existsSync(mainEnvPath)) {
    mainEnvContent = fs.readFileSync(mainEnvPath, 'utf8');
  }
  
  // Update blockchain mode
  if (mainEnvContent.includes('BLOCKCHAIN_MODE=')) {
    mainEnvContent = mainEnvContent.replace(/BLOCKCHAIN_MODE=.*/, 'BLOCKCHAIN_MODE=ganache');
  } else {
    mainEnvContent += '\nBLOCKCHAIN_MODE=ganache';
  }
  
  fs.writeFileSync(mainEnvPath, mainEnvContent);
  console.log('✅ Main project .env updated with blockchain mode');

  // Final instructions
  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Start the blockchain service:');
  console.log('   cd blockchain && npm start');
  console.log('   OR from project root: pnpm dev:blockchain:real');
  console.log('');
  console.log('2. Start the full application with blockchain:');
  console.log('   pnpm start:all:blockchain');
  console.log('');
  console.log('3. Test the blockchain integration:');
  console.log('   - Register a new tourist via the website');
  console.log('   - Approve the tourist via admin dashboard');
  console.log('   - Verify the blockchain ID is created');
  console.log('');
  console.log('4. Health check:');
  console.log('   http://localhost:5002/health');
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('- If blockchain service fails to start, check Ganache is running');
  console.log('- View blockchain service logs for detailed error information');
  console.log('- Use fallback mode by setting BLOCKCHAIN_MODE=mock in .env');

  rl.close();
}

// Handle script execution
if (require.main === module) {
  setupBlockchainEnvironment().catch(error => {
    console.error('❌ Setup failed:', error.message);
    rl.close();
    process.exit(1);
  });
}

module.exports = setupBlockchainEnvironment;
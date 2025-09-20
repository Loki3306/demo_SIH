require('dotenv').config({ path: '.env.blockchain' });
const express = require('express');
const cors = require('cors');
const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
const SERVICE_PORT = process.env.SERVICE_PORT || 5002;

// Initialize Web3
let web3;
let contract;
let adminAccount;

// Contract ABI (comprehensive functions for TouristDigitalID)
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
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
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_touristUserId", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "bytes32", "name": "_kycHash", "type": "bytes32" },
      { "internalType": "bytes32", "name": "_personalHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "_expirationTimestamp", "type": "uint256" },
      { "internalType": "uint8", "name": "_verificationLevel", "type": "uint8" }
    ],
    "name": "createDigitalID",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
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
    "inputs": [{ "internalType": "string", "name": "_touristUserId", "type": "string" }],
    "name": "getIDByTouristId",
    "outputs": [{ "internalType": "uint256", "name": "digitalId", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Status mapping
const STATUS_NAMES = {
  0: 'Active',
  1: 'Suspended', 
  2: 'Expired',
  3: 'Revoked'
};

// Initialize blockchain connection
async function initializeBlockchain() {
  try {
    console.log('🔗 Connecting to Ganache at:', GANACHE_URL);
    
    // Initialize Web3
    web3 = new Web3(GANACHE_URL);
    
    // Test connection with timeout
    const connectionTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 5000)
    );
    
    const isConnected = await Promise.race([
      web3.eth.net.isListening(),
      connectionTimeout
    ]);
    
    if (!isConnected) {
      throw new Error('Cannot connect to Ganache network');
    }
    
    const networkId = await web3.eth.net.getId();
    console.log('📡 Connected to network ID:', networkId);
    
    // Check contract address
    if (!CONTRACT_ADDRESS) {
      console.warn('⚠️  CONTRACT_ADDRESS not found in environment variables');
      console.log('📝 To deploy contract, run: npx hardhat run scripts/deploy.js --network ganache');
      return false;
    }
    
    // Initialize contract
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    console.log('📄 Contract initialized at:', CONTRACT_ADDRESS);
    
    // Setup admin account
    if (ADMIN_PRIVATE_KEY) {
      adminAccount = web3.eth.accounts.privateKeyToAccount(ADMIN_PRIVATE_KEY);
      web3.eth.accounts.wallet.add(adminAccount);
      web3.eth.defaultAccount = adminAccount.address;
      console.log('👑 Admin account set:', adminAccount.address);
    } else {
      console.warn('⚠️  ADMIN_PRIVATE_KEY not set. Some functions may not work.');
    }
    
    // Test contract connectivity
    try {
      // Test basic contract access
      const owner = await contract.methods.owner().call();
      console.log('👑 Contract owner:', owner);
      
      // Test contract stats if available
      const [totalIDs, activeIDs] = await contract.methods.getContractStats().call();
      console.log('📊 Contract stats - Total IDs:', totalIDs, 'Active IDs:', activeIDs);
    } catch (error) {
      console.warn('⚠️  Could not fetch contract stats:', error.message);
      // Continue initialization even if stats fail
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Blockchain initialization failed:', error.message);
    return false;
  }
}

// Generate QR Code for digital ID
async function generateQRCode(digitalId) {
  try {
    const qrData = {
      digitalId: digitalId.toString(),
      verifyUrl: `http://localhost:${SERVICE_PORT}/verifyID?blockchainId=${digitalId}`,
      timestamp: new Date().toISOString()
    };
    
    const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData));
    return qrCodeDataURL;
    
  } catch (error) {
    console.error('❌ QR Code generation failed:', error);
    // Return a simple fallback QR code
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

// Fallback to mock response
function createMockResponse(endpoint, data) {
  console.log(`🔄 Fallback to mock response for ${endpoint}`);
  
  if (endpoint === 'createID') {
    return {
      blockchainId: `mock_${Date.now()}`,
      qr: 'data:image/png;base64,iVBORw0KGgo=',
      status: 'created',
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      onChain: false,
      fallback: true
    };
  } else if (endpoint === 'verifyID') {
    return {
      blockchainId: data.blockchainId || 'mock_unknown',
      userId: 'unknown',
      valid: false,
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      onChain: false,
      fallback: true
    };
  }
}

// API Endpoints

// Create Digital ID
app.post('/createID', async (req, res) => {
  try {
    const { userId, name, kycHash, itinerary, validUntil, documentType, documentNumber } = req.body || {};
    
    console.log(`📝 Creating digital ID for user: ${userId} (${name})`);
    
    // Validate input
    if (!userId || !name) {
      return res.status(400).json({ error: 'userId and name are required' });
    }
    
    // Check blockchain connectivity
    if (!contract || !adminAccount) {
      console.warn('⚠️  Blockchain not available, using fallback');
      return res.json(createMockResponse('createID', req.body));
    }
    
    try {
      // Check if ID already exists
      const existingId = await contract.methods.getIDByTouristId(userId).call();
      if (existingId && existingId !== '0') {
        console.log(`ℹ️  Digital ID already exists for ${userId}: ${existingId}`);
        
        // Get existing ID details and return
        const details = await contract.methods.getIDDetails(existingId).call();
        const qrCode = await generateQRCode(existingId);
        
        return res.json({
          blockchainId: existingId.toString(),
          qr: qrCode,
          status: 'exists',
          expiresAt: new Date(Number(details.expirationTimestamp) * 1000).toISOString(),
          onChain: true,
          transactionHash: null
        });
      }
      
      // Generate hashes for blockchain
      const kycHashBytes32 = kycHash ? 
        web3.utils.sha3(kycHash) : 
        web3.utils.sha3(`${documentType || 'passport'}_${documentNumber || 'default'}`);
      
      const personalHashBytes32 = web3.utils.sha3(`${name}_${userId}_${Date.now()}`);
      
      // Set expiration (1 year from now or provided validUntil)
      const expirationTimestamp = validUntil ? 
        Math.floor(new Date(validUntil).getTime() / 1000) :
        Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60);
      
      // Determine verification level
      const verificationLevel = documentType === 'passport' ? 4 : 3;
      
      console.log('🔨 Creating blockchain transaction...');
      
      // Create digital ID on blockchain
      const tx = await contract.methods.createDigitalID(
        userId,
        name,
        kycHashBytes32,
        personalHashBytes32,
        expirationTimestamp,
        verificationLevel
      ).send({
        from: adminAccount.address,
        gas: 500000
      });
      
      console.log(`✅ Transaction successful: ${tx.transactionHash}`);
      
      // Get the created digital ID
      const digitalId = await contract.methods.getIDByTouristId(userId).call();
      
      // Generate QR code
      const qrCode = await generateQRCode(digitalId);
      
      const response = {
        blockchainId: digitalId.toString(),
        qr: qrCode,
        status: 'created',
        expiresAt: new Date(expirationTimestamp * 1000).toISOString(),
        onChain: true,
        transactionHash: tx.transactionHash,
        verificationLevel
      };
      
      console.log(`🎉 Digital ID created successfully: ${digitalId}`);
      res.json(response);
      
    } catch (blockchainError) {
      console.error('❌ Blockchain operation failed:', blockchainError.message);
      
      // Fallback to mock response
      const mockResponse = createMockResponse('createID', req.body);
      mockResponse.error = 'blockchain_unavailable';
      mockResponse.details = blockchainError.message;
      
      res.json(mockResponse);
    }
    
  } catch (error) {
    console.error('❌ Create ID failed:', error);
    res.status(500).json({ 
      error: 'internal_error', 
      details: error.message,
      fallback: createMockResponse('createID', req.body)
    });
  }
});

// Verify Digital ID
app.get('/verifyID', async (req, res) => {
  try {
    const blockchainId = req.query.blockchainId;
    
    console.log(`🔍 Verifying digital ID: ${blockchainId}`);
    
    if (!blockchainId) {
      return res.status(400).json({ error: 'blockchainId parameter is required' });
    }
    
    // Check blockchain connectivity
    if (!contract) {
      console.warn('⚠️  Blockchain not available, using fallback');
      return res.json(createMockResponse('verifyID', { blockchainId }));
    }
    
    try {
      // Verify digital ID on blockchain
      const verification = await contract.methods.verifyDigitalID(blockchainId).call();
      const isValid = verification.valid;
      const status = verification.status;
      
      console.log(`📊 Verification result: valid=${isValid}, status=${status}`);
      
      if (!isValid) {
        return res.json({
          blockchainId: blockchainId.toString(),
          userId: 'unknown',
          valid: false,
          status: STATUS_NAMES[status] || 'Unknown',
          onChain: true,
          reason: status === '2' ? 'expired' : status === '1' ? 'suspended' : 'invalid'
        });
      }
      
      // Get detailed ID information
      const details = await contract.methods.getIDDetails(blockchainId).call();
      
      const response = {
        blockchainId: blockchainId.toString(),
        userId: details.touristUserId,
        name: details.name,
        valid: isValid,
        status: STATUS_NAMES[status] || 'Unknown',
        issuedAt: new Date(Number(details.issueTimestamp) * 1000).toISOString(),
        expiresAt: new Date(Number(details.expirationTimestamp) * 1000).toISOString(),
        verificationLevel: Number(details.verificationLevel),
        authorityAddress: details.authorityAddress,
        onChain: true
      };
      
      console.log(`✅ Verification successful for ${details.name}`);
      res.json(response);
      
    } catch (blockchainError) {
      console.error('❌ Blockchain verification failed:', blockchainError.message);
      
      // Fallback to mock response
      const mockResponse = createMockResponse('verifyID', { blockchainId });
      mockResponse.error = 'blockchain_unavailable';
      mockResponse.details = blockchainError.message;
      
      res.json(mockResponse);
    }
    
  } catch (error) {
    console.error('❌ Verify ID failed:', error);
    res.status(500).json({ 
      error: 'internal_error', 
      details: error.message,
      fallback: createMockResponse('verifyID', { blockchainId: req.query.blockchainId })
    });
  }
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      blockchain: {
        connected: false,
        contractAddress: CONTRACT_ADDRESS,
        ganacheUrl: GANACHE_URL,
        adminAccount: adminAccount?.address || null
      }
    };
    
    if (contract && web3) {
      try {
        const isListening = await web3.eth.net.isListening();
        health.blockchain.connected = isListening;
        
        if (isListening) {
          const [totalIDs, activeIDs] = await contract.methods.getContractStats().call();
          health.blockchain.totalIDs = Number(totalIDs);
          health.blockchain.activeIDs = Number(activeIDs);
        }
      } catch (error) {
        health.blockchain.error = error.message;
      }
    }
    
    res.json(health);
    
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Start server
async function startServer() {
  console.log('🚀 Starting Ganache Blockchain Service...');
  
  // Initialize blockchain connection
  const blockchainReady = await initializeBlockchain();
  
  if (!blockchainReady) {
    console.log('⚠️  Blockchain not ready, service will use fallback mode');
  }
  
  app.listen(SERVICE_PORT, () => {
    console.log(`✅ Blockchain service listening on port ${SERVICE_PORT}`);
    console.log(`🔗 Health check: http://localhost:${SERVICE_PORT}/health`);
    
    if (blockchainReady) {
      console.log('🎉 Real blockchain mode active');
    } else {
      console.log('🔄 Fallback mode active - mock responses will be used');
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down blockchain service...');
  process.exit(0);
});

// Start the service
startServer().catch(error => {
  console.error('❌ Failed to start blockchain service:', error);
  process.exit(1);
});
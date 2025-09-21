const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Simple in-memory storage for demo purposes
const digitalIDs = new Map();

// Generate a realistic QR code data URI (base64 encoded mock QR code)
function generateQRCode(data) {
  // This is a simple mock QR code - in production, use a proper QR code library
  const qrData = JSON.stringify(data);
  const base64QR = Buffer.from(qrData).toString('base64');
  return `data:image/png;base64,${base64QR}`;
}

// Generate blockchain transaction hash
function generateTransactionHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'blockchain-mock',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.post('/createID', (req, res) => {
  const { userId, name, documentType, documentNumber, kycHash, validUntil } = req.body || {};
  
  if (!userId || !name) {
    return res.status(400).json({ 
      error: 'missing_required_fields',
      message: 'userId and name are required'
    });
  }
  
  const blockchainId = `bc_${crypto.randomBytes(8).toString('hex')}`;
  const transactionHash = generateTransactionHash();
  const issuedAt = new Date().toISOString();
  const expiresAt = validUntil || new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString(); // 5 years default
  
  const digitalIDData = {
    blockchainId,
    userId,
    name,
    documentType: documentType || 'unknown',
    documentNumber: documentNumber || 'unknown',
    kycHash: kycHash || `sha256:${Date.now()}`,
    issuedAt,
    expiresAt,
    transactionHash,
    status: 'active',
    onChain: true, // Mock as on-chain for demo
    verificationLevel: 'verified'
  };
  
  // Generate QR code with verification data
  const qrCodeData = {
    id: blockchainId,
    userId,
    name,
    issued: issuedAt,
    expires: expiresAt,
    verify: `https://yatrarakshak.verify/${blockchainId}`
  };
  
  const qrCode = generateQRCode(qrCodeData);
  
  // Store in mock database
  digitalIDs.set(blockchainId, digitalIDData);
  
  res.json({
    blockchainId,
    transactionHash,
    qr: qrCode,
    status: 'created',
    issuedAt,
    expiresAt,
    onChain: true,
    verificationLevel: 'verified',
    userId,
    name
  });
});

app.get('/verifyID', (req, res) => {
  const blockchainId = req.query.blockchainId;
  
  if (!blockchainId) {
    return res.status(400).json({
      error: 'missing_blockchain_id',
      message: 'blockchainId query parameter is required'
    });
  }
  
  const digitalID = digitalIDs.get(blockchainId);
  
  if (!digitalID) {
    // Return a fallback response for unknown IDs
    return res.json({
      blockchainId,
      valid: false,
      status: 'not_found',
      message: 'Digital ID not found in blockchain'
    });
  }
  
  const now = new Date();
  const expiresAt = new Date(digitalID.expiresAt);
  const isExpired = now > expiresAt;
  
  res.json({
    blockchainId: digitalID.blockchainId,
    userId: digitalID.userId,
    name: digitalID.name,
    valid: !isExpired && digitalID.status === 'active',
    status: isExpired ? 'expired' : digitalID.status,
    issuedAt: digitalID.issuedAt,
    expiresAt: digitalID.expiresAt,
    onChain: digitalID.onChain,
    verificationLevel: digitalID.verificationLevel,
    documentType: digitalID.documentType,
    transactionHash: digitalID.transactionHash
  });
});

// List all digital IDs (for admin/debug purposes)
app.get('/listIDs', (req, res) => {
  const ids = Array.from(digitalIDs.values());
  res.json({
    total: ids.length,
    digitalIDs: ids
  });
});

// Revoke a digital ID
app.post('/revokeID', (req, res) => {
  const { blockchainId, reason } = req.body || {};
  
  if (!blockchainId) {
    return res.status(400).json({
      error: 'missing_blockchain_id',
      message: 'blockchainId is required'
    });
  }
  
  const digitalID = digitalIDs.get(blockchainId);
  
  if (!digitalID) {
    return res.status(404).json({
      error: 'id_not_found',
      message: 'Digital ID not found'
    });
  }
  
  digitalID.status = 'revoked';
  digitalID.revokedAt = new Date().toISOString();
  digitalID.revocationReason = reason || 'No reason provided';
  
  digitalIDs.set(blockchainId, digitalID);
  
  res.json({
    success: true,
    blockchainId,
    status: 'revoked',
    revokedAt: digitalID.revokedAt,
    reason: digitalID.revocationReason
  });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`[blockchain-mock] listening on ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

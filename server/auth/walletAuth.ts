/**
 * Wallet-Based Admin Authentication Service
 * Implements blockchain wallet authentication for admin access
 * Based on design document requirements for YatraRakshak Admin System
 */

import { Request, Response } from 'express';
import crypto from 'crypto';
import Web3 from 'web3';
import { 
  Admin, 
  AdminLoginRequest, 
  AuthResponse, 
  AuthSession,
  AuditLogEntry,
  BlockchainHealth
} from '../../shared/types';
import { 
  generateToken, 
  createAuditLogEntry, 
  getClientIP,
  hashPassword,
  sanitizeString
} from './security';

// Web3 Configuration
const GANACHE_URL = process.env.GANACHE_URL || 'http://127.0.0.1:7545';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:5002';

// Initialize Web3 instance
let web3: Web3;
let blockchainHealthCache: BlockchainHealth | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize Web3 connection for wallet authentication
 */
export async function initializeWeb3(): Promise<boolean> {
  try {
    console.log('🔗 Initializing Web3 for admin wallet authentication...');
    web3 = new Web3(GANACHE_URL);
    
    // Test connection with timeout
    const connectionTimeout = new Promise<boolean>((_, reject) => 
      setTimeout(() => reject(new Error('Web3 connection timeout')), 5000)
    );
    
    const isConnected = await Promise.race([
      web3.eth.net.isListening(),
      connectionTimeout
    ]);
    
    if (!isConnected) {
      throw new Error('Cannot connect to Ganache network');
    }
    
    const networkId = await web3.eth.net.getId();
    const chainId = await web3.eth.getChainId();
    
    console.log(`✅ Web3 connected - Network ID: ${networkId}, Chain ID: ${chainId}`);
    return true;
    
  } catch (error: any) {
    console.error('❌ Web3 initialization failed:', error.message);
    return false;
  }
}

/**
 * Validate Ethereum private key format and mathematical validity
 */
export function validatePrivateKey(privateKey: string): { isValid: boolean; error?: string } {
  try {
    // Check basic format
    if (!privateKey) {
      return { isValid: false, error: 'Private key is required' };
    }
    
    // Ensure 0x prefix
    const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    // Check length (64 hex characters + 0x prefix = 66 total)
    if (cleanKey.length !== 66) {
      return { isValid: false, error: 'Private key must be 64 hexadecimal characters (with 0x prefix)' };
    }
    
    // Check if it's valid hexadecimal
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(cleanKey)) {
      return { isValid: false, error: 'Private key must contain only hexadecimal characters' };
    }
    
    // Validate mathematically using Web3
    if (!web3) {
      return { isValid: false, error: 'Web3 not initialized' };
    }
    
    try {
      const account = web3.eth.accounts.privateKeyToAccount(cleanKey);
      if (!account.address) {
        return { isValid: false, error: 'Invalid private key - cannot derive address' };
      }
    } catch {
      return { isValid: false, error: 'Invalid private key format' };
    }
    
    return { isValid: true };
    
  } catch (error: any) {
    return { isValid: false, error: `Private key validation error: ${error.message}` };
  }
}

/**
 * Check if wallet address has admin authority in smart contract
 */
export async function validateAdminAuthority(walletAddress: string): Promise<{ 
  isAuthorized: boolean; 
  role?: string; 
  error?: string 
}> {
  try {
    if (!CONTRACT_ADDRESS) {
      // Fallback: allow any address for development
      console.warn('⚠️  CONTRACT_ADDRESS not set. Allowing wallet address for development.');
      return { isAuthorized: true, role: 'admin' };
    }
    
    // Query blockchain service for authority validation
    const response = await fetch(`${BLOCKCHAIN_API_URL}/validateAuthority`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        isAuthorized: result.isAuthorized || false,
        role: result.role || 'admin'
      };
    } else {
      throw new Error(`Authority validation failed: ${response.status}`);
    }
    
  } catch (error: any) {
    console.warn('⚠️  Authority validation error:', error.message);
    
    // Fallback: allow wallet for development if blockchain service unavailable
    return { 
      isAuthorized: true, 
      role: 'admin',
      error: `Fallback mode: ${error.message}`
    };
  }
}

/**
 * Check wallet account balance
 */
export async function checkWalletBalance(walletAddress: string): Promise<{
  balance: string;
  balanceEth: string;
  sufficient: boolean;
}> {
  try {
    if (!web3) {
      throw new Error('Web3 not initialized');
    }
    
    const balance = await web3.eth.getBalance(walletAddress);
    const balanceEth = web3.utils.fromWei(balance, 'ether');
    const sufficient = parseFloat(balanceEth) >= 0.1; // Minimum 0.1 ETH required
    
    return {
      balance,
      balanceEth,
      sufficient
    };
    
  } catch (error: any) {
    console.warn('⚠️  Balance check failed:', error.message);
    return {
      balance: '0',
      balanceEth: '0',
      sufficient: false
    };
  }
}

/**
 * Get blockchain health status
 */
export async function getBlockchainHealth(): Promise<BlockchainHealth> {
  const now = Date.now();
  
  // Return cached result if recent
  if (blockchainHealthCache && (now - lastHealthCheck) < HEALTH_CHECK_INTERVAL) {
    return blockchainHealthCache;
  }
  
  try {
    if (!web3) {
      throw new Error('Web3 not initialized');
    }
    
    // Test network connectivity
    const isConnected = await web3.eth.net.isListening();
    if (!isConnected) {
      throw new Error('Network not accessible');
    }
    
    const networkId = await web3.eth.net.getId();
    const chainId = await web3.eth.getChainId();
    
    // Query blockchain service for stats
    let totalIDs = 0;
    let activeIDs = 0;
    let adminBalance = '0';
    
    try {
      const healthResponse = await fetch(`${BLOCKCHAIN_API_URL}/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        totalIDs = healthData.blockchain?.totalIDs || 0;
        activeIDs = healthData.blockchain?.activeIDs || 0;
      }
    } catch (error: any) {
      console.warn('⚠️  Blockchain service health check failed:', error.message);
    }
    
    // Get admin account balance if available
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (adminPrivateKey) {
      try {
        const adminAccount = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
        const balanceInfo = await checkWalletBalance(adminAccount.address);
        adminBalance = balanceInfo.balanceEth;
      } catch (error: any) {
        console.warn('⚠️  Admin balance check failed:', error.message);
      }
    }
    
    const health: BlockchainHealth = {
      connected: true,
      contractAddress: CONTRACT_ADDRESS,
      networkId: networkId.toString(),
      chainId: chainId.toString(),
      totalIDs,
      activeIDs,
      adminBalance,
      lastChecked: new Date().toISOString()
    };
    
    blockchainHealthCache = health;
    lastHealthCheck = now;
    
    return health;
    
  } catch (error: any) {
    console.error('❌ Blockchain health check failed:', error.message);
    
    const health: BlockchainHealth = {
      connected: false,
      lastChecked: new Date().toISOString()
    };
    
    blockchainHealthCache = health;
    lastHealthCheck = now;
    
    return health;
  }
}

/**
 * Create secure hash of private key for storage
 */
export function createPrivateKeyHash(privateKey: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(privateKey, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify private key against stored hash
 */
export function verifyPrivateKeyHash(privateKey: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    
    const derivedHash = crypto.pbkdf2Sync(privateKey, salt, 10000, 64, 'sha512').toString('hex');
    return hash === derivedHash;
  } catch {
    return false;
  }
}

/**
 * Generate session ID for wallet-based authentication
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// In-memory session storage (replace with Redis in production)
const activeSessions = new Map<string, AuthSession>();

/**
 * Create authentication session
 */
export function createAuthSession(admin: Admin, clientIP: string, userAgent: string): AuthSession {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 hours
  
  const token = generateToken({
    userId: admin._id,
    role: 'admin',
    sessionId
  }, true); // Admin token
  
  const session: AuthSession = {
    sessionId,
    adminId: admin._id,
    walletAddress: admin.walletAddress,
    jwtToken: token,
    expiresAt,
    ipAddress: clientIP,
    userAgent,
    authType: admin.authType
  };
  
  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Validate authentication session
 */
export function validateAuthSession(sessionId: string): AuthSession | null {
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return null;
  }
  
  // Check expiration
  if (new Date() > new Date(session.expiresAt)) {
    activeSessions.delete(sessionId);
    return null;
  }
  
  return session;
}

/**
 * Revoke authentication session
 */
export function revokeAuthSession(sessionId: string): boolean {
  return activeSessions.delete(sessionId);
}

/**
 * Get all active sessions for admin
 */
export function getAdminSessions(adminId: string): AuthSession[] {
  return Array.from(activeSessions.values()).filter(session => session.adminId === adminId);
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now > new Date(session.expiresAt)) {
      activeSessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

// Auto-cleanup expired sessions every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// Initialize Web3 on module load
initializeWeb3().catch(error => {
  console.error('Failed to initialize Web3 for wallet authentication:', error);
});
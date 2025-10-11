import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import Web3 from 'web3';
import { 
  validatePrivateKey, 
  validateAdminAuthority, 
  createAuthSession,
  getBlockchainHealth 
} from '../auth/walletAuth';
import { BlockchainError } from '../auth/errorHandling';

// Mock Web3 and dependencies
jest.mock('web3');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

describe('Wallet Authentication Service', () => {
  let mockWeb3: jest.Mocked<Web3>;
  let mockContract: any;

  beforeEach(() => {
    // Setup Web3 mock
    mockWeb3 = new Web3() as jest.Mocked<Web3>;
    mockContract = {
      methods: {
        isAdmin: jest.fn(),
        adminInfo: jest.fn()
      }
    };
    
    (Web3 as jest.MockedClass<typeof Web3>).mockImplementation(() => mockWeb3);
    mockWeb3.eth = {
      accounts: {
        privateKeyToAccount: jest.fn()
      },
      getBalance: jest.fn()
    } as any;
    
    // Mock contract instance
    mockWeb3.eth.Contract = jest.fn().mockReturnValue(mockContract) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePrivateKey', () => {
    it('should validate correct private key format', async () => {
      const validPrivateKey = '0x' + 'a'.repeat(64);
      const mockAccount = {
        address: '0x1234567890123456789012345678901234567890',
        privateKey: validPrivateKey
      };

      mockWeb3.eth.accounts.privateKeyToAccount = jest.fn().mockReturnValue(mockAccount);

      const result = await validatePrivateKey(validPrivateKey);

      expect(result.isValid).toBe(true);
      expect(result.address).toBe(mockAccount.address);
      expect(mockWeb3.eth.accounts.privateKeyToAccount).toHaveBeenCalledWith(validPrivateKey);
    });

    it('should reject invalid private key format', async () => {
      const invalidPrivateKey = 'invalid-key';

      const result = await validatePrivateKey(invalidPrivateKey);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid private key format');
    });

    it('should reject private key without 0x prefix', async () => {
      const keyWithoutPrefix = 'a'.repeat(64);

      const result = await validatePrivateKey(keyWithoutPrefix);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid private key format');
    });

    it('should reject private key with wrong length', async () => {
      const shortKey = '0x' + 'a'.repeat(32);

      const result = await validatePrivateKey(shortKey);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid private key format');
    });

    it('should handle Web3 errors gracefully', async () => {
      const validPrivateKey = '0x' + 'a'.repeat(64);
      mockWeb3.eth.accounts.privateKeyToAccount = jest.fn().mockImplementation(() => {
        throw new Error('Web3 connection failed');
      });

      const result = await validatePrivateKey(validPrivateKey);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Web3 connection failed');
    });
  });

  describe('validateAdminAuthority', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890';

    it('should validate admin authority successfully', async () => {
      const mockAdminInfo = {
        isActive: true,
        role: 'admin',
        permissions: ['read', 'write']
      };

      mockContract.methods.isAdmin.mockReturnValue({
        call: jest.fn().mockResolvedValue(true)
      });
      mockContract.methods.adminInfo.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockAdminInfo)
      });
      mockWeb3.eth.getBalance = jest.fn().mockResolvedValue('1000000000000000000');

      const result = await validateAdminAuthority(mockAddress);

      expect(result.isValid).toBe(true);
      expect(result.adminInfo).toEqual(mockAdminInfo);
      expect(result.hasBalance).toBe(true);
    });

    it('should reject non-admin addresses', async () => {
      mockContract.methods.isAdmin.mockReturnValue({
        call: jest.fn().mockResolvedValue(false)
      });

      const result = await validateAdminAuthority(mockAddress);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Address is not registered as admin');
    });

    it('should reject inactive admin accounts', async () => {
      const inactiveAdminInfo = {
        isActive: false,
        role: 'admin',
        permissions: []
      };

      mockContract.methods.isAdmin.mockReturnValue({
        call: jest.fn().mockResolvedValue(true)
      });
      mockContract.methods.adminInfo.mockReturnValue({
        call: jest.fn().mockResolvedValue(inactiveAdminInfo)
      });

      const result = await validateAdminAuthority(mockAddress);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Admin account is inactive');
    });

    it('should warn about low balance but allow access', async () => {
      const mockAdminInfo = {
        isActive: true,
        role: 'admin',
        permissions: ['read', 'write']
      };

      mockContract.methods.isAdmin.mockReturnValue({
        call: jest.fn().mockResolvedValue(true)
      });
      mockContract.methods.adminInfo.mockReturnValue({
        call: jest.fn().mockResolvedValue(mockAdminInfo)
      });
      mockWeb3.eth.getBalance = jest.fn().mockResolvedValue('100000000000000'); // Low balance

      const result = await validateAdminAuthority(mockAddress);

      expect(result.isValid).toBe(true);
      expect(result.hasBalance).toBe(false);
      expect(result.warning).toContain('Low account balance');
    });

    it('should handle blockchain connectivity errors', async () => {
      mockContract.methods.isAdmin.mockReturnValue({
        call: jest.fn().mockRejectedValue(new Error('Network timeout'))
      });

      const result = await validateAdminAuthority(mockAddress);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Blockchain validation failed');
    });
  });

  describe('createAuthSession', () => {
    const mockAdminData = {
      adminId: 'admin123',
      walletAddress: '0x1234567890123456789012345678901234567890',
      role: 'admin',
      permissions: ['read', 'write']
    };

    beforeEach(() => {
      // Mock JWT
      const jwt = require('jsonwebtoken');
      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');
    });

    it('should create auth session successfully', async () => {
      const result = await createAuthSession(mockAdminData);

      expect(result.sessionId).toBeDefined();
      expect(result.token).toBe('mock-jwt-token');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.adminId).toBe(mockAdminData.adminId);
    });

    it('should set correct expiration time (8 hours)', async () => {
      const beforeCreate = new Date();
      const result = await createAuthSession(mockAdminData);
      const afterCreate = new Date();

      const expectedExpiration = new Date(beforeCreate.getTime() + 8 * 60 * 60 * 1000);
      const maxExpected = new Date(afterCreate.getTime() + 8 * 60 * 60 * 1000);

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration.getTime());
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(maxExpected.getTime());
    });

    it('should include all required session data', async () => {
      const result = await createAuthSession(mockAdminData);

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('adminId');
      expect(result).toHaveProperty('walletAddress');
      expect(result.walletAddress).toBe(mockAdminData.walletAddress);
    });
  });

  describe('getBlockchainHealth', () => {
    it('should report healthy blockchain status', async () => {
      mockWeb3.eth.getBlockNumber = jest.fn().mockResolvedValue(12345);
      mockWeb3.eth.net.isListening = jest.fn().mockResolvedValue(true);
      mockWeb3.eth.net.getId = jest.fn().mockResolvedValue(1337);

      const result = await getBlockchainHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.currentBlock).toBe(12345);
      expect(result.networkId).toBe(1337);
      expect(result.isListening).toBe(true);
    });

    it('should report unhealthy status on connection failure', async () => {
      mockWeb3.eth.getBlockNumber = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const result = await getBlockchainHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toContain('Connection failed');
    });

    it('should detect wrong network', async () => {
      mockWeb3.eth.getBlockNumber = jest.fn().mockResolvedValue(12345);
      mockWeb3.eth.net.isListening = jest.fn().mockResolvedValue(true);
      mockWeb3.eth.net.getId = jest.fn().mockResolvedValue(1); // Wrong network

      const result = await getBlockchainHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.warning).toContain('Unexpected network');
    });
  });

  describe('Error Handling Integration', () => {
    it('should throw BlockchainError for network issues', async () => {
      mockWeb3.eth.accounts.privateKeyToAccount = jest.fn().mockImplementation(() => {
        throw new Error('Network unreachable');
      });

      const validPrivateKey = '0x' + 'a'.repeat(64);
      
      const result = await validatePrivateKey(validPrivateKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Network unreachable');
    });

    it('should handle contract call failures', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      
      mockContract.methods.isAdmin.mockReturnValue({
        call: jest.fn().mockRejectedValue(new BlockchainError('Contract call failed', 'CONTRACT_ERROR'))
      });

      const result = await validateAdminAuthority(mockAddress);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Blockchain validation failed');
    });
  });
});
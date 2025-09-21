import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { authRoutes } from '../auth/routes';
import { validateSecurityConstraints } from '../auth/walletSecurity';

// Mock dependencies
jest.mock('../auth/walletAuth');
jest.mock('../auth/walletSecurity');
jest.mock('../auth/adminAuth');

describe('Authentication Routes Integration', () => {
  let app: express.Application;
  let mockWalletAuth: any;
  let mockWalletSecurity: any;
  let mockAdminAuth: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    // Setup mocks
    mockWalletAuth = require('../auth/walletAuth');
    mockWalletSecurity = require('../auth/walletSecurity');
    mockAdminAuth = require('../auth/adminAuth');

    // Default mock implementations
    mockWalletSecurity.validateSecurityConstraints.mockResolvedValue({
      isValid: true,
      riskLevel: 'low'
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/admin/login', () => {
    it('should handle successful password authentication', async () => {
      mockAdminAuth.authenticateAdmin.mockResolvedValue({
        success: true,
        admin: {
          _id: 'admin123',
          email: 'admin@test.com',
          role: 'admin'
        },
        token: 'mock-jwt-token',
        session: {
          sessionId: 'session123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
          authType: 'password'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.admin.email).toBe('admin@test.com');
    });

    it('should handle successful wallet authentication', async () => {
      const mockWalletAddress = '0x1234567890123456789012345678901234567890';
      const mockPrivateKey = '0x' + 'a'.repeat(64);

      mockWalletAuth.validatePrivateKey.mockResolvedValue({
        isValid: true,
        address: mockWalletAddress
      });

      mockWalletAuth.validateAdminAuthority.mockResolvedValue({
        isValid: true,
        adminInfo: {
          isActive: true,
          role: 'admin',
          permissions: ['read', 'write']
        },
        hasBalance: true
      });

      mockAdminAuth.authenticateAdmin.mockResolvedValue({
        success: true,
        admin: {
          _id: 'admin123',
          walletAddress: mockWalletAddress,
          role: 'admin'
        },
        token: 'mock-jwt-token',
        session: {
          sessionId: 'session123',
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: mockPrivateKey,
          authType: 'wallet'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('mock-jwt-token');
      expect(response.body.admin.walletAddress).toBe(mockWalletAddress);
    });

    it('should reject invalid private key format', async () => {
      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: 'invalid-key',
          authType: 'wallet'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid private key format');
    });

    it('should reject non-admin wallet addresses', async () => {
      const mockPrivateKey = '0x' + 'a'.repeat(64);

      mockWalletAuth.validatePrivateKey.mockResolvedValue({
        isValid: true,
        address: '0x1234567890123456789012345678901234567890'
      });

      mockWalletAuth.validateAdminAuthority.mockResolvedValue({
        isValid: false,
        error: 'Address is not registered as admin'
      });

      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: mockPrivateKey,
          authType: 'wallet'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Address is not registered as admin');
    });

    it('should handle security constraint violations', async () => {
      mockWalletSecurity.validateSecurityConstraints.mockResolvedValue({
        isValid: false,
        violations: ['SUSPICIOUS_IP', 'RATE_LIMIT_EXCEEDED'],
        riskLevel: 'high'
      });

      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123',
          authType: 'password'
        });

      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Security constraints violated');
    });

    it('should handle missing authentication type', async () => {
      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authentication type is required');
    });

    it('should handle blockchain connectivity errors', async () => {
      const mockPrivateKey = '0x' + 'a'.repeat(64);

      mockWalletAuth.validatePrivateKey.mockRejectedValue(
        new Error('Blockchain network unreachable')
      );

      const response = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: mockPrivateKey,
          authType: 'wallet'
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Blockchain service temporarily unavailable');
    });
  });

  describe('GET /auth/blockchain/health', () => {
    it('should return healthy blockchain status', async () => {
      mockWalletAuth.getBlockchainHealth.mockResolvedValue({
        isHealthy: true,
        currentBlock: 12345,
        networkId: 1337,
        isListening: true,
        timestamp: new Date().toISOString()
      });

      const response = await request(app)
        .get('/auth/blockchain/health');

      expect(response.status).toBe(200);
      expect(response.body.isHealthy).toBe(true);
      expect(response.body.currentBlock).toBe(12345);
      expect(response.body.networkId).toBe(1337);
    });

    it('should return unhealthy status on blockchain issues', async () => {
      mockWalletAuth.getBlockchainHealth.mockResolvedValue({
        isHealthy: false,
        error: 'Connection timeout',
        timestamp: new Date().toISOString()
      });

      const response = await request(app)
        .get('/auth/blockchain/health');

      expect(response.status).toBe(503);
      expect(response.body.isHealthy).toBe(false);
      expect(response.body.error).toContain('Connection timeout');
    });
  });

  describe('POST /auth/admin/refresh', () => {
    it('should refresh valid session token', async () => {
      mockAdminAuth.refreshAuthSession.mockResolvedValue({
        success: true,
        token: 'new-jwt-token',
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .post('/auth/admin/refresh')
        .set('Authorization', 'Bearer old-jwt-token')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBe('new-jwt-token');
    });

    it('should reject refresh for expired sessions', async () => {
      mockAdminAuth.refreshAuthSession.mockResolvedValue({
        success: false,
        error: 'Session expired'
      });

      const response = await request(app)
        .post('/auth/admin/refresh')
        .set('Authorization', 'Bearer expired-jwt-token')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Session expired');
    });

    it('should require authorization header', async () => {
      const response = await request(app)
        .post('/auth/admin/refresh')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization header required');
    });
  });

  describe('POST /auth/admin/logout', () => {
    it('should logout successfully', async () => {
      mockAdminAuth.logoutAdmin.mockResolvedValue({
        success: true,
        message: 'Logged out successfully'
      });

      const response = await request(app)
        .post('/auth/admin/logout')
        .set('Authorization', 'Bearer valid-jwt-token')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should handle logout without valid session', async () => {
      const response = await request(app)
        .post('/auth/admin/logout')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Already logged out');
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should enforce rate limiting on login attempts', async () => {
      // Mock multiple failed attempts
      mockAdminAuth.authenticateAdmin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials'
      });

      const loginAttempts = Array(6).fill(null).map(() => 
        request(app)
          .post('/auth/admin/login')
          .send({
            email: 'admin@test.com',
            password: 'wrong-password',
            authType: 'password'
          })
      );

      const responses = await Promise.all(loginAttempts);
      
      // First 5 should be 401 (unauthorized)
      // 6th should be 429 (rate limited)
      expect(responses[4].status).toBe(401);
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error).toContain('Too many login attempts');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      mockWalletAuth.getBlockchainHealth.mockResolvedValue({
        isHealthy: true,
        currentBlock: 12345,
        networkId: 1337,
        isListening: true
      });

      const response = await request(app)
        .get('/auth/blockchain/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });
});
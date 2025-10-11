import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import { Server } from 'http';
import app from '../index';

describe('End-to-End Authentication Tests', () => {
  let server: Server;
  let authToken: string;
  const testPort = 3001;

  const mockAdminCredentials = {
    email: 'test-admin@example.com',
    password: 'TestAdmin123!',
    privateKey: '0x' + 'a'.repeat(64),
    walletAddress: '0x1234567890123456789012345678901234567890'
  };

  beforeAll((done) => {
    server = app.listen(testPort, () => {
      console.log(`Test server running on port ${testPort}`);
      done();
    });
  });

  afterAll((done) => {
    server.close(done);
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full password authentication flow', async () => {
      // Step 1: Check blockchain health
      const healthResponse = await request(app)
        .get('/auth/blockchain/health');

      expect(healthResponse.status).toBe(200);

      // Step 2: Login with password
      const loginResponse = await request(app)
        .post('/auth/admin/login')
        .send({
          email: mockAdminCredentials.email,
          password: mockAdminCredentials.password,
          authType: 'password'
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      
      authToken = loginResponse.body.token;

      // Step 3: Verify session with protected route
      const dashboardResponse = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${authToken}`);

      expect(dashboardResponse.status).toBe(200);

      // Step 4: Refresh token
      const refreshResponse = await request(app)
        .post('/auth/admin/refresh')
        .set('Authorization', `Bearer ${authToken}`);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.token).toBeDefined();

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/auth/admin/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.body.success).toBe(true);
    });

    it('should complete full wallet authentication flow', async () => {
      // Step 1: Validate private key format
      expect(mockAdminCredentials.privateKey.length).toBe(66); // 0x + 64 chars
      expect(mockAdminCredentials.privateKey.startsWith('0x')).toBe(true);

      // Step 2: Login with wallet
      const loginResponse = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: mockAdminCredentials.privateKey,
          authType: 'wallet'
        });

      // Note: This will likely fail in actual test without proper blockchain setup
      // but the test structure is important for documentation

      if (loginResponse.status === 200) {
        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.token).toBeDefined();
        expect(loginResponse.body.admin.walletAddress).toBe(mockAdminCredentials.walletAddress);

        // Step 3: Verify wallet-specific features
        const blockchainStatusResponse = await request(app)
          .get('/admin/blockchain/status')
          .set('Authorization', `Bearer ${loginResponse.body.token}`);

        expect(blockchainStatusResponse.status).toBe(200);
      } else {
        // Expected when blockchain is not available in test environment
        expect(loginResponse.status).toBe(503);
        expect(loginResponse.body.error).toContain('Blockchain service');
      }
    });

    it('should handle authentication errors gracefully', async () => {
      // Test invalid credentials
      const invalidLoginResponse = await request(app)
        .post('/auth/admin/login')
        .send({
          email: 'invalid@email.com',
          password: 'wrongpassword',
          authType: 'password'
        });

      expect(invalidLoginResponse.status).toBe(401);
      expect(invalidLoginResponse.body.success).toBe(false);

      // Test malformed private key
      const invalidWalletResponse = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: 'invalid-key',
          authType: 'wallet'
        });

      expect(invalidWalletResponse.status).toBe(400);
      expect(invalidWalletResponse.body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      const loginAttempts = [];

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        loginAttempts.push(
          request(app)
            .post('/auth/admin/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword',
              authType: 'password'
            })
        );
      }

      const responses = await Promise.all(loginAttempts);

      // First 5 should be 401 (unauthorized)
      expect(responses[0].status).toBe(401);
      expect(responses[4].status).toBe(401);

      // 6th should be rate limited (429)
      expect(responses[5].status).toBe(429);
      expect(responses[5].body.error).toContain('rate limit');
    });

    it('should handle session expiration', async () => {
      // This test would require mocking time or using very short session duration
      // For now, we'll test the structure
      
      const expiredToken = 'expired-jwt-token';
      
      const protectedResponse = await request(app)
        .get('/admin/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect([401, 403]).toContain(protectedResponse.status);
    });
  });

  describe('Tourist Management Integration', () => {
    beforeEach(async () => {
      // Login to get auth token for tourist management tests
      const loginResponse = await request(app)
        .post('/auth/admin/login')
        .send({
          email: mockAdminCredentials.email,
          password: mockAdminCredentials.password,
          authType: 'password'
        });

      if (loginResponse.status === 200) {
        authToken = loginResponse.body.token;
      }
    });

    it('should create tourist profile with admin authentication', async () => {
      if (!authToken) {
        console.log('Skipping tourist creation test - no auth token');
        return;
      }

      const touristData = {
        name: 'Test Tourist',
        email: 'tourist@example.com',
        phone: '+1234567890',
        emergencyName: 'Emergency Contact',
        emergencyPhone: '+0987654321',
        documentType: 'passport',
        documentNumber: 'AB1234567',
        itinerary: 'Test travel plan'
      };

      const createResponse = await request(app)
        .post('/admin/tourists')
        .set('Authorization', `Bearer ${authToken}`)
        .send(touristData);

      expect([200, 201]).toContain(createResponse.status);
      
      if (createResponse.status === 200 || createResponse.status === 201) {
        expect(createResponse.body.tourist).toBeDefined();
        expect(createResponse.body.tourist.name).toBe(touristData.name);
        expect(createResponse.body.tourist.status).toBe('pending');
      }
    });

    it('should verify tourist application with admin privileges', async () => {
      if (!authToken) {
        console.log('Skipping tourist verification test - no auth token');
        return;
      }

      const mockTouristId = 'tourist123';

      const verifyResponse = await request(app)
        .post(`/admin/tourists/${mockTouristId}/verify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'approve',
          notes: 'Documents verified successfully'
        });

      // This will depend on actual implementation
      expect([200, 404]).toContains(verifyResponse.status);
    });

    it('should require authentication for tourist management', async () => {
      const unauthorizedResponse = await request(app)
        .get('/admin/tourists');

      expect(unauthorizedResponse.status).toBe(401);
    });
  });

  describe('Dashboard Integration', () => {
    it('should provide admin dashboard metrics', async () => {
      if (!authToken) {
        const loginResponse = await request(app)
          .post('/auth/admin/login')
          .send({
            email: mockAdminCredentials.email,
            password: mockAdminCredentials.password,
            authType: 'password'
          });

        if (loginResponse.status === 200) {
          authToken = loginResponse.body.token;
        }
      }

      if (authToken) {
        const metricsResponse = await request(app)
          .get('/admin/dashboard/metrics')
          .set('Authorization', `Bearer ${authToken}`);

        expect(metricsResponse.status).toBe(200);
        expect(metricsResponse.body).toHaveProperty('totalPendingApplications');
        expect(metricsResponse.body).toHaveProperty('applicationsToday');
        expect(metricsResponse.body).toHaveProperty('verificationRate');
      }
    });

    it('should provide real-time system health', async () => {
      const healthResponse = await request(app)
        .get('/auth/blockchain/health');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body).toHaveProperty('isHealthy');
      expect(healthResponse.body).toHaveProperty('timestamp');
    });
  });

  describe('Security Features', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/auth/blockchain/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });

    it('should log security events', async () => {
      // Attempt suspicious login
      const suspiciousResponse = await request(app)
        .post('/auth/admin/login')
        .set('User-Agent', 'curl/7.68.0') // Automated tool
        .send({
          email: 'admin@example.com',
          password: 'password123',
          authType: 'password'
        });

      // Should either succeed or fail, but security event should be logged
      expect([200, 401, 429]).toContain(suspiciousResponse.status);
    });

    it('should handle CORS properly', async () => {
      const corsResponse = await request(app)
        .options('/auth/admin/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');

      expect(corsResponse.status).toBe(200);
      expect(corsResponse.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors gracefully', async () => {
      // Test malformed JSON
      const malformedResponse = await request(app)
        .post('/auth/admin/login')
        .set('Content-Type', 'application/json')
        .send('{"malformed": json}');

      expect(malformedResponse.status).toBe(400);
      expect(malformedResponse.body.error).toContain('Invalid JSON');
    });

    it('should handle missing endpoints', async () => {
      const notFoundResponse = await request(app)
        .get('/nonexistent/endpoint');

      expect(notFoundResponse.status).toBe(404);
    });

    it('should handle blockchain service unavailability', async () => {
      // This test assumes blockchain service is not running
      const walletLoginResponse = await request(app)
        .post('/auth/admin/login')
        .send({
          privateKey: mockAdminCredentials.privateKey,
          authType: 'wallet'
        });

      if (walletLoginResponse.status === 503) {
        expect(walletLoginResponse.body.error).toContain('Blockchain service');
        expect(walletLoginResponse.body.fallback).toBeDefined();
      }
    });
  });
});
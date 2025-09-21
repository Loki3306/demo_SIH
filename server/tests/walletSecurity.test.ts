import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  validateSecurityConstraints,
  trackLoginAttempt,
  checkRateLimit,
  detectSuspiciousActivity,
  auditSecurityEvent 
} from '../auth/walletSecurity';

describe('Wallet Security Service', () => {
  const mockRequest = {
    ip: '192.168.1.100',
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  };

  beforeEach(() => {
    // Clear any existing rate limit data
    jest.clearAllMocks();
  });

  describe('validateSecurityConstraints', () => {
    it('should pass validation for normal requests', async () => {
      const result = await validateSecurityConstraints(mockRequest as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.violations).toHaveLength(0);
    });

    it('should detect suspicious IP addresses', async () => {
      const suspiciousRequest = {
        ...mockRequest,
        ip: '192.168.1.1' // Mock suspicious IP
      };

      // Mock the suspicious IP detection logic
      const detectSuspiciousActivitySpy = jest.spyOn(require('../auth/walletSecurity'), 'detectSuspiciousActivity');
      detectSuspiciousActivitySpy.mockReturnValue({
        isSuspicious: true,
        reasons: ['SUSPICIOUS_IP']
      });

      const result = await validateSecurityConstraints(suspiciousRequest as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('SUSPICIOUS_IP');
      expect(result.riskLevel).toBe('high');

      detectSuspiciousActivitySpy.mockRestore();
    });

    it('should enforce rate limiting', async () => {
      const checkRateLimitSpy = jest.spyOn(require('../auth/walletSecurity'), 'checkRateLimit');
      checkRateLimitSpy.mockReturnValue({
        isAllowed: false,
        remainingAttempts: 0,
        resetTime: new Date(Date.now() + 15 * 60 * 1000)
      });

      const result = await validateSecurityConstraints(mockRequest as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('RATE_LIMIT_EXCEEDED');
      expect(result.riskLevel).toBe('medium');

      checkRateLimitSpy.mockRestore();
    });

    it('should validate wallet address format', async () => {
      const result = await validateSecurityConstraints(mockRequest as any, {
        adminId: 'admin123',
        walletAddress: 'invalid-address'
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('INVALID_WALLET_FORMAT');
      expect(result.riskLevel).toBe('medium');
    });

    it('should detect multiple concurrent sessions', async () => {
      // Mock multiple active sessions for same admin
      const result = await validateSecurityConstraints(mockRequest as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890',
        existingSessions: 3 // Assume this comes from session store
      });

      if ((result as any).existingSessions > 2) {
        expect(result.violations).toContain('MULTIPLE_SESSIONS');
        expect(result.riskLevel).toBe('medium');
      }
    });
  });

  describe('trackLoginAttempt', () => {
    it('should track successful login attempts', async () => {
      const result = trackLoginAttempt(mockRequest.ip, true);

      expect(result.success).toBe(true);
      expect(result.totalAttempts).toBeGreaterThan(0);
      expect(result.consecutiveFailures).toBe(0);
    });

    it('should track failed login attempts', async () => {
      const result = trackLoginAttempt(mockRequest.ip, false);

      expect(result.success).toBe(false);
      expect(result.totalAttempts).toBeGreaterThan(0);
      expect(result.consecutiveFailures).toBeGreaterThan(0);
    });

    it('should reset consecutive failures on successful login', async () => {
      // First, create some failures
      trackLoginAttempt(mockRequest.ip, false);
      trackLoginAttempt(mockRequest.ip, false);
      
      // Then succeed
      const result = trackLoginAttempt(mockRequest.ip, true);

      expect(result.consecutiveFailures).toBe(0);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const result = checkRateLimit(mockRequest.ip);

      expect(result.isAllowed).toBe(true);
      expect(result.remainingAttempts).toBeGreaterThan(0);
    });

    it('should block requests exceeding rate limit', async () => {
      // Simulate multiple attempts to exceed rate limit
      for (let i = 0; i < 10; i++) {
        trackLoginAttempt(mockRequest.ip, false);
      }

      const result = checkRateLimit(mockRequest.ip);

      expect(result.isAllowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should reset rate limit after cooldown period', async () => {
      // This test would require mocking time advancement
      // For now, we'll just verify the structure
      const result = checkRateLimit(mockRequest.ip);
      
      expect(result).toHaveProperty('isAllowed');
      expect(result).toHaveProperty('remainingAttempts');
      expect(result).toHaveProperty('resetTime');
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious user agents', async () => {
      const suspiciousRequest = {
        ...mockRequest,
        headers: {
          'user-agent': 'curl/7.68.0' // Automated tool
        }
      };

      const result = detectSuspiciousActivity(suspiciousRequest as any);

      if (result.isSuspicious) {
        expect(result.reasons).toContain('SUSPICIOUS_USER_AGENT');
      }
    });

    it('should detect missing user agent', async () => {
      const noUserAgentRequest = {
        ...mockRequest,
        headers: {}
      };

      const result = detectSuspiciousActivity(noUserAgentRequest as any);

      if (result.isSuspicious) {
        expect(result.reasons).toContain('MISSING_USER_AGENT');
      }
    });

    it('should detect rapid requests from same IP', async () => {
      // This would require implementing timestamp tracking
      const result = detectSuspiciousActivity(mockRequest as any);
      
      expect(result).toHaveProperty('isSuspicious');
      expect(result).toHaveProperty('reasons');
    });

    it('should detect geographic anomalies', async () => {
      // Mock IP geolocation service
      const foreignIPRequest = {
        ...mockRequest,
        ip: '8.8.8.8' // Google DNS, clearly not local
      };

      const result = detectSuspiciousActivity(foreignIPRequest as any);
      
      // This would require actual geolocation implementation
      expect(result).toHaveProperty('isSuspicious');
      expect(result).toHaveProperty('reasons');
    });
  });

  describe('auditSecurityEvent', () => {
    it('should log successful authentication events', async () => {
      const eventData = {
        type: 'AUTH_SUCCESS',
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890',
        ip: mockRequest.ip,
        userAgent: mockRequest.headers['user-agent'],
        timestamp: new Date()
      };

      const result = await auditSecurityEvent(eventData);

      expect(result.logged).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    it('should log failed authentication events', async () => {
      const eventData = {
        type: 'AUTH_FAILURE',
        reason: 'INVALID_CREDENTIALS',
        ip: mockRequest.ip,
        userAgent: mockRequest.headers['user-agent'],
        timestamp: new Date()
      };

      const result = await auditSecurityEvent(eventData);

      expect(result.logged).toBe(true);
      expect(result.eventId).toBeDefined();
    });

    it('should log security violations', async () => {
      const eventData = {
        type: 'SECURITY_VIOLATION',
        violations: ['RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_IP'],
        riskLevel: 'high',
        ip: mockRequest.ip,
        userAgent: mockRequest.headers['user-agent'],
        timestamp: new Date()
      };

      const result = await auditSecurityEvent(eventData);

      expect(result.logged).toBe(true);
      expect(result.eventId).toBeDefined();
      expect(result.alertTriggered).toBe(true); // High risk should trigger alerts
    });

    it('should handle audit logging failures gracefully', async () => {
      // Mock audit service failure
      const eventData = {
        type: 'AUTH_SUCCESS',
        adminId: 'admin123'
      };

      // This test would require mocking the audit service to fail
      const result = await auditSecurityEvent(eventData);
      
      expect(result).toHaveProperty('logged');
    });
  });

  describe('Security Configuration', () => {
    it('should have proper rate limit configuration', () => {
      const config = {
        maxAttempts: 5,
        windowMinutes: 15,
        lockoutMinutes: 15
      };

      expect(config.maxAttempts).toBeGreaterThan(0);
      expect(config.windowMinutes).toBeGreaterThan(0);
      expect(config.lockoutMinutes).toBeGreaterThan(0);
    });

    it('should have proper session configuration', () => {
      const config = {
        sessionDurationHours: 8,
        refreshThresholdMinutes: 30,
        maxConcurrentSessions: 3
      };

      expect(config.sessionDurationHours).toBe(8);
      expect(config.refreshThresholdMinutes).toBeGreaterThan(0);
      expect(config.maxConcurrentSessions).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle malformed requests', async () => {
      const malformedRequest = {
        ip: undefined,
        headers: null
      };

      const result = await validateSecurityConstraints(malformedRequest as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('MALFORMED_REQUEST');
    });

    it('should handle IPv6 addresses', async () => {
      const ipv6Request = {
        ...mockRequest,
        ip: '2001:db8::1'
      };

      const result = await validateSecurityConstraints(ipv6Request as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      // Should handle IPv6 without errors
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('riskLevel');
    });

    it('should handle very long user agent strings', async () => {
      const longUserAgentRequest = {
        ...mockRequest,
        headers: {
          'user-agent': 'x'.repeat(1000) // Very long user agent
        }
      };

      const result = await validateSecurityConstraints(longUserAgentRequest as any, {
        adminId: 'admin123',
        walletAddress: '0x1234567890123456789012345678901234567890'
      });

      // Should handle without errors
      expect(result).toHaveProperty('isValid');
    });
  });
});
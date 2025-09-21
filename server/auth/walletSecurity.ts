/**
 * Enhanced Security Measures for Wallet-Based Admin Authentication
 * Implements comprehensive security validations and protections
 */

import crypto from 'crypto';
import { Request } from 'express';
import { getClientIP } from './security';

// Security Constants
export const SECURITY_CONSTANTS = {
  // Wallet validation
  PRIVATE_KEY_LENGTH: 66, // Including 0x prefix
  MIN_WALLET_BALANCE: 0.1, // Minimum ETH balance required
  MAX_LOGIN_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  
  // Session security
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
  SESSION_REFRESH_THRESHOLD: 30 * 60 * 1000, // 30 minutes before expiry
  MAX_CONCURRENT_SESSIONS: 3,
  
  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  MAX_AUTH_ATTEMPTS: 5,
  
  // IP validation
  TRUSTED_IP_RANGES: [
    '127.0.0.0/8',    // Localhost
    '192.168.0.0/16', // Private networks
    '10.0.0.0/8',     // Private networks
    '172.16.0.0/12'   // Private networks
  ],
  
  // Blockchain security
  GANACHE_NETWORK_ID: '1337',
  GANACHE_CHAIN_ID: '1337',
  CONTRACT_DEPLOYMENT_BLOCK: 0 // Should be set after deployment
} as const;

// Security violation types
export enum SecurityViolationType {
  INVALID_PRIVATE_KEY = 'invalid_private_key',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  UNAUTHORIZED_WALLET = 'unauthorized_wallet',
  SUSPICIOUS_IP = 'suspicious_ip',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SESSION_ANOMALY = 'session_anomaly',
  BLOCKCHAIN_MISMATCH = 'blockchain_mismatch'
}

// Security audit log entry
interface SecurityAuditLog {
  timestamp: string;
  violationType: SecurityViolationType;
  walletAddress?: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
}

// In-memory security audit log (replace with persistent storage in production)
const securityAuditLogs: SecurityAuditLog[] = [];

// Rate limiting store for wallet addresses
const walletRateLimits = new Map<string, { attempts: number; resetTime: number }>();

// IP address tracking for anomaly detection
const ipAddressHistory = new Map<string, { walletAddress: string; lastSeen: number; count: number }[]>();

/**
 * Comprehensive private key validation with security checks
 */
export function validatePrivateKeySecurity(privateKey: string): {
  isValid: boolean;
  violations: SecurityViolationType[];
  details: string[];
} {
  const violations: SecurityViolationType[] = [];
  const details: string[] = [];
  
  try {
    // Basic format validation
    if (!privateKey) {
      violations.push(SecurityViolationType.INVALID_PRIVATE_KEY);
      details.push('Private key is required');
      return { isValid: false, violations, details };
    }
    
    // Ensure proper format
    const cleanKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    // Length validation
    if (cleanKey.length !== SECURITY_CONSTANTS.PRIVATE_KEY_LENGTH) {
      violations.push(SecurityViolationType.INVALID_PRIVATE_KEY);
      details.push(`Private key must be exactly ${SECURITY_CONSTANTS.PRIVATE_KEY_LENGTH - 2} hexadecimal characters`);
    }
    
    // Hexadecimal validation
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(cleanKey)) {
      violations.push(SecurityViolationType.INVALID_PRIVATE_KEY);
      details.push('Private key must contain only valid hexadecimal characters');
    }
    
    // Check for common weak keys (all zeros, all ones, etc.)
    const keyWithoutPrefix = cleanKey.substring(2);
    if (/^0{64}$/.test(keyWithoutPrefix) || /^[fF]{64}$/.test(keyWithoutPrefix)) {
      violations.push(SecurityViolationType.INVALID_PRIVATE_KEY);
      details.push('Private key appears to be a common weak key');
    }
    
    // Check for incremental patterns (basic entropy check)
    if (/^(0123456789abcdef){4}/.test(keyWithoutPrefix.toLowerCase())) {
      violations.push(SecurityViolationType.INVALID_PRIVATE_KEY);
      details.push('Private key appears to have low entropy');
    }
    
    return {
      isValid: violations.length === 0,
      violations,
      details
    };
    
  } catch (error: any) {
    violations.push(SecurityViolationType.INVALID_PRIVATE_KEY);
    details.push(`Private key validation error: ${error.message}`);
    return { isValid: false, violations, details };
  }
}

/**
 * Validate wallet balance meets security requirements
 */
export function validateWalletBalance(balanceEth: string): {
  isSufficient: boolean;
  violations: SecurityViolationType[];
  details: string[];
} {
  const violations: SecurityViolationType[] = [];
  const details: string[] = [];
  
  try {
    const balance = parseFloat(balanceEth);
    
    if (isNaN(balance) || balance < 0) {
      violations.push(SecurityViolationType.INSUFFICIENT_BALANCE);
      details.push('Invalid wallet balance');
      return { isSufficient: false, violations, details };
    }
    
    if (balance < SECURITY_CONSTANTS.MIN_WALLET_BALANCE) {
      violations.push(SecurityViolationType.INSUFFICIENT_BALANCE);
      details.push(`Wallet balance (${balance} ETH) is below minimum required (${SECURITY_CONSTANTS.MIN_WALLET_BALANCE} ETH)`);
    }
    
    return {
      isSufficient: violations.length === 0,
      violations,
      details
    };
    
  } catch (error: any) {
    violations.push(SecurityViolationType.INSUFFICIENT_BALANCE);
    details.push(`Balance validation error: ${error.message}`);
    return { isSufficient: false, violations, details };
  }
}

/**
 * Check for suspicious IP address patterns
 */
export function validateIPAddressSecurity(ipAddress: string, walletAddress: string): {
  isTrusted: boolean;
  violations: SecurityViolationType[];
  details: string[];
} {
  const violations: SecurityViolationType[] = [];
  const details: string[] = [];
  
  try {
    // Check if IP is in trusted ranges (for development)
    const isTrustedRange = SECURITY_CONSTANTS.TRUSTED_IP_RANGES.some(range => {
      // Simple check for localhost and common private ranges
      return ipAddress.startsWith('127.') || 
             ipAddress.startsWith('192.168.') || 
             ipAddress.startsWith('10.') || 
             ipAddress.startsWith('172.');
    });
    
    if (!isTrustedRange) {
      // In production, you might want to be more restrictive
      console.warn(`Admin login from non-local IP: ${ipAddress}`);
    }
    
    // Track IP address history for anomaly detection
    const history = ipAddressHistory.get(ipAddress) || [];
    const now = Date.now();
    
    // Clean old entries (older than 24 hours)
    const recentHistory = history.filter(entry => now - entry.lastSeen < 24 * 60 * 60 * 1000);
    
    // Check if this wallet has been used from this IP before
    const existingEntry = recentHistory.find(entry => entry.walletAddress === walletAddress);
    
    if (existingEntry) {
      existingEntry.lastSeen = now;
      existingEntry.count++;
    } else {
      recentHistory.push({
        walletAddress,
        lastSeen: now,
        count: 1
      });
    }
    
    // Check for suspicious patterns
    const uniqueWallets = new Set(recentHistory.map(entry => entry.walletAddress));
    if (uniqueWallets.size > 5) {
      violations.push(SecurityViolationType.SUSPICIOUS_IP);
      details.push(`Too many different wallets used from this IP address: ${uniqueWallets.size}`);
    }
    
    // Update history
    ipAddressHistory.set(ipAddress, recentHistory);
    
    return {
      isTrusted: violations.length === 0,
      violations,
      details
    };
    
  } catch (error: any) {
    violations.push(SecurityViolationType.SUSPICIOUS_IP);
    details.push(`IP validation error: ${error.message}`);
    return { isTrusted: false, violations, details };
  }
}

/**
 * Rate limiting for wallet authentication attempts
 */
export function checkWalletRateLimit(walletAddress: string): {
  allowed: boolean;
  violations: SecurityViolationType[];
  details: string[];
  remainingTime?: number;
} {
  const violations: SecurityViolationType[] = [];
  const details: string[] = [];
  const now = Date.now();
  
  const limit = walletRateLimits.get(walletAddress);
  
  if (!limit || now > limit.resetTime) {
    // Reset or create new limit
    walletRateLimits.set(walletAddress, {
      attempts: 1,
      resetTime: now + SECURITY_CONSTANTS.RATE_LIMIT_WINDOW
    });
    return { allowed: true, violations, details };
  }
  
  if (limit.attempts >= SECURITY_CONSTANTS.MAX_AUTH_ATTEMPTS) {
    violations.push(SecurityViolationType.RATE_LIMIT_EXCEEDED);
    const remainingTime = Math.ceil((limit.resetTime - now) / 1000);
    details.push(`Rate limit exceeded. Try again in ${remainingTime} seconds`);
    
    return {
      allowed: false,
      violations,
      details,
      remainingTime
    };
  }
  
  limit.attempts++;
  return { allowed: true, violations, details };
}

/**
 * Comprehensive security validation for wallet authentication
 */
export function validateWalletAuthSecurity(
  privateKey: string,
  walletAddress: string,
  balanceEth: string,
  req: Request
): {
  isSecure: boolean;
  violations: SecurityViolationType[];
  details: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const allViolations: SecurityViolationType[] = [];
  const allDetails: string[] = [];
  let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // 1. Private key validation
  const keyValidation = validatePrivateKeySecurity(privateKey);
  allViolations.push(...keyValidation.violations);
  allDetails.push(...keyValidation.details);
  
  // 2. Balance validation
  const balanceValidation = validateWalletBalance(balanceEth);
  allViolations.push(...balanceValidation.violations);
  allDetails.push(...balanceValidation.details);
  
  // 3. IP address validation
  const ipValidation = validateIPAddressSecurity(clientIP, walletAddress);
  allViolations.push(...ipValidation.violations);
  allDetails.push(...ipValidation.details);
  
  // 4. Rate limiting
  const rateLimitValidation = checkWalletRateLimit(walletAddress);
  allViolations.push(...rateLimitValidation.violations);
  allDetails.push(...rateLimitValidation.details);
  
  // Determine severity
  if (allViolations.includes(SecurityViolationType.INVALID_PRIVATE_KEY)) {
    maxSeverity = 'critical';
  } else if (allViolations.includes(SecurityViolationType.UNAUTHORIZED_WALLET)) {
    maxSeverity = 'high';
  } else if (allViolations.includes(SecurityViolationType.RATE_LIMIT_EXCEEDED) || 
             allViolations.includes(SecurityViolationType.SUSPICIOUS_IP)) {
    maxSeverity = 'medium';
  } else if (allViolations.includes(SecurityViolationType.INSUFFICIENT_BALANCE)) {
    maxSeverity = 'low';
  }
  
  // Log security audit entry
  if (allViolations.length > 0) {
    logSecurityAudit({
      timestamp: new Date().toISOString(),
      violationType: allViolations[0], // Primary violation
      walletAddress,
      ipAddress: clientIP,
      userAgent,
      details: allDetails.join('; '),
      severity: maxSeverity,
      blocked: maxSeverity === 'critical' || maxSeverity === 'high'
    });
  }
  
  return {
    isSecure: allViolations.length === 0,
    violations: allViolations,
    details: allDetails,
    severity: maxSeverity
  };
}

/**
 * Log security audit entry
 */
export function logSecurityAudit(entry: SecurityAuditLog): void {
  securityAuditLogs.push(entry);
  
  // Log to console for development
  const severityEmoji = {
    low: '🟡',
    medium: '🟠', 
    high: '🔴',
    critical: '🚨'
  };
  
  console.log(`${severityEmoji[entry.severity]} Security Audit: ${entry.violationType}`);
  console.log(`  Wallet: ${entry.walletAddress || 'N/A'}`);
  console.log(`  IP: ${entry.ipAddress}`);
  console.log(`  Details: ${entry.details}`);
  console.log(`  Blocked: ${entry.blocked}`);
  
  // In production, send to security monitoring system
  if (entry.severity === 'critical' || entry.severity === 'high') {
    // Alert security team
    console.error(`🚨 CRITICAL SECURITY VIOLATION: ${entry.details}`);
  }
}

/**
 * Get security audit logs (for admin dashboard)
 */
export function getSecurityAuditLogs(limit = 100): SecurityAuditLog[] {
  return securityAuditLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Generate security report for admin dashboard
 */
export function generateSecurityReport(): {
  totalViolations: number;
  violationsByType: Record<SecurityViolationType, number>;
  severityDistribution: Record<'low' | 'medium' | 'high' | 'critical', number>;
  blockedAttempts: number;
  recentViolations: SecurityAuditLog[];
} {
  const report = {
    totalViolations: securityAuditLogs.length,
    violationsByType: {} as Record<SecurityViolationType, number>,
    severityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
    blockedAttempts: 0,
    recentViolations: getSecurityAuditLogs(10)
  };
  
  // Initialize violation type counts
  Object.values(SecurityViolationType).forEach(type => {
    report.violationsByType[type] = 0;
  });
  
  // Calculate statistics
  securityAuditLogs.forEach(log => {
    report.violationsByType[log.violationType]++;
    report.severityDistribution[log.severity]++;
    if (log.blocked) {
      report.blockedAttempts++;
    }
  });
  
  return report;
}

/**
 * Clear old audit logs (for maintenance)
 */
export function cleanupSecurityAuditLogs(maxAge = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAge;
  const initialLength = securityAuditLogs.length;
  
  // Remove old logs
  const filteredLogs = securityAuditLogs.filter(log => 
    new Date(log.timestamp).getTime() > cutoff
  );
  
  securityAuditLogs.length = 0;
  securityAuditLogs.push(...filteredLogs);
  
  const removed = initialLength - securityAuditLogs.length;
  if (removed > 0) {
    console.log(`🧹 Cleaned up ${removed} old security audit logs`);
  }
  
  return removed;
}

// Auto-cleanup every 24 hours
setInterval(() => {
  cleanupSecurityAuditLogs();
}, 24 * 60 * 60 * 1000);
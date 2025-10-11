import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthTokenPayload, SecurityConfig, PasswordRequirements } from '../../shared/types';

// Security configuration
export const SECURITY_CONFIG: SecurityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    expiresIn: '24h', // Tourist tokens last 24 hours
    refreshExpiresIn: '7d',
  },
  password: {
    saltRounds: 12,
    requirements: {
      minLength: 6, // 6 for tourists, 8+ for admins
      requireSpecialChar: false,
      requireNumber: false,
      requireUppercase: false,
      requireLowercase: false,
    },
  },
  session: {
    maxFailedAttempts: 3,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    maxSessions: 5,
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  },
};

// Admin JWT expires in 8 hours
export const ADMIN_JWT_EXPIRES = '8h';

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SECURITY_CONFIG.password.saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<AuthTokenPayload, 'iat' | 'exp'>, isAdmin = false): string {
  const expiresIn = isAdmin ? ADMIN_JWT_EXPIRES : SECURITY_CONFIG.jwt.expiresIn;
  return signJwt(payload, SECURITY_CONFIG.jwt.secret, {
    expiresIn,
    issuer: 'yatrarakshak',
    audience: 'yatrarakshak-users'
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string): string {
  return signJwt(
    { userId, type: 'refresh' },
    SECURITY_CONFIG.jwt.secret,
    {
      expiresIn: SECURITY_CONFIG.jwt.refreshExpiresIn,
      issuer: 'yatrarakshak',
      audience: 'yatrarakshak-refresh'
    }
  );
}

/**
 * Small typed wrapper around jwt.sign to keep the cast localized and provide SignOptions typing.
 */
function signJwt(payload: unknown, secret: string, options?: any): string {
  // jwt.sign has complex overloads across versions; keep a single controlled cast here.
  const safeOptions = options ? { ...options, expiresIn: (options as any).expiresIn as any } : undefined;
  return jwt.sign(payload as unknown as jwt.JwtPayload, secret, safeOptions) as string;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, SECURITY_CONFIG.jwt.secret, {
      issuer: 'yatrarakshak',
      audience: 'yatrarakshak-users'
    }) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): { userId: string; type: string } | null {
  try {
    return jwt.verify(token, SECURITY_CONFIG.jwt.secret, {
      issuer: 'yatrarakshak',
      audience: 'yatrarakshak-refresh'
    }) as { userId: string; type: string };
  } catch (error) {
    return null;
  }
}

/**
 * Generate special login ID for tourists
 */
export function generateSpecialLoginId(): string {
  const prefix = 'YR';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Validate special login ID format
 */
export function isValidSpecialLoginId(specialId: string): boolean {
  // Format: YR + timestamp(base36) + random(8 hex chars)
  const pattern = /^YR[0-9A-Z]{6,}[0-9A-F]{8}$/;
  return pattern.test(specialId);
}

/**
 * Validate password requirements
 */
export function validatePassword(password: string, isAdmin = false): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const minLength = isAdmin ? 8 : SECURITY_CONFIG.password.requirements.minLength;
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (isAdmin) {
    // Stricter requirements for admins
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Aadhaar number
 */
export function validateAadhaar(aadhaar: string): boolean {
  // Remove spaces and check if it's 12 digits
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
}

/**
 * Validate passport number (basic format)
 */
export function validatePassport(passport: string): boolean {
  // Basic passport format: 1-2 letters followed by 6-8 numbers
  const cleaned = passport.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{1,2}\d{6,8}$/.test(cleaned);
}

/**
 * Validate phone number (Indian format)
 */
export function validatePhone(phone: string): boolean {
  // Indian phone number: 10 digits, optionally with +91 or 0 prefix
  const cleaned = phone.replace(/\s|-/g, '');
  return /^(\+91|91|0)?[6789]\d{9}$/.test(cleaned);
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Generate secure random string
 */
export function generateSecureRandom(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (for development use only)
 */
export function hashSensitiveData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create audit log entry
 */
export function createAuditLogEntry(
  adminId: string,
  action: string,
  targetUserId?: string,
  notes?: string,
  ipAddress?: string
): {
  logId: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  notes?: string;
  timestamp: string;
  ipAddress?: string;
} {
  return {
    logId: generateSecureRandom(16),
    adminId,
    action,
    targetUserId,
    notes,
    timestamp: new Date().toISOString(),
    ipAddress,
  };
}

/**
 * Extract IP address from request
 */
export function getClientIP(req: any): string {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         'unknown';
}

/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(ip: string, identifier?: string): string {
  return identifier ? `${ip}:${identifier}` : ip;
}
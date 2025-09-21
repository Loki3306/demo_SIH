import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken } from './security';
import { Admin, Tourist, Police } from '../../shared/types';

// Simple in-memory stores (replace with database in production)
let admins: Admin[] = [];
let tourists: Tourist[] = [];
let police: Police[] = [];

// Rate limiting store
const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Failed login attempts store
const failedLogins = new Map<string, { attempts: number; lockoutUntil: number }>();

// Security headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
}

// CORS middleware
export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}

// Rate limiting middleware
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.connection.remoteAddress || '';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100;

  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 0, resetTime: now + windowMs });
  }

  const rateLimitInfo = rateLimits.get(ip)!;

  if (now > rateLimitInfo.resetTime) {
    rateLimitInfo.count = 0;
    rateLimitInfo.resetTime = now + windowMs;
  }

  rateLimitInfo.count++;

  if (rateLimitInfo.count > maxRequests) {
    return res.status(429).json({ error: 'too_many_requests', message: 'Too many requests, please try again later' });
  }

  next();
}

// JWT Authentication middleware
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'access_denied', message: 'Access token required' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'invalid_token', message: 'Invalid or expired token' });
  }

  // Attach decoded payload to request
  (req as any).auth = payload;
  next();
}

// Role-based authorization middleware
export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).auth?.role;
    
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'insufficient_permissions', 
        message: 'Insufficient permissions for this operation' 
      });
    }
    
    next();
  };
}

// Ownership verification middleware
export function requireOwnership(paramName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).auth?.userId;
    const paramUserId = req.params[paramName];
    
    if (!userId || userId !== paramUserId) {
      return res.status(403).json({ 
        error: 'access_denied', 
        message: 'You do not have permission to access this resource' 
      });
    }
    
    next();
  };
}

// Validate special ID middleware
export function validateSpecialId(req: Request, res: Response, next: NextFunction) {
  const { specialLoginId } = req.body;
  
  if (!specialLoginId) {
    return res.status(400).json({ 
      error: 'missing_special_id', 
      message: 'Special login ID is required' 
    });
  }
  
  // In a real implementation, you would validate the special ID format here
  next();
}

// Track failed login attempts
export function trackFailedLogin(identifier: string) {
  const now = Date.now();
  const lockoutDuration = 30 * 60 * 1000; // 30 minutes
  const maxAttempts = 5;
  
  if (!failedLogins.has(identifier)) {
    failedLogins.set(identifier, { attempts: 0, lockoutUntil: 0 });
  }
  
  const loginInfo = failedLogins.get(identifier)!;
  
  if (now < loginInfo.lockoutUntil) {
    // Still locked out
    return;
  }
  
  loginInfo.attempts++;
  
  if (loginInfo.attempts >= maxAttempts) {
    loginInfo.lockoutUntil = now + lockoutDuration;
  }
}

// Reset failed login attempts
export function resetFailedLogin(identifier: string) {
  failedLogins.delete(identifier);
}

// Check if account is locked
export function isAccountLocked(identifier: string) {
  const loginInfo = failedLogins.get(identifier);
  
  if (!loginInfo) {
    return { locked: false, remainingTime: 0 };
  }
  
  const now = Date.now();
  
  if (now < loginInfo.lockoutUntil) {
    return { locked: true, remainingTime: loginInfo.lockoutUntil - now };
  }
  
  return { locked: false, remainingTime: 0 };
}

// Set data functions for integration with main server
export function setAuthData(adminData: Admin[], touristData: Tourist[], policeData: Police[]) {
  admins = adminData;
  tourists = touristData;
  police = policeData;
}

// Wallet-based authentication middleware
export function requireWalletAuth(req: Request, res: Response, next: NextFunction) {
  // Implementation would verify wallet signature
  // For now, we'll just pass through
  next();
}

// Admin wallet authentication middleware
export function requireAdminWallet(req: Request, res: Response, next: NextFunction) {
  // Implementation would verify admin wallet authorization
  // For now, we'll just pass through
  next();
}

// Blockchain authentication middleware
export function requireBlockchainAuth(req: Request, res: Response, next: NextFunction) {
  // Implementation would verify blockchain-based authentication
  // For now, we'll just pass through
  next();
}

// Session timeout check
export function checkSessionTimeout(req: Request, res: Response, next: NextFunction) {
  const auth = (req as any).auth;
  
  if (auth && auth.exp) {
    const now = Math.floor(Date.now() / 1000);
    
    if (now >= auth.exp) {
      return res.status(401).json({ 
        error: 'session_expired', 
        message: 'Your session has expired. Please log in again.' 
      });
    }
  }
  
  next();
}

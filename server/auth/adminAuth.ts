import { Request, Response } from 'express';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  generateRefreshToken,
  generateSpecialLoginId,
  validatePassword,
  validateEmail,
  validatePhone,
  validateAadhaar,
  validatePassport,
  sanitizeString,
  createAuditLogEntry,
  getClientIP
} from './security';
import { 
  Admin, 
  Tourist,
  AdminLoginRequest,
  TouristRegistrationRequest,
  AuthResponse,
  AuditLogEntry,
  PaginatedResponse,
  BlockchainHealth,
  AdminDashboardMetrics
} from '../../shared/types';
import { trackFailedLogin, resetFailedLogin, isAccountLocked } from './middleware';
import {
  validatePrivateKey,
  validateAdminAuthority,
  checkWalletBalance,
  getBlockchainHealth,
  createPrivateKeyHash,
  verifyPrivateKeyHash,
  createAuthSession,
  validateAuthSession,
  revokeAuthSession,
  getAdminSessions
} from './walletAuth';
import {
  validateWalletAuthSecurity,
  SecurityViolationType,
  logSecurityAudit,
  generateSecurityReport
} from './walletSecurity';

// In-memory stores (replace with database in production)
let admins: Admin[] = [];
let tourists: Tourist[] = [];
let auditLogs: AuditLogEntry[] = [];

// Initialize default admin (for development)
export async function initializeDefaultAdmin() {
  if (admins.length === 0) {
    // Traditional password-based admin
    const defaultAdmin: Admin = {
      _id: 'admin_001',
      name: 'System Administrator',
      email: 'admin@yatrarakshak.com',
      passwordHash: await hashPassword('admin123'), // Change in production
      role: 'admin',
      createdAt: new Date().toISOString(),
      isActive: true,
      authType: 'password'
    };
    
    admins.push(defaultAdmin);
    
    // Add wallet-based admin if ADMIN_PRIVATE_KEY is available
    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (adminPrivateKey) {
      try {
        const Web3 = require('web3');
        const web3 = new Web3();
        const account = web3.eth.accounts.privateKeyToAccount(adminPrivateKey);
        
        const walletAdmin: Admin = {
          _id: 'admin_wallet_001',
          name: 'Blockchain Administrator',
          email: 'blockchain.admin@yatrarakshak.com',
          role: 'senior_admin',
          createdAt: new Date().toISOString(),
          isActive: true,
          authType: 'wallet',
          walletAddress: account.address,
          privateKeyHash: createPrivateKeyHash(adminPrivateKey),
          blockchainRole: 'authority',
          permissions: ['create_tourist', 'approve_tourist', 'manage_admins', 'blockchain_operations']
        };
        
        admins.push(walletAdmin);
        console.log(`✅ Wallet-based admin initialized: ${account.address}`);
        
      } catch (error: any) {
        console.warn('⚠️  Failed to initialize wallet-based admin:', error.message);
      }
    }
  }
}

/**
 * Enhanced admin login supporting both password and wallet authentication
 */
export async function adminLogin(req: Request, res: Response) {
  try {
    const { 
      email, 
      password, 
      walletPrivateKey, 
      walletAddress, 
      authType 
    }: AdminLoginRequest = req.body;
    const clientIP = getClientIP(req);
    
    // Input validation
    if (!authType || !['password', 'wallet'].includes(authType)) {
      return res.status(400).json({
        error: 'invalid_auth_type',
        message: 'Authentication type must be either "password" or "wallet"'
      });
    }
    
    // Handle password-based authentication
    if (authType === 'password') {
      return await handlePasswordAuth(req, res, email, password, clientIP);
    }
    
    // Handle wallet-based authentication
    if (authType === 'wallet') {
      return await handleWalletAuth(req, res, walletPrivateKey, walletAddress, clientIP);
    }
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      error: 'login_failed',
      message: 'Login failed due to server error'
    });
  }
}

/**
 * Handle password-based authentication
 */
async function handlePasswordAuth(
  req: Request, 
  res: Response, 
  email?: string, 
  password?: string, 
  clientIP?: string
) {
  if (!email || !password) {
    return res.status(400).json({
      error: 'missing_credentials',
      message: 'Email and password are required for password authentication'
    });
  }
  
  if (!validateEmail(email)) {
    return res.status(400).json({
      error: 'invalid_email',
      message: 'Invalid email format'
    });
  }
  
  // Check for account lockout
  const lockStatus = isAccountLocked(email);
  if (lockStatus.locked) {
    return res.status(423).json({
      error: 'account_locked',
      message: 'Account temporarily locked due to too many failed attempts',
      remainingTime: lockStatus.remainingTime
    });
  }
  
  // Find admin by email
  const admin = admins.find(a => 
    a.email.toLowerCase() === email.toLowerCase() && 
    ['password', 'hybrid'].includes(a.authType)
  );
  
  if (!admin || !admin.passwordHash) {
    trackFailedLogin(email);
    return res.status(401).json({
      error: 'invalid_credentials',
      message: 'Invalid email or password'
    });
  }
  
  // Check if admin is active
  if (!admin.isActive) {
    return res.status(403).json({
      error: 'account_disabled',
      message: 'Admin account is disabled'
    });
  }
  
  // Verify password
  const isPasswordValid = await verifyPassword(password, admin.passwordHash);
  
  if (!isPasswordValid) {
    trackFailedLogin(email);
    return res.status(401).json({
      error: 'invalid_credentials',
      message: 'Invalid email or password'
    });
  }
  
  // Reset failed login attempts on successful login
  resetFailedLogin(email);
  
  return await finalizeAuthentication(admin, clientIP || '', req.get('User-Agent') || '', res);
}

/**
 * Handle wallet-based authentication
 */
async function handleWalletAuth(
  req: Request, 
  res: Response, 
  walletPrivateKey?: string, 
  walletAddress?: string, 
  clientIP?: string
) {
  if (!walletPrivateKey) {
    return res.status(400).json({
      error: 'missing_wallet_key',
      message: 'Wallet private key is required for wallet authentication'
    });
  }
  
  // Validate private key format using comprehensive security checks
  const securityValidation = validateWalletAuthSecurity(
    walletPrivateKey,
    '', // Will be set after derivation
    '0', // Balance will be checked later
    req
  );
  
  // Check for critical security violations
  if (securityValidation.violations.includes(SecurityViolationType.INVALID_PRIVATE_KEY)) {
    return res.status(400).json({
      error: 'invalid_private_key',
      message: securityValidation.details.join('; '),
      severity: securityValidation.severity
    });
  }
  
  // Additional basic validation as fallback
  const keyValidation = validatePrivateKey(walletPrivateKey);
  if (!keyValidation.isValid) {
    return res.status(400).json({
      error: 'invalid_private_key',
      message: keyValidation.error
    });
  }
  
  // Derive wallet address from private key
  let derivedAddress: string;
  try {
    const Web3 = require('web3');
    const web3 = new Web3();
    const account = web3.eth.accounts.privateKeyToAccount(walletPrivateKey);
    derivedAddress = account.address;
  } catch (error: any) {
    return res.status(400).json({
      error: 'key_derivation_failed',
      message: 'Failed to derive wallet address from private key'
    });
  }
  
  // Check if provided address matches derived address
  if (walletAddress && walletAddress.toLowerCase() !== derivedAddress.toLowerCase()) {
    return res.status(400).json({
      error: 'address_mismatch',
      message: 'Provided wallet address does not match private key'
    });
  }
  
  // Find admin by wallet address
  const admin = admins.find(a => 
    a.walletAddress?.toLowerCase() === derivedAddress.toLowerCase() && 
    ['wallet', 'hybrid'].includes(a.authType)
  );
  
  if (!admin) {
    return res.status(401).json({
      error: 'wallet_not_authorized',
      message: 'Wallet address is not authorized for admin access'
    });
  }
  
  // Check if admin is active
  if (!admin.isActive) {
    return res.status(403).json({
      error: 'account_disabled',
      message: 'Admin account is disabled'
    });
  }
  
  // Verify private key against stored hash
  if (admin.privateKeyHash && !verifyPrivateKeyHash(walletPrivateKey, admin.privateKeyHash)) {
    return res.status(401).json({
      error: 'invalid_private_key',
      message: 'Invalid private key for this wallet address'
    });
  }
  
  // Validate admin authority on blockchain
  const authorityCheck = await validateAdminAuthority(derivedAddress);
  if (!authorityCheck.isAuthorized) {
    return res.status(403).json({
      error: 'insufficient_authority',
      message: 'Wallet does not have admin authority on blockchain',
      details: authorityCheck.error
    });
  }
  
  // Check wallet balance with comprehensive security validation
  const balanceCheck = await checkWalletBalance(derivedAddress);
  
  // Re-run security validation with actual wallet address and balance
  const finalSecurityValidation = validateWalletAuthSecurity(
    walletPrivateKey,
    derivedAddress,
    balanceCheck.balanceEth,
    req
  );
  
  // Check for any security violations
  if (!finalSecurityValidation.isSecure) {
    // Log security violations but continue if not critical
    if (finalSecurityValidation.severity === 'critical' || finalSecurityValidation.severity === 'high') {
      return res.status(403).json({
        error: 'security_violation',
        message: 'Wallet authentication blocked due to security concerns',
        violations: finalSecurityValidation.violations,
        severity: finalSecurityValidation.severity
      });
    } else {
      // Log warnings but allow authentication
      console.warn(`⚠️  Security warnings for wallet ${derivedAddress}:`, finalSecurityValidation.details);
    }
  }
  
  if (!balanceCheck.sufficient) {
    // Warning but allow login for development
    console.warn(`⚠️  Low wallet balance for admin ${derivedAddress}: ${balanceCheck.balanceEth} ETH`);
  }
  
  return await finalizeAuthentication(admin, clientIP || '', req.get('User-Agent') || '', res, {
    walletAddress: derivedAddress,
    balance: balanceCheck.balanceEth,
    authorityRole: authorityCheck.role
  });
}

/**
 * Finalize authentication process for both password and wallet auth
 */
async function finalizeAuthentication(
  admin: Admin, 
  clientIP: string, 
  userAgent: string, 
  res: Response,
  walletInfo?: {
    walletAddress: string;
    balance: string;
    authorityRole?: string;
  }
) {
  // Create authentication session
  const session = createAuthSession(admin, clientIP, userAgent);
  
  // Update last login
  admin.lastLogin = new Date().toISOString();
  
  // Create audit log entry
  const loginType = admin.authType === 'wallet' ? 'wallet_login' : 'password_login';
  const logMessage = admin.authType === 'wallet' 
    ? `Admin wallet login from ${walletInfo?.walletAddress} (IP: ${clientIP})` 
    : `Admin login from IP: ${clientIP}`;
  
  const auditEntry = createAuditLogEntry(
    admin._id,
    loginType,
    undefined,
    logMessage,
    clientIP
  );
  auditLogs.push(auditEntry);
  
  // Prepare user data (exclude sensitive information)
  const { passwordHash, privateKeyHash, ...adminProfile } = admin;
  
  const response: AuthResponse = {
    token: session.jwtToken,
    sessionId: session.sessionId,
    role: 'admin',
    userId: admin._id,
    user: {
      ...adminProfile,
      walletInfo: walletInfo ? {
        address: walletInfo.walletAddress,
        balance: walletInfo.balance,
        authorityRole: walletInfo.authorityRole
      } : undefined
    }
  };
  
  res.json(response);
}

/**
 * Get blockchain health status for admin dashboard
 */
export async function getAdminBlockchainHealth(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const health = await getBlockchainHealth();
    res.json(health);
    
  } catch (error) {
    console.error('Blockchain health check error:', error);
    res.status(500).json({
      error: 'health_check_failed',
      message: 'Failed to check blockchain health'
    });
  }
}

/**
 * Get admin dashboard metrics including blockchain stats
 */
export async function getAdminDashboardMetrics(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    // Calculate basic metrics
    const totalPending = tourists.filter(t => t.verificationStatus === 'pending').length;
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const applicationsToday = tourists.filter(t => {
      const appDate = new Date(t.applicationDate || t.createdAt || 0);
      return appDate >= startOfDay;
    }).length;
    
    const verifiedTourists = tourists.filter(t => t.verificationStatus === 'verified');
    const verificationRate = tourists.length > 0 ? 
      Math.round((verifiedTourists.length / tourists.length) * 100) : 0;
    
    const activeDigitalIDs = verifiedTourists.filter(t => t.blockchainId && t.blockchainStatus === 'created').length;
    
    // Get blockchain health
    const systemHealth = await getBlockchainHealth();
    
    // Calculate average processing time (simplified)
    let averageProcessingTime = 0;
    const processedTourists = tourists.filter(t => 
      t.verificationStatus !== 'pending' && t.verificationDate && t.applicationDate
    );
    
    if (processedTourists.length > 0) {
      const totalProcessingTime = processedTourists.reduce((sum, tourist) => {
        const applied = new Date(tourist.applicationDate!).getTime();
        const processed = new Date(tourist.verificationDate!).getTime();
        return sum + (processed - applied);
      }, 0);
      
      averageProcessingTime = Math.round(totalProcessingTime / processedTourists.length / (1000 * 60 * 60)); // in hours
    }
    
    const metrics: AdminDashboardMetrics = {
      totalPending,
      applicationsToday,
      verificationRate,
      averageProcessingTime,
      activeDigitalIDs,
      systemHealth
    };
    
    res.json(metrics);
    
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      error: 'metrics_failed',
      message: 'Failed to fetch dashboard metrics'
    });
  }
}

/**
 * Get admin sessions (for session management)
 */
export function getAdminActiveSessions(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const sessions = getAdminSessions(adminId);
    
    // Remove sensitive information
    const safeSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      authType: session.authType,
      walletAddress: session.walletAddress
    }));
    
    res.json({
      sessions: safeSessions,
      total: safeSessions.length
    });
    
  } catch (error) {
    console.error('Get admin sessions error:', error);
    res.status(500).json({
      error: 'sessions_fetch_failed',
      message: 'Failed to fetch admin sessions'
    });
  }
}

/**
 * Revoke admin session
 */
export function revokeAdminSession(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    const { sessionId } = req.params;
    const clientIP = getClientIP(req);
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'missing_session_id',
        message: 'Session ID is required'
      });
    }
    
    // Verify session belongs to admin
    const session = validateAuthSession(sessionId);
    if (!session || session.adminId !== adminId) {
      return res.status(404).json({
        error: 'session_not_found',
        message: 'Session not found or does not belong to admin'
      });
    }
    
    // Revoke session
    const revoked = revokeAuthSession(sessionId);
    
    if (revoked) {
      // Create audit log entry
      const auditEntry = createAuditLogEntry(
        adminId,
        'session_revoked',
        undefined,
        `Admin session ${sessionId} revoked from IP: ${clientIP}`,
        clientIP
      );
      auditLogs.push(auditEntry);
      
      res.json({
        success: true,
        message: 'Session revoked successfully'
      });
    } else {
      res.status(404).json({
        error: 'session_not_found',
        message: 'Session not found'
      });
    }
    
  } catch (error) {
    console.error('Revoke admin session error:', error);
    res.status(500).json({
      error: 'session_revoke_failed',
      message: 'Failed to revoke session'
    });
  }
}

/**
 * Get security audit report for admin dashboard
 */
export function getSecurityAuditReport(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const securityReport = generateSecurityReport();
    res.json(securityReport);
    
  } catch (error) {
    console.error('Security audit report error:', error);
    res.status(500).json({
      error: 'security_report_failed',
      message: 'Failed to generate security report'
    });
  }
}

/**
 * Create tourist profile (admin only)
 */
export async function createTouristProfile(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    const clientIP = getClientIP(req);
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const {
      name,
      email,
      phone,
      password,
      itinerary,
      emergencyName,
      emergencyPhone,
      documentType,
      documentNumber,
      documentFileName
    }: TouristRegistrationRequest = req.body;
    
    // Input validation
    if (!name || !email || !phone || !documentType || !documentNumber) {
      return res.status(400).json({
        error: 'missing_required_fields',
        message: 'Name, email, phone, document type, and document number are required'
      });
    }
    
    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'invalid_email',
        message: 'Invalid email format'
      });
    }
    
    if (!validatePhone(phone)) {
      return res.status(400).json({
        error: 'invalid_phone',
        message: 'Invalid phone number format'
      });
    }
    
    // Validate document number based on type
    if (documentType === 'aadhaar' && !validateAadhaar(documentNumber)) {
      return res.status(400).json({
        error: 'invalid_aadhaar',
        message: 'Invalid Aadhaar number format'
      });
    }
    
    if (documentType === 'passport' && !validatePassport(documentNumber)) {
      return res.status(400).json({
        error: 'invalid_passport',
        message: 'Invalid passport number format'
      });
    }
    
    // Check for existing email
    const existingTourist = tourists.find(t => t.email.toLowerCase() === email.toLowerCase());
    if (existingTourist) {
      return res.status(409).json({
        error: 'email_exists',
        message: 'Email already registered'
      });
    }
    
    // Validate password if provided
    let passwordHash: string | undefined;
    if (password) {
      const passwordValidation = validatePassword(password, false);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'invalid_password',
          message: 'Password does not meet requirements',
          details: passwordValidation.errors
        });
      }
      passwordHash = await hashPassword(password);
    }
    
    // Generate unique user ID and application date
    const userId = `t${Date.now()}`;
    const applicationDate = new Date().toISOString();
    
    // Create tourist record
    const tourist: Tourist = {
      _id: userId,
      name: sanitizeString(name),
      email: email.toLowerCase(),
      phone,
      passwordHash,
      itinerary: itinerary ? sanitizeString(itinerary) : undefined,
      emergencyName: emergencyName ? sanitizeString(emergencyName) : undefined,
      emergencyPhone,
      documentType,
      documentNumber: documentNumber.replace(/\s/g, '').toUpperCase(),
      documentFileName,
      verificationStatus: 'pending',
      applicationDate,
      blockchainStatus: 'none',
      createdByAdminId: adminId,
      canLogin: false, // Cannot login until verified and special ID is generated
      history: [{
        action: 'profile_created',
        admin: adminId,
        notes: 'Tourist profile created by admin',
        timestamp: applicationDate
      }]
    };
    
    tourists.push(tourist);
    
    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      adminId,
      'create_tourist_profile',
      userId,
      `Created tourist profile for ${name} (${email})`,
      clientIP
    );
    auditLogs.push(auditEntry);
    
    res.json({
      success: true,
      userId,
      status: 'pending_verification',
      message: 'Tourist profile created successfully',
      applicationDate
    });
    
  } catch (error) {
    console.error('Create tourist profile error:', error);
    res.status(500).json({
      error: 'profile_creation_failed',
      message: 'Failed to create tourist profile'
    });
  }
}

/**
 * Get pending verifications with filtering and pagination
 */
export function getPendingVerifications(req: Request, res: Response) {
  try {
    const status = String(req.query.status || 'pending').toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(String(req.query.perPage || '10'), 10) || 10));
    
    let result: Tourist[];
    
    // Filter by status
    if (status === 'all') {
      result = tourists.slice();
    } else {
      result = tourists.filter(t => t.verificationStatus === status);
    }
    
    // Filter by search query
    if (q) {
      result = result.filter(t => {
        const name = (t.name || '').toLowerCase();
        const email = (t.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    
    // Sort by application date (newest first)
    result.sort((a, b) => {
      const dateA = new Date(a.applicationDate || 0).getTime();
      const dateB = new Date(b.applicationDate || 0).getTime();
      return dateB - dateA;
    });
    
    // Pagination
    const total = result.length;
    const start = (page - 1) * perPage;
    const paged = result.slice(start, start + perPage);
    
    // Remove sensitive data
    const sanitizedData = paged.map(tourist => {
      const { passwordHash, ...publicData } = tourist;
      return publicData;
    });
    
    const response: PaginatedResponse<Partial<Tourist>> = {
      data: sanitizedData,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({
      error: 'fetch_failed',
      message: 'Failed to fetch verifications'
    });
  }
}

/**
 * Approve tourist and generate special login ID
 */
export async function approveTourist(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    const adminId = req.auth?.userId;
    const clientIP = getClientIP(req);
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'tourist_not_found',
        message: 'Tourist not found'
      });
    }
    
    if (tourist.verificationStatus === 'verified') {
      return res.status(400).json({
        error: 'already_verified',
        message: 'Tourist is already verified'
      });
    }
    
    try {
      // Generate special login ID
      const specialLoginId = generateSpecialLoginId();
      
      // Generate password if not already set
      if (!tourist.passwordHash) {
        const tempPassword = generateSpecialLoginId().substring(0, 8); // Temporary password
        tourist.passwordHash = await hashPassword(tempPassword);
        
        // In production, send this password to tourist via secure channel
        console.log(`Temporary password for ${tourist.email}: ${tempPassword}`);
      }
      
      // Try to create blockchain ID
      const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:5002';
      const blockchainPayload = {
        userId: tourist._id,
        name: tourist.name,
        documentType: tourist.documentType,
        documentNumber: tourist.documentNumber,
        kycHash: tourist.documentFileName ? `sha256:${tourist.documentFileName}` : undefined,
        validUntil: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() // 1 year
      };
      
      let blockchainResult: any = {};
      
      try {
        const response = await fetch(`${BLOCKCHAIN_API_URL}/createID`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blockchainPayload)
        });
        
        if (response.ok) {
          blockchainResult = await response.json();
          tourist.blockchainId = blockchainResult?.blockchainId || `bc_${userId}`;
          tourist.transactionHash = blockchainResult.transactionHash;
          tourist.qrCodeData = blockchainResult.qr;
          tourist.blockchainStatus = blockchainResult.onChain ? 'created' : 'mock';
        } else {
          throw new Error(`Blockchain service returned ${response.status}`);
        }
      } catch (blockchainError: any) {
        console.warn(`Blockchain error for user ${userId}:`, blockchainError.message);
        
        // Fallback: approve without blockchain if service is unavailable
        tourist.blockchainId = `fallback_${userId}_${Date.now()}`;
        tourist.blockchainStatus = 'fallback';
      }
      
      // Update tourist record
      tourist.specialLoginId = specialLoginId;
      tourist.verificationStatus = 'verified';
      tourist.verificationDate = new Date().toISOString();
      tourist.canLogin = true;
      
      // Add to history
      tourist.history = tourist.history || [];
      tourist.history.push({
        action: 'approved',
        admin: adminId,
        notes: notes ? `${notes} (Special ID: ${specialLoginId})` : `Approved with Special ID: ${specialLoginId}`,
        timestamp: new Date().toISOString()
      });
      
      // Create audit log entry
      const auditEntry = createAuditLogEntry(
        adminId,
        'approve_tourist',
        userId,
        `Approved tourist ${tourist.name} (${tourist.email}). Special ID: ${specialLoginId}`,
        clientIP
      );
      auditLogs.push(auditEntry);
      
      res.json({
        success: true,
        specialLoginId,
        blockchainId: tourist.blockchainId,
        transactionHash: tourist.transactionHash,
        qrCode: tourist.qrCodeData,
        onChain: blockchainResult.onChain,
        fallback: tourist.blockchainStatus === 'fallback'
      });
      
    } catch (error: any) {
      console.error(`Approval error for user ${userId}:`, error.message);
      
      res.status(500).json({
        error: 'approval_failed',
        message: 'Failed to approve tourist',
        details: error.message
      });
    }
    
  } catch (error) {
    console.error('Approve tourist error:', error);
    res.status(500).json({
      error: 'approval_failed',
      message: 'Failed to approve tourist'
    });
  }
}

/**
 * Reject tourist application
 */
export function rejectTourist(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    const adminId = req.auth?.userId;
    const clientIP = getClientIP(req);
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'tourist_not_found',
        message: 'Tourist not found'
      });
    }
    
    // Update status
    tourist.verificationStatus = 'rejected';
    tourist.canLogin = false;
    
    // Add to history
    tourist.history = tourist.history || [];
    tourist.history.push({
      action: 'rejected',
      admin: adminId,
      notes: notes || 'Application rejected',
      timestamp: new Date().toISOString()
    });
    
    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      adminId,
      'reject_tourist',
      userId,
      `Rejected tourist ${tourist.name} (${tourist.email}). Reason: ${notes || 'Not specified'}`,
      clientIP
    );
    auditLogs.push(auditEntry);
    
    res.json({
      success: true,
      message: 'Tourist application rejected'
    });
    
  } catch (error) {
    console.error('Reject tourist error:', error);
    res.status(500).json({
      error: 'rejection_failed',
      message: 'Failed to reject tourist'
    });
  }
}

/**
 * Archive tourist application
 */
export function archiveTourist(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { notes } = req.body;
    const adminId = req.auth?.userId;
    const clientIP = getClientIP(req);
    
    if (!adminId) {
      return res.status(401).json({
        error: 'admin_required',
        message: 'Admin authentication required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'tourist_not_found',
        message: 'Tourist not found'
      });
    }
    
    // Update status
    tourist.verificationStatus = 'archived';
    tourist.canLogin = false;
    
    // Add to history
    tourist.history = tourist.history || [];
    tourist.history.push({
      action: 'archived',
      admin: adminId,
      notes: notes || 'Application archived',
      timestamp: new Date().toISOString()
    });
    
    // Create audit log entry
    const auditEntry = createAuditLogEntry(
      adminId,
      'archive_tourist',
      userId,
      `Archived tourist ${tourist.name} (${tourist.email})`,
      clientIP
    );
    auditLogs.push(auditEntry);
    
    res.json({
      success: true,
      message: 'Tourist application archived'
    });
    
  } catch (error) {
    console.error('Archive tourist error:', error);
    res.status(500).json({
      error: 'archive_failed',
      message: 'Failed to archive tourist'
    });
  }
}

/**
 * Get admin activity logs
 */
export function getAdminLogs(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const perPage = Math.max(1, Math.min(100, parseInt(String(req.query.perPage || '20'), 10) || 20));
    
    // Sort by timestamp (newest first)
    const sortedLogs = auditLogs.slice().sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return dateB - dateA;
    });
    
    // Pagination
    const total = sortedLogs.length;
    const start = (page - 1) * perPage;
    const paged = sortedLogs.slice(start, start + perPage);
    
    const response: PaginatedResponse<AuditLogEntry> = {
      data: paged,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage)
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      error: 'logs_fetch_failed',
      message: 'Failed to fetch admin logs'
    });
  }
}

/**
 * Admin logout
 */
export function adminLogout(req: Request, res: Response) {
  try {
    const adminId = req.auth?.userId;
    const clientIP = getClientIP(req);
    
    if (adminId) {
      // Create audit log entry
      const auditEntry = createAuditLogEntry(
        adminId,
        'admin_logout',
        undefined,
        `Admin logout from IP: ${clientIP}`,
        clientIP
      );
      auditLogs.push(auditEntry);
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      error: 'logout_failed',
      message: 'Logout failed'
    });
  }
}

// Export functions to set data (for integration with main server)
export function setAdminData(adminData: Admin[], touristData: Tourist[], auditData: AuditLogEntry[]) {
  admins = adminData;
  tourists = touristData;
  auditLogs = auditData;
}
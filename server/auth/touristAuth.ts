import { Request, Response } from 'express';
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  generateRefreshToken,
  generateSpecialLoginId,
  isValidSpecialLoginId,
  validatePassword,
  validateEmail,
  validatePhone,
  sanitizeString,
  createAuditLogEntry,
  getClientIP
} from './security';
import { 
  Tourist, 
  TouristLoginRequest, 
  TouristRegistrationRequest,
  AuthResponse,
  SpecialIdValidation,
  DigitalIdData
} from '../../shared/types';
import { trackFailedLogin, resetFailedLogin, isAccountLocked } from './middleware';

// In-memory stores (replace with database in production)
let tourists: Tourist[] = [];
let adminLogs: any[] = [];

// Load seed data function (should be imported from main server)
function loadTouristData(): Tourist[] {
  // This would be imported from the main server module
  // For now, return empty array
  return [];
}

/**
 * Tourist login with special ID
 */
export async function touristLogin(req: Request, res: Response) {
  try {
    const { specialId, password }: TouristLoginRequest = req.body;
    const clientIP = getClientIP(req);
    
    // Input validation
    if (!specialId || !password) {
      return res.status(400).json({
        error: 'missing_credentials',
        message: 'Special ID and password are required'
      });
    }
    
    // Validate special ID format
    if (!isValidSpecialLoginId(specialId)) {
      return res.status(400).json({
        error: 'invalid_special_id_format',
        message: 'Invalid special ID format'
      });
    }
    
    // Check for account lockout
    const lockStatus = isAccountLocked(specialId);
    if (lockStatus.locked) {
      return res.status(423).json({
        error: 'account_locked',
        message: 'Account temporarily locked due to too many failed attempts',
        remainingTime: lockStatus.remainingTime
      });
    }
    
    // Find tourist by special ID
    const tourist = tourists.find(t => t.specialLoginId === specialId);
    
    if (!tourist) {
      trackFailedLogin(specialId);
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid special ID or password'
      });
    }
    
    // Check if account is verified
    if (tourist.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'account_not_verified',
        message: 'Account is still under review. Please contact admin.',
        status: tourist.verificationStatus
      });
    }
    
    // Check if login is enabled
    if (!tourist.canLogin) {
      return res.status(403).json({
        error: 'login_disabled',
        message: 'Login is disabled for this account. Please contact admin.'
      });
    }
    
    // Verify password
    if (!tourist.passwordHash) {
      return res.status(500).json({
        error: 'password_not_set',
        message: 'Password not configured. Please contact admin.'
      });
    }
    
    const isPasswordValid = await verifyPassword(password, tourist.passwordHash);
    
    if (!isPasswordValid) {
      trackFailedLogin(specialId);
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Invalid special ID or password'
      });
    }
    
    // Reset failed login attempts on successful login
    resetFailedLogin(specialId);
    
    // Generate tokens
    const token = generateToken({
      userId: tourist._id,
      role: 'tourist',
      specialLoginId: specialId
    });
    
    const refreshToken = generateRefreshToken(tourist._id);
    
    // Update last login (in production, update database)
    tourist.history = tourist.history || [];
    tourist.history.push({
      action: 'login',
      admin: 'system',
      notes: `Login from IP: ${clientIP}`,
      timestamp: new Date().toISOString()
    });
    
    // Prepare user data (exclude sensitive information)
    const { passwordHash, ...userProfile } = tourist;
    
    const response: AuthResponse = {
      token,
      refreshToken,
      role: 'tourist',
      userId: tourist._id,
      specialLoginId: specialId,
      user: userProfile
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Tourist login error:', error);
    res.status(500).json({
      error: 'login_failed',
      message: 'Login failed due to server error'
    });
  }
}

/**
 * Validate special ID (check if exists and account status)
 */
export function validateSpecialIdEndpoint(req: Request, res: Response) {
  try {
    const { specialId } = req.body;
    
    if (!specialId) {
      return res.status(400).json({
        error: 'missing_special_id',
        message: 'Special ID is required'
      });
    }
    
    // Validate format
    if (!isValidSpecialLoginId(specialId)) {
      return res.status(400).json({
        error: 'invalid_format',
        message: 'Invalid special ID format'
      });
    }
    
    // Find tourist
    const tourist = tourists.find(t => t.specialLoginId === specialId);
    
    const validation: SpecialIdValidation = {
      specialId,
      exists: !!tourist,
      accountStatus: tourist?.verificationStatus,
      canLogin: tourist?.canLogin && tourist?.verificationStatus === 'verified'
    };
    
    res.json(validation);
    
  } catch (error) {
    console.error('Special ID validation error:', error);
    res.status(500).json({
      error: 'validation_failed',
      message: 'Special ID validation failed'
    });
  }
}

/**
 * Get tourist profile (authenticated)
 */
export function getTouristProfile(req: Request, res: Response) {
  try {
    const userId = req.params.userId || req.auth?.userId;
    
    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'User ID is required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Tourist profile not found'
      });
    }
    
    // Remove sensitive data
    const { passwordHash, ...profile } = tourist;
    
    res.json(profile);
    
  } catch (error) {
    console.error('Get tourist profile error:', error);
    res.status(500).json({
      error: 'profile_fetch_failed',
      message: 'Failed to fetch profile'
    });
  }
}

/**
 * Update tourist profile (authenticated)
 */
export async function updateTouristProfile(req: Request, res: Response) {
  try {
    const userId = req.params.userId || req.auth?.userId;
    const { name, phone, emergencyName, emergencyPhone, itinerary } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'User ID is required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Tourist profile not found'
      });
    }
    
    // Validate inputs
    if (name && name.trim().length < 2) {
      return res.status(400).json({
        error: 'invalid_name',
        message: 'Name must be at least 2 characters'
      });
    }
    
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        error: 'invalid_phone',
        message: 'Invalid phone number format'
      });
    }
    
    if (emergencyPhone && !validatePhone(emergencyPhone)) {
      return res.status(400).json({
        error: 'invalid_emergency_phone',
        message: 'Invalid emergency phone number format'
      });
    }
    
    // Update allowed fields
    if (name) tourist.name = sanitizeString(name);
    if (phone) tourist.phone = phone;
    if (emergencyName) tourist.emergencyName = sanitizeString(emergencyName);
    if (emergencyPhone) tourist.emergencyPhone = emergencyPhone;
    if (itinerary) tourist.itinerary = sanitizeString(itinerary);
    
    // Add to history
    tourist.history = tourist.history || [];
    tourist.history.push({
      action: 'profile_updated',
      admin: 'user',
      notes: 'Profile updated by user',
      timestamp: new Date().toISOString()
    });
    
    // Remove sensitive data from response
    const { passwordHash, ...profile } = tourist;
    
    res.json({
      success: true,
      profile
    });
    
  } catch (error) {
    console.error('Update tourist profile error:', error);
    res.status(500).json({
      error: 'profile_update_failed',
      message: 'Failed to update profile'
    });
  }
}

/**
 * Get digital ID information
 */
export async function getDigitalId(req: Request, res: Response) {
  try {
    const userId = req.params.userId || req.auth?.userId;
    
    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'User ID is required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Tourist not found'
      });
    }
    
    const digitalIdData: DigitalIdData = {
      userId: tourist._id,
      blockchainId: tourist.blockchainId,
      verificationStatus: tourist.verificationStatus,
      qrCodeData: tourist.qrCodeData,
      blockchainStatus: tourist.blockchainStatus || 'none',
      transactionHash: tourist.transactionHash,
      applicationDate: tourist.applicationDate
    };
    
    // If verified and has blockchain ID, try to get blockchain verification
    if (tourist.verificationStatus === 'verified' && tourist.blockchainId) {
      try {
        const BLOCKCHAIN_API_URL = process.env.BLOCKCHAIN_API_URL || 'http://localhost:5002';
        const blockchainUrl = new URL(`${BLOCKCHAIN_API_URL}/verifyID`);
        blockchainUrl.searchParams.set('blockchainId', tourist.blockchainId);
        
        const response = await fetch(blockchainUrl);
        
        if (response.ok) {
          const blockchainData = await response.json();
          digitalIdData.blockchainVerification = {
            valid: blockchainData.valid,
            status: blockchainData.status,
            issuedAt: blockchainData.issuedAt,
            expiresAt: blockchainData.expiresAt,
            onChain: blockchainData.onChain,
            verificationLevel: blockchainData.verificationLevel
          };
        }
      } catch (error) {
        digitalIdData.blockchainVerification = {
          error: 'blockchain_unreachable',
          fallback: true,
          valid: false
        };
      }
    }
    
    res.json(digitalIdData);
    
  } catch (error) {
    console.error('Get digital ID error:', error);
    res.status(500).json({
      error: 'digital_id_fetch_failed',
      message: 'Failed to fetch digital ID'
    });
  }
}

/**
 * Change password (authenticated)
 */
export async function changeTouristPassword(req: Request, res: Response) {
  try {
    const userId = req.params.userId || req.auth?.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        error: 'missing_user_id',
        message: 'User ID is required'
      });
    }
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'missing_passwords',
        message: 'Current and new passwords are required'
      });
    }
    
    const tourist = tourists.find(t => t._id === userId);
    
    if (!tourist) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Tourist not found'
      });
    }
    
    if (!tourist.passwordHash) {
      return res.status(400).json({
        error: 'password_not_set',
        message: 'Password not configured. Please contact admin.'
      });
    }
    
    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, tourist.passwordHash);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: 'invalid_current_password',
        message: 'Current password is incorrect'
      });
    }
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword, false);
    
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'invalid_new_password',
        message: 'New password does not meet requirements',
        details: passwordValidation.errors
      });
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    tourist.passwordHash = newPasswordHash;
    
    // Add to history
    tourist.history = tourist.history || [];
    tourist.history.push({
      action: 'password_changed',
      admin: 'user',
      notes: 'Password changed by user',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'password_change_failed',
      message: 'Failed to change password'
    });
  }
}

/**
 * Tourist logout
 */
export function touristLogout(req: Request, res: Response) {
  try {
    const userId = req.auth?.userId;
    const clientIP = getClientIP(req);
    
    if (userId) {
      const tourist = tourists.find(t => t._id === userId);
      
      if (tourist) {
        // Add logout to history
        tourist.history = tourist.history || [];
        tourist.history.push({
          action: 'logout',
          admin: 'system',
          notes: `Logout from IP: ${clientIP}`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Tourist logout error:', error);
    res.status(500).json({
      error: 'logout_failed',
      message: 'Logout failed'
    });
  }
}

// Export function to set tourist data (for integration with main server)
export function setTouristData(touristData: Tourist[], logs: any[]) {
  tourists = touristData;
  adminLogs = logs;
}
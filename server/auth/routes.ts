import express, { Router } from 'express';
import { 
  authenticateToken, 
  requireRole, 
  requireOwnership,
  validateSpecialId,
  rateLimitMiddleware,
  corsMiddleware,
  securityHeaders,
  requireWalletAuth,
  requireAdminWallet,
  requireBlockchainAuth,
  checkSessionTimeout
} from './middleware';
import {
  touristLogin,
  validateSpecialIdEndpoint,
  getTouristProfile,
  updateTouristProfile,
  getDigitalId,
  changeTouristPassword,
  touristLogout
} from './touristAuth';
import {
  adminLogin,
  createTouristProfile,
  getPendingVerifications,
  approveTourist,
  rejectTourist,
  archiveTourist,
  getAdminLogs,
  adminLogout,
  initializeDefaultAdmin,
  getAdminBlockchainHealth,
  getAdminDashboardMetrics,
  getAdminActiveSessions,
  revokeAdminSession,
  getSecurityAuditReport
} from './adminAuth';

const router = Router();

// Apply security middleware to all routes
router.use(corsMiddleware);
router.use(securityHeaders);
router.use(rateLimitMiddleware);

// Initialize default admin on startup
initializeDefaultAdmin();

/**
 * Authentication Endpoints
 */

// Tourist login with special ID
router.post('/auth/tourist-login', touristLogin);

// Admin login
router.post('/auth/admin-login', adminLogin);

// Validate special ID (check if exists and status)
router.post('/auth/validate-special-id', validateSpecialIdEndpoint);

// Tourist logout
router.post('/auth/tourist-logout', authenticateToken, requireRole(['tourist']), touristLogout);

// Admin logout
router.post('/auth/admin-logout', authenticateToken, requireRole(['admin']), adminLogout);

/**
 * Tourist Profile Management Endpoints
 */

// Get tourist profile (authenticated tourist or admin)
router.get('/tourist/profile/:userId', 
  authenticateToken, 
  requireOwnership('userId'),
  getTouristProfile
);

// Update tourist profile (authenticated tourist only)
router.put('/tourist/profile/:userId', 
  authenticateToken, 
  requireRole(['tourist']),
  requireOwnership('userId'),
  validateSpecialId,
  updateTouristProfile
);

// Get digital ID information
router.get('/tourist/digital-id/:userId', 
  authenticateToken, 
  requireOwnership('userId'),
  getDigitalId
);

// Change tourist password
router.post('/tourist/change-password/:userId', 
  authenticateToken, 
  requireRole(['tourist']),
  requireOwnership('userId'),
  changeTouristPassword
);

/**
 * Admin Tourist Management Endpoints
 */

// Create new tourist profile (admin only)
router.post('/admin/create-tourist', 
  authenticateToken, 
  requireRole(['admin']),
  createTouristProfile
);

// Get pending verifications with filtering and pagination
router.get('/admin/pending-verifications', 
  authenticateToken, 
  requireRole(['admin']),
  getPendingVerifications
);

// Approve tourist and generate special ID
router.post('/admin/approve/:userId', 
  authenticateToken, 
  requireRole(['admin']),
  approveTourist
);

// Reject tourist application
router.post('/admin/reject/:userId', 
  authenticateToken, 
  requireRole(['admin']),
  rejectTourist
);

// Archive tourist application
router.post('/admin/archive/:userId', 
  authenticateToken, 
  requireRole(['admin']),
  archiveTourist
);

// Get admin activity logs
router.get('/admin/logs', 
  authenticateToken, 
  requireRole(['admin']),
  getAdminLogs
);

/**
 * Enhanced Admin Wallet Authentication and Blockchain Integration Endpoints
 */

// Get blockchain health status
router.get('/admin/blockchain/health',
  authenticateToken,
  requireRole(['admin']),
  getAdminBlockchainHealth
);

// Get comprehensive admin dashboard metrics
router.get('/admin/dashboard/metrics',
  authenticateToken,
  requireRole(['admin']),
  getAdminDashboardMetrics
);

// Get active admin sessions
router.get('/admin/sessions',
  authenticateToken,
  requireRole(['admin']),
  getAdminActiveSessions
);

// Revoke admin session
router.delete('/admin/sessions/:sessionId',
  authenticateToken,
  requireRole(['admin']),
  revokeAdminSession
);

// Get security audit report
router.get('/admin/security/audit',
  authenticateToken,
  requireRole(['admin']),
  getSecurityAuditReport
);

/**
 * Utility Endpoints
 */

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      authentication: 'operational',
      database: 'operational' // In production, check actual database
    }
  });
});

// Get current user info (any authenticated user)
router.get('/auth/me', authenticateToken, (req, res) => {
  res.json({
    userId: req.auth?.userId,
    role: req.auth?.role,
    specialLoginId: req.auth?.specialLoginId,
    isAuthenticated: req.auth?.isAuthenticated
  });
});

// Refresh token endpoint (if using refresh tokens)
router.post('/auth/refresh', (req, res) => {
  // Implementation would go here for token refresh
  // For now, return not implemented
  res.status(501).json({
    error: 'not_implemented',
    message: 'Token refresh not implemented yet'
  });
});

export const authRoutes = router;
export default router;
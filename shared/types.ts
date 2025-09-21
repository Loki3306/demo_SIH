// Enhanced Authentication System Types
// Based on design document requirements for YatraRakshak

// User Roles
export type UserRole = "tourist" | "admin" | "police";

// Authentication Status
export type AuthStatus = "authenticated" | "unauthenticated" | "pending";

// Tourist Profile Structure
export interface Tourist {
  _id: string;
  specialLoginId?: string; // Unique ID for tourist login
  name: string;
  email: string;
  phone?: string;
  passwordHash?: string; // Only for server-side use
  itinerary?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  documentType?: "aadhaar" | "passport";
  documentNumber?: string;
  documentFileName?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "archived";
  history?: VerificationHistoryEntry[];
  blockchainId?: string;
  applicationDate?: string;
  // Enhanced blockchain fields
  transactionHash?: string;
  blockchainStatus?: "none" | "pending" | "created" | "failed" | "mock" | "fallback";
  qrCodeData?: string;
  // Admin-related fields
  createdByAdmin?: string;
  createdByAdminId?: string;
  verificationDate?: string;
  canLogin?: boolean;
}

// Admin Profile Structure - Enhanced for Wallet-Based Authentication
export interface Admin {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string; // Optional for wallet-based auth
  role: "admin" | "senior_admin";
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  
  // Wallet-based authentication fields  
  walletAddress?: string; // Ethereum wallet public address
  privateKeyHash?: string; // Hashed private key for verification (server-side only)
  authType: "password" | "wallet" | "hybrid"; // Authentication method
  permissions?: string[]; // Granular permission set
  blockchainRole?: "admin" | "senior_admin" | "authority"; // Role in smart contract
}

// Police Profile Structure
export interface Police {
  _id: string;
  name: string;
  email: string;
  passwordHash: string; // Only for server-side use
  badgeNumber: string;
  department: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

// Verification History Entry
export interface VerificationHistoryEntry {
  action: string;
  admin?: string;
  notes?: string;
  timestamp: string;
}

// Admin Session
export interface AdminSession {
  sessionId: string;
  adminId: string;
  createdAt: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// Audit Log Entry
export interface AuditLogEntry {
  logId: string;
  adminId: string;
  action: string;
  targetUserId?: string;
  notes?: string;
  timestamp: string;
  ipAddress?: string;
}

// Authentication Token Payload
export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  specialLoginId?: string; // For tourists
  iat: number;
  exp: number;
}

// Authentication Response
export interface AuthResponse {
  token: string;
  refreshToken?: string;
  role: UserRole;
  userId: string;
  specialLoginId?: string;
  user: Partial<Tourist | Admin | Police>;
}

// Login Request Types
export interface TouristLoginRequest {
  specialId: string;
  password: string;
}

export interface AdminLoginRequest {
  email?: string;
  password?: string;
  // Wallet-based authentication
  walletPrivateKey?: string;
  walletAddress?: string;
  authType: "password" | "wallet";
}

export interface PoliceLoginRequest {
  email: string;
  password: string;
}

// Registration Request
export interface TouristRegistrationRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  itinerary?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  documentType: "aadhaar" | "passport";
  documentNumber: string;
  documentFileName: string;
}

// Password Requirements
export interface PasswordRequirements {
  minLength: number;
  requireSpecialChar: boolean;
  requireNumber: boolean;
  requireUppercase: boolean;
  requireLowercase: boolean;
}

// Document Validation
export interface DocumentValidation {
  type: "aadhaar" | "passport";
  number: string;
  isValid: boolean;
  errors?: string[];
}

// Blockchain Verification
export interface BlockchainVerification {
  valid: boolean;
  status?: string;
  issuedAt?: string;
  expiresAt?: string;
  onChain?: boolean;
  verificationLevel?: string;
  error?: string;
  fallback?: boolean;
}

// Authentication Session for Wallet-Based Auth
export interface AuthSession {
  sessionId: string;
  adminId: string;
  walletAddress?: string;
  jwtToken: string;
  expiresAt: string;
  ipAddress: string;
  userAgent: string;
  authType: "password" | "wallet";
}

// Blockchain Health Status
export interface BlockchainHealth {
  connected: boolean;
  contractAddress?: string;
  networkId?: string;
  chainId?: string;
  totalIDs?: number;
  activeIDs?: number;
  adminBalance?: string;
  lastChecked: string;
}

// Admin Dashboard Metrics
export interface AdminDashboardMetrics {
  totalPending: number;
  applicationsToday: number;
  verificationRate: number;
  averageProcessingTime: number;
  activeDigitalIDs: number;
  systemHealth: BlockchainHealth;
}

// Digital ID Data
export interface DigitalIdData {
  userId: string;
  blockchainId?: string;
  verificationStatus: "pending" | "verified" | "rejected" | "archived";
  qrCodeData?: string;
  blockchainStatus: "none" | "pending" | "created" | "failed" | "mock" | "fallback";
  transactionHash?: string;
  applicationDate?: string;
  blockchainVerification?: BlockchainVerification;
}

// API Error Response
export interface ApiError {
  error: string;
  message?: string;
  details?: any;
}

// Pagination
export interface PaginationParams {
  page: number;
  perPage: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

// Special ID Validation
export interface SpecialIdValidation {
  specialId: string;
  exists: boolean;
  accountStatus?: "pending" | "verified" | "rejected" | "archived";
  canLogin?: boolean;
}

// Security Configuration
export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  password: {
    saltRounds: number;
    requirements: PasswordRequirements;
  };
  session: {
    maxFailedAttempts: number;
    lockoutDuration: number;
    maxSessions: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// Middleware Context - Enhanced for Wallet Authentication
export interface AuthContext {
  user?: Tourist | Admin | Police;
  role?: UserRole;
  userId?: string;
  specialLoginId?: string;
  isAuthenticated: boolean;
  token?: string;
  // Wallet-based authentication fields
  sessionId?: string;
  walletAddress?: string;
  authType?: "password" | "wallet";
}

// Request with Auth Context
export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}
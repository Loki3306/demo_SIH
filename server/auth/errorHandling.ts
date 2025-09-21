/**
 * Error Handling and Fallback Mechanisms for Blockchain Connectivity
 * Implements robust error handling, retry logic, and graceful degradation
 */

import { Request, Response, NextFunction } from 'express';
import { getBlockchainHealth } from './walletAuth';
import { logSecurityAudit, SecurityViolationType } from './walletSecurity';

// Error types for blockchain operations
export enum BlockchainErrorType {
  CONNECTION_FAILED = 'connection_failed',
  CONTRACT_ERROR = 'contract_error',
  TRANSACTION_FAILED = 'transaction_failed',
  TIMEOUT = 'timeout',
  INVALID_RESPONSE = 'invalid_response',
  INSUFFICIENT_GAS = 'insufficient_gas',
  NETWORK_MISMATCH = 'network_mismatch',
  VALIDATION_ERROR = 'validation_error'
}

// Fallback mode configuration
interface FallbackConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelay: number;
  timeoutMs: number;
  gracefulDegradation: boolean;
}

const FALLBACK_CONFIG: FallbackConfig = {
  enabled: process.env.FALLBACK_MODE_ENABLED !== 'false',
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  timeoutMs: 10000, // 10 seconds
  gracefulDegradation: true
};

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime: number;
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: 0,
  state: 'closed',
  nextAttemptTime: 0
};

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  openTimeoutMs: 60000, // 1 minute
  halfOpenRetryMs: 10000 // 10 seconds
};

/**
 * Custom error class for blockchain operations
 */
export class BlockchainError extends Error {
  public readonly type: BlockchainErrorType;
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(
    type: BlockchainErrorType,
    message: string,
    details?: any,
    retryable = true,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ) {
    super(message);
    this.name = 'BlockchainError';
    this.type = type;
    this.details = details;
    this.retryable = retryable;
    this.severity = severity;
  }
}

/**
 * Parse blockchain service errors and classify them
 */
export function parseBlockchainError(error: any): BlockchainError {
  // Network/Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return new BlockchainError(
      BlockchainErrorType.CONNECTION_FAILED,
      'Cannot connect to blockchain service',
      { code: error.code, address: error.address },
      true,
      'high'
    );
  }
  
  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
    return new BlockchainError(
      BlockchainErrorType.TIMEOUT,
      'Blockchain operation timed out',
      { originalError: error.message },
      true,
      'medium'
    );
  }
  
  // HTTP status code errors
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    
    if (status >= 500) {
      return new BlockchainError(
        BlockchainErrorType.CONTRACT_ERROR,
        `Blockchain service error: ${status}`,
        { status, response: error.response },
        true,
        'high'
      );
    } else if (status >= 400) {
      return new BlockchainError(
        BlockchainErrorType.VALIDATION_ERROR,
        `Invalid request to blockchain service: ${status}`,
        { status, response: error.response },
        false,
        'medium'
      );
    }
  }
  
  // Gas-related errors
  if (error.message.includes('gas') || error.message.includes('Gas')) {
    return new BlockchainError(
      BlockchainErrorType.INSUFFICIENT_GAS,
      'Insufficient gas for blockchain transaction',
      { originalError: error.message },
      true,
      'medium'
    );
  }
  
  // Network mismatch errors
  if (error.message.includes('network') || error.message.includes('chainId')) {
    return new BlockchainError(
      BlockchainErrorType.NETWORK_MISMATCH,
      'Blockchain network configuration mismatch',
      { originalError: error.message },
      false,
      'high'
    );
  }
  
  // Transaction errors
  if (error.message.includes('transaction') || error.message.includes('revert')) {
    return new BlockchainError(
      BlockchainErrorType.TRANSACTION_FAILED,
      'Blockchain transaction failed',
      { originalError: error.message },
      true,
      'medium'
    );
  }
  
  // Generic error
  return new BlockchainError(
    BlockchainErrorType.INVALID_RESPONSE,
    error.message || 'Unknown blockchain error',
    { originalError: error },
    true,
    'medium'
  );
}

/**
 * Circuit breaker pattern implementation
 */
export function checkCircuitBreaker(): { canProceed: boolean; reason?: string } {
  const now = Date.now();
  
  switch (circuitBreaker.state) {
    case 'closed':
      return { canProceed: true };
      
    case 'open':
      if (now >= circuitBreaker.nextAttemptTime) {
        circuitBreaker.state = 'half-open';
        return { canProceed: true };
      }
      return { 
        canProceed: false, 
        reason: `Circuit breaker open. Next attempt in ${Math.ceil((circuitBreaker.nextAttemptTime - now) / 1000)}s` 
      };
      
    case 'half-open':
      return { canProceed: true };
      
    default:
      return { canProceed: false, reason: 'Unknown circuit breaker state' };
  }
}

/**
 * Update circuit breaker state based on operation result
 */
export function updateCircuitBreaker(success: boolean): void {
  const now = Date.now();
  
  if (success) {
    // Reset on success
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'closed';
    circuitBreaker.nextAttemptTime = 0;
  } else {
    // Increment failures
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = now;
    
    if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
      circuitBreaker.state = 'open';
      circuitBreaker.nextAttemptTime = now + CIRCUIT_BREAKER_CONFIG.openTimeoutMs;
      
      console.warn(`🔴 Circuit breaker opened after ${circuitBreaker.failures} failures`);
    }
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = FALLBACK_CONFIG.maxRetries,
  baseDelay = FALLBACK_CONFIG.retryDelay
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check circuit breaker before attempting
      const circuitCheck = checkCircuitBreaker();
      if (!circuitCheck.canProceed) {
        throw new BlockchainError(
          BlockchainErrorType.CONNECTION_FAILED,
          circuitCheck.reason || 'Circuit breaker prevents operation',
          undefined,
          false,
          'high'
        );
      }
      
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), FALLBACK_CONFIG.timeoutMs)
        )
      ]);
      
      // Success - update circuit breaker
      updateCircuitBreaker(true);
      return result;
      
    } catch (error: any) {
      lastError = error;
      const blockchainError = parseBlockchainError(error);
      
      // Update circuit breaker on failure
      updateCircuitBreaker(false);
      
      // Don't retry if not retryable or on last attempt
      if (!blockchainError.retryable || attempt === maxRetries) {
        throw blockchainError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(`🔄 Retrying blockchain operation (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw parseBlockchainError(lastError);
}

/**
 * Graceful degradation helper
 */
export function createFallbackResponse<T>(operation: string, fallbackData: T): {
  success: boolean;
  data: T;
  fallback: boolean;
  warning: string;
} {
  return {
    success: true,
    data: fallbackData,
    fallback: true,
    warning: `Blockchain service unavailable for ${operation}. Using fallback data.`
  };
}

/**
 * Blockchain operation wrapper with error handling
 */
export async function executeBlockchainOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackData?: T,
  req?: Request
): Promise<{
  success: boolean;
  data?: T;
  error?: BlockchainError;
  fallback?: boolean;
  warning?: string;
}> {
  try {
    console.log(`🔧 Executing blockchain operation: ${operationName}`);
    
    const result = await retryWithBackoff(operation);
    
    console.log(`✅ Blockchain operation completed: ${operationName}`);
    return {
      success: true,
      data: result
    };
    
  } catch (error: any) {
    const blockchainError = parseBlockchainError(error);
    
    console.error(`❌ Blockchain operation failed: ${operationName}`, {
      type: blockchainError.type,
      message: blockchainError.message,
      severity: blockchainError.severity
    });
    
    // Log security audit if critical
    if (blockchainError.severity === 'critical' && req) {
      logSecurityAudit({
        timestamp: new Date().toISOString(),
        violationType: SecurityViolationType.BLOCKCHAIN_MISMATCH,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        details: `Critical blockchain error in ${operationName}: ${blockchainError.message}`,
        severity: 'critical',
        blocked: false
      });
    }
    
    // Use fallback if available and graceful degradation is enabled
    if (FALLBACK_CONFIG.gracefulDegradation && fallbackData !== undefined) {
      console.warn(`🟡 Using fallback data for: ${operationName}`);
      return {
        success: true,
        data: fallbackData,
        fallback: true,
        warning: `${operationName} using fallback due to blockchain error`
      };
    }
    
    return {
      success: false,
      error: blockchainError
    };
  }
}

/**
 * Express middleware for blockchain error handling
 */
export function blockchainErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof BlockchainError) {
    const statusCode = getStatusCodeForError(err.type);
    
    return res.status(statusCode).json({
      error: err.type,
      message: err.message,
      severity: err.severity,
      retryable: err.retryable,
      details: process.env.NODE_ENV === 'development' ? err.details : undefined,
      fallbackAvailable: FALLBACK_CONFIG.enabled && FALLBACK_CONFIG.gracefulDegradation
    });
  }
  
  next(err);
}

/**
 * Get appropriate HTTP status code for blockchain error type
 */
function getStatusCodeForError(errorType: BlockchainErrorType): number {
  switch (errorType) {
    case BlockchainErrorType.CONNECTION_FAILED:
    case BlockchainErrorType.TIMEOUT:
      return 503; // Service Unavailable
    case BlockchainErrorType.CONTRACT_ERROR:
      return 502; // Bad Gateway
    case BlockchainErrorType.VALIDATION_ERROR:
      return 400; // Bad Request
    case BlockchainErrorType.INSUFFICIENT_GAS:
      return 402; // Payment Required
    case BlockchainErrorType.NETWORK_MISMATCH:
      return 409; // Conflict
    case BlockchainErrorType.TRANSACTION_FAILED:
      return 422; // Unprocessable Entity
    case BlockchainErrorType.INVALID_RESPONSE:
    default:
      return 500; // Internal Server Error
  }
}

/**
 * Health check with detailed blockchain status
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  blockchain: {
    connected: boolean;
    circuitBreaker: string;
    lastError?: string;
    fallbackEnabled: boolean;
  };
  timestamp: string;
}> {
  const health = await getBlockchainHealth();
  const circuitCheck = checkCircuitBreaker();
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  
  if (!health.connected) {
    status = FALLBACK_CONFIG.enabled ? 'degraded' : 'unhealthy';
  } else if (circuitBreaker.state === 'open') {
    status = 'degraded';
  }
  
  return {
    status,
    blockchain: {
      connected: health.connected,
      circuitBreaker: circuitBreaker.state,
      lastError: circuitBreaker.failures > 0 ? 'Recent failures detected' : undefined,
      fallbackEnabled: FALLBACK_CONFIG.enabled
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Reset circuit breaker manually (for admin use)
 */
export function resetCircuitBreaker(): void {
  circuitBreaker.failures = 0;
  circuitBreaker.state = 'closed';
  circuitBreaker.nextAttemptTime = 0;
  circuitBreaker.lastFailureTime = 0;
  
  console.log('🔄 Circuit breaker manually reset');
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(): {
  state: string;
  failures: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  isBlocking: boolean;
} {
  return {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    lastFailureTime: circuitBreaker.lastFailureTime,
    nextAttemptTime: circuitBreaker.nextAttemptTime,
    isBlocking: circuitBreaker.state === 'open'
  };
}

/**
 * Configure fallback settings at runtime
 */
export function configureFallback(config: Partial<FallbackConfig>): void {
  Object.assign(FALLBACK_CONFIG, config);
  console.log('🔧 Fallback configuration updated:', FALLBACK_CONFIG);
}
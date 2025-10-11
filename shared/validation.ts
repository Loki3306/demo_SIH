import { z } from 'zod';

// Password validation schema
export const passwordSchema = z.string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password must not exceed 128 characters');

// Admin password schema (stricter)
export const adminPasswordSchema = z.string()
  .min(8, 'Admin password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Email validation schema
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(254, 'Email must not exceed 254 characters')
  .toLowerCase();

// Phone validation schema (Indian format)
export const phoneSchema = z.string()
  .regex(/^(\+91|91|0)?[6789]\d{9}$/, 'Invalid phone number format')
  .transform(val => val.replace(/^(\+91|91|0)/, ''));

// Name validation schema
export const nameSchema = z.string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s.'-]+$/, 'Name can only contain letters, spaces, dots, apostrophes, and hyphens')
  .transform(val => val.trim());

// Aadhaar number validation schema
export const aadhaarSchema = z.string()
  .regex(/^\d{4}\s?\d{4}\s?\d{4}$/, 'Invalid Aadhaar number format')
  .transform(val => val.replace(/\s/g, ''));

// Passport number validation schema
export const passportSchema = z.string()
  .regex(/^[A-Z]{1,2}\d{6,8}$/, 'Invalid passport number format')
  .transform(val => val.toUpperCase().replace(/\s/g, ''));

// Special Login ID validation schema
export const specialLoginIdSchema = z.string()
  .regex(/^YR[0-9A-Z]{6,}[0-9A-F]{8}$/, 'Invalid special login ID format')
  .length(18, 'Special login ID must be exactly 18 characters');

// Document type schema
export const documentTypeSchema = z.enum(['aadhaar', 'passport']);

// Verification status schema
export const verificationStatusSchema = z.enum(['pending', 'verified', 'rejected', 'archived']);

// User role schema
export const userRoleSchema = z.enum(['tourist', 'admin', 'police']);

// Tourist Login Request Schema
export const touristLoginSchema = z.object({
  specialId: specialLoginIdSchema,
  password: passwordSchema
});

// Admin Login Request Schema
export const adminLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

// Tourist Registration Schema
export const touristRegistrationSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema.optional(),
  itinerary: z.string().max(1000, 'Itinerary must not exceed 1000 characters').optional(),
  emergencyName: nameSchema.optional(),
  emergencyPhone: phoneSchema.optional(),
  documentType: documentTypeSchema,
  documentNumber: z.string().min(1, 'Document number is required'),
  documentFileName: z.string().optional()
}).refine((data) => {
  if (data.documentType === 'aadhaar') {
    return aadhaarSchema.safeParse(data.documentNumber).success;
  } else if (data.documentType === 'passport') {
    return passportSchema.safeParse(data.documentNumber).success;
  }
  return false;
}, {
  message: 'Invalid document number for the selected document type',
  path: ['documentNumber']
});

// Profile Update Schema
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema.optional(),
  emergencyName: nameSchema.optional(),
  emergencyPhone: phoneSchema.optional(),
  itinerary: z.string().max(1000, 'Itinerary must not exceed 1000 characters').optional()
});

// Password Change Schema
export const passwordChangeSchema = z.object({
  currentPassword: passwordSchema,
  newPassword: passwordSchema
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
});

// Admin Action Schema
export const adminActionSchema = z.object({
  notes: z.string().max(500, 'Notes must not exceed 500 characters').optional()
});

// Special ID Validation Schema
export const specialIdValidationSchema = z.object({
  specialId: specialLoginIdSchema
});

// Pagination Schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  perPage: z.coerce.number().min(1, 'Per page must be at least 1').max(100, 'Per page must not exceed 100').default(10),
  status: verificationStatusSchema.or(z.literal('all')).default('pending'),
  q: z.string().max(100, 'Search query must not exceed 100 characters').optional()
});

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().max(255, 'Filename must not exceed 255 characters'),
  mimetype: z.enum([
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf'
  ], { errorMap: () => ({ message: 'Only JPEG, PNG, GIF, and PDF files are allowed' }) }),
  size: z.number().max(5 * 1024 * 1024, 'File size must not exceed 5MB')
});

// Sanitization functions
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[\x00-\x1F\x7F]/g, '');
};

// XSS prevention
export const preventXSS = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  
  if (Array.isArray(input)) {
    return input.map(preventXSS);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = preventXSS(value);
    }
    return sanitized;
  }
  
  return input;
};

// SQL injection prevention (for raw queries)
export const escapeSql = (input: string): string => {
  return input.replace(/'/g, "''").replace(/;/g, '');
};

// Rate limiting key generation
export const generateRateLimitKey = (ip: string, userId?: string): string => {
  return userId ? `${ip}:${userId}` : ip;
};

// Security headers validation
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'",
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()'
};

// Input length limits
export const INPUT_LIMITS = {
  NAME_MAX: 100,
  EMAIL_MAX: 254,
  PHONE_MAX: 15,
  PASSWORD_MAX: 128,
  NOTES_MAX: 500,
  ITINERARY_MAX: 1000,
  SEARCH_QUERY_MAX: 100,
  FILENAME_MAX: 255
} as const;

// File upload limits
export const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  PASSWORD_MIN_LENGTH: 6,
  ADMIN_PASSWORD_MIN_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 3,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  JWT_EXPIRY: '24h',
  ADMIN_JWT_EXPIRY: '8h',
  REFRESH_TOKEN_EXPIRY: '7d',
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100
} as const;

// Validation error types
export type ValidationError = {
  field: string;
  message: string;
  code: string;
};

// Validation result type
export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
};

// Generic validation function
export const validateData = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> => {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      return {
        success: false,
        errors
      };
    }
    
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'Validation failed',
        code: 'unknown_error'
      }]
    };
  }
};

// Client-side validation helpers
export const clientValidation = {
  isValidEmail: (email: string): boolean => {
    return emailSchema.safeParse(email).success;
  },
  
  isValidPhone: (phone: string): boolean => {
    return phoneSchema.safeParse(phone).success;
  },
  
  isValidAadhaar: (aadhaar: string): boolean => {
    return aadhaarSchema.safeParse(aadhaar).success;
  },
  
  isValidPassport: (passport: string): boolean => {
    return passportSchema.safeParse(passport).success;
  },
  
  isValidSpecialId: (specialId: string): boolean => {
    return specialLoginIdSchema.safeParse(specialId).success;
  },
  
  validatePassword: (password: string, isAdmin = false): { isValid: boolean; errors: string[] } => {
    const schema = isAdmin ? adminPasswordSchema : passwordSchema;
    const result = schema.safeParse(password);
    
    if (result.success) {
      return { isValid: true, errors: [] };
    }
    
    return {
      isValid: false,
      errors: result.error.errors.map(err => err.message)
    };
  }
};
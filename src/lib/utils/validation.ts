// src/lib/utils/validation.ts
import { z } from 'zod';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

/**
 * Phone number validation for Kenya (+254 format)
 */
export const validateKenyanPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+254|0)[17]\d{8}$/;
  return phoneRegex.test(phone);
};

/**
 * ID Number validation for Kenya
 */
export const validateKenyanID = (id: string): boolean => {
  const idRegex = /^\d{7,8}$/;
  return idRegex.test(id);
};

/**
 * OB Entry validation schema
 */
export const obEntrySchema = z.object({
  incidentDate: z.coerce.date({
    required_error: 'Incident date is required',
    invalid_type_error: 'Invalid date format',
  }),
  category: z.nativeEnum(IncidentCategory, {
    required_error: 'Incident category is required',
    invalid_type_error: 'Invalid incident category',
  }),
  description: z
    .string({
      required_error: 'Description is required',
    })
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  location: z
    .string({
      required_error: 'Location is required',
    })
    .min(3, 'Location must be at least 3 characters'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  reportedBy: z
    .string({
      required_error: 'Reporter name is required',
    })
    .min(2, 'Name must be at least 2 characters'),
  contactNumber: z
    .string({
      required_error: 'Contact number is required',
    })
    .refine(validateKenyanPhone, {
      message: 'Invalid Kenyan phone number. Use format: +254712345678 or 0712345678',
    }),
  stationId: z.string({
    required_error: 'Station is required',
  }),
  recordedById: z.string({
    required_error: 'Recording officer is required',
  }),
  evidenceFiles: z.array(z.string()).optional(),
  witnesses: z
    .array(
      z.object({
        name: z.string().min(2),
        contactNumber: z.string().refine(validateKenyanPhone, {
          message: 'Invalid phone number',
        }),
        idNumber: z.string().optional(),
        address: z.string().optional(),
        statement: z.string().optional(),
      })
    )
    .optional(),
  suspects: z
    .array(
      z.object({
        name: z.string().optional(),
        alias: z.array(z.string()).optional(),
        description: z.string().min(10),
        lastSeenLocation: z.string().optional(),
        lastSeenTime: z.string().optional(),
        identifyingFeatures: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

/**
 * OB Update validation schema (all fields optional)
 */
export const obUpdateSchema = obEntrySchema.partial().extend({
  status: z.nativeEnum(IncidentStatus).optional(),
});

/**
 * Search parameters validation
 */
export const obSearchSchema = z.object({
  stationId: z.string().optional(),
  category: z.nativeEnum(IncidentCategory).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  searchTerm: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

/**
 * Criminal registration validation
 */
export const criminalSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  middleName: z.string().optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  alias: z.array(z.string()).default([]),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['Male', 'Female', 'Other']),
  nationality: z.string().default('Kenyan'),
  idNumber: z.string().refine(validateKenyanID, {
    message: 'Invalid ID number',
  }).optional(),
  phoneNumber: z.string().refine(validateKenyanPhone, {
    message: 'Invalid phone number',
  }).optional(),
  address: z.string().optional(),
  isWanted: z.boolean().default(false),
  wantedReason: z.string().optional(),
  lastKnownLocation: z.string().optional(),
  stationId: z.string(),
});

/**
 * User registration validation
 */
export const userRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  badgeNumber: z.string().optional(),
  phoneNumber: z.string().refine(validateKenyanPhone, {
    message: 'Invalid phone number',
  }).optional(),
  stationId: z.string().optional(),
});

/**
 * Validate data against schema
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
} {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const formatted: Record<string, string> = {};
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formatted[path] = err.message;
  });
  return formatted;
}

/**
 * Sanitize input string
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  maxSizeMB: number = 10,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}
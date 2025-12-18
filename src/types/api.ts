// src/types/api.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp?: string;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode: number;
  details?: any;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchParams extends PaginationParams {
  query?: string;
  filters?: Record<string, any>;
}

// Generic list response
export interface ListResponse<T> extends ApiResponse {
  data: T[];
  pagination: PaginationResponse;
}

// File upload types
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  link?: string;
}

// Dashboard statistics
export interface DashboardStats {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  pendingCases: number;
  recentActivity: any[];
  trends: {
    date: string;
    count: number;
  }[];
}

// Export/Report types
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'json';
  filters?: Record<string, any>;
  columns?: string[];
  includeMetadata?: boolean;
}

export interface BulkActionRequest {
  ids: string[];
  action: string;
  params?: Record<string, any>;
}

export interface BulkActionResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: { id: string; error: string }[];
}

// Validation error
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationErrorResponse extends ApiError {
  validationErrors: ValidationError[];
}
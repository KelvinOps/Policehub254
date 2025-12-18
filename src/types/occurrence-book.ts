// src/types/occurrence-book.ts
import { IncidentCategory, IncidentStatus } from '@prisma/client';

// ============================================
// Core OB Entry Types
// ============================================

export interface OccurrenceBookEntry {
  id: string;
  obNumber: string;
  incidentDate: Date;
  reportedDate: Date;
  category: IncidentCategory;
  description: string;
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  status: IncidentStatus;
  reportedBy: string;
  contactNumber: string;
  stationId: string;
  recordedById: string;
  evidenceFiles: string[];
  witnesses?: WitnessInfo[] | null;
  suspects?: SuspectInfo[] | null;
  caseId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  station?: {
    id: string;
    name: string;
    code: string;
    county: string;
  };
  recordedBy?: {
    id: string;
    name: string;
    badgeNumber: string;
    role: string;
  };
  case?: {
    id: string;
    caseNumber: string;
    status: string;
  } | null;
}

// ============================================
// Witness & Suspect Information
// ============================================

export interface WitnessInfo {
  name: string;
  contactNumber: string;
  idNumber?: string;
  address?: string;
  statement?: string;
}

export interface SuspectInfo {
  name?: string;
  alias?: string[];
  description: string;
  lastSeenLocation?: string;
  lastSeenTime?: string;
  identifyingFeatures?: string[];
}

// ============================================
// Input/Output Types
// ============================================

export interface CreateOBInput {
  incidentDate: Date | string;
  category: IncidentCategory;
  description: string;
  location: string;
  latitude?: number;
  longitude?: number;
  reportedBy: string;
  contactNumber: string;
  stationId: string;
  recordedById: string;
  evidenceFiles?: string[];
  witnesses?: WitnessInfo[];
  suspects?: SuspectInfo[];
}

export interface UpdateOBInput {
  incidentDate?: Date | string;
  category?: IncidentCategory;
  description?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status?: IncidentStatus;
  reportedBy?: string;
  contactNumber?: string;
  evidenceFiles?: string[];
  witnesses?: WitnessInfo[];
  suspects?: SuspectInfo[];
  caseId?: string;
}

// ============================================
// Search & Filter Types
// ============================================

export interface OBSearchFilters {
  stationId?: string;
  category?: IncidentCategory;
  status?: IncidentStatus;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  searchTerm?: string;
  county?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface OBSearchParams extends OBSearchFilters {
  page?: number;
  limit?: number;
  sortBy?: 'incidentDate' | 'reportedDate' | 'obNumber';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// Pagination & Lists
// ============================================

export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface OBPaginationResult {
  entries: OccurrenceBookEntry[];
  pagination: PaginationData;
}

// ============================================
// Statistics & Analytics
// ============================================

export interface OBStatistics {
  total: number;
  thisMonth: number;
  lastMonth: number;
  percentageChange: number;
  byCategory: CategoryStat[];
  byStatus: StatusStat[];
  bySeverity?: SeverityStat[];
  trends?: TrendData[];
  recent: OccurrenceBookEntry[];
}

export interface CategoryStat {
  category: IncidentCategory;
  count: number;
  _count?: number; // For Prisma groupBy
}

export interface StatusStat {
  status: IncidentStatus;
  count: number;
  _count?: number; // For Prisma groupBy
}

export interface SeverityStat {
  severity: string;
  count: number;
}

export interface TrendData {
  date: string;
  count: number;
}

// ============================================
// Report Generation
// ============================================

export interface OBReportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeEvidence?: boolean;
  includeWitnesses?: boolean;
  includeSuspects?: boolean;
  groupBy?: 'category' | 'status' | 'date' | 'station';
  dateRange?: {
    from: Date | string;
    to: Date | string;
  };
  filters?: OBSearchFilters;
}

export interface OBExportData {
  entries: OccurrenceBookEntry[];
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    totalEntries: number;
    dateRange?: {
      from: Date;
      to: Date;
    };
    filters?: OBSearchFilters;
  };
}

// ============================================
// Form Validation
// ============================================

export interface OBFormErrors {
  incidentDate?: string;
  category?: string;
  description?: string;
  location?: string;
  reportedBy?: string;
  contactNumber?: string;
  stationId?: string;
  witnesses?: Record<number, Partial<Record<keyof WitnessInfo, string>>>;
  suspects?: Record<number, Partial<Record<keyof SuspectInfo, string>>>;
}

// ============================================
// API Response Types
// ============================================

export interface OBApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface OBListResponse extends OBApiResponse {
  data: OccurrenceBookEntry[];
  pagination: PaginationData;
}

export interface OBSingleResponse extends OBApiResponse {
  data: OccurrenceBookEntry;
}

export interface OBStatsResponse extends OBApiResponse {
  data: OBStatistics;
}

// ============================================
// UI Component Props
// ============================================

export interface OBTableProps {
  entries: OccurrenceBookEntry[];
  loading?: boolean;
  onView?: (entry: OccurrenceBookEntry) => void;
  onEdit?: (entry: OccurrenceBookEntry) => void;
  onDelete?: (id: string) => void;
}

export interface OBFormProps {
  initialData?: Partial<OccurrenceBookEntry>;
  onSubmit: (data: CreateOBInput | UpdateOBInput) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

export interface OBFiltersProps {
  filters: OBSearchFilters;
  onFilterChange: (filters: OBSearchFilters) => void;
  onSearch: (term: string) => void;
}

// ============================================
// Constants & Enums
// ============================================

export const INCIDENT_CATEGORIES: Record<IncidentCategory, string> = {
  THEFT: 'Theft',
  ROBBERY: 'Robbery',
  ASSAULT: 'Assault',
  MURDER: 'Murder',
  RAPE: 'Rape',
  DOMESTIC_VIOLENCE: 'Domestic Violence',
  FRAUD: 'Fraud',
  BURGLARY: 'Burglary',
  TRAFFIC_ACCIDENT: 'Traffic Accident',
  KIDNAPPING: 'Kidnapping',
  DRUG_RELATED: 'Drug Related',
  CYBERCRIME: 'Cybercrime',
  CORRUPTION: 'Corruption',
  MISSING_PERSON: 'Missing Person',
  OTHER: 'Other',
};

export const INCIDENT_STATUSES: Record<IncidentStatus, string> = {
  REPORTED: 'Reported',
  UNDER_INVESTIGATION: 'Under Investigation',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  TRANSFERRED: 'Transferred',
};

// ============================================
// Utility Types
// ============================================

export type OBSortField = keyof Pick<OccurrenceBookEntry, 'incidentDate' | 'reportedDate' | 'obNumber'>;
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: OBSortField;
  order: SortOrder;
}

// ============================================
// Audit & History
// ============================================

export interface OBAuditLog {
  id: string;
  obId: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';
  changes?: Record<string, { old: any; new: any }>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// Bulk Operations
// ============================================

export interface BulkOBOperation {
  ids: string[];
  action: 'delete' | 'update_status' | 'export';
  data?: {
    status?: IncidentStatus;
  };
}

export interface BulkOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
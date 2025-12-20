import { CaseStatus, IncidentCategory, UserRole } from '@prisma/client';

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  category: IncidentCategory;
  status: CaseStatus;
  priority: string;
  stationId: string;
  stationName?: string;
  assignedToId?: string | null;
  assignedToName?: string;
  assignedToBadge?: string;
  createdById: string;
  createdByName?: string;
  createdByBadge?: string;
  courtDate?: Date | null;
  courtCase?: string | null;
  outcome?: string | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Related data
  station?: {
    id: string;
    name: string;
    code: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    badgeNumber: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    badgeNumber: string;
  };
  criminals?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    idNumber?: string;
    photoUrl?: string;
    isWanted?: boolean;
  }>;
  evidence?: Evidence[];
  obEntry?: {
    id: string;
    obNumber: string;
    incidentDate: Date;
    location: string;
  } | null;
}

export interface Evidence {
  id: string;
  caseId: string;
  type: string;
  description: string;
  fileUrl?: string | null;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  collectedBy: string;
  collectedByName?: string;
  collectedAt: Date;
  chainOfCustody: ChainOfCustodyEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ChainOfCustodyEntry {
  timestamp: Date | string;
  action: 'COLLECTED' | 'TRANSFERRED' | 'ANALYZED' | 'STORED' | 'RETRIEVED' | 'RETURNED' | 'DISPOSED';
  officer: string;
  officerBadge?: string;
  location: string;
  notes?: string;
  recipient?: string;
  recipientBadge?: string;
}

export interface CreateCaseData {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: string;
  stationId: string;
  createdById: string;
  assignedToId?: string;
  obEntryId?: string;
}

export interface UpdateCaseData {
  title?: string;
  description?: string;
  status?: CaseStatus;
  priority?: string;
  assignedToId?: string | null;
  courtDate?: Date | null;
  courtCase?: string | null;
  outcome?: string | null;
}

export interface CreateEvidenceData {
  caseId: string;
  type: string;
  description: string;
  fileUrl?: string;
  collectedBy: string;
  collectedAt: Date;
  chainOfCustody?: ChainOfCustodyEntry[];
}

export interface CaseFilters {
  status?: CaseStatus;
  priority?: string;
  category?: IncidentCategory;
  assignedToId?: string;
  stationId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface CaseStatistics {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  avgResolutionTime: number;
  convictionRate: number;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  stationId?: string;
  badgeNumber?: string;
}
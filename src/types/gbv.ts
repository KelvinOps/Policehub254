// src/types/gbv.ts

export type GBVCaseStatus =
  | 'REPORTED'
  | 'UNDER_INVESTIGATION'
  | 'REFERRED'
  | 'COURT_PROCEEDINGS'
  | 'CLOSED'
  | 'WITHDRAWN';

export type GBVIncidentType =
  | 'PHYSICAL_VIOLENCE'
  | 'SEXUAL_VIOLENCE'
  | 'EMOTIONAL_ABUSE'
  | 'ECONOMIC_ABUSE'
  | 'STALKING'
  | 'HARASSMENT'
  | 'FGM'
  | 'CHILD_MARRIAGE'
  | 'OTHER';

export type GBVRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type GBVVictimGender = 'FEMALE' | 'MALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type SupportResourceType = 'SHELTER' | 'LEGAL_AID' | 'MEDICAL' | 'COUNSELING' | 'POLICE' | 'NGO' | 'HOTLINE';

export interface GBVCase {
  id: string;
  caseNumber: string;
  status: GBVCaseStatus;
  incidentType: GBVIncidentType;
  incidentDate: string;
  reportedDate: string;
  location: string;
  county?: string | null;
  subCounty?: string | null;
  description: string;
  victimAge?: number | null;
  victimGender?: GBVVictimGender | null;
  victimCodeName?: string | null;
  victimInjured: boolean;
  victimInjuryDesc?: string | null;
  perpetratorKnown: boolean;
  perpetratorRelation?: string | null;
  perpetratorArrested: boolean;
  riskLevel: GBVRiskLevel;
  riskScore: number;
  aiSummary?: string | null;
  aiRecommendations?: string | null;
  recurrenceRisk?: number | null;
  stationId?: string | null;
  station?: { id: string; name: string; code: string; county?: string | null } | null;
  recordedById?: string | null;
  recordedBy?: { id: string; name: string; badgeNumber?: string | null } | null;
  assignedToId?: string | null;
  assignedTo?: { id: string; name: string; badgeNumber?: string | null } | null;
  supportActions?: GBVSupportAction[];
  evidence?: GBVEvidence[];
  followUps?: GBVFollowUp[];
  createdAt: string;
  updatedAt: string;
}

export interface GBVSupportAction {
  id: string; caseId: string; type: SupportResourceType;
  description: string; providedBy?: string | null;
  providedAt: string; notes?: string | null;
}

export interface GBVEvidence {
  id: string; caseId: string; fileName: string;
  fileUrl: string; fileType: string; uploadedAt: string;
}

export interface GBVFollowUp {
  id: string; caseId: string; notes: string;
  outcome?: string | null; scheduledAt?: string | null;
  completedAt?: string | null; createdAt: string;
}

export interface GBVResource {
  id: string; name: string; type: SupportResourceType;
  county?: string | null; subCounty?: string | null;
  address?: string | null; phone?: string | null;
  email?: string | null; website?: string | null;
  description?: string | null; isActive: boolean;
}

export interface GBVStatistics {
  total: number; thisMonth: number; critical: number;
  high: number; medium: number; low: number;
  arrested: number; referred: number;
  byType: Partial<Record<GBVIncidentType, number>>;
  byStatus: Partial<Record<GBVCaseStatus, number>>;
}

export const GBV_INCIDENT_LABELS: Record<GBVIncidentType, string> = {
  PHYSICAL_VIOLENCE: 'Physical Violence', SEXUAL_VIOLENCE: 'Sexual Violence',
  EMOTIONAL_ABUSE: 'Emotional Abuse', ECONOMIC_ABUSE: 'Economic Abuse',
  STALKING: 'Stalking', HARASSMENT: 'Harassment',
  FGM: 'FGM', CHILD_MARRIAGE: 'Child Marriage', OTHER: 'Other',
};

export const GBV_STATUS_LABELS: Record<GBVCaseStatus, string> = {
  REPORTED: 'Reported', UNDER_INVESTIGATION: 'Under Investigation',
  REFERRED: 'Referred', COURT_PROCEEDINGS: 'Court Proceedings',
  CLOSED: 'Closed', WITHDRAWN: 'Withdrawn',
};

export const SUPPORT_RESOURCE_LABELS: Record<SupportResourceType, string> = {
  SHELTER: 'Shelter', LEGAL_AID: 'Legal Aid', MEDICAL: 'Medical',
  COUNSELING: 'Counseling', POLICE: 'Police', NGO: 'NGO', HOTLINE: 'Hotline',
};
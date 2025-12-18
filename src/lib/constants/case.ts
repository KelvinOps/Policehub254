// src/lib/constants/case.ts

import { CaseStatus, IncidentCategory } from '@prisma/client';

export const CASE_STATUSES: Record<CaseStatus, { label: string; color: string; description: string }> = {
  OPEN: {
    label: 'Open',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Case is newly opened and awaiting assignment',
  },
  UNDER_INVESTIGATION: {
    label: 'Under Investigation',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    description: 'Active investigation in progress',
  },
  PENDING_TRIAL: {
    label: 'Pending Trial',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'Case forwarded to court, awaiting trial',
  },
  IN_COURT: {
    label: 'In Court',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'Case is currently in court proceedings',
  },
  CLOSED: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    description: 'Case has been concluded',
  },
  DISMISSED: {
    label: 'Dismissed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    description: 'Case dismissed by court or lack of evidence',
  },
};

export const CASE_PRIORITIES = {
  LOW: {
    label: 'Low',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    value: 1,
  },
  MEDIUM: {
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    value: 2,
  },
  HIGH: {
    label: 'High',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    value: 3,
  },
  CRITICAL: {
    label: 'Critical',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    value: 4,
  },
} as const;

export const EVIDENCE_TYPES = {
  PHYSICAL: {
    label: 'Physical Evidence',
    icon: '📦',
    description: 'Tangible items collected from crime scene',
  },
  DIGITAL: {
    label: 'Digital Evidence',
    icon: '💾',
    description: 'Electronic data, files, communications',
  },
  DOCUMENTARY: {
    label: 'Documentary Evidence',
    icon: '📄',
    description: 'Written documents, reports, records',
  },
  TESTIMONIAL: {
    label: 'Testimonial Evidence',
    icon: '🎤',
    description: 'Witness statements, interviews',
  },
  PHOTOGRAPHIC: {
    label: 'Photographic Evidence',
    icon: '📷',
    description: 'Photos, videos of crime scene or suspects',
  },
  FORENSIC: {
    label: 'Forensic Evidence',
    icon: '🔬',
    description: 'DNA, fingerprints, ballistics',
  },
} as const;

export const CASE_OUTCOMES = [
  'Convicted',
  'Acquitted',
  'Case Withdrawn',
  'Plea Bargain',
  'Dismissed - Lack of Evidence',
  'Dismissed - Procedural Issues',
  'Ongoing',
  'Other',
] as const;

// Helper functions
export function getCaseStatusColor(status: CaseStatus): string {
  return CASE_STATUSES[status]?.color || 'bg-gray-100 text-gray-800';
}

export function getCaseStatusLabel(status: CaseStatus): string {
  return CASE_STATUSES[status]?.label || status;
}

export function getCasePriorityColor(priority: string): string {
  return CASE_PRIORITIES[priority as keyof typeof CASE_PRIORITIES]?.color || CASE_PRIORITIES.MEDIUM.color;
}

export function getCasePriorityLabel(priority: string): string {
  return CASE_PRIORITIES[priority as keyof typeof CASE_PRIORITIES]?.label || priority;
}

export function getEvidenceTypeIcon(type: string): string {
  return EVIDENCE_TYPES[type as keyof typeof EVIDENCE_TYPES]?.icon || '📋';
}

export function getEvidenceTypeLabel(type: string): string {
  return EVIDENCE_TYPES[type as keyof typeof EVIDENCE_TYPES]?.label || type;
}

// Map incident categories to suggested case priorities
export function getSuggestedPriority(category: IncidentCategory): string {
  const criticalCrimes: IncidentCategory[] = ['MURDER', 'RAPE', 'KIDNAPPING'];
  const highCrimes: IncidentCategory[] = ['ROBBERY', 'ASSAULT', 'DOMESTIC_VIOLENCE', 'DRUG_RELATED', 'CORRUPTION'];
  
  if (criticalCrimes.includes(category)) return 'CRITICAL';
  if (highCrimes.includes(category)) return 'HIGH';
  return 'MEDIUM';
}
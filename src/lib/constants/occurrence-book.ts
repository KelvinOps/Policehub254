// src/lib/constants/occurrence-book.ts
import { IncidentCategory, IncidentStatus } from '@prisma/client';

export const INCIDENT_CATEGORIES: Record<IncidentCategory, { label: string; color: string; severity: string }> = {
  THEFT: { label: 'Theft', color: 'bg-yellow-100 text-yellow-800', severity: 'MEDIUM' },
  ROBBERY: { label: 'Robbery', color: 'bg-orange-100 text-orange-800', severity: 'HIGH' },
  ASSAULT: { label: 'Assault', color: 'bg-orange-100 text-orange-800', severity: 'HIGH' },
  MURDER: { label: 'Murder', color: 'bg-red-100 text-red-800', severity: 'CRITICAL' },
  RAPE: { label: 'Rape', color: 'bg-red-100 text-red-800', severity: 'CRITICAL' },
  DOMESTIC_VIOLENCE: { label: 'Domestic Violence', color: 'bg-red-100 text-red-800', severity: 'HIGH' },
  FRAUD: { label: 'Fraud', color: 'bg-purple-100 text-purple-800', severity: 'MEDIUM' },
  BURGLARY: { label: 'Burglary', color: 'bg-yellow-100 text-yellow-800', severity: 'MEDIUM' },
  TRAFFIC_ACCIDENT: { label: 'Traffic Accident', color: 'bg-blue-100 text-blue-800', severity: 'MEDIUM' },
  KIDNAPPING: { label: 'Kidnapping', color: 'bg-red-100 text-red-800', severity: 'CRITICAL' },
  DRUG_RELATED: { label: 'Drug Related', color: 'bg-pink-100 text-pink-800', severity: 'HIGH' },
  CYBERCRIME: { label: 'Cybercrime', color: 'bg-indigo-100 text-indigo-800', severity: 'MEDIUM' },
  CORRUPTION: { label: 'Corruption', color: 'bg-gray-100 text-gray-800', severity: 'HIGH' },
  MISSING_PERSON: { label: 'Missing Person', color: 'bg-amber-100 text-amber-800', severity: 'HIGH' },
  OTHER: { label: 'Other', color: 'bg-gray-100 text-gray-800', severity: 'LOW' },
};

export const INCIDENT_STATUSES: Record<IncidentStatus, { label: string; color: string }> = {
  REPORTED: { label: 'Reported', color: 'bg-blue-100 text-blue-800' },
  UNDER_INVESTIGATION: { label: 'Under Investigation', color: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800' },
  CLOSED: { label: 'Closed', color: 'bg-gray-100 text-gray-800' },
  TRANSFERRED: { label: 'Transferred', color: 'bg-purple-100 text-purple-800' },
};

export function getCategoryColor(category: IncidentCategory): string {
  return INCIDENT_CATEGORIES[category]?.color || 'bg-gray-100 text-gray-800';
}

export function getStatusColor(status: IncidentStatus): string {
  return INCIDENT_STATUSES[status]?.color || 'bg-gray-100 text-gray-800';
}

export function getCategoryLabel(category: IncidentCategory): string {
  return INCIDENT_CATEGORIES[category]?.label || category;
}

export function getStatusLabel(status: IncidentStatus): string {
  return INCIDENT_STATUSES[status]?.label || status;
}
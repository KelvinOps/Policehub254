// src/types/traffic.ts
export type IncidentType = 'TRAFFIC' | 'ACCIDENT' | 'IMPOUND';
export type IncidentStatus = 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED' | 'CITATION_ISSUED';
export type AccidentSeverity = 'MINOR' | 'SERIOUS' | 'FATAL' | 'PROPERTY_DAMAGE';
export type ImpoundReason = 'PARKING_VIOLATION' | 'EXPIRED_LICENSE' | 'NO_INSURANCE' | 'STOLEN_VEHICLE' | 'DANGEROUS_DRIVING' | 'OTHER';
export type VehicleType = 'MOTORCYCLE' | 'CAR' | 'SUV' | 'TRUCK' | 'BUS' | 'VAN' | 'OTHER';
export type PaymentStatus = 'PAID' | 'UNPAID' | 'WAIVED' | 'PENDING';

export interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
  role: string;
}

export interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  color?: string;
  type: VehicleType;
}

export interface TrafficIncident {
  id: string;
  incidentNumber: string;
  type: IncidentType;
  status: IncidentStatus;
  reportedAt: string;
  reportedBy?: string;
  reportedById?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  description: string;
  
  // Assignment
  assignedToId?: string;
  assignedToName?: string;
  assignedToBadge?: string;
  
  // Involved parties
  involvedVehicles: InvolvedVehicle[];
  involvedPeople: InvolvedPerson[];
  
  // Citations
  citations: Citation[];
  
  // Attachments
  attachments: Attachment[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  stationId?: string;
  stationName?: string;
  createdById: string;
  createdByName?: string;
}

export interface Accident extends TrafficIncident {
  type: 'ACCIDENT';
  severity: AccidentSeverity;
  weatherConditions?: string;
  roadConditions?: string;
  visibility?: string;
  witnesses: Witness[];
  diagram?: string;
  insuranceDetails?: InsuranceInfo[];
}

export interface Impound extends TrafficIncident {
  type: 'IMPOUND';
  impoundReason: ImpoundReason;
  impoundLocation: string;
  impoundedAt: string;
  releasedAt?: string;
  releasedTo?: string;
  impoundFee?: number;
  paymentStatus: PaymentStatus;
  storageLocation: string;
  vehicleId: string;
  vehicleInfo: Vehicle;
  ownerInfo: OwnerInfo;
}

export interface InvolvedVehicle {
  id: string;
  vehicleId?: string;
  registration: string;
  make: string;
  model: string;
  color?: string;
  type: VehicleType;
  damageDescription?: string;
  ownerName?: string;
  ownerContact?: string;
  insuranceCompany?: string;
  insurancePolicy?: string;
}

export interface InvolvedPerson {
  id: string;
  name: string;
  idNumber?: string;
  phoneNumber?: string;
  address?: string;
  driverLicense?: string;
  role: 'DRIVER' | 'PASSENGER' | 'PEDESTRIAN' | 'OWNER' | 'WITNESS';
  injuries?: string;
  medicalAttention?: boolean;
}

export interface Witness {
  id: string;
  name: string;
  phoneNumber?: string;
  idNumber?: string;
  address?: string;
  statement?: string;
  statementDate?: string;
}

export interface Citation {
  id: string;
  citationNumber: string;
  issuedTo: string;
  issuedToIdNumber?: string;
  violation: string;
  section?: string;
  amount: number;
  issuedAt: string;
  issuedById: string;
  issuedByName: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  notes?: string;
}

export interface OwnerInfo {
  name: string;
  idNumber: string;
  phoneNumber: string;
  address?: string;
  licenseNumber?: string;
}

export interface InsuranceInfo {
  company: string;
  policyNumber: string;
  expiryDate: string;
  contactNumber?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
  uploadedById: string;
}

// Constants
export const INCIDENT_STATUS_LABELS: Record<IncidentStatus, string> = {
  PENDING: 'Pending',
  INVESTIGATING: 'Investigating',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CITATION_ISSUED: 'Citation Issued'
};

export const INCIDENT_STATUS_COLORS: Record<IncidentStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  INVESTIGATING: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  RESOLVED: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  CLOSED: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  CITATION_ISSUED: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' }
};

export const ACCIDENT_SEVERITY_LABELS: Record<AccidentSeverity, string> = {
  MINOR: 'Minor',
  SERIOUS: 'Serious',
  FATAL: 'Fatal',
  PROPERTY_DAMAGE: 'Property Damage Only'
};

export const ACCIDENT_SEVERITY_COLORS: Record<AccidentSeverity, { bg: string; text: string }> = {
  MINOR: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  SERIOUS: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
  FATAL: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  PROPERTY_DAMAGE: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' }
};

export const IMPOUND_REASON_LABELS: Record<ImpoundReason, string> = {
  PARKING_VIOLATION: 'Parking Violation',
  EXPIRED_LICENSE: 'Expired License',
  NO_INSURANCE: 'No Insurance',
  STOLEN_VEHICLE: 'Stolen Vehicle',
  DANGEROUS_DRIVING: 'Dangerous Driving',
  OTHER: 'Other'
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  UNPAID: 'Unpaid',
  WAIVED: 'Waived',
  PENDING: 'Pending'
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; text: string }> = {
  PAID: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  UNPAID: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  WAIVED: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  PENDING: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' }
};
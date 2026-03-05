// types/settings.ts

import type { UserRole } from "@prisma/client";

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  badgeNumber?: string | null;
  phoneNumber?: string | null;
  rank?: string | null;
  department?: string | null;
  avatar?: string | null;
  dateOfBirth?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  stationId?: string | null;
  station?: { id: string; name: string; code: string } | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Stations ─────────────────────────────────────────────────────────────────

export interface StationData {
  id: string;
  name: string;
  code: string;
  county: string;
  subCounty: string;
  address: string;
  phoneNumber: string;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  commander?: string | null;
  capacity?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { User: number; Case: number; OccurrenceBook: number };
}

export interface CreateStationData {
  name: string;
  code: string;
  county: string;
  subCounty: string;
  address: string;
  phoneNumber: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  commander?: string;
  capacity?: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  badgeNumber?: string | null;
  phoneNumber?: string | null;
  rank?: string | null;
  department?: string | null;
  avatar?: string | null;
  stationId?: string | null;
  station?: { id: string; name: string; code: string } | null;
  isActive: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Shared constants ─────────────────────────────────────────────────────────

export const KENYAN_COUNTIES = [
  "Baringo","Bomet","Bungoma","Busia","Elgeyo-Marakwet","Embu","Garissa",
  "Homa Bay","Isiolo","Kajiado","Kakamega","Kericho","Kiambu","Kilifi",
  "Kirinyaga","Kisii","Kisumu","Kitui","Kwale","Laikipia","Lamu","Machakos",
  "Makueni","Mandera","Marsabit","Meru","Migori","Mombasa","Murang'a",
  "Nairobi","Nakuru","Nandi","Narok","Nyamira","Nyandarua","Nyeri",
  "Samburu","Siaya","Taita-Taveta","Tana River","Tharaka-Nithi","Trans Nzoia",
  "Turkana","Uasin Gishu","Vihiga","Wajir","West Pokot",
] as const;

export const USER_ROLES: UserRole[] = [
  "SUPER_ADMIN","ADMIN","STATION_COMMANDER","OCS","DETECTIVE",
  "TRAFFIC_OFFICER","GBV_OFFICER","RECORDS_OFFICER","OFFICER","CONSTABLE","PUBLIC",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN:       "Super Admin",
  ADMIN:             "Admin",
  STATION_COMMANDER: "Station Commander",
  OCS:               "OCS",
  DETECTIVE:         "Detective",
  TRAFFIC_OFFICER:   "Traffic Officer",
  GBV_OFFICER:       "GBV Officer",
  RECORDS_OFFICER:   "Records Officer",
  OFFICER:           "Officer",
  CONSTABLE:         "Constable",
  PUBLIC:            "Public",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN:       "bg-red-100 text-red-700 border-red-200",
  ADMIN:             "bg-orange-100 text-orange-700 border-orange-200",
  STATION_COMMANDER: "bg-purple-100 text-purple-700 border-purple-200",
  OCS:               "bg-indigo-100 text-indigo-700 border-indigo-200",
  DETECTIVE:         "bg-blue-100 text-blue-700 border-blue-200",
  TRAFFIC_OFFICER:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  GBV_OFFICER:       "bg-pink-100 text-pink-700 border-pink-200",
  RECORDS_OFFICER:   "bg-cyan-100 text-cyan-700 border-cyan-200",
  OFFICER:           "bg-green-100 text-green-700 border-green-200",
  CONSTABLE:         "bg-teal-100 text-teal-700 border-teal-200",
  PUBLIC:            "bg-gray-100 text-gray-600 border-gray-200",
};
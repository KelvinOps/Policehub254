// ============================================
// FILE 1: src/lib/constants/roles.ts
// ============================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  STATION_COMMANDER = 'STATION_COMMANDER',
  OCS = 'OCS', // Officer Commanding Station
  INVESTIGATOR = 'INVESTIGATOR',
  DESK_OFFICER = 'DESK_OFFICER',
  FIELD_OFFICER = 'FIELD_OFFICER',
  TRAFFIC_OFFICER = 'TRAFFIC_OFFICER',
  GBV_OFFICER = 'GBV_OFFICER',
  PUBLIC = 'PUBLIC'
}

export const ROLE_PERMISSIONS = {
  [UserRole.SUPER_ADMIN]: {
    canAccessAllStations: true,
    canManageUsers: true,
    canViewReports: true,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: true,
    canManageResources: true,
  },
  [UserRole.STATION_COMMANDER]: {
    canAccessAllStations: false,
    canManageUsers: true,
    canViewReports: true,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: true,
    canManageResources: true,
  },
  [UserRole.OCS]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: true,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: false,
    canManageResources: true,
  },
  [UserRole.INVESTIGATOR]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: true,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: false,
    canManageResources: false,
  },
  [UserRole.DESK_OFFICER]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: false,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: false,
    canManageResources: false,
  },
  [UserRole.FIELD_OFFICER]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: false,
    canCreateOB: true,
    canEditOB: false,
    canDeleteOB: false,
    canManageResources: false,
  },
  [UserRole.TRAFFIC_OFFICER]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: false,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: false,
    canManageResources: false,
  },
  [UserRole.GBV_OFFICER]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: true,
    canCreateOB: true,
    canEditOB: true,
    canDeleteOB: false,
    canManageResources: false,
  },
  [UserRole.PUBLIC]: {
    canAccessAllStations: false,
    canManageUsers: false,
    canViewReports: false,
    canCreateOB: false,
    canEditOB: false,
    canDeleteOB: false,
    canManageResources: false,
  }
};

export const ROLE_DISPLAY_NAMES = {
  [UserRole.SUPER_ADMIN]: 'Super Administrator',
  [UserRole.STATION_COMMANDER]: 'Station Commander',
  [UserRole.OCS]: 'Officer Commanding Station',
  [UserRole.INVESTIGATOR]: 'Investigator',
  [UserRole.DESK_OFFICER]: 'Desk Officer',
  [UserRole.FIELD_OFFICER]: 'Field Officer',
  [UserRole.TRAFFIC_OFFICER]: 'Traffic Officer',
  [UserRole.GBV_OFFICER]: 'GBV Officer',
  [UserRole.PUBLIC]: 'Public User'
};

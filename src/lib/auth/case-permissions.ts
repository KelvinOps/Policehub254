// src/lib/auth/case-permissions.ts

import { UserRole } from '@prisma/client';
import { Case, SessionUser } from '@/types/case';

export interface CasePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canAddEvidence: boolean;
  canEditEvidence: boolean;
  canDeleteEvidence: boolean;
  canLinkCriminals: boolean;
  canCloseCase: boolean;
  canReopenCase: boolean;
  canAccessAllCases: boolean;
}

export function getCasePermissions(
  user: SessionUser,
  caseData?: Case | null
): CasePermissions {
  const { role, id: userId, stationId: userStationId } = user;
  
  // Check if user is assigned to or created the case
  const isAssignedOfficer = caseData?.assignedToId === userId;
  const isCreator = caseData?.createdById === userId;
  const isInvolved = isAssignedOfficer || isCreator;
  const isSameStation = caseData?.stationId === userStationId;

  // Base permissions for all officers
  const baseOfficerPermissions: CasePermissions = {
    canView: true,
    canCreate: true,
    canEdit: false,
    canDelete: false,
    canAssign: false,
    canAddEvidence: false,
    canEditEvidence: false,
    canDeleteEvidence: false,
    canLinkCriminals: false,
    canCloseCase: false,
    canReopenCase: false,
    canAccessAllCases: false,
  };

  switch (role) {
    case UserRole.SUPER_ADMIN:
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canAssign: true,
        canAddEvidence: true,
        canEditEvidence: true,
        canDeleteEvidence: true,
        canLinkCriminals: true,
        canCloseCase: true,
        canReopenCase: true,
        canAccessAllCases: true,
      };

    case UserRole.ADMIN:
      return {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canAssign: true,
        canAddEvidence: true,
        canEditEvidence: true,
        canDeleteEvidence: true,
        canLinkCriminals: true,
        canCloseCase: true,
        canReopenCase: true,
        canAccessAllCases: true,
      };

    case UserRole.STATION_COMMANDER:
      return {
        canView: true,
        canCreate: true,
        canEdit: isSameStation,
        canDelete: false,
        canAssign: isSameStation,
        canAddEvidence: isSameStation,
        canEditEvidence: isSameStation,
        canDeleteEvidence: false,
        canLinkCriminals: isSameStation,
        canCloseCase: isSameStation,
        canReopenCase: isSameStation,
        canAccessAllCases: false, // Only within their station
      };

    case UserRole.OCS:
      return {
        canView: true,
        canCreate: true,
        canEdit: isSameStation,
        canDelete: false,
        canAssign: isSameStation,
        canAddEvidence: isSameStation,
        canEditEvidence: isSameStation,
        canDeleteEvidence: false,
        canLinkCriminals: isSameStation,
        canCloseCase: isSameStation,
        canReopenCase: false,
        canAccessAllCases: false,
      };

    case UserRole.DETECTIVE:
      return {
        canView: true,
        canCreate: true,
        canEdit: isInvolved && isSameStation,
        canDelete: false,
        canAssign: false,
        canAddEvidence: isInvolved && isSameStation,
        canEditEvidence: isInvolved && isSameStation,
        canDeleteEvidence: false,
        canLinkCriminals: isInvolved && isSameStation,
        canCloseCase: isInvolved && isSameStation,
        canReopenCase: false,
        canAccessAllCases: false,
      };

    case UserRole.TRAFFIC_OFFICER:
      const isTrafficCase = caseData?.category === 'TRAFFIC_ACCIDENT';
      return {
        ...baseOfficerPermissions,
        canEdit: isInvolved && isSameStation && isTrafficCase,
        canAddEvidence: isInvolved && isSameStation && isTrafficCase,
        canEditEvidence: isInvolved && isSameStation && isTrafficCase,
      };

    case UserRole.GBV_OFFICER:
      const isGBVCase = caseData?.category === 'RAPE' || caseData?.category === 'DOMESTIC_VIOLENCE';
      return {
        ...baseOfficerPermissions,
        canEdit: isInvolved && isSameStation && isGBVCase,
        canAddEvidence: isInvolved && isSameStation && isGBVCase,
        canEditEvidence: isInvolved && isSameStation && isGBVCase,
        canLinkCriminals: isInvolved && isSameStation && isGBVCase,
      };

    case UserRole.RECORDS_OFFICER:
      return {
        ...baseOfficerPermissions,
        canView: isSameStation,
        canEdit: false,
        canAddEvidence: false,
      };

    case UserRole.OFFICER:
    case UserRole.CONSTABLE:
      return {
        ...baseOfficerPermissions,
        canEdit: isInvolved && isSameStation,
        canAddEvidence: isInvolved && isSameStation,
        canEditEvidence: isInvolved && isSameStation,
      };

    case UserRole.PUBLIC:
      return {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canAssign: false,
        canAddEvidence: false,
        canEditEvidence: false,
        canDeleteEvidence: false,
        canLinkCriminals: false,
        canCloseCase: false,
        canReopenCase: false,
        canAccessAllCases: false,
      };

    default:
      return baseOfficerPermissions;
  }
}

export function canAccessCase(
  user: SessionUser,
  caseData: Case
): boolean {
  const permissions = getCasePermissions(user, caseData);
  
  // Super admin and admin can access all cases
  if (permissions.canAccessAllCases && 
      (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN)) {
    return true;
  }
  
  // Station-level access (Commander, OCS)
  if (caseData.stationId === user.stationId && 
      (user.role === UserRole.STATION_COMMANDER || user.role === UserRole.OCS)) {
    return true;
  }
  
  // Check if user is involved in the case
  if (caseData.assignedToId === user.id || caseData.createdById === user.id) {
    return true;
  }
  
  // Check if case is in user's station and they have view permission
  return caseData.stationId === user.stationId && permissions.canView;
}

export function filterCasesByPermission(
  cases: Case[],
  user: SessionUser
): Case[] {
  // Super admin and admin see all cases
  if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
    return cases;
  }

  // Filter based on access permissions
  return cases.filter(caseData => canAccessCase(user, caseData));
}

/**
 * Get list of roles that can be assigned cases
 */
export function getAssignableRoles(): UserRole[] {
  return [
    UserRole.DETECTIVE,
    UserRole.OFFICER,
    UserRole.CONSTABLE,
    UserRole.TRAFFIC_OFFICER,
    UserRole.GBV_OFFICER,
  ];
}
// src/lib/db/queries/cases.ts
//
// ROOT CAUSE OF BUG:
// Prisma auto-generates relation names like `User_Case_assignedToIdToUser`
// when a model has multiple FK relations to the same table (Case → User × 2).
// Fix: use the Prisma-generated names everywhere, then re-map to clean shapes
// for the rest of the app so nothing else needs to change.

import { prisma } from '../prisma';
import { CaseStatus, IncidentCategory } from '@prisma/client';
import { CaseFilters } from '@/types/case';

// ── Relation name constants ────────────────────────────────────────────────────
// These match exactly what Prisma generated (visible in the error message).
const ASSIGNED_TO = 'User_Case_assignedToIdToUser' as const;
const CREATED_BY  = 'User_Case_createdByIdToUser'  as const;
const EVIDENCE    = 'Evidence'                      as const;
const OB_ENTRY    = 'OccurrenceBook'               as const;

// ── Select shapes (reused across queries) ─────────────────────────────────────
const officerSelect = {
  id:          true,
  name:        true,
  email:       true,
  badgeNumber: true,
  phoneNumber: true,
} as const;

const officerSelectBasic = {
  id:          true,
  name:        true,
  badgeNumber: true,
} as const;

// ── Helper: remap raw Prisma result to friendly shape ─────────────────────────
// Converts User_Case_assignedToIdToUser → assignedTo, etc.
function remapCase(raw: any) {
  if (!raw) return null;
  const {
    [ASSIGNED_TO]: assignedTo,
    [CREATED_BY]:  createdBy,
    [EVIDENCE]:    evidence,
    [OB_ENTRY]:    obEntry,
    ...rest
  } = raw;
  return { ...rest, assignedTo, createdBy, evidence, obEntry };
}

function remapCases(raws: any[]) {
  return raws.map(remapCase);
}

// ── createCase ────────────────────────────────────────────────────────────────

export async function createCase(data: {
  title:         string;
  description:   string;
  category:      IncidentCategory;
  priority:      string;
  stationId:     string;
  createdById:   string;
  assignedToId?: string;
  obEntryId?:    string;
}) {
  const year = new Date().getFullYear();

  const lastCase = await prisma.case.findFirst({
    where:   { caseNumber: { startsWith: `CASE-${year}-` } },
    orderBy: { createdAt: 'desc' },
    select:  { caseNumber: true },
  });

  const nextNum = lastCase
    ? parseInt(lastCase.caseNumber.split('-')[2]) + 1
    : 1;
  const caseNumber = `CASE-${year}-${String(nextNum).padStart(6, '0')}`;

  const raw = await prisma.case.create({
    data: {
      caseNumber,
      title:        data.title,
      description:  data.description,
      category:     data.category,
      priority:     data.priority,
      stationId:    data.stationId,
      createdById:  data.createdById,
      assignedToId: data.assignedToId,
    },
    include: {
      Station:     { select: { id: true, name: true, code: true } },
      [ASSIGNED_TO]: { select: officerSelectBasic },
      [CREATED_BY]:  { select: officerSelectBasic },
    },
  });

  return remapCase(raw);
}

// ── getCases ──────────────────────────────────────────────────────────────────

export async function getCases(filters: CaseFilters = {}) {
  const where: any = {};

  if (filters.status)       where.status       = filters.status;
  if (filters.priority)     where.priority     = filters.priority;
  if (filters.category)     where.category     = filters.category;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.stationId)    where.stationId    = filters.stationId;

  if (filters.search) {
    where.OR = [
      { caseNumber:  { contains: filters.search, mode: 'insensitive' } },
      { title:       { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo)   where.createdAt.lte = filters.dateTo;
  }

  const raws = await prisma.case.findMany({
    where,
    include: {
      Station:       { select: { id: true, name: true, code: true } },
      [ASSIGNED_TO]: { select: officerSelectBasic },
      [CREATED_BY]:  { select: officerSelectBasic },
      criminals:     { select: { id: true, firstName: true, lastName: true, idNumber: true, photoUrl: true } },
      [EVIDENCE]:    { select: { id: true, type: true, description: true, createdAt: true } },
      [OB_ENTRY]:    { select: { id: true, obNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return remapCases(raws);
}

// ── getCaseById ───────────────────────────────────────────────────────────────

export async function getCaseById(id: string) {
  const raw = await prisma.case.findUnique({
    where: { id },
    include: {
      Station:       true,
      [ASSIGNED_TO]: { select: officerSelect },
      [CREATED_BY]:  { select: { id: true, name: true, email: true, badgeNumber: true } },
      criminals: {
        select: {
          id: true, firstName: true, middleName: true, lastName: true,
          dateOfBirth: true, gender: true, idNumber: true,
          photoUrl: true, isWanted: true, wantedReason: true,
        },
      },
      [EVIDENCE]: {
        orderBy: { collectedAt: 'desc' },
      },
      [OB_ENTRY]: {
        select: { id: true, obNumber: true, incidentDate: true, location: true, category: true },
      },
    },
  });

  return remapCase(raw);
}

// ── updateCase ────────────────────────────────────────────────────────────────

export async function updateCase(id: string, data: {
  title?:        string;
  description?:  string;
  status?:       CaseStatus;
  priority?:     string;
  assignedToId?: string;
  courtDate?:    Date;
  courtCase?:    string;
  outcome?:      string;
}) {
  const updateData: any = { ...data };

  if (data.status === 'CLOSED' || data.status === 'DISMISSED') {
    updateData.closedAt = new Date();
  }

  const raw = await prisma.case.update({
    where: { id },
    data:  updateData,
    include: {
      Station:       true,
      [ASSIGNED_TO]: true,
      [CREATED_BY]:  true,
      criminals:     true,
      [EVIDENCE]:    true,
    },
  });

  return remapCase(raw);
}

// ── Criminal linking ──────────────────────────────────────────────────────────

export async function linkCriminalToCase(caseId: string, criminalId: string) {
  return prisma.case.update({
    where: { id: caseId },
    data:  { criminals: { connect: { id: criminalId } } },
  });
}

export async function unlinkCriminalFromCase(caseId: string, criminalId: string) {
  return prisma.case.update({
    where: { id: caseId },
    data:  { criminals: { disconnect: { id: criminalId } } },
  });
}

// ── Evidence ──────────────────────────────────────────────────────────────────

export async function addEvidence(data: {
  caseId:          string;
  type:            string;
  description:     string;
  fileUrl?:        string;
  collectedBy:     string;
  collectedAt:     Date;
  chainOfCustody?: any[];
}) {
  return prisma.evidence.create({
    data: {
      caseId:          data.caseId,
      type:            data.type,
      description:     data.description,
      fileUrl:         data.fileUrl,
      collectedBy:     data.collectedBy,
      collectedAt:     data.collectedAt,
      chainOfCustody:  data.chainOfCustody ?? [],
    },
  });
}

export async function updateEvidence(id: string, data: {
  description?:    string;
  chainOfCustody?: any[];
}) {
  return prisma.evidence.update({ where: { id }, data });
}

export async function deleteEvidence(id: string) {
  return prisma.evidence.delete({ where: { id } });
}

// ── Statistics ────────────────────────────────────────────────────────────────

export async function getCaseStatistics(stationId?: string) {
  const where = stationId ? { stationId } : {};

  const [total, byStatus, byPriority, byCategory, closedCases, convictedCases] =
    await Promise.all([
      prisma.case.count({ where }),

      prisma.case.groupBy({ by: ['status'],   where, _count: true }),
      prisma.case.groupBy({ by: ['priority'], where, _count: true }),
      prisma.case.groupBy({ by: ['category'], where, _count: true }),

      prisma.case.findMany({
        where: { ...where, status: { in: ['CLOSED', 'DISMISSED'] }, closedAt: { not: null } },
        select: { createdAt: true, closedAt: true },
      }),

      prisma.case.count({
        where: { ...where, outcome: { contains: 'Convicted' } },
      }),
    ]);

  const avgResolutionTime =
    closedCases.length > 0
      ? closedCases.reduce((sum, c) => {
          return sum + (c.closedAt!.getTime() - c.createdAt.getTime()) / 86_400_000;
        }, 0) / closedCases.length
      : 0;

  const convictionRate =
    closedCases.length > 0
      ? (convictedCases / closedCases.length) * 100
      : 0;

  return {
    total,
    byStatus:   Object.fromEntries(byStatus.map(s   => [s.status,   s._count])),
    byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
    byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
    avgResolutionTime: Math.round(avgResolutionTime),
    convictionRate:    Math.round(convictionRate * 10) / 10,
  };
}
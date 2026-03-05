// src/lib/db/queries/occurrence-book.ts
import { prisma } from '@/lib/db/prisma';
import { IncidentCategory, IncidentStatus, Prisma } from '@prisma/client';

export interface CreateOBEntryInput {
  incidentDate: Date;
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
  witnesses?: any;
  suspects?: any;
}

export interface SearchOBParams {
  stationId?: string;
  category?: IncidentCategory;
  status?: IncidentStatus;
  dateFrom?: Date;
  dateTo?: Date;
  searchTerm?: string;
  page?: number;
  limit?: number;
}

export interface UpdateOBEntryInput {
  incidentDate?: Date;
  category?: IncidentCategory;
  description?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  status?: IncidentStatus;
  reportedBy?: string;
  contactNumber?: string;
  evidenceFiles?: string[];
  witnesses?: any;
  suspects?: any;
  caseId?: string | null;
}

// ─── Shared include shapes ────────────────────────────────────────────────────
// Relation names MUST match schema exactly:
//   OccurrenceBook.Station  (via "StationOccurrenceBooks")
//   OccurrenceBook.User     (recordedById)
//   OccurrenceBook.Case     (caseId — one-to-one, singular "Case" not "cases")
//
// On the Case side:
//   Case.User_Case_assignedToIdToUser  (NOT "assignedTo" — that's the relation alias)

const OB_INCLUDE_BASIC = {
  Station: {
    select: {
      id: true,
      name: true,
      code: true,
      county: true,
    },
  },
  User: {
    select: {
      id: true,
      name: true,
      badgeNumber: true,
      role: true,
    },
  },
  Case: {
    select: {
      id: true,
      caseNumber: true,
      status: true,
    },
  },
} satisfies Prisma.OccurrenceBookInclude;

const OB_INCLUDE_DETAIL = {
  Station: {
    select: {
      id: true,
      name: true,
      code: true,
      county: true,
      address: true,
      phoneNumber: true,
    },
  },
  User: {
    select: {
      id: true,
      name: true,
      badgeNumber: true,
      role: true,
      phoneNumber: true,
    },
  },
  // One-to-one: singular "Case", not "cases"
  Case: {
    select: {
      id: true,
      caseNumber: true,
      title: true,
      status: true,
      priority: true,
      createdAt: true,
      // Schema relation name for assignedTo user on Case model
      User_Case_assignedToIdToUser: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
        },
      },
    },
  },
} satisfies Prisma.OccurrenceBookInclude;

// ─── Generate OB Number ───────────────────────────────────────────────────────

async function generateOBNumber(stationId: string): Promise<string> {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    select: { code: true },
  });

  if (!station) {
    throw new Error(`Station not found for ID: ${stationId}`);
  }

  const year = new Date().getFullYear();

  const count = await prisma.occurrenceBook.count({
    where: {
      stationId,
      createdAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt:  new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });

  return `${station.code}/${year}/${String(count + 1).padStart(5, '0')}`;
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createOBEntry(data: CreateOBEntryInput) {
  const obNumber = await generateOBNumber(data.stationId);

  const witnessesValue =
    data.witnesses != null
      ? (data.witnesses as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  const suspectsValue =
    data.suspects != null
      ? (data.suspects as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  return await prisma.occurrenceBook.create({
    data: {
      obNumber,
      reportedDate:  new Date(),
      status:        IncidentStatus.REPORTED,
      incidentDate:  data.incidentDate,
      category:      data.category,
      description:   data.description,
      location:      data.location,
      latitude:      data.latitude  ?? null,
      longitude:     data.longitude ?? null,
      reportedBy:    data.reportedBy,
      contactNumber: data.contactNumber,
      stationId:     data.stationId,
      recordedById:  data.recordedById,
      ...(data.evidenceFiles !== undefined && {
        evidenceFiles: data.evidenceFiles,
      }),
      witnesses: witnessesValue,
      suspects:  suspectsValue,
    },
    include: OB_INCLUDE_BASIC,
  });
}

// ─── Search / list ────────────────────────────────────────────────────────────

export async function searchOBEntries(params: SearchOBParams) {
  const {
    stationId,
    category,
    status,
    dateFrom,
    dateTo,
    searchTerm,
    page  = 1,
    limit = 20,
  } = params;

  const where: Prisma.OccurrenceBookWhereInput = {};

  if (stationId)  where.stationId = stationId;
  if (category)   where.category  = category;
  if (status)     where.status    = status;

  if (dateFrom || dateTo) {
    where.incidentDate = {};
    if (dateFrom) where.incidentDate.gte = dateFrom;
    if (dateTo)   where.incidentDate.lte = dateTo;
  }

  if (searchTerm) {
    where.OR = [
      { obNumber:     { contains: searchTerm, mode: 'insensitive' } },
      { description:  { contains: searchTerm, mode: 'insensitive' } },
      { location:     { contains: searchTerm, mode: 'insensitive' } },
      { reportedBy:   { contains: searchTerm, mode: 'insensitive' } },
      { contactNumber:{ contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  // Sequential queries — avoids exhausting Neon's free-tier connection pool
  const entries = await prisma.occurrenceBook.findMany({
    where,
    skip,
    take:     limit,
    orderBy:  { incidentDate: 'desc' },
    include:  OB_INCLUDE_BASIC,
  });

  const total = await prisma.occurrenceBook.count({ where });

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Get by ID (single, with full detail) ─────────────────────────────────────
// ONE implementation only — uses OB_INCLUDE_DETAIL which includes the linked
// Case (one-to-one) and the assigned officer via the correct relation name.

export async function getOBEntryById(id: string) {
  return await prisma.occurrenceBook.findUnique({
    where: { id },
    include: OB_INCLUDE_DETAIL,
  });
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateOBEntry(id: string, data: UpdateOBEntryInput) {
  const updateData: any = { ...data };

  if ('witnesses' in data) {
    updateData.witnesses =
      data.witnesses != null
        ? (data.witnesses as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }

  if ('suspects' in data) {
    updateData.suspects =
      data.suspects != null
        ? (data.suspects as Prisma.InputJsonValue)
        : Prisma.JsonNull;
  }

  return await prisma.occurrenceBook.update({
    where: { id },
    data:    updateData,
    include: OB_INCLUDE_BASIC,
  });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteOBEntry(id: string) {
  return await prisma.occurrenceBook.delete({
    where: { id },
  });
}

// ─── Report export ────────────────────────────────────────────────────────────

export async function getOBEntriesForReport(filters: {
  stationId?: string;
  category?:  IncidentCategory;
  status?:    IncidentStatus;
  dateFrom?:  Date;
  dateTo?:    Date;
}) {
  const where: Prisma.OccurrenceBookWhereInput = {};

  if (filters.stationId) where.stationId = filters.stationId;
  if (filters.category)  where.category  = filters.category;
  if (filters.status)    where.status    = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    where.incidentDate = {};
    if (filters.dateFrom) where.incidentDate.gte = filters.dateFrom;
    if (filters.dateTo)   where.incidentDate.lte = filters.dateTo;
  }

  return await prisma.occurrenceBook.findMany({
    where,
    orderBy: { incidentDate: 'desc' },
    include: {
      Station: { select: { name: true, code: true, county: true } },
      User:    { select: { name: true, badgeNumber: true } },
      Case:    { select: { caseNumber: true, status: true } },
    },
  });
}

// ─── Caseless OB stats (for dashboard widget) ─────────────────────────────────
// "Caseless" = OccurrenceBook.caseId IS NULL (one-to-one FK on OB side)

export async function getCaselessOBStats(stationId?: string) {
  const caselessWhere: Prisma.OccurrenceBookWhereInput = {
    ...(stationId ? { stationId } : {}),
    caseId: null,   // one-to-one: null means no case linked
  };

  const baseWhere: Prisma.OccurrenceBookWhereInput = stationId ? { stationId } : {};

  // Sequential to stay within Neon connection limits
  const totalCaseless = await prisma.occurrenceBook.count({ where: caselessWhere });

  const byCategory = await prisma.occurrenceBook.groupBy({
    by:      ['category'],
    where:   caselessWhere,
    _count:  { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  const byStatus = await prisma.occurrenceBook.groupBy({
    by:    ['status'],
    where: caselessWhere,
    _count: { id: true },
  });

  const recentCaseless = await prisma.occurrenceBook.findMany({
    where:   caselessWhere,
    select: {
      id:           true,
      obNumber:     true,
      incidentDate: true,
      category:     true,
      status:       true,
      location:     true,
      Station:      { select: { name: true, code: true } },
    },
    orderBy: { incidentDate: 'desc' },
    take:    5,
  });

  const totalOB = await prisma.occurrenceBook.count({ where: baseWhere });

  return {
    totalCaseless,
    totalOB,
    caselessPercent: totalOB > 0 ? Math.round((totalCaseless / totalOB) * 100) : 0,
    byCategory: byCategory.map(r => ({ category: r.category, count: r._count.id })),
    byStatus:   byStatus.map(r   => ({ status:   r.status,   count: r._count.id })),
    recentCaseless,
  };
}

// ─── Caseless OB entries paginated (drill-down) ───────────────────────────────

export async function getCaselessOBEntries(params: {
  stationId?: string;
  category?:  IncidentCategory;
  status?:    IncidentStatus;
  page?:      number;
  limit?:     number;
}) {
  const { stationId, category, status, page = 1, limit = 20 } = params;

  const where: Prisma.OccurrenceBookWhereInput = {
    caseId: null,
    ...(stationId ? { stationId } : {}),
    ...(category  ? { category  } : {}),
    ...(status    ? { status    } : {}),
  };

  const entries = await prisma.occurrenceBook.findMany({
    where,
    include: {
      Station: { select: { name: true, code: true } },
      User:    { select: { name: true, badgeNumber: true } },
    },
    orderBy: { incidentDate: 'desc' },
    skip:    (page - 1) * limit,
    take:    limit,
  });

  const total = await prisma.occurrenceBook.count({ where });

  return {
    entries,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export async function getOBStatistics(stationId?: string) {
  const where: Prisma.OccurrenceBookWhereInput = stationId ? { stationId } : {};

  const now             = new Date();
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(),     1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth  = new Date(now.getFullYear(), now.getMonth(),     0, 23, 59, 59, 999);

  // Sequential queries — avoids Neon pool exhaustion
  const totalIncidents = await prisma.occurrenceBook.count({ where });

  const thisMonthIncidents = await prisma.occurrenceBook.count({
    where: { ...where, incidentDate: { gte: startOfMonth } },
  });

  const lastMonthIncidents = await prisma.occurrenceBook.count({
    where: { ...where, incidentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
  });

  const byCategory = await prisma.occurrenceBook.groupBy({
    by:    ['category'],
    where,
    _count: true,
  });

  const byStatus = await prisma.occurrenceBook.groupBy({
    by:    ['status'],
    where,
    _count: true,
  });

  const percentageChange =
    lastMonthIncidents > 0
      ? ((thisMonthIncidents - lastMonthIncidents) / lastMonthIncidents) * 100
      : 100;

  return {
    total:            totalIncidents,
    thisMonth:        thisMonthIncidents,
    lastMonth:        lastMonthIncidents,
    percentageChange: Math.round(percentageChange * 10) / 10,
    byCategory:       byCategory.map(item => ({ category: item.category, count: item._count })),
    byStatus:         byStatus.map(item   => ({ status:   item.status,   count: item._count })),
  };
}

// ─── Recent entries ───────────────────────────────────────────────────────────

export async function getRecentOBEntries(stationId?: string, limit = 10) {
  const where: Prisma.OccurrenceBookWhereInput = stationId ? { stationId } : {};

  return await prisma.occurrenceBook.findMany({
    where,
    take:    limit,
    orderBy: { createdAt: 'desc' },
    include: {
      Station: { select: { name: true, code: true } },
      User:    { select: { name: true } },
    },
  });
}
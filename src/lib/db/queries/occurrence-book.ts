// src/lib/db/queries/occurrence-book.ts
import { prisma } from '@/lib/db/prisma';
import { IncidentCategory, IncidentStatus, Prisma } from '@prisma/client';

// Types
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
  latitude?: number;
  longitude?: number;
  status?: IncidentStatus;
  reportedBy?: string;
  contactNumber?: string;
  evidenceFiles?: string[];
  witnesses?: any;
  suspects?: any;
  caseId?: string;
}

/**
 * Create a new OB entry
 */
export async function createOBEntry(data: CreateOBEntryInput) {
  // Generate OB Number
  const station = await prisma.station.findUnique({
    where: { id: data.stationId },
    select: { code: true },
  });

  if (!station) {
    throw new Error('Station not found');
  }

  // Get count for current year
  const year = new Date().getFullYear();
  const count = await prisma.occurrenceBook.count({
    where: {
      stationId: data.stationId,
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });

  const obNumber = `${station.code}/${year}/${String(count + 1).padStart(5, '0')}`;

  return await prisma.occurrenceBook.create({
    data: {
      ...data,
      obNumber,
      reportedDate: new Date(),
      status: IncidentStatus.REPORTED,
    },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
          county: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
          role: true,
        },
      },
      case: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Search and filter OB entries
 */
export async function searchOBEntries(params: SearchOBParams) {
  const {
    stationId,
    category,
    status,
    dateFrom,
    dateTo,
    searchTerm,
    page = 1,
    limit = 20,
  } = params;

  const where: Prisma.OccurrenceBookWhereInput = {};

  if (stationId) {
    where.stationId = stationId;
  }

  if (category) {
    where.category = category;
  }

  if (status) {
    where.status = status;
  }

  if (dateFrom || dateTo) {
    where.incidentDate = {};
    if (dateFrom) where.incidentDate.gte = dateFrom;
    if (dateTo) where.incidentDate.lte = dateTo;
  }

  if (searchTerm) {
    where.OR = [
      { obNumber: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { location: { contains: searchTerm, mode: 'insensitive' } },
      { reportedBy: { contains: searchTerm, mode: 'insensitive' } },
      { contactNumber: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.occurrenceBook.findMany({
      where,
      skip,
      take: limit,
      orderBy: { incidentDate: 'desc' },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
            county: true,
          },
        },
        recordedBy: {
          select: {
            id: true,
            name: true,
            badgeNumber: true,
            role: true,
          },
        },
        case: {
          select: {
            id: true,
            caseNumber: true,
            status: true,
          },
        },
      },
    }),
    prisma.occurrenceBook.count({ where }),
  ]);

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

/**
 * Get OB entry by ID
 */
export async function getOBEntryById(id: string) {
  return await prisma.occurrenceBook.findUnique({
    where: { id },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
          county: true,
          address: true,
          phoneNumber: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
          role: true,
          phoneNumber: true,
        },
      },
      case: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
          status: true,
          priority: true,
          assignedTo: {
            select: {
              id: true,
              name: true,
              badgeNumber: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Update OB entry
 */
export async function updateOBEntry(id: string, data: UpdateOBEntryInput) {
  return await prisma.occurrenceBook.update({
    where: { id },
    data,
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
        },
      },
      case: {
        select: {
          id: true,
          caseNumber: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Delete OB entry
 */
export async function deleteOBEntry(id: string) {
  return await prisma.occurrenceBook.delete({
    where: { id },
  });
}

/**
 * Get OB entries for report generation
 */
export async function getOBEntriesForReport(filters: {
  stationId?: string;
  category?: IncidentCategory;
  status?: IncidentStatus;
  dateFrom?: Date;
  dateTo?: Date;
}) {
  const where: Prisma.OccurrenceBookWhereInput = {};

  if (filters.stationId) where.stationId = filters.stationId;
  if (filters.category) where.category = filters.category;
  if (filters.status) where.status = filters.status;

  if (filters.dateFrom || filters.dateTo) {
    where.incidentDate = {};
    if (filters.dateFrom) where.incidentDate.gte = filters.dateFrom;
    if (filters.dateTo) where.incidentDate.lte = filters.dateTo;
  }

  return await prisma.occurrenceBook.findMany({
    where,
    orderBy: { incidentDate: 'desc' },
    include: {
      station: {
        select: {
          name: true,
          code: true,
          county: true,
        },
      },
      recordedBy: {
        select: {
          name: true,
          badgeNumber: true,
        },
      },
      case: {
        select: {
          caseNumber: true,
          status: true,
        },
      },
    },
  });
}

/**
 * Get statistics for dashboard
 */
export async function getOBStatistics(stationId?: string) {
  const where: Prisma.OccurrenceBookWhereInput = stationId
    ? { stationId }
    : {};

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalIncidents,
    thisMonthIncidents,
    lastMonthIncidents,
    byCategory,
    byStatus,
  ] = await Promise.all([
    prisma.occurrenceBook.count({ where }),
    prisma.occurrenceBook.count({
      where: {
        ...where,
        incidentDate: { gte: startOfMonth },
      },
    }),
    prisma.occurrenceBook.count({
      where: {
        ...where,
        incidentDate: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    }),
    prisma.occurrenceBook.groupBy({
      by: ['category'],
      where,
      _count: true,
    }),
    prisma.occurrenceBook.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
  ]);

  const percentageChange =
    lastMonthIncidents > 0
      ? ((thisMonthIncidents - lastMonthIncidents) / lastMonthIncidents) * 100
      : 100;

  return {
    total: totalIncidents,
    thisMonth: thisMonthIncidents,
    lastMonth: lastMonthIncidents,
    percentageChange: Math.round(percentageChange * 10) / 10,
    byCategory: byCategory.map((item) => ({
      category: item.category,
      count: item._count,
    })),
    byStatus: byStatus.map((item) => ({
      status: item.status,
      count: item._count,
    })),
  };
}

/**
 * Get recent OB entries
 */
export async function getRecentOBEntries(stationId?: string, limit = 10) {
  const where: Prisma.OccurrenceBookWhereInput = stationId
    ? { stationId }
    : {};

  return await prisma.occurrenceBook.findMany({
    where,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      station: {
        select: {
          name: true,
          code: true,
        },
      },
      recordedBy: {
        select: {
          name: true,
        },
      },
    },
  });
}
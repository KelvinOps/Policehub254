// src/lib/db/queries/cases.ts

import { prisma } from '../prisma';
import { CaseStatus, IncidentCategory } from '@prisma/client';
import { CaseFilters } from '@/types/case';

export async function createCase(data: {
  title: string;
  description: string;
  category: IncidentCategory;
  priority: string;
  stationId: string;
  createdById: string;
  assignedToId?: string;
  obEntryId?: string;
}) {
  // Generate case number
  const year = new Date().getFullYear();
  const lastCase = await prisma.case.findFirst({
    where: {
      caseNumber: {
        startsWith: `CASE-${year}-`,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let caseNumber: string;
  if (lastCase) {
    const lastNumber = parseInt(lastCase.caseNumber.split('-')[2]);
    caseNumber = `CASE-${year}-${String(lastNumber + 1).padStart(6, '0')}`;
  } else {
    caseNumber = `CASE-${year}-000001`;
  }

  return await prisma.case.create({
    data: {
      caseNumber,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      stationId: data.stationId,
      createdById: data.createdById,
      assignedToId: data.assignedToId,
    },
    include: {
      station: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
        },
      },
    },
  });
}

export async function getCases(filters: CaseFilters = {}) {
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.category) where.category = filters.category;
  if (filters.assignedToId) where.assignedToId = filters.assignedToId;
  if (filters.stationId) where.stationId = filters.stationId;
  
  if (filters.search) {
    where.OR = [
      { caseNumber: { contains: filters.search, mode: 'insensitive' } },
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }

  return await prisma.case.findMany({
    where,
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          badgeNumber: true,
        },
      },
      criminals: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          idNumber: true,
          photoUrl: true,
        },
      },
      evidence: {
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
        },
      },
      obEntry: {
        select: {
          id: true,
          obNumber: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getCaseById(id: string) {
  return await prisma.case.findUnique({
    where: { id },
    include: {
      station: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          badgeNumber: true,
          phoneNumber: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          badgeNumber: true,
        },
      },
      criminals: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          idNumber: true,
          photoUrl: true,
          isWanted: true,
          wantedReason: true,
        },
      },
      evidence: {
        include: {
          case: {
            select: {
              id: true,
              caseNumber: true,
            },
          },
        },
        orderBy: {
          collectedAt: 'desc',
        },
      },
      obEntry: {
        select: {
          id: true,
          obNumber: true,
          incidentDate: true,
          location: true,
          category: true,
        },
      },
    },
  });
}

export async function updateCase(id: string, data: {
  title?: string;
  description?: string;
  status?: CaseStatus;
  priority?: string;
  assignedToId?: string;
  courtDate?: Date;
  courtCase?: string;
  outcome?: string;
}) {
  const updateData: any = { ...data };
  
  if (data.status === 'CLOSED' || data.status === 'DISMISSED') {
    updateData.closedAt = new Date();
  }

  return await prisma.case.update({
    where: { id },
    data: updateData,
    include: {
      station: true,
      assignedTo: true,
      createdBy: true,
      criminals: true,
      evidence: true,
    },
  });
}

export async function linkCriminalToCase(caseId: string, criminalId: string) {
  return await prisma.case.update({
    where: { id: caseId },
    data: {
      criminals: {
        connect: { id: criminalId },
      },
    },
  });
}

export async function unlinkCriminalFromCase(caseId: string, criminalId: string) {
  return await prisma.case.update({
    where: { id: caseId },
    data: {
      criminals: {
        disconnect: { id: criminalId },
      },
    },
  });
}

export async function addEvidence(data: {
  caseId: string;
  type: string;
  description: string;
  fileUrl?: string;
  collectedBy: string;
  collectedAt: Date;
  chainOfCustody?: any[];
}) {
  return await prisma.evidence.create({
    data: {
      caseId: data.caseId,
      type: data.type,
      description: data.description,
      fileUrl: data.fileUrl,
      collectedBy: data.collectedBy,
      collectedAt: data.collectedAt,
      chainOfCustody: data.chainOfCustody || [],
    },
  });
}

export async function updateEvidence(id: string, data: {
  description?: string;
  chainOfCustody?: any[];
}) {
  return await prisma.evidence.update({
    where: { id },
    data,
  });
}

export async function deleteEvidence(id: string) {
  return await prisma.evidence.delete({
    where: { id },
  });
}

export async function getCaseStatistics(stationId?: string) {
  const where = stationId ? { stationId } : {};

  const [total, byStatus, byPriority, byCategory] = await Promise.all([
    prisma.case.count({ where }),
    prisma.case.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.case.groupBy({
      by: ['priority'],
      where,
      _count: true,
    }),
    prisma.case.groupBy({
      by: ['category'],
      where,
      _count: true,
    }),
  ]);

  // Calculate average resolution time for closed cases
  const closedCases = await prisma.case.findMany({
    where: {
      ...where,
      status: { in: ['CLOSED', 'DISMISSED'] },
      closedAt: { not: null },
    },
    select: {
      createdAt: true,
      closedAt: true,
    },
  });

  const avgResolutionTime = closedCases.length > 0
    ? closedCases.reduce((sum, c) => {
        const diff = c.closedAt!.getTime() - c.createdAt.getTime();
        return sum + diff / (1000 * 60 * 60 * 24); // Convert to days
      }, 0) / closedCases.length
    : 0;

  // Calculate conviction rate
  const convictedCases = await prisma.case.count({
    where: {
      ...where,
      outcome: { contains: 'Convicted' },
    },
  });
  const convictionRate = closedCases.length > 0 ? (convictedCases / closedCases.length) * 100 : 0;

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map(s => [s.status, s._count])),
    byPriority: Object.fromEntries(byPriority.map(p => [p.priority, p._count])),
    byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
    avgResolutionTime: Math.round(avgResolutionTime),
    convictionRate: Math.round(convictionRate * 10) / 10,
  };
}
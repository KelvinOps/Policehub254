// src/app/api/occurrence-book/statistics/route.ts
// Fixed: was filtering with caseId IS NULL which excluded most records.
// Now counts ALL entries regardless of caseId, matching what the dashboard shows.

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Date boundaries
    const now       = new Date();
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Station filter (non-admins only see their station's data)
    const stationFilter =
      user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
        ? {}
        : { stationId: user.stationId };

    // Run all counts in parallel
    const [total, thisMonth, lastMonth, byCategory, byStatus] = await Promise.all([
      prisma.occurrenceBook.count({ where: stationFilter }),

      prisma.occurrenceBook.count({
        where: { ...stationFilter, incidentDate: { gte: thisStart } },
      }),

      prisma.occurrenceBook.count({
        where: { ...stationFilter, incidentDate: { gte: lastStart, lte: lastEnd } },
      }),

      prisma.occurrenceBook.groupBy({
        by:      ['category'],
        where:   stationFilter,
        _count:  { id: true },
        orderBy: { _count: { id: 'desc' } },
        take:    10,
      }),

      prisma.occurrenceBook.groupBy({
        by:     ['status'],
        where:  stationFilter,
        _count: { id: true },
      }),
    ]);

    const percentageChange =
      lastMonth === 0
        ? thisMonth > 0 ? 100 : 0
        : ((thisMonth - lastMonth) / lastMonth) * 100;

    return NextResponse.json({
      success: true,
      data: {
        total,
        thisMonth,
        lastMonth,
        percentageChange: Math.round(percentageChange * 10) / 10,
        byCategory: byCategory.map(r => ({
          category: r.category,
          count:    r._count.id,
        })),
        byStatus: byStatus.map(r => ({
          status: r.status,
          count:  r._count.id,
        })),
      },
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load statistics' },
      { status: 500 }
    );
  }
}
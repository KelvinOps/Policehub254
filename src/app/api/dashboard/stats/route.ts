// src/app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getOBStatistics, getRecentOBEntries } from '@/lib/db/queries/occurrence-book';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stationId = searchParams.get('stationId') || undefined;

    // Get OB statistics
    const obStats = await getOBStatistics(stationId);

    // Get recent entries
    const recentEntries = await getRecentOBEntries(stationId, 5);

    // Get case counts
    const activeCases = await prisma.case.count({
      where: {
        ...(stationId && { stationId }),
        status: {
          in: ['OPEN', 'UNDER_INVESTIGATION', 'PENDING_TRIAL'],
        },
      },
    });

    // Get resolved cases this month
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const resolvedThisMonth = await prisma.case.count({
      where: {
        ...(stationId && { stationId }),
        status: 'CLOSED',
        closedAt: {
          gte: startOfMonth,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalIncidents: obStats.total,
        incidentsThisMonth: obStats.thisMonth,
        percentageChange: obStats.percentageChange,
        activeCases,
        resolvedThisMonth,
        byCategory: obStats.byCategory,
        byStatus: obStats.byStatus,
        recentEntries: recentEntries.map((entry) => ({
          id: entry.id,
          title: `${entry.category.replace(/_/g, ' ')} at ${entry.station.name}`,
          type: 'OB Entry',
          time: getTimeAgo(entry.createdAt),
          status: entry.status.toLowerCase(),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard statistics',
      },
      { status: 500 }
    );
  }
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
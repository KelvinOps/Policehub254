// src/app/api/criminals/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define types for better type safety
interface StationStats {
  stationName: string;
  stationCode: string;
  count: number;
}

interface GenderStats {
  gender: string;
  count: number;
}

interface NationalityStats {
  nationality: string;
  count: number;
}

interface MonthlyTrendItem {
  month: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role');
    const userStationId = request.headers.get('x-user-station');

    // Build where clause based on permissions
    const where: { stationId?: string } = {};
    if (userRole !== 'SUPER_ADMIN' && userStationId) {
      where.stationId = userStationId;
    }

    // Get total count
    const total = await prisma.criminal.count({ where });

    // Get wanted count
    const wantedCount = await prisma.criminal.count({
      where: {
        ...where,
        isWanted: true,
      },
    });

    // Get by gender
    const byGender = await prisma.criminal.groupBy({
      by: ['gender'],
      where,
      _count: {
        id: true,
      },
    });

    // Get by nationality
    const byNationality = await prisma.criminal.groupBy({
      by: ['nationality'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get by station (for super admins)
    let byStation: StationStats[] = [];
    if (userRole === 'SUPER_ADMIN') {
      const stationGroups = await prisma.criminal.groupBy({
        by: ['stationId'],
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      // Fetch station names
      const stationIds = stationGroups.map((s) => s.stationId);
      const stations = await prisma.station.findMany({
        where: {
          id: {
            in: stationIds,
          },
        },
        select: {
          id: true,
          name: true,
          code: true,
        },
      });

      byStation = stationGroups.map((s) => {
        const station = stations.find((st) => st.id === s.stationId);
        return {
          stationName: station?.name || 'Unknown',
          stationCode: station?.code || 'Unknown',
          count: s._count.id,
        };
      });
    }

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentCount = await prisma.criminal.count({
      where: {
        ...where,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get monthly trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await prisma.criminal.findMany({
      where: {
        ...where,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by month
    const monthlyTrendMap: Record<string, number> = monthlyData.reduce((acc, record) => {
      const month = new Date(record.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
      });
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyTrend: MonthlyTrendItem[] = Object.entries(monthlyTrendMap).map(([month, count]) => ({
      month,
      count,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total,
        wantedCount,
        notWantedCount: total - wantedCount,
        recentCount,
        byGender: byGender.map((g): GenderStats => ({
          gender: g.gender,
          count: g._count.id,
        })),
        byNationality: byNationality.map((n): NationalityStats => ({
          nationality: n.nationality,
          count: n._count.id,
        })),
        byStation,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching criminal statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
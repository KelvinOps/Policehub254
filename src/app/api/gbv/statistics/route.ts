// src/app/api/gbv/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'GBV_OFFICER'];

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const stationFilter = !ADMIN_ROLES.includes(user.role) ? { stationId: user.stationId ?? undefined } : {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      total, thisMonth, critical, high, medium, low,
      arrested, referred, byType, byStatus, recentHotspots,
    ] = await Promise.all([
      prisma.gBVCase.count({ where: stationFilter }),
      prisma.gBVCase.count({ where: { ...stationFilter, reportedDate: { gte: monthStart } } }),
      prisma.gBVCase.count({ where: { ...stationFilter, riskLevel: 'CRITICAL' } }),
      prisma.gBVCase.count({ where: { ...stationFilter, riskLevel: 'HIGH' } }),
      prisma.gBVCase.count({ where: { ...stationFilter, riskLevel: 'MEDIUM' } }),
      prisma.gBVCase.count({ where: { ...stationFilter, riskLevel: 'LOW' } }),
      prisma.gBVCase.count({ where: { ...stationFilter, perpetratorArrested: true } }),
      prisma.gBVCase.count({ where: { ...stationFilter, status: 'REFERRED' } }),
      prisma.gBVCase.groupBy({ by: ['incidentType'], where: stationFilter, _count: { id: true } }),
      prisma.gBVCase.groupBy({ by: ['status'],       where: stationFilter, _count: { id: true } }),
      // Top 5 hotspot locations
      prisma.gBVCase.groupBy({
        by: ['location'],
        where: stationFilter,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    const byTypeMap: Record<string, number> = {};
    byType.forEach(r => { byTypeMap[r.incidentType] = r._count.id; });

    const byStatusMap: Record<string, number> = {};
    byStatus.forEach(r => { byStatusMap[r.status] = r._count.id; });

    return NextResponse.json({
      success: true,
      data: {
        total, thisMonth, critical, high, medium, low,
        arrested, referred,
        byType: byTypeMap,
        byStatus: byStatusMap,
        hotspots: recentHotspots.map(h => ({ location: h.location, count: h._count.id })),
      },
    });
  } catch (error) {
    console.error('[GET /api/gbv/statistics]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
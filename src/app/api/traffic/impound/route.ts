// src/app/api/traffic/impound/route.ts
//

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];

// ── GET /api/traffic/impounds ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sp            = request.nextUrl.searchParams;
    const status        = sp.get('status');
    const paymentStatus = sp.get('paymentStatus');
    const stationId     = sp.get('stationId');
    const assignedToId  = sp.get('assignedToId');
    const search        = sp.get('search');
    const fromDate      = sp.get('fromDate');
    const toDate        = sp.get('toDate');
    const page          = Math.max(1, parseInt(sp.get('page')  || '1'));
    const limit         = Math.min(100, parseInt(sp.get('limit') || '20'));
    const skip          = (page - 1) * limit;

    const where: Record<string, unknown> = {
      type: 'IMPOUND', // always filter to impounds only
    };

    if (!ADMIN_ROLES.includes(user.role)) {
      where.stationId = user.stationId;
    } else if (stationId) {
      where.stationId = stationId;
    }

    if (status)        where.status        = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (assignedToId)  where.assignedToId  = assignedToId;

    if (search) {
      where.OR = [
        { incidentNumber: { contains: search, mode: 'insensitive' } },
        { location:       { contains: search, mode: 'insensitive' } },
        { description:    { contains: search, mode: 'insensitive' } },
        { assignedToName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      const reportedAt: Record<string, Date> = {};
      if (fromDate) reportedAt.gte = new Date(fromDate);
      if (toDate)   reportedAt.lte = new Date(toDate);
      where.reportedAt = reportedAt;
    }

    const [incidents, total] = await Promise.all([
      prisma.trafficIncident.findMany({
        where,
        include: {
          assignedTo:       { select: { id: true, name: true, badgeNumber: true } },
          station:          { select: { id: true, name: true, code: true } },
          createdBy:        { select: { id: true, name: true } },
          citations:        true,
          involvedVehicles: true,
          involvedPeople:   true,
          witnesses:        true,
          attachments:      true,
        },
        orderBy: { reportedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trafficIncident.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/traffic/impounds]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch impound records' },
      { status: 500 },
    );
  }
}
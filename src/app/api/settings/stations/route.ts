// ============================================
// FILE: src/app/api/settings/stations/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const stationId = request.headers.get('x-user-station');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Super admins can see all stations, others see only their station
    const canSeeAll = ['SUPER_ADMIN'].includes(userRole || '');

    const stations = await prisma.station.findMany({
      where: canSeeAll ? {} : stationId ? { id: stationId } : {},
      orderBy: {
        name: 'asc',
      },
    });

    const formattedStations = stations.map(station => ({
      id: station.id,
      name: station.name,
      code: station.code,
      county: station.county,
      subCounty: station.subCounty,
      address: station.address || '',
      phoneNumber: station.phoneNumber || '',
      email: station.email || '',
      isActive: station.isActive,
      createdAt: station.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      stations: formattedStations,
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only super admins can create stations
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, code, county, subCounty, address, phoneNumber, email } = body;

    if (!name || !code || !county || !subCounty) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if station code already exists
    const existing = await prisma.station.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Station code already exists' },
        { status: 400 }
      );
    }

    const station = await prisma.station.create({
      data: {
        name,
        code,
        county,
        subCounty,
        address,
        phoneNumber,
        email,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      station: {
        id: station.id,
        name: station.name,
        code: station.code,
      },
    });
  } catch (error) {
    console.error('Error creating station:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create station' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userStationId = request.headers.get('x-user-station');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { stationId, ...updateData } = body;

    // Check permissions
    const canEdit = userRole === 'SUPER_ADMIN' || 
      (userRole === 'STATION_COMMANDER' && userStationId === stationId);

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const station = await prisma.station.update({
      where: { id: stationId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      station,
    });
  } catch (error) {
    console.error('Error updating station:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update station' },
      { status: 500 }
    );
  }
}

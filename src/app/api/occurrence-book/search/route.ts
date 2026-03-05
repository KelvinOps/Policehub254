// src/app/api/occurrence-book/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { searchOBEntries } from '@/lib/db/queries/occurrence-book';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // FIX: Added missing auth check — this route was completely unprotected
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    const params = {
      stationId: searchParams.get('stationId') || undefined,
      category: searchParams.get('category') as IncidentCategory | undefined,
      status: searchParams.get('status') as IncidentStatus | undefined,
      dateFrom: searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom')!)
        : undefined,
      dateTo: searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo')!)
        : undefined,
      searchTerm:
        searchParams.get('q') || searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

    // FIX: Non-admin users should only see their own station's entries
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    if (!adminRoles.includes(user.role) && user.stationId) {
      params.stationId = user.stationId;
    }

    const result = await searchOBEntries(params);

    return NextResponse.json({
      success: true,
      data: result.entries,
      pagination: result.pagination,
      query: params,
    });
  } catch (error) {
    console.error('Error searching OB entries:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to search OB entries',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // FIX: Added missing auth check
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      filters = {},
      fullTextSearch,
      dateRange,
      locationRadius,
      pagination = { page: 1, limit: 20 },
    } = body;

    const searchParams: any = {
      ...filters,
      searchTerm: fullTextSearch,
      dateFrom: dateRange?.from ? new Date(dateRange.from) : undefined,
      dateTo: dateRange?.to ? new Date(dateRange.to) : undefined,
      page: pagination.page,
      limit: pagination.limit,
    };

    // Non-admin users locked to their station
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    if (!adminRoles.includes(user.role) && user.stationId) {
      searchParams.stationId = user.stationId;
    }

    const result = await searchOBEntries(searchParams);

    let filteredEntries = result.entries;
    if (
      locationRadius?.latitude &&
      locationRadius?.longitude
    ) {
      filteredEntries = filterByLocation(
        result.entries,
        locationRadius.latitude,
        locationRadius.longitude,
        locationRadius.radiusKm || 5
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredEntries,
      pagination: {
        ...result.pagination,
        total: filteredEntries.length,
        totalPages: Math.ceil(filteredEntries.length / pagination.limit),
      },
      appliedFilters: { ...filters, fullTextSearch, dateRange, locationRadius },
    });
  } catch (error) {
    console.error('Error performing advanced search:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform advanced search' },
      { status: 500 }
    );
  }
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function filterByLocation(
  entries: any[],
  targetLat: number,
  targetLon: number,
  radiusKm: number
): any[] {
  return entries.filter((entry) => {
    if (!entry.latitude || !entry.longitude) return false;
    return (
      calculateDistance(targetLat, targetLon, entry.latitude, entry.longitude) <=
      radiusKm
    );
  });
}
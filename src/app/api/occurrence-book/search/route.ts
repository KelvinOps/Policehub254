// src/app/api/occurrence-book/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { searchOBEntries } from '@/lib/db/queries/occurrence-book';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

/**
 * Advanced search endpoint for OB entries
 * GET /api/occurrence-book/search
 */
export async function GET(request: NextRequest) {
  try {
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
      searchTerm: searchParams.get('q') || searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    };

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
        error: error instanceof Error ? error.message : 'Failed to search OB entries',
      },
      { status: 500 }
    );
  }
}

/**
 * Advanced POST search with complex queries
 * POST /api/occurrence-book/search
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      filters = {},
      fullTextSearch,
      dateRange,
      locationRadius,
      advancedFilters = {},
      pagination = { page: 1, limit: 20 },
    } = body;

    // Build search parameters
    const searchParams = {
      ...filters,
      searchTerm: fullTextSearch,
      dateFrom: dateRange?.from ? new Date(dateRange.from) : undefined,
      dateTo: dateRange?.to ? new Date(dateRange.to) : undefined,
      page: pagination.page,
      limit: pagination.limit,
    };

    // Perform search
    const result = await searchOBEntries(searchParams);

    // Apply location-based filtering if specified
    let filteredEntries = result.entries;
    if (locationRadius && locationRadius.latitude && locationRadius.longitude) {
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
      appliedFilters: {
        ...filters,
        fullTextSearch,
        dateRange,
        locationRadius,
      },
    });
  } catch (error) {
    console.error('Error performing advanced search:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform advanced search',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Filter entries by location radius
 */
function filterByLocation(
  entries: any[],
  targetLat: number,
  targetLon: number,
  radiusKm: number
): any[] {
  return entries.filter((entry) => {
    if (!entry.latitude || !entry.longitude) return false;
    const distance = calculateDistance(
      targetLat,
      targetLon,
      entry.latitude,
      entry.longitude
    );
    return distance <= radiusKm;
  });
}
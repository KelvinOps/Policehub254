// src/app/api/occurrence-book/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { getOBStatistics } from '@/lib/db/queries/occurrence-book';

/**
 * GET: Fetch OB statistics
 * Supports filtering by station and date range
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = request.nextUrl;
    
    // Determine which station to use
    let stationId = searchParams.get('stationId');
    
    // If no stationId specified, use user's station for non-admin roles
    if (!stationId) {
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
      if (!adminRoles.includes(user.role)) {
        stationId = user.stationId || undefined;
      }
    }

    const statistics = await getOBStatistics(stationId);

    return NextResponse.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error fetching OB statistics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch statistics',
      },
      { status: 500 }
    );
  }
}
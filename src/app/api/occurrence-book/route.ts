// src/app/api/occurrence-book/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import {
  createOBEntry,
  searchOBEntries,
} from '@/lib/db/queries/occurrence-book';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as IncidentCategory | null;
    const status = searchParams.get('status') as IncidentStatus | null;
    const searchTerm = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const params: any = {
      page,
      limit,
    };

    // Only filter by station for non-admin roles
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    if (!adminRoles.includes(user.role)) {
      if (user.stationId) {
        params.stationId = user.stationId;
      }
    }

    if (category) params.category = category;
    if (status) params.status = status;
    if (searchTerm) params.searchTerm = searchTerm;

    const result = await searchOBEntries(params);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching OB entries:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch occurrence book entries',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('=== POST /api/occurrence-book START ===');
  
  try {
    // Log all headers for debugging
    console.log('Request headers:', {
      'x-user-id': request.headers.get('x-user-id'),
      'x-user-role': request.headers.get('x-user-role'),
      'x-user-station': request.headers.get('x-user-station'),
      'content-type': request.headers.get('content-type'),
      'cookie': request.headers.get('cookie') ? 'present' : 'missing',
    });

    // Try to get user
    console.log('Attempting to get user from request...');
    const user = await getUserFromRequest(request);
    console.log('User retrieved:', user ? {
      id: user.id,
      name: user.name,
      role: user.role,
      stationId: user.stationId,
    } : 'null');

    if (!user) {
      console.error('❌ POST /api/occurrence-book - Unauthorized: No user found');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Unauthorized - Please log in again',
          debug: {
            hasUserIdHeader: !!request.headers.get('x-user-id'),
            hasCookie: !!request.headers.get('cookie'),
          }
        },
        { status: 401 }
      );
    }

    // FIXED: Check station requirement based on actual roles
    // Roles that can create entries without a station
    const rolesWithoutStationRequired = ['SUPER_ADMIN'];
    
    // Check if user needs a station and doesn't have one
    if (!rolesWithoutStationRequired.includes(user.role) && !user.stationId) {
      console.error('❌ User has no station assigned:', user.id, 'Role:', user.role);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Your account has no assigned station. Please contact your administrator.',
          debug: {
            userId: user.id,
            role: user.role,
            stationId: user.stationId,
          }
        },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log('Request body parsed:', {
        hasIncidentDate: !!body.incidentDate,
        hasCategory: !!body.category,
        hasDescription: !!body.description,
        hasLocation: !!body.location,
        hasReportedBy: !!body.reportedBy,
        hasContactNumber: !!body.contactNumber,
      });
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body - must be valid JSON' 
        },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = [
      'incidentDate',
      'category',
      'description',
      'location',
      'reportedBy',
      'contactNumber'
    ];
    
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields);
      return NextResponse.json(
        {
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`,
          debug: { missingFields }
        },
        { status: 400 }
      );
    }

    // Determine which station to use
    // For SUPER_ADMIN without a station, they must provide one in the request
    let targetStationId: string;
    
    if (user.stationId) {
      targetStationId = user.stationId;
    } else if (body.stationId) {
      targetStationId = body.stationId;
      console.log('Using station from request body:', targetStationId);
    } else {
      console.error('❌ No station available for entry');
      return NextResponse.json(
        {
          success: false,
          error: 'Station is required for this entry. Please specify a station.',
        },
        { status: 400 }
      );
    }

    // Prepare entry data
    const entryData = {
      incidentDate: new Date(body.incidentDate),
      category: body.category as IncidentCategory,
      description: body.description,
      location: body.location,
      latitude: body.latitude ? parseFloat(body.latitude) : undefined,
      longitude: body.longitude ? parseFloat(body.longitude) : undefined,
      reportedBy: body.reportedBy,
      contactNumber: body.contactNumber,
      stationId: targetStationId,  // Now guaranteed to be a string
      recordedById: user.id,
      evidenceFiles: body.evidenceFiles || [],
      witnesses: body.witnesses || undefined,
      suspects: body.suspects || undefined,
    };

    console.log('Creating OB entry with data:', {
      stationId: entryData.stationId,
      recordedById: entryData.recordedById,
      category: entryData.category,
      location: entryData.location,
    });

    // Create the entry
    const entry = await createOBEntry(entryData);
    console.log('✅ OB entry created successfully:', entry.obNumber);

    return NextResponse.json({
      success: true,
      data: entry,
      message: 'Occurrence book entry created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating OB entry:', error);
    
    // Better error handling
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create occurrence book entry',
          debug: {
            errorName: error.name,
            errorMessage: error.message,
          }
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  } finally {
    console.log('=== POST /api/occurrence-book END ===\n');
  }
}
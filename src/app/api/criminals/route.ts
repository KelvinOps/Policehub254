// src/app/api/criminals/route.ts - LIST ROUTE (NOT DETAIL)
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Received criminal data:', body);

    // Get user ID from headers (set by middleware)
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    // Validate required fields
    if (!body.firstName || !body.lastName || !body.gender || !body.stationId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: {
            firstName: !body.firstName,
            lastName: !body.lastName,
            gender: !body.gender,
            stationId: !body.stationId
          }
        },
        { status: 400 }
      );
    }

    // Verify station exists
    const stationExists = await prisma.station.findUnique({
      where: { id: body.stationId }
    });

    if (!stationExists) {
      return NextResponse.json(
        { success: false, error: 'Invalid station ID' },
        { status: 400 }
      );
    }

    // Prepare the data object
    const criminalData: any = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      gender: body.gender,
      stationId: body.stationId,
      nationality: body.nationality || 'Kenyan',
      isWanted: Boolean(body.isWanted),
    };

    // Add optional fields only if they exist
    if (body.middleName) criminalData.middleName = body.middleName.trim();
    if (body.alias && Array.isArray(body.alias)) criminalData.alias = body.alias;
    if (body.dateOfBirth) criminalData.dateOfBirth = new Date(body.dateOfBirth);
    if (body.idNumber) criminalData.idNumber = body.idNumber.trim();
    if (body.phoneNumber) criminalData.phoneNumber = body.phoneNumber.trim();
    if (body.address) criminalData.address = body.address.trim();
    if (body.photoUrl) criminalData.photoUrl = body.photoUrl;
    if (body.lastKnownLocation) criminalData.lastKnownLocation = body.lastKnownLocation.trim();
    if (body.isWanted && body.wantedReason) criminalData.wantedReason = body.wantedReason.trim();
    if (body.criminalHistory && Array.isArray(body.criminalHistory)) {
      criminalData.criminalHistory = body.criminalHistory;
    }

    console.log('Prepared criminal data:', criminalData);

    // Create criminal record
    const criminal = await prisma.criminal.create({
      data: criminalData,
      include: {
        station: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    // Create evidence items if provided
    if (body.evidenceItems && Array.isArray(body.evidenceItems) && body.evidenceItems.length > 0) {
      console.log('Creating evidence items:', body.evidenceItems.length);
      
      const evidenceData = body.evidenceItems.map((item: any) => ({
        criminalId: criminal.id,
        type: item.type || 'OTHER',
        title: item.title,
        description: item.description || null,
        fileUrl: item.fileUrl,
        fileName: item.fileName,
        fileSize: item.fileSize || null,
        mimeType: item.mimeType || null,
        uploadedBy: userId,
      }));

      await prisma.criminalEvidence.createMany({
        data: evidenceData,
      });

      console.log('Evidence items created successfully');
    }

    // Fetch the complete criminal record with evidence
    const completeCriminal = await prisma.criminal.findUnique({
      where: { id: criminal.id },
      include: {
        station: {
          select: {
            name: true,
            code: true,
          },
        },
        evidenceItems: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: completeCriminal,
        message: 'Criminal record created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating criminal:', error);
    
    // Check for unique constraint violations
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A record with this ID number already exists',
          details: error.meta
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create criminal record',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const wanted = searchParams.get('wanted');

    console.log('GET /api/criminals - Params:', {
      page,
      limit,
      search,
      wanted,
    });

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { idNumber: { contains: search, mode: 'insensitive' } },
        { alias: { has: search } },
      ];
    }

    // Wanted filter - FIXED: Only apply if explicitly set to 'true' or 'false'
    if (wanted === 'true') {
      where.isWanted = true;
      console.log('Filtering for WANTED criminals only');
    } else if (wanted === 'false') {
      where.isWanted = false;
      console.log('Filtering for NOT WANTED criminals only');
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    // Get total count
    const total = await prisma.criminal.count({ where });

    // Get criminals with pagination
    const criminals = await prisma.criminal.findMany({
      where,
      skip,
      take: limit,
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
            county: true,
          },
        },
        cases: {
          select: {
            id: true,
            caseNumber: true,
            title: true,
            status: true,
          },
        },
        evidenceItems: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: criminals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching criminals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch criminals' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
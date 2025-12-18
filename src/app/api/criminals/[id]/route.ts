// src/app/api/criminals/[id]/route.ts - INDIVIDUAL CRIMINAL ROUTE
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const criminal = await prisma.criminal.findUnique({
      where: { id: params.id },
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
            category: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        evidenceItems: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!criminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: criminal,
    });
  } catch (error) {
    console.error('Error fetching criminal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch criminal record' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    console.log('Updating criminal:', params.id, body);

    // Verify criminal exists
    const existingCriminal = await prisma.criminal.findUnique({
      where: { id: params.id },
    });

    if (!existingCriminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal record not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      gender: body.gender,
      nationality: body.nationality || 'Kenyan',
      isWanted: Boolean(body.isWanted),
    };

    // Add optional fields
    if (body.middleName !== undefined) updateData.middleName = body.middleName?.trim() || null;
    if (body.alias) updateData.alias = body.alias;
    if (body.dateOfBirth) updateData.dateOfBirth = new Date(body.dateOfBirth);
    if (body.idNumber !== undefined) updateData.idNumber = body.idNumber?.trim() || null;
    if (body.phoneNumber !== undefined) updateData.phoneNumber = body.phoneNumber?.trim() || null;
    if (body.address !== undefined) updateData.address = body.address?.trim() || null;
    if (body.photoUrl !== undefined) updateData.photoUrl = body.photoUrl || null;
    if (body.lastKnownLocation !== undefined) updateData.lastKnownLocation = body.lastKnownLocation?.trim() || null;
    if (body.stationId) updateData.stationId = body.stationId;
    
    if (body.isWanted && body.wantedReason) {
      updateData.wantedReason = body.wantedReason.trim();
    } else if (!body.isWanted) {
      updateData.wantedReason = null;
    }

    if (body.criminalHistory && Array.isArray(body.criminalHistory)) {
      updateData.criminalHistory = body.criminalHistory;
    }

    console.log('Update data:', updateData);

    // Update criminal record
    const criminal = await prisma.criminal.update({
      where: { id: params.id },
      data: updateData,
      include: {
        station: {
          select: {
            id: true,
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

    // Add new evidence items if provided
    if (body.evidenceItems && Array.isArray(body.evidenceItems) && body.evidenceItems.length > 0) {
      console.log('Adding new evidence items:', body.evidenceItems.length);
      
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

      console.log('New evidence items added');
    }

    // Fetch complete updated record
    const completeCriminal = await prisma.criminal.findUnique({
      where: { id: criminal.id },
      include: {
        station: {
          select: {
            id: true,
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

    return NextResponse.json({
      success: true,
      data: completeCriminal,
      message: 'Criminal record updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating criminal:', error);
    
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
        error: 'Failed to update criminal record',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Deleting criminal:', params.id);

    // Verify criminal exists
    const existingCriminal = await prisma.criminal.findUnique({
      where: { id: params.id },
      include: {
        cases: true,
      },
    });

    if (!existingCriminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal record not found' },
        { status: 404 }
      );
    }

    // Check if criminal has associated cases
    if (existingCriminal.cases.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete criminal with associated cases. Please remove case associations first.' 
        },
        { status: 400 }
      );
    }

    // Delete evidence items first (cascade should handle this, but being explicit)
    await prisma.criminalEvidence.deleteMany({
      where: { criminalId: params.id },
    });

    // Delete the criminal record
    await prisma.criminal.delete({
      where: { id: params.id },
    });

    console.log('Criminal deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Criminal record deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting criminal:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete criminal record',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
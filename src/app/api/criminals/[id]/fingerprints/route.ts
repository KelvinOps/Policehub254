// src/app/api/criminals/[id]/fingerprints/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all fingerprints for a criminal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify criminal exists
    const criminal = await prisma.criminal.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!criminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal not found' },
        { status: 404 }
      );
    }

    const fingerprints = await prisma.criminalEvidence.findMany({
      where: {
        criminalId: id,
        type: 'FINGERPRINT',
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: fingerprints,
      criminal,
    });
  } catch (error) {
    console.error('Error fetching fingerprints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fingerprints' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Add a new fingerprint for a criminal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

    const { fingerType, fileUrl, fileName, fileSize, mimeType, quality, deviceInfo } = body;

    if (!fingerType || !fileUrl || !fileName) {
      return NextResponse.json(
        { success: false, error: 'fingerType, fileUrl, and fileName are required' },
        { status: 400 }
      );
    }

    const validFingerTypes = [
      'RIGHT_THUMB', 'RIGHT_INDEX', 'RIGHT_MIDDLE', 'RIGHT_RING', 'RIGHT_PINKY',
      'LEFT_THUMB', 'LEFT_INDEX', 'LEFT_MIDDLE', 'LEFT_RING', 'LEFT_PINKY',
    ];

    if (!validFingerTypes.includes(fingerType)) {
      return NextResponse.json(
        { success: false, error: `Invalid fingerType. Must be one of: ${validFingerTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Verify criminal exists
    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal not found' },
        { status: 404 }
      );
    }

    // Check if this finger type already exists for this criminal
    const existingFingerprint = await prisma.criminalEvidence.findFirst({
      where: {
        criminalId: id,
        type: 'FINGERPRINT',
        title: fingerType,
      },
    });

    let fingerprint;

    if (existingFingerprint) {
      // Update existing fingerprint
      fingerprint = await prisma.criminalEvidence.update({
        where: { id: existingFingerprint.id },
        data: {
          fileUrl,
          fileName,
          fileSize: fileSize || null,
          mimeType: mimeType || 'image/png',
          description: JSON.stringify({
            quality: quality || null,
            deviceInfo: deviceInfo || null,
            capturedAt: new Date().toISOString(),
            capturedBy: userId,
            recaptured: true,
          }),
          uploadedBy: userId,
        },
      });
    } else {
      // Create new fingerprint record
      fingerprint = await prisma.criminalEvidence.create({
        data: {
          criminalId: id,
          type: 'FINGERPRINT',
          title: fingerType,
          fileUrl,
          fileName,
          fileSize: fileSize || null,
          mimeType: mimeType || 'image/png',
          description: JSON.stringify({
            quality: quality || null,
            deviceInfo: deviceInfo || null,
            capturedAt: new Date().toISOString(),
            capturedBy: userId,
          }),
          uploadedBy: userId,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: fingerprint,
        message: existingFingerprint
          ? `${fingerType} fingerprint updated successfully`
          : `${fingerType} fingerprint added successfully`,
        isUpdate: !!existingFingerprint,
      },
      { status: existingFingerprint ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error saving fingerprint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save fingerprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Delete all fingerprints for a criminal (bulk clear)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const criminal = await prisma.criminal.findUnique({
      where: { id },
    });

    if (!criminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal not found' },
        { status: 404 }
      );
    }

    const deleted = await prisma.criminalEvidence.deleteMany({
      where: {
        criminalId: id,
        type: 'FINGERPRINT',
      },
    });

    return NextResponse.json({
      success: true,
      message: `${deleted.count} fingerprint(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting fingerprints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete fingerprints' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
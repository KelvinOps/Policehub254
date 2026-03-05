// src/app/api/criminals/[id]/fingerprints/[fingerprintId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get a specific fingerprint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fingerprintId: string }> }
) {
  try {
    const { id, fingerprintId } = await params;

    const fingerprint = await prisma.criminalEvidence.findFirst({
      where: {
        id: fingerprintId,
        criminalId: id,
        type: 'FINGERPRINT',
      },
    });

    if (!fingerprint) {
      return NextResponse.json(
        { success: false, error: 'Fingerprint not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: fingerprint,
    });
  } catch (error) {
    console.error('Error fetching fingerprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fingerprint' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Delete a specific fingerprint
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fingerprintId: string }> }
) {
  try {
    const { id, fingerprintId } = await params;

    console.log('Deleting fingerprint:', fingerprintId, 'for criminal:', id);

    const fingerprint = await prisma.criminalEvidence.findFirst({
      where: {
        id: fingerprintId,
        criminalId: id,
        type: 'FINGERPRINT',
      },
    });

    if (!fingerprint) {
      return NextResponse.json(
        { success: false, error: 'Fingerprint not found' },
        { status: 404 }
      );
    }

    await prisma.criminalEvidence.delete({
      where: { id: fingerprintId },
    });

    console.log('Fingerprint deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Fingerprint deleted successfully',
      deletedFingerType: fingerprint.title,
    });
  } catch (error) {
    console.error('Error deleting fingerprint:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete fingerprint',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
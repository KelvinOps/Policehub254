// src/app/api/criminals/[id]/evidence/[evidenceId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Delete a specific evidence item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const { id, evidenceId } = await params;

    console.log('Deleting evidence:', evidenceId, 'for criminal:', id);

    // Verify evidence exists and belongs to this criminal
    const evidence = await prisma.criminalEvidence.findFirst({
      where: {
        id: evidenceId,
        criminalId: id,
      },
    });

    if (!evidence) {
      return NextResponse.json(
        { success: false, error: 'Evidence not found' },
        { status: 404 }
      );
    }

    // Delete the evidence
    await prisma.criminalEvidence.delete({
      where: { id: evidenceId },
    });

    console.log('Evidence deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting evidence:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete evidence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Get a specific evidence item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; evidenceId: string }> }
) {
  try {
    const { id, evidenceId } = await params;

    const evidence = await prisma.criminalEvidence.findFirst({
      where: {
        id: evidenceId,
        criminalId: id,
      },
    });

    if (!evidence) {
      return NextResponse.json(
        { success: false, error: 'Evidence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: evidence,
    });
  } catch (error) {
    console.error('Error fetching evidence:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch evidence' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
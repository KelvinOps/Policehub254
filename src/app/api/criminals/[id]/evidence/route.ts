// src/app/api/criminals/[id]/evidence/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Add new evidence items to a criminal record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { evidenceItems } = body;

    console.log('Adding evidence for criminal:', id);
    console.log('Evidence items:', evidenceItems);

    // Get user ID from headers
    const userId = request.headers.get('x-user-id') || 'SYSTEM';

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

    // Validate evidence items
    if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No evidence items provided' },
        { status: 400 }
      );
    }

    // Create evidence items
    const evidenceData = evidenceItems.map((item: any) => ({
      criminalId: id,
      type: item.type || 'OTHER',
      title: item.title,
      description: item.description || null,
      fileUrl: item.fileUrl,
      fileName: item.fileName,
      fileSize: item.fileSize || null,
      mimeType: item.mimeType || null,
      uploadedBy: userId,
    }));

    const createdEvidence = await prisma.criminalEvidence.createMany({
      data: evidenceData,
    });

    console.log('Evidence created successfully:', createdEvidence.count);

    return NextResponse.json({
      success: true,
      data: createdEvidence,
      message: `${createdEvidence.count} evidence item(s) added successfully`,
    });
  } catch (error) {
    console.error('Error adding evidence:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add evidence',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Get all evidence for a criminal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const evidence = await prisma.criminalEvidence.findMany({
      where: { criminalId: id },
      orderBy: { createdAt: 'desc' },
    });

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
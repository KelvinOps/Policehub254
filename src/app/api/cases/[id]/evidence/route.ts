// src/app/api/cases/[id]/evidence/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { addEvidence, updateEvidence, deleteEvidence } from '@/lib/db/queries/cases';
import { getCaseById } from '@/lib/db/queries/cases';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const caseData = await getCaseById(params.id);

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const permissions = getCasePermissions(user, caseData);
    
    if (!permissions.canAddEvidence) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to add evidence to this case' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.description) {
      return NextResponse.json(
        { success: false, error: 'Type and description are required' },
        { status: 400 }
      );
    }

    // Get user details for chain of custody
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, badgeNumber: true },
    });

    // Initial chain of custody entry
    const initialChainOfCustody = [{
      timestamp: new Date(),
      action: 'COLLECTED' as const,
      officer: userDetails?.name || user.id,
      officerBadge: userDetails?.badgeNumber || undefined,
      location: body.location || 'Crime Scene',
      notes: body.initialNotes || 'Initial evidence collection',
    }];

    const evidence = await addEvidence({
      caseId: params.id,
      type: body.type,
      description: body.description,
      fileUrl: body.fileUrl,
      collectedBy: user.id,
      collectedAt: body.collectedAt ? new Date(body.collectedAt) : new Date(),
      chainOfCustody: initialChainOfCustody,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Evidence',
        entityId: evidence.id,
        changes: {
          caseId: params.id,
          type: body.type,
          description: body.description,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      data: evidence,
      message: 'Evidence added successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding evidence:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const evidenceId = body.evidenceId;

    if (!evidenceId) {
      return NextResponse.json(
        { success: false, error: 'Evidence ID is required' },
        { status: 400 }
      );
    }

    // Get evidence and verify it belongs to this case
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { case: true },
    });

    if (!evidence || evidence.caseId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Evidence not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const permissions = getCasePermissions(user, evidence.case);
    
    if (!permissions.canEditEvidence) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit evidence' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    
    if (body.description) {
      updateData.description = body.description;
    }

    // Add chain of custody entry if provided
    if (body.chainOfCustodyEntry) {
      const userDetails = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, badgeNumber: true },
      });

      const newEntry = {
        timestamp: new Date(),
        action: body.chainOfCustodyEntry.action,
        officer: userDetails?.name || user.id,
        officerBadge: userDetails?.badgeNumber || undefined,
        location: body.chainOfCustodyEntry.location,
        notes: body.chainOfCustodyEntry.notes,
        recipient: body.chainOfCustodyEntry.recipient,
        recipientBadge: body.chainOfCustodyEntry.recipientBadge,
      };

      updateData.chainOfCustody = [
        ...(evidence.chainOfCustody as any[]),
        newEntry,
      ];
    }

    const updated = await updateEvidence(evidenceId, updateData);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Evidence',
        entityId: evidenceId,
        changes: updateData,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Evidence updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating evidence:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const evidenceId = searchParams.get('evidenceId');

    if (!evidenceId) {
      return NextResponse.json(
        { success: false, error: 'Evidence ID is required' },
        { status: 400 }
      );
    }

    // Get evidence and verify it belongs to this case
    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { case: true },
    });

    if (!evidence || evidence.caseId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Evidence not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const permissions = getCasePermissions(user, evidence.case);
    
    if (!permissions.canDeleteEvidence) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete evidence' },
        { status: 403 }
      );
    }

    await deleteEvidence(evidenceId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Evidence',
        entityId: evidenceId,
        changes: {
          caseId: params.id,
          type: evidence.type,
          description: evidence.description,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Evidence deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting evidence:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
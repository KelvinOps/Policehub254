// src/app/api/cases/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCaseById, updateCase } from '@/lib/db/queries/cases';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions, canAccessCase } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

export async function GET(
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

    // Check access permissions
    if (!canAccessCase(user, caseData)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this case' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: caseData,
    });
  } catch (error: any) {
    console.error('Error fetching case:', error);
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

    const caseData = await getCaseById(params.id);

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const permissions = getCasePermissions(user, caseData);
    
    if (!permissions.canEdit) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this case' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    // Only allow updating specific fields based on permissions
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Only allow assigning if user has permission
    if (body.assignedToId !== undefined && permissions.canAssign) {
      // Verify assignee exists and is in same station
      if (body.assignedToId) {
        const assignee = await prisma.user.findUnique({
          where: { id: body.assignedToId },
          select: { stationId: true, isActive: true },
        });

        if (!assignee || !assignee.isActive) {
          return NextResponse.json(
            { success: false, error: 'Assigned officer not found or inactive' },
            { status: 400 }
          );
        }

        if (assignee.stationId !== caseData.stationId) {
          return NextResponse.json(
            { success: false, error: 'Cannot assign case to officer from different station' },
            { status: 400 }
          );
        }
      }
      updateData.assignedToId = body.assignedToId;
    }

    // Court information
    if (body.courtDate !== undefined) updateData.courtDate = body.courtDate ? new Date(body.courtDate) : null;
    if (body.courtCase !== undefined) updateData.courtCase = body.courtCase;
    
    // Only allow closing/reopening if user has permission
    if (body.status === 'CLOSED' || body.status === 'DISMISSED') {
      if (!permissions.canCloseCase) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to close this case' },
          { status: 403 }
        );
      }
      if (body.outcome !== undefined) updateData.outcome = body.outcome;
    }

    // Check reopen permission
    if (caseData.status === 'CLOSED' || caseData.status === 'DISMISSED') {
      if (body.status && body.status !== caseData.status) {
        if (!permissions.canReopenCase) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to reopen this case' },
            { status: 403 }
          );
        }
      }
    }

    const updatedCase = await updateCase(params.id, updateData);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'Case',
        entityId: params.id,
        changes: {
          before: {
            status: caseData.status,
            assignedToId: caseData.assignedToId,
            priority: caseData.priority,
          },
          after: updateData,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCase,
      message: 'Case updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating case:', error);
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

    const caseData = await getCaseById(params.id);

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    // Check permissions - only SUPER_ADMIN can delete
    const permissions = getCasePermissions(user, caseData);
    
    if (!permissions.canDelete) {
      return NextResponse.json(
        { success: false, error: 'Only Super Administrators can delete cases. Consider closing the case instead.' },
        { status: 403 }
      );
    }

    // Soft delete by closing the case
    await updateCase(params.id, {
      status: 'CLOSED',
      outcome: 'Case deleted by administrator',
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'DELETE',
        entity: 'Case',
        entityId: params.id,
        changes: {
          caseNumber: caseData.caseNumber,
          title: caseData.title,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Case deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting case:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
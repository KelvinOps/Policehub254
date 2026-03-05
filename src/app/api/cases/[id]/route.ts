// src/app/api/cases/[id]/route.ts
// FIX: Next.js 15 requires `params` to be awaited (it's a Promise).

import { NextRequest, NextResponse } from 'next/server';
import { getCaseById, updateCase } from '@/lib/db/queries/cases';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions, canAccessCase } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const caseData = await getCaseById(id);
    if (!caseData) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    if (!canAccessCase(user, caseData as any)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: caseData });
  } catch (error: any) {
    console.error('Error fetching case:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const caseData = await getCaseById(id);
    if (!caseData) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    const permissions = getCasePermissions(user, caseData as any);
    if (!permissions.canEdit) {
      return NextResponse.json({ success: false, error: 'You do not have permission to edit this case' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.title       !== undefined) updateData.title       = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.priority    !== undefined) updateData.priority    = body.priority;
    if (body.status      !== undefined) updateData.status      = body.status;
    if (body.courtDate   !== undefined) updateData.courtDate   = body.courtDate ? new Date(body.courtDate) : null;
    if (body.courtCase   !== undefined) updateData.courtCase   = body.courtCase;

    if (body.assignedToId !== undefined && permissions.canAssign) {
      if (body.assignedToId) {
        const assignee = await prisma.user.findUnique({
          where: { id: body.assignedToId },
          select: { stationId: true, isActive: true },
        });
        if (!assignee?.isActive) return NextResponse.json({ success: false, error: 'Officer not found or inactive' }, { status: 400 });
        if (assignee.stationId !== caseData.stationId) return NextResponse.json({ success: false, error: 'Officer is from a different station' }, { status: 400 });
      }
      updateData.assignedToId = body.assignedToId || null;
    }

    if ((body.status === 'CLOSED' || body.status === 'DISMISSED') && !permissions.canCloseCase) {
      return NextResponse.json({ success: false, error: 'You do not have permission to close this case' }, { status: 403 });
    }
    if (body.status === 'CLOSED' || body.status === 'DISMISSED') {
      if (body.outcome !== undefined) updateData.outcome = body.outcome;
    }

    if ((caseData.status === 'CLOSED' || caseData.status === 'DISMISSED') &&
        body.status && body.status !== caseData.status && !permissions.canReopenCase) {
      return NextResponse.json({ success: false, error: 'You do not have permission to reopen this case' }, { status: 403 });
    }

    const updatedCase = await updateCase(id, updateData);

    await prisma.auditLog.create({
      data: {
        userId:   user.id,
        action:   'UPDATE',
        entity:   'Case',
        entityId: id,
        changes:  { before: { status: caseData.status, priority: caseData.priority }, after: updateData },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true, data: updatedCase, message: 'Case updated successfully' });
  } catch (error: any) {
    console.error('Error updating case:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const caseData = await getCaseById(id);
    if (!caseData) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    const permissions = getCasePermissions(user, caseData as any);
    if (!permissions.canDelete) {
      return NextResponse.json({ success: false, error: 'Only Super Administrators can delete cases' }, { status: 403 });
    }

    await updateCase(id, { status: 'CLOSED', outcome: 'Case deleted by administrator' });

    await prisma.auditLog.create({
      data: {
        userId:   user.id, action: 'DELETE', entity: 'Case', entityId: id,
        changes:  { caseNumber: caseData.caseNumber, title: caseData.title },
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true, message: 'Case deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
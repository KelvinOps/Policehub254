// src/app/api/cases/[id]/evidence/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { addEvidence, updateEvidence, deleteEvidence, getCaseById } from '@/lib/db/queries/cases';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const caseData = await getCaseById(id);
    if (!caseData) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    const permissions = getCasePermissions(user, caseData as any);
    if (!permissions.canAddEvidence) return NextResponse.json({ success: false, error: 'No permission to add evidence' }, { status: 403 });

    const body = await request.json();
    if (!body.type || !body.description) return NextResponse.json({ success: false, error: 'Type and description are required' }, { status: 400 });

    const userDetails = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, badgeNumber: true } });

    const evidence = await addEvidence({
      caseId:          id,
      type:            body.type,
      description:     body.description,
      fileUrl:         body.fileUrl,
      collectedBy:     user.id,
      collectedAt:     body.collectedAt ? new Date(body.collectedAt) : new Date(),
      chainOfCustody:  [{
        timestamp:    new Date(),
        action:       'COLLECTED',
        officer:      userDetails?.name || user.id,
        officerBadge: userDetails?.badgeNumber,
        location:     body.location || 'Crime Scene',
        notes:        body.initialNotes || 'Initial evidence collection',
      }],
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id, action: 'CREATE', entity: 'Evidence', entityId: evidence.id,
        changes: { caseId: id, type: body.type },
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true, data: evidence, message: 'Evidence added' }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding evidence:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.evidenceId) return NextResponse.json({ success: false, error: 'Evidence ID required' }, { status: 400 });

    const evidence = await prisma.evidence.findUnique({ where: { id: body.evidenceId }, include: { Case: true } });
    if (!evidence || evidence.caseId !== id) return NextResponse.json({ success: false, error: 'Evidence not found' }, { status: 404 });

    const permissions = getCasePermissions(user, evidence.Case as any);
    if (!permissions.canEditEvidence) return NextResponse.json({ success: false, error: 'No permission to edit evidence' }, { status: 403 });

    const updateData: any = {};
    if (body.description) updateData.description = body.description;

    if (body.chainOfCustodyEntry) {
      const userDetails = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, badgeNumber: true } });
      updateData.chainOfCustody = [
        ...(evidence.chainOfCustody as any[]),
        { timestamp: new Date(), officer: userDetails?.name || user.id, officerBadge: userDetails?.badgeNumber, ...body.chainOfCustodyEntry },
      ];
    }

    const updated = await updateEvidence(body.evidenceId, updateData);
    return NextResponse.json({ success: true, data: updated, message: 'Evidence updated' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const evidenceId = request.nextUrl.searchParams.get('evidenceId');
    if (!evidenceId) return NextResponse.json({ success: false, error: 'Evidence ID required' }, { status: 400 });

    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId }, include: { Case: true } });
    if (!evidence || evidence.caseId !== id) return NextResponse.json({ success: false, error: 'Evidence not found' }, { status: 404 });

    const permissions = getCasePermissions(user, evidence.Case as any);
    if (!permissions.canDeleteEvidence) return NextResponse.json({ success: false, error: 'No permission to delete evidence' }, { status: 403 });

    await deleteEvidence(evidenceId);

    await prisma.auditLog.create({
      data: {
        userId: user.id, action: 'DELETE', entity: 'Evidence', entityId: evidenceId,
        changes: { caseId: id, type: evidence.type },
        ipAddress: request.headers.get('x-forwarded-for'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ success: true, message: 'Evidence deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
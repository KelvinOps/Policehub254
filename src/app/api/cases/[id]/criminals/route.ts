// src/app/api/cases/[id]/criminals/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { linkCriminalToCase, unlinkCriminalFromCase, getCaseById } from '@/lib/db/queries/cases';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { criminalId } = body;
    if (!criminalId) return NextResponse.json({ success: false, error: 'Criminal ID required' }, { status: 400 });

    const caseData = await getCaseById(id);
    if (!caseData) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    const permissions = getCasePermissions(user, caseData as any);
    if (!permissions.canLinkCriminals) return NextResponse.json({ success: false, error: 'No permission to link criminals' }, { status: 403 });

    const criminal = await prisma.criminal.findUnique({ where: { id: criminalId } });
    if (!criminal) return NextResponse.json({ success: false, error: 'Criminal not found' }, { status: 404 });

    const alreadyLinked = (caseData.criminals as any[])?.some((c: any) => c.id === criminalId);
    if (alreadyLinked) return NextResponse.json({ success: false, error: 'Criminal already linked' }, { status: 400 });

    const updatedCase = await linkCriminalToCase(id, criminalId);

    await prisma.auditLog.create({
      data: {
        userId: user.id, action: 'LINK', entity: 'Case-Criminal', entityId: id,
        changes: { criminalId, criminalName: `${criminal.firstName} ${criminal.lastName}` },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: updatedCase, message: 'Criminal linked' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const user = getSession(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const criminalId = request.nextUrl.searchParams.get('criminalId');
    if (!criminalId) return NextResponse.json({ success: false, error: 'Criminal ID required' }, { status: 400 });

    const caseData = await getCaseById(id);
    if (!caseData) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    const permissions = getCasePermissions(user, caseData as any);
    if (!permissions.canLinkCriminals) return NextResponse.json({ success: false, error: 'No permission to unlink criminals' }, { status: 403 });

    const updatedCase = await unlinkCriminalFromCase(id, criminalId);

    await prisma.auditLog.create({
      data: {
        userId: user.id, action: 'UNLINK', entity: 'Case-Criminal', entityId: id,
        changes: { criminalId },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({ success: true, data: updatedCase, message: 'Criminal unlinked' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
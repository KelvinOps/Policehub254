import { NextRequest, NextResponse } from 'next/server';
import { linkCriminalToCase, unlinkCriminalFromCase, getCaseById } from '@/lib/db/queries/cases';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

// Type for params in Next.js 15
interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Await the params for Next.js 15
    const { id } = await context.params;
    
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { criminalId } = body;

    if (!criminalId || typeof criminalId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid Criminal ID is required' },
        { status: 400 }
      );
    }

    const caseData = await getCaseById(id);

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    // Type assertion to include criminals
    const caseWithCriminals = caseData as typeof caseData & { criminals?: Array<{ id: string }> };

    const permissions = getCasePermissions(user, caseData);

    if (!permissions.canLinkCriminals) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to link criminals to cases' },
        { status: 403 }
      );
    }

    // Verify criminal exists
    const criminal = await prisma.criminal.findUnique({
      where: { id: criminalId },
    });

    if (!criminal) {
      return NextResponse.json(
        { success: false, error: 'Criminal not found' },
        { status: 404 }
      );
    }

    // Check if already linked - with proper type
    const existingLink = caseWithCriminals.criminals?.find((c: { id: string }) => c.id === criminalId);
    if (existingLink) {
      return NextResponse.json(
        { success: false, error: 'Criminal is already linked to this case' },
        { status: 400 }
      );
    }

    const updatedCase = await linkCriminalToCase(id, criminalId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LINK',
        entity: 'Case-Criminal',
        entityId: id,
        changes: {
          criminalId,
          criminalName: `${criminal.firstName} ${criminal.lastName}`,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCase,
      message: 'Criminal linked to case successfully',
    });
  } catch (error: any) {
    console.error('Error linking criminal to case:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteParams
) {
  try {
    // Await the params for Next.js 15
    const { id } = await context.params;
    
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const criminalId = searchParams.get('criminalId');

    if (!criminalId) {
      return NextResponse.json(
        { success: false, error: 'Criminal ID is required' },
        { status: 400 }
      );
    }

    const caseData = await getCaseById(id);

    if (!caseData) {
      return NextResponse.json(
        { success: false, error: 'Case not found' },
        { status: 404 }
      );
    }

    const permissions = getCasePermissions(user, caseData);

    if (!permissions.canLinkCriminals) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to unlink criminals from cases' },
        { status: 403 }
      );
    }

    const updatedCase = await unlinkCriminalFromCase(id, criminalId);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UNLINK',
        entity: 'Case-Criminal',
        entityId: id,
        changes: {
          criminalId,
          action: 'removed',
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedCase,
      message: 'Criminal unlinked from case successfully',
    });
  } catch (error: any) {
    console.error('Error unlinking criminal from case:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
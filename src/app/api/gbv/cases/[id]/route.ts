// src/app/api/gbv/cases/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'GBV_OFFICER'];

const CASE_INCLUDE = {
  station:        { select: { id: true, name: true, code: true, county: true } },
  recordedBy:     { select: { id: true, name: true, badgeNumber: true } },
  assignedTo:     { select: { id: true, name: true, badgeNumber: true } },
  supportActions: { orderBy: { providedAt: 'desc' as const } },
  evidence:       { orderBy: { uploadedAt: 'desc' as const } },
  followUps:      { orderBy: { createdAt: 'desc' as const } },
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const { id } = await context.params;
    const gbvCase = await prisma.gBVCase.findUnique({ where: { id }, include: CASE_INCLUDE });

    if (!gbvCase) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    if (!ADMIN_ROLES.includes(user.role) && gbvCase.stationId !== user.stationId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: gbvCase });
  } catch (error) {
    console.error('[GET /api/gbv/cases/[id]]', error);
    return err500('Failed to fetch case');
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const { id } = await context.params;
    const existing = await prisma.gBVCase.findUnique({ where: { id }, select: { id: true, stationId: true } });
    if (!existing) return NextResponse.json({ success: false, error: 'Case not found' }, { status: 404 });

    if (!ADMIN_ROLES.includes(user.role) && existing.stationId !== user.stationId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      status, incidentType, incidentDate, location, county, subCounty, description,
      victimAge, victimGender, victimCodeName, victimInjured, victimInjuryDesc,
      perpetratorKnown, perpetratorRelation, perpetratorArrested,
      riskLevel, riskScore, aiSummary, aiRecommendations, recurrenceRisk,
      assignedToId,
      // Support action to add
      newSupportAction,
      // Follow-up to add
      newFollowUp,
    } = body;

    const data: Record<string, unknown> = {};
    if (status             !== undefined) data.status             = status;
    if (incidentType       !== undefined) data.incidentType       = incidentType;
    if (incidentDate       !== undefined) data.incidentDate       = new Date(incidentDate);
    if (location           !== undefined) data.location           = location;
    if (county             !== undefined) data.county             = county    ?? null;
    if (subCounty          !== undefined) data.subCounty          = subCounty ?? null;
    if (description        !== undefined) data.description        = description;
    if (victimAge          !== undefined) data.victimAge          = victimAge          ?? null;
    if (victimGender       !== undefined) data.victimGender       = victimGender       ?? null;
    if (victimCodeName     !== undefined) data.victimCodeName     = victimCodeName     ?? null;
    if (victimInjured      !== undefined) data.victimInjured      = victimInjured;
    if (victimInjuryDesc   !== undefined) data.victimInjuryDesc   = victimInjuryDesc   ?? null;
    if (perpetratorKnown   !== undefined) data.perpetratorKnown   = perpetratorKnown;
    if (perpetratorRelation!== undefined) data.perpetratorRelation= perpetratorRelation?? null;
    if (perpetratorArrested!== undefined) data.perpetratorArrested= perpetratorArrested;
    if (riskLevel          !== undefined) data.riskLevel          = riskLevel;
    if (riskScore          !== undefined) data.riskScore          = riskScore;
    if (aiSummary          !== undefined) data.aiSummary          = aiSummary          ?? null;
    if (aiRecommendations  !== undefined) data.aiRecommendations  = aiRecommendations  ?? null;
    if (recurrenceRisk     !== undefined) data.recurrenceRisk     = recurrenceRisk     ?? null;
    if (assignedToId       !== undefined) data.assignedToId       = assignedToId       || null;

    // Nested creates
    if (newSupportAction) {
      data.supportActions = { create: [newSupportAction] };
    }
    if (newFollowUp) {
      data.followUps = { create: [{ ...newFollowUp, officerId: user.id }] };
    }

    const updated = await prisma.gBVCase.update({ where: { id }, data, include: CASE_INCLUDE });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/gbv/cases/[id]]', error);
    return err500('Failed to update case');
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Only admins can delete GBV cases' }, { status: 403 });
    }

    const { id } = await context.params;
    await prisma.gBVCase.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Case deleted' });
  } catch (error) {
    console.error('[DELETE /api/gbv/cases/[id]]', error);
    return err500('Failed to delete case');
  }
}

const unauth = () => NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
const err500 = (msg: string) => NextResponse.json({ success: false, error: msg }, { status: 500 });
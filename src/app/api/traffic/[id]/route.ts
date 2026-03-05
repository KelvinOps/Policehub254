// src/app/api/traffic/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];

const INCIDENT_INCLUDE = {
  assignedTo:  { select: { id: true, name: true, badgeNumber: true, role: true } },
  station:     { select: { id: true, name: true, code: true, county: true } },
  createdBy:   { select: { id: true, name: true, badgeNumber: true } },
  citations: {
    include: { issuedBy: { select: { id: true, name: true, badgeNumber: true } } },
    orderBy: { issuedAt: 'desc' as const },
  },
  involvedVehicles: true,
  involvedPeople:   true,
  witnesses:        true,
  attachments: {
    orderBy: { uploadedAt: 'desc' as const },
  },
} as const;

// ── GET /api/traffic/[id] ────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    // ✅ Next.js 15: params is a Promise — must be awaited
    const { id } = await context.params;

    const incident = await prisma.trafficIncident.findUnique({
      where:   { id },
      include: INCIDENT_INCLUDE,
    });

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 },
      );
    }

    if (!ADMIN_ROLES.includes(user.role) && incident.stationId !== user.stationId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: incident });
  } catch (error) {
    console.error('[GET /api/traffic/[id]]', error);
    return err500('Failed to fetch incident');
  }
}

// ── PATCH /api/traffic/[id] ──────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    // ✅ Next.js 15: await params
    const { id } = await context.params;

    const existing = await prisma.trafficIncident.findUnique({
      where:  { id },
      select: { id: true, stationId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 },
      );
    }

    if (!ADMIN_ROLES.includes(user.role) && existing.stationId !== user.stationId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const body = await request.json();

    const {
      status, location, description, reportedAt, reportedBy,
      assignedToId: rawAssignedToId,
      severity, weatherConditions, roadConditions, visibility,
      impoundReason, impoundLocation, storageLocation, impoundFee,
      impoundedAt, releasedAt, releasedTo, paymentStatus,
      latitude, longitude,
    } = body;

    // Only include fields that were actually sent in the PATCH body
    const data: Record<string, unknown> = {};

    if (status            !== undefined) data.status            = status;
    if (location          !== undefined) data.location          = location;
    if (description       !== undefined) data.description       = description;
    if (reportedAt        !== undefined) data.reportedAt        = new Date(reportedAt);
    if (reportedBy        !== undefined) data.reportedBy        = reportedBy        ?? null;
    if (latitude          !== undefined) data.latitude          = latitude          ?? null;
    if (longitude         !== undefined) data.longitude         = longitude         ?? null;
    if (severity          !== undefined) data.severity          = severity          ?? null;
    if (weatherConditions !== undefined) data.weatherConditions = weatherConditions ?? null;
    if (roadConditions    !== undefined) data.roadConditions    = roadConditions    ?? null;
    if (visibility        !== undefined) data.visibility        = visibility        ?? null;
    if (impoundReason     !== undefined) data.impoundReason     = impoundReason     ?? null;
    if (impoundLocation   !== undefined) data.impoundLocation   = impoundLocation   ?? null;
    if (storageLocation   !== undefined) data.storageLocation   = storageLocation   ?? null;
    if (impoundFee        !== undefined) data.impoundFee        = impoundFee        ?? null;
    if (releasedTo        !== undefined) data.releasedTo        = releasedTo        ?? null;
    if (paymentStatus     !== undefined) data.paymentStatus     = paymentStatus     ?? null;
    if (impoundedAt       !== undefined) data.impoundedAt       = impoundedAt ? new Date(impoundedAt) : null;
    if (releasedAt        !== undefined) data.releasedAt        = releasedAt  ? new Date(releasedAt)  : null;

    // Handle assignedToId with officer name denormalisation
    if (rawAssignedToId !== undefined) {
      const assignedToId = rawAssignedToId || null;
      data.assignedToId = assignedToId;
      if (assignedToId) {
        const officer = await prisma.user.findUnique({
          where:  { id: assignedToId },
          select: { name: true, badgeNumber: true },
        });
        data.assignedToName  = officer?.name        ?? null;
        data.assignedToBadge = officer?.badgeNumber ?? null;
      } else {
        data.assignedToName  = null;
        data.assignedToBadge = null;
      }
    }

    const updated = await prisma.trafficIncident.update({
      where:   { id },
      data,
      include: INCIDENT_INCLUDE,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/traffic/[id]]', error);
    return err500('Failed to update incident');
  }
}

// PUT is a full-replace alias for PATCH
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PATCH(request, context);
}

// ── DELETE /api/traffic/[id] ─────────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    if (!ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only admins can delete incidents' },
        { status: 403 },
      );
    }

    // ✅ Next.js 15: await params
    const { id } = await context.params;

    const existing = await prisma.trafficIncident.findUnique({
      where:  { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 },
      );
    }

    await prisma.trafficIncident.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Incident deleted' });
  } catch (error) {
    console.error('[DELETE /api/traffic/[id]]', error);
    return err500('Failed to delete incident');
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────
const unauth = () =>
  NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

const err500 = (msg: string) =>
  NextResponse.json({ success: false, error: msg }, { status: 500 });
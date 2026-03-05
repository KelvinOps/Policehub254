// src/app/api/traffic/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];

// ── GET /api/traffic ─────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sp            = request.nextUrl.searchParams;
    const type          = sp.get('type');
    const status        = sp.get('status');
    const severity      = sp.get('severity');
    const paymentStatus = sp.get('paymentStatus');
    const stationId     = sp.get('stationId');
    const assignedToId  = sp.get('assignedToId');
    const search        = sp.get('search');
    const fromDate      = sp.get('fromDate');
    const toDate        = sp.get('toDate');
    const page          = Math.max(1, parseInt(sp.get('page')  || '1'));
    const limit         = Math.min(100, parseInt(sp.get('limit') || '20'));
    const skip          = (page - 1) * limit;

    const where: any = {};

    if (!ADMIN_ROLES.includes(user.role)) {
      where.stationId = user.stationId;
    } else if (stationId) {
      where.stationId = stationId;
    }

    if (type)          where.type          = type;
    if (status)        where.status        = status;
    if (severity)      where.severity      = severity;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (assignedToId)  where.assignedToId  = assignedToId;

    if (search) {
      where.OR = [
        { incidentNumber: { contains: search, mode: 'insensitive' } },
        { location:       { contains: search, mode: 'insensitive' } },
        { description:    { contains: search, mode: 'insensitive' } },
        { assignedToName: { contains: search, mode: 'insensitive' } },
        { assignedTo: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (fromDate || toDate) {
      where.reportedAt = {};
      if (fromDate) where.reportedAt.gte = new Date(fromDate);
      if (toDate)   where.reportedAt.lte = new Date(toDate);
    }

    const [incidents, total] = await Promise.all([
      prisma.trafficIncident.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, badgeNumber: true },
          },
          station: {
            select: { id: true, name: true, code: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          citations: {
            include: {
              issuedBy: {
                select: { id: true, name: true, badgeNumber: true },
              },
            },
          },
          involvedVehicles: true,
          involvedPeople:   true,
          witnesses:        true,
          attachments:      true,
        },
        orderBy: { reportedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trafficIncident.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: incidents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/traffic]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch incidents' },
      { status: 500 },
    );
  }
}

// ── POST /api/traffic ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const {
      type,
      location,
      description,
      reportedAt,
      reportedBy,
      assignedToId: rawAssignedToId,
      involvedVehicles = [],
      involvedPeople   = [],
      witnesses        = [],
      // accident fields
      severity,
      weatherConditions,
      roadConditions,
      visibility,
      // impound fields
      impoundReason,
      impoundLocation,
      storageLocation,
      impoundFee,
      impoundedAt,
      paymentStatus,
      // optional geo
      latitude,
      longitude,
    } = body;

    if (!type || !location || !description) {
      return NextResponse.json(
        { success: false, error: 'type, location and description are required' },
        { status: 400 },
      );
    }

    // Coerce empty string → null so FK constraint is not violated
    const assignedToId = rawAssignedToId || null;

    // Look up assigned officer name/badge for denormalised columns
    let assignedToName:  string | null = null;
    let assignedToBadge: string | null = null;
    if (assignedToId) {
      const officer = await prisma.user.findUnique({
        where:  { id: assignedToId },
        select: { name: true, badgeNumber: true },
      });
      assignedToName  = officer?.name        ?? null;
      assignedToBadge = officer?.badgeNumber ?? null;
    }

    // Generate incident number: type-prefix + year + zero-padded sequence
    const year  = new Date().getFullYear();
    const count = await prisma.trafficIncident.count({
      where: {
        createdAt: {
          gte: new Date(year, 0, 1),
          lt:  new Date(year + 1, 0, 1),
        },
      },
    });
    const incidentNumber = `${type.charAt(0)}${year}-${(count + 1)
      .toString()
      .padStart(5, '0')}`;

    // Strip client-side temp keys (_key, id) from nested arrays before
    // passing them to Prisma — these fields don't exist in the DB schema.
    const cleanVehicles  = (involvedVehicles as any[]).map(({ id: _id, _key, ...v }) => v);
    const cleanPeople    = (involvedPeople   as any[]).map(({ id: _id, _key, ...p }) => p);
    const cleanWitnesses = (witnesses        as any[]).map(({ id: _id, _key, ...w }) => w);

    // ── THE FIX ──────────────────────────────────────────────────────────────
    // Prisma nested-create relations MUST be wrapped in { create: [...] }.
    // Passing a plain array directly causes PrismaClientValidationError.
    // ─────────────────────────────────────────────────────────────────────────
    const incident = await prisma.trafficIncident.create({
      data: {
        incidentNumber,
        type,
        status:     'PENDING',
        location,
        description,
        reportedAt:  reportedAt ? new Date(reportedAt) : new Date(),
        reportedBy:  reportedBy ?? null,
        latitude:    latitude   ?? null,
        longitude:   longitude  ?? null,

        assignedToId,
        assignedToName,
        assignedToBadge,

        // Accident-specific fields
        severity:          severity          ?? null,
        weatherConditions: weatherConditions ?? null,
        roadConditions:    roadConditions    ?? null,
        visibility:        visibility        ?? null,

        // Impound-specific fields
        impoundReason:   impoundReason   ?? null,
        impoundLocation: impoundLocation ?? null,
        storageLocation: storageLocation ?? null,
        impoundFee:      impoundFee      ?? null,
        impoundedAt:     impoundedAt ? new Date(impoundedAt) : null,
        paymentStatus:   paymentStatus   ?? null,

        stationId:   user.stationId ?? null,
        createdById: user.id,

        // Nested creates — wrap in { create: [...] } as Prisma requires
        involvedVehicles:  cleanVehicles.length  ? { create: cleanVehicles  } : undefined,
        involvedPeople:    cleanPeople.length     ? { create: cleanPeople    } : undefined,
        witnesses:         cleanWitnesses.length  ? { create: cleanWitnesses } : undefined,
      },
      include: {
        assignedTo:       { select: { id: true, name: true, badgeNumber: true } },
        station:          { select: { id: true, name: true, code: true } },
        createdBy:        { select: { id: true, name: true } },
        involvedVehicles: true,
        involvedPeople:   true,
        witnesses:        true,
      },
    });

    return NextResponse.json({ success: true, data: incident }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/traffic]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create incident' },
      { status: 500 },
    );
  }
}
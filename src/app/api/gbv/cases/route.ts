// src/app/api/gbv/cases/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'GBV_OFFICER'];

const CASE_INCLUDE = {
  station:       { select: { id: true, name: true, code: true, county: true } },
  recordedBy:    { select: { id: true, name: true, badgeNumber: true } },
  assignedTo:    { select: { id: true, name: true, badgeNumber: true } },
  supportActions: true,
  evidence:      true,
  followUps:     { orderBy: { createdAt: 'desc' as const } },
} as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const sp = request.nextUrl.searchParams;
    const status      = sp.get('status');
    const riskLevel   = sp.get('riskLevel');
    const incidentType= sp.get('incidentType');
    const stationId   = sp.get('stationId');
    const search      = sp.get('search');
    const fromDate    = sp.get('fromDate');
    const toDate      = sp.get('toDate');
    const page        = Math.max(1, parseInt(sp.get('page')  || '1'));
    const limit       = Math.min(100, parseInt(sp.get('limit') || '20'));
    const skip        = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Non-admins only see their station's cases
    if (!ADMIN_ROLES.includes(user.role)) {
      where.stationId = user.stationId;
    } else if (stationId) {
      where.stationId = stationId;
    }

    if (status)       where.status       = status;
    if (riskLevel)    where.riskLevel    = riskLevel;
    if (incidentType) where.incidentType = incidentType;

    if (search) {
      where.OR = [
        { caseNumber:     { contains: search, mode: 'insensitive' } },
        { location:       { contains: search, mode: 'insensitive' } },
        { description:    { contains: search, mode: 'insensitive' } },
        { victimCodeName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (fromDate || toDate) {
      const incidentDate: Record<string, Date> = {};
      if (fromDate) incidentDate.gte = new Date(fromDate);
      if (toDate)   incidentDate.lte = new Date(toDate);
      where.incidentDate = incidentDate;
    }

    const [cases, total] = await Promise.all([
      prisma.gBVCase.findMany({
        where,
        include: CASE_INCLUDE,
        orderBy: [
          { riskScore: 'desc' },
          { incidentDate: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.gBVCase.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: cases,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[GET /api/gbv/cases]', error);
    return err500('Failed to fetch GBV cases');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const body = await request.json();
    const {
      incidentType, incidentDate, location, county, subCounty, description,
      victimAge, victimGender, victimCodeName, victimInjured, victimInjuryDesc,
      perpetratorKnown, perpetratorRelation, perpetratorArrested,
      assignedToId,
    } = body;

    if (!incidentType || !incidentDate || !location || !description) {
      return NextResponse.json(
        { success: false, error: 'incidentType, incidentDate, location, description are required' },
        { status: 400 },
      );
    }

    // Generate case number: GBV-YYYY-XXXXXX
    const year  = new Date().getFullYear();
    const count = await prisma.gBVCase.count({
      where: { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    });
    const caseNumber = `GBV-${year}-${(count + 1).toString().padStart(6, '0')}`;

    const gbvCase = await prisma.gBVCase.create({
      data: {
        caseNumber,
        incidentType,
        incidentDate:       new Date(incidentDate),
        location,
        county:             county             ?? null,
        subCounty:          subCounty          ?? null,
        description,
        victimAge:          victimAge          ?? null,
        victimGender:       victimGender       ?? null,
        victimCodeName:     victimCodeName     ?? null,
        victimInjured:      victimInjured      ?? false,
        victimInjuryDesc:   victimInjuryDesc   ?? null,
        perpetratorKnown:   perpetratorKnown   ?? false,
        perpetratorRelation:perpetratorRelation?? null,
        perpetratorArrested:perpetratorArrested?? false,
        assignedToId:       assignedToId       || null,
        stationId:          user.stationId     ?? null,
        recordedById:       user.id,
        riskLevel:          'MEDIUM',
        riskScore:          50,
      },
      include: CASE_INCLUDE,
    });

    return NextResponse.json({ success: true, data: gbvCase }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/gbv/cases]', error);
    return err500('Failed to create GBV case');
  }
}

const unauth = () => NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
const err500 = (msg: string) => NextResponse.json({ success: false, error: msg }, { status: 500 });
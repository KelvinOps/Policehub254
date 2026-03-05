
//app/api/traffic/citations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

// ── POST /api/traffic/citations ───────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const body = await request.json();
    const {
      incidentId,
      issuedTo,
      issuedToIdNumber,
      violation,
      section,
      amount,
      dueDate,  
      notes,
    } = body;

    // FIX #29: validate required fields before touching the DB
    const missing: string[] = [];
    if (!incidentId) missing.push('incidentId');
    if (!issuedTo)   missing.push('issuedTo');
    if (!violation)  missing.push('violation');
    if (!amount)     missing.push('amount');
    if (!dueDate)    missing.push('dueDate');

    if (missing.length) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 },
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json(
        { success: false, error: 'amount must be a positive number' },
        { status: 400 },
      );
    }

    // Verify the incident exists
    const incident = await prisma.trafficIncident.findUnique({
      where:  { id: incidentId },
      select: { id: true },
    });
    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 },
      );
    }

    // Generate citation number
    const year  = new Date().getFullYear();
    const count = await prisma.citation.count({
      where: { issuedAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    });
    const citationNumber = `CIT${year}-${(count + 1).toString().padStart(6, '0')}`;

    // FIX #30: coerce dueDate string → Date object
    const dueDateParsed = new Date(dueDate);
    if (isNaN(dueDateParsed.getTime())) {
      return NextResponse.json(
        { success: false, error: 'dueDate is not a valid date' },
        { status: 400 },
      );
    }

    const citation = await prisma.citation.create({
      data: {
        citationNumber,
        incidentId,
        issuedTo,
        issuedToIdNumber: issuedToIdNumber ?? null,
        violation,
        section:          section ?? null,
        amount:           amountNum,
        dueDate:          dueDateParsed,   // FIX #30: actual Date, not string
        issuedById:       user.id,
        paymentStatus:    'UNPAID',
        notes:            notes ?? null,
      },
      include: {
        issuedBy: { select: { id: true, name: true, badgeNumber: true } },
      },
    });

    // Update the incident status to CITATION_ISSUED
    await prisma.trafficIncident.update({
      where: { id: incidentId },
      data:  { status: 'CITATION_ISSUED' },
    });

    return NextResponse.json({ success: true, data: citation }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/traffic/citations]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create citation' },
      { status: 500 },
    );
  }
}

// ── GET /api/traffic/citations ────────────────────────────────────────────────
// FIX #34: missing endpoint – list citations (optionally filtered by incidentId)
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const sp         = request.nextUrl.searchParams;
    const incidentId = sp.get('incidentId');
    const status     = sp.get('status');

    const where: any = {};
    if (incidentId)  where.incidentId    = incidentId;
    if (status)      where.paymentStatus = status;

    const citations = await prisma.citation.findMany({
      where,
      include: {
        issuedBy: { select: { id: true, name: true, badgeNumber: true } },
        incident: { select: { id: true, incidentNumber: true, type: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: citations });
  } catch (error) {
    console.error('[GET /api/traffic/citations]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch citations' },
      { status: 500 },
    );
  }
}

const unauth = () => NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
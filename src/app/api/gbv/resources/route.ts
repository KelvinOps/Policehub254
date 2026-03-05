// src/app/api/gbv/resources/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sp      = request.nextUrl.searchParams;
    const type    = sp.get('type');
    const county  = sp.get('county');
    const search  = sp.get('search');

    const where: Record<string, unknown> = { isActive: true };
    if (type)   where.type   = type;
    if (county) where.county = county;
    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address:     { contains: search, mode: 'insensitive' } },
      ];
    }

    const resources = await prisma.gBVResource.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: resources });
  } catch (error) {
    console.error('[GET /api/gbv/resources]', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch resources' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    if (!['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, county, subCounty, address, phone, email, website, description } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: 'name and type are required' }, { status: 400 });
    }

    const resource = await prisma.gBVResource.create({
      data: { name, type, county: county ?? null, subCounty: subCounty ?? null,
              address: address ?? null, phone: phone ?? null,
              email: email ?? null, website: website ?? null,
              description: description ?? null },
    });

    return NextResponse.json({ success: true, data: resource }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/gbv/resources]', error);
    return NextResponse.json({ success: false, error: 'Failed to create resource' }, { status: 500 });
  }
}
// src/app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const stationId = sp.get('stationId') || undefined;
    const roleParam = sp.get('role');
    const search = sp.get('search') || undefined;
    const county = sp.get('county') || undefined;
    const page = Math.max(1, parseInt(sp.get('page') || '1'));
    const limit = Math.min(100, parseInt(sp.get('limit') || '50'));
    const skip = (page - 1) * limit;

    const roleFilter: UserRole[] = roleParam
      ? (roleParam.split(',').map(r => r.trim()) as UserRole[])
      : [];

    const where: Record<string, unknown> = {};

    if (!ADMIN_ROLES.includes(user.role as UserRole)) {
      where.stationId = user.stationId;
    } else {
      if (stationId) where.stationId = stationId;
    }

    if (roleFilter.length > 0) {
      where.role = { in: roleFilter };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { badgeNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (county) {
      where.Station = { county: { contains: county, mode: 'insensitive' } };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          badgeNumber: true,
          phoneNumber: true,
          isActive: true,
          createdAt: true,
          stationId: true,
          avatar: true, // ✅ Added avatar
          station: {
            select: {
              id: true,
              name: true,
              code: true,
              county: true,
              subCounty: true,
            },
          },
        },
        orderBy: [
          { role: 'asc' },
          { name: 'asc' },
        ],
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch personnel' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!ADMIN_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, role, badgeNumber, phone, stationId, password, avatar } = body;

    if (!name || !email || !role || !badgeNumber || !stationId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, role, badgeNumber, stationId' },
        { status: 400 }
      );
    }

    if (user.role === 'STATION_COMMANDER' && stationId !== user.stationId) {
      return NextResponse.json(
        { success: false, error: 'You can only create personnel for your own station' },
        { status: 403 }
      );
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password || badgeNumber, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role as UserRole,
        badgeNumber,
        phoneNumber: phone,
        stationId,
        password: hashedPassword,
        isActive: true,
        avatar, 
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        badgeNumber: true,
        phoneNumber: true,
        isActive: true,
        stationId: true,
        avatar: true,
        station: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Email or badge number already exists' },
        { status: 409 }
      );
    }
    console.error('Error creating user:', error);
    return NextResponse.json({ success: false, error: 'Failed to create personnel' }, { status: 500 });
  }
}
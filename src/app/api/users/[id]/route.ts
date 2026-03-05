// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';

const ADMIN_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user   = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const officer = await prisma.user.findUnique({
      where: { id },
      select: {
        id:          true,
        name:        true,
        email:       true,
        role:        true,
        badgeNumber: true,
        phoneNumber: true,
        isActive:    true,
        createdAt:   true,
        updatedAt:   true,
        stationId:   true,
        station: {
          select: { id: true, name: true, code: true, county: true, subCounty: true },
        },
        // ✅ FIXED: Changed from 'assignedCases' to 'Case_Case_assignedToIdToUser' to match schema
        Case_Case_assignedToIdToUser: {
          select: { 
            id: true, 
            caseNumber: true, 
            title: true, 
            status: true, 
            priority: true 
          },
          take:   10,
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!officer) {
      return NextResponse.json({ success: false, error: 'Officer not found' }, { status: 404 });
    }

    // Non-admins can only see their own station
    if (!ADMIN_ROLES.includes(user.role as UserRole) && officer.stationId !== user.stationId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: officer });
  } catch (error) {
    console.error('Error fetching officer:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch officer' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user   = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Only admins or the user themselves can update
    const isAdmin   = ADMIN_ROLES.includes(user.role as UserRole);
    const isSelf    = user.id === id;
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Non-admins can only update limited fields on themselves
    const allowedFields = isAdmin
      ? ['name', 'email', 'role', 'badgeNumber', 'phoneNumber', 'stationId', 'isActive']
      : ['name', 'phoneNumber'];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const updated = await prisma.user.update({
      where: { id },
      data:  updateData,
      select: {
        id: true, 
        name: true, 
        email: true, 
        role: true,
        badgeNumber: true, 
        phoneNumber: true, 
        isActive: true, 
        stationId: true,
        station: { 
          select: { name: true, code: true } 
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Officer not found' }, { status: 404 });
    }
    console.error('Error updating officer:', error);
    return NextResponse.json({ success: false, error: 'Failed to update officer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user   = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    // Only SUPER_ADMIN and ADMIN can delete users
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Soft delete — deactivate instead of destroying
    await prisma.user.update({
      where: { id },
      data:  { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Officer deactivated successfully' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Officer not found' }, { status: 404 });
    }
    console.error('Error deactivating officer:', error);
    return NextResponse.json({ success: false, error: 'Failed to deactivate officer' }, { status: 500 });
  }
}
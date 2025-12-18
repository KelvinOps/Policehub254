// src/app/api/cases/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getCases, createCase, getCaseStatistics } from '@/lib/db/queries/cases';
import { CaseFilters } from '@/types/case';
import { getSession } from '@/lib/auth/session';
import { getCasePermissions, filterCasesByPermission } from '@/lib/auth/case-permissions';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // Get statistics
    if (action === 'statistics') {
      const permissions = getCasePermissions(user);
      
      // Only station or all cases based on permissions
      const stationId = permissions.canAccessAllCases 
        ? searchParams.get('stationId') || undefined
        : user.stationId;
        
      const stats = await getCaseStatistics(stationId);
      return NextResponse.json({ success: true, data: stats });
    }

    // Build filters
    const filters: CaseFilters = {
      status: searchParams.get('status') as any,
      priority: searchParams.get('priority') || undefined,
      category: searchParams.get('category') as any,
      assignedToId: searchParams.get('assignedToId') || undefined,
      stationId: searchParams.get('stationId') || undefined,
      search: searchParams.get('search') || undefined,
    };

    // Apply date filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    // Clean up undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof CaseFilters] === undefined) {
        delete filters[key as keyof CaseFilters];
      }
    });

    // Get permissions
    const permissions = getCasePermissions(user);

    // If user can't access all cases, filter by station
    if (!permissions.canAccessAllCases && user.stationId) {
      filters.stationId = user.stationId;
    }

    // Get cases
    let cases = await getCases(filters);

    // Apply permission-based filtering
    cases = filterCasesByPermission(cases, user);

    return NextResponse.json({
      success: true,
      data: cases,
      count: cases.length,
    });
  } catch (error: any) {
    console.error('Error fetching cases:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getSession(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    const permissions = getCasePermissions(user);
    if (!permissions.canCreate) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to create cases' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description || !body.category) {
      return NextResponse.json(
        { success: false, error: 'Title, description, and category are required' },
        { status: 400 }
      );
    }

    // Validate station access
    let stationId = body.stationId;
    if (!permissions.canAccessAllCases) {
      // Non-admin users can only create cases in their station
      if (!user.stationId) {
        return NextResponse.json(
          { success: false, error: 'User is not assigned to a station' },
          { status: 403 }
        );
      }
      stationId = user.stationId;
    } else {
      // Admin users must specify a station
      if (!stationId) {
        return NextResponse.json(
          { success: false, error: 'Station ID is required' },
          { status: 400 }
        );
      }
    }

    // If assigning to someone, verify they exist and are in the same station
    if (body.assignedToId && permissions.canAssign) {
      const assignee = await prisma.user.findUnique({
        where: { id: body.assignedToId },
        select: { stationId: true, isActive: true },
      });

      if (!assignee || !assignee.isActive) {
        return NextResponse.json(
          { success: false, error: 'Assigned officer not found or inactive' },
          { status: 400 }
        );
      }

      if (assignee.stationId !== stationId) {
        return NextResponse.json(
          { success: false, error: 'Cannot assign case to officer from different station' },
          { status: 400 }
        );
      }
    }

    const newCase = await createCase({
      title: body.title,
      description: body.description,
      category: body.category,
      priority: body.priority || 'MEDIUM',
      stationId,
      createdById: user.id,
      assignedToId: permissions.canAssign ? body.assignedToId : undefined,
      obEntryId: body.obEntryId,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'Case',
        entityId: newCase.id,
        changes: {
          caseNumber: newCase.caseNumber,
          title: newCase.title,
          category: newCase.category,
          priority: newCase.priority,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({
      success: true,
      data: newCase,
      message: 'Case created successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating case:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
// ============================================
// FILE: src/app/api/communications/alerts/route.ts
// Complete Alert system with acknowledgments
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AlertType, AlertPriority } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const stationId = request.headers.get('x-user-station');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Determine alert visibility based on role and scope
    const canSeeAll = ['SUPER_ADMIN', 'ADMIN'].includes(userRole || '');
    
    // Build where conditions based on scope
    let whereConditions: any = {
      isActive: true, // Only show active alerts by default
    };

    if (!canSeeAll) {
      whereConditions = {
        ...whereConditions,
        OR: [
          { scope: 'NATIONAL' },
          { scope: 'COUNTY', stationId: { in: [stationId] } },
          { scope: 'STATION', stationId: stationId },
        ],
      };
    }

    // Check for query params
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get('includeInactive') === 'true';
    const alertType = url.searchParams.get('type');
    const priority = url.searchParams.get('priority');

    if (includeInactive) {
      delete whereConditions.isActive;
    }

    if (alertType) {
      whereConditions.type = alertType;
    }

    if (priority) {
      whereConditions.priority = priority;
    }

    const alerts = await prisma.alert.findMany({
      where: whereConditions,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            badgeNumber: true,
            role: true,
          },
        },
        station: {
          select: {
            id: true,
            name: true,
            code: true,
            county: true,
          },
        },
        acknowledgments: {
          where: { userId },
          select: {
            id: true,
            acknowledgedAt: true,
            notes: true,
          },
        },
        _count: {
          select: {
            acknowledgments: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 100,
    });

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      type: alert.type,
      priority: alert.priority,
      scope: alert.scope,
      targetRoles: alert.targetRoles,
      createdById: alert.createdById,
      createdByName: alert.createdBy.name,
      createdByBadge: alert.createdBy.badgeNumber || 'N/A',
      createdByRole: alert.createdBy.role,
      stationId: alert.stationId || '',
      stationName: alert.station?.name || 'N/A',
      stationCounty: alert.station?.county || 'N/A',
      isActive: alert.isActive,
      expiresAt: alert.expiresAt?.toISOString() || null,
      metadata: alert.metadata,
      attachments: alert.attachments,
      acknowledgmentCount: alert._count.acknowledgments,
      isAcknowledged: alert.acknowledgments.length > 0,
      myAcknowledgment: alert.acknowledgments[0] || null,
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString(),
    }));

    // Calculate statistics
    const stats = {
      total: formattedAlerts.length,
      critical: formattedAlerts.filter(a => a.type === 'CRITICAL').length,
      warnings: formattedAlerts.filter(a => a.type === 'WARNING').length,
      apb: formattedAlerts.filter(a => a.type === 'APB').length,
      acknowledged: formattedAlerts.filter(a => a.isAcknowledged).length,
      pending: formattedAlerts.filter(a => !a.isAcknowledged).length,
    };

    return NextResponse.json({
      success: true,
      alerts: formattedAlerts,
      stats,
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const stationId = request.headers.get('x-user-station');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions to create alerts
    const canCreateAlerts = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'OCS'].includes(userRole || '');

    if (!canCreateAlerts) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create alerts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      message,
      type = 'INFO',
      priority = 'MEDIUM',
      scope = 'STATION',
      targetRoles = [],
      expiresAt = null,
      metadata = null,
      attachments = [],
    } = body;

    // Validation
    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Validate scope permissions
    if (scope === 'NATIONAL' && !['SUPER_ADMIN', 'ADMIN'].includes(userRole || '')) {
      return NextResponse.json(
        { success: false, error: 'Only admins can create national alerts' },
        { status: 403 }
      );
    }

    if (scope === 'COUNTY' && !['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(userRole || '')) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions for county-wide alerts' },
        { status: 403 }
      );
    }

    // For station scope, require stationId
    if (scope === 'STATION' && !stationId) {
      return NextResponse.json(
        { success: false, error: 'Station required for station-scoped alerts' },
        { status: 400 }
      );
    }

    // Create alert
    const alert = await prisma.alert.create({
      data: {
        title,
        message,
        type: type as AlertType,
        priority: priority as AlertPriority,
        scope,
        targetRoles,
        createdById: userId,
        stationId: scope === 'STATION' ? stationId : null,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata,
        attachments,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            badgeNumber: true,
          },
        },
        station: {
          select: {
            name: true,
            code: true,
          },
        },
      },
    });

    // Create notifications for relevant users based on scope and targetRoles
    // This is a background task - don't wait for it
    createAlertNotifications(alert.id, scope, stationId || '', targetRoles).catch(err =>
      console.error('Failed to create alert notifications:', err)
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'ALERT',
        entityId: alert.id,
        changes: {
          title,
          type,
          priority,
          scope,
        },
      },
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        title: alert.title,
        type: alert.type,
        priority: alert.priority,
        scope: alert.scope,
        createdAt: alert.createdAt.toISOString(),
      },
      message: 'Alert created successfully',
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

// Helper function to create notifications
async function createAlertNotifications(
  alertId: string,
  scope: string,
  stationId: string,
  targetRoles: string[]
) {
  try {
    let users;

    if (scope === 'NATIONAL') {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          ...(targetRoles.length > 0 && { role: { in: targetRoles } }),
        },
        select: { id: true },
      });
    } else if (scope === 'STATION') {
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          stationId,
          ...(targetRoles.length > 0 && { role: { in: targetRoles } }),
        },
        select: { id: true },
      });
    } else if (scope === 'COUNTY') {
      // Get all stations in the same county
      const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { county: true },
      });

      if (station) {
        users = await prisma.user.findMany({
          where: {
            isActive: true,
            station: { county: station.county },
            ...(targetRoles.length > 0 && { role: { in: targetRoles } }),
          },
          select: { id: true },
        });
      }
    }

    if (users && users.length > 0) {
      await prisma.notification.createMany({
        data: users.map(user => ({
          userId: user.id,
          title: 'New Alert',
          message: 'A new alert has been issued that requires your attention',
          type: 'ALERT',
          relatedId: alertId,
          relatedType: 'ALERT',
          actionUrl: `/communications/alerts`,
        })),
      });
    }
  } catch (error) {
    console.error('Error creating alert notifications:', error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const canManageAlerts = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'OCS'].includes(userRole || '');

    if (!canManageAlerts) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { alertId, isActive, expiresAt } = body;

    if (!alertId) {
      return NextResponse.json(
        { success: false, error: 'Alert ID is required' },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'ALERT',
        entityId: alertId,
        changes: { isActive },
      },
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      alert: { id: alert.id, isActive: alert.isActive },
    });
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
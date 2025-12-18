// ============================================
// FILE: src/app/api/communications/alerts/[id]/acknowledge/route.ts
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Acknowledge an alert
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notes } = body;

    // Check if alert exists and is active
    const alert = await prisma.alert.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (!alert.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot acknowledge inactive alert' },
        { status: 400 }
      );
    }

    // Check if already acknowledged
    const existing = await prisma.alertAcknowledgment.findUnique({
      where: {
        alertId_userId: {
          alertId: resolvedParams.id,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Alert already acknowledged' },
        { status: 400 }
      );
    }

    // Create acknowledgment
    const acknowledgment = await prisma.alertAcknowledgment.create({
      data: {
        alertId: resolvedParams.id,
        userId,
        notes: notes || null,
      },
      include: {
        user: {
          select: {
            name: true,
            badgeNumber: true,
          },
        },
      },
    });

    // Update related notification if exists
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          relatedId: resolvedParams.id,
          relatedType: 'ALERT',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });
    } catch (notificationError) {
      console.error('Failed to update notification:', notificationError);
      // Don't fail the request if notification update fails
    }

    return NextResponse.json({
      success: true,
      acknowledgment: {
        id: acknowledgment.id,
        userName: acknowledgment.user.name,
        acknowledgedAt: acknowledgment.acknowledgedAt.toISOString(),
      },
      message: 'Alert acknowledged successfully',
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to acknowledge alert' },
      { status: 500 }
    );
  }
}

// GET - Retrieve acknowledgment status
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const resolvedParams = await params;
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const acknowledgments = await prisma.alertAcknowledgment.findMany({
      where: { alertId: resolvedParams.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            badgeNumber: true,
            role: true,
          },
        },
      },
      orderBy: {
        acknowledgedAt: 'asc',
      },
    });

    const formattedAcknowledgments = acknowledgments.map((ack: {
      id: string;
      alertId: string;
      userId: string;
      acknowledgedAt: Date;
      notes: string | null;
      user: {
        id: string;
        name: string;
        badgeNumber: string | null;
        role: string;
      };
    }) => ({
      id: ack.id,
      userId: ack.userId,
      userName: ack.user.name,
      userBadge: ack.user.badgeNumber || 'N/A',
      userRole: ack.user.role,
      notes: ack.notes,
      acknowledgedAt: ack.acknowledgedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      acknowledgments: formattedAcknowledgments,
      total: formattedAcknowledgments.length,
    });
  } catch (error) {
    console.error('Error fetching acknowledgments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch acknowledgments' },
      { status: 500 }
    );
  }
}
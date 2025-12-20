// ============================================
// FILE: src/app/api/communications/messages/[id]/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const message = await prisma.internalMessage.findUnique({
      where: { id: params.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            badgeNumber: true,
            role: true,
          },
        },
        receiver: {
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
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this message
    const hasAccess = message.senderId === userId || message.receiverId === userId;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        readAt: message.readAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { isArchived } = body;

    // Get message to verify ownership
    const message = await prisma.internalMessage.findUnique({
      where: { id: params.id },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Only sender or receiver can archive
    if (message.senderId !== userId && message.receiverId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const updated = await prisma.internalMessage.update({
      where: { id: params.id },
      data: {
        isArchived,
        archivedAt: isArchived ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: { id: updated.id, isArchived: updated.isArchived },
    });
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get message to verify ownership
    const message = await prisma.internalMessage.findUnique({
      where: { id: params.id },
    });

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    // Only sender or admins can delete
    const canDelete = message.senderId === userId || 
                     ['SUPER_ADMIN', 'ADMIN'].includes(userRole || '');

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: 'Only sender or admins can delete messages' },
        { status: 403 }
      );
    }

    await prisma.internalMessage.delete({
      where: { id: params.id },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        entity: 'MESSAGE',
        entityId: params.id,
      },
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
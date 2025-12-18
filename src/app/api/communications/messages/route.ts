// ============================================
// FILE: src/app/api/communications/messages/route.ts
// UPDATED for InternalMessage model
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { MessageStatus, AlertPriority } from '@prisma/client';

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

    // Determine message visibility based on role
    const canSeeAllStationMessages = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER', 'OCS'].includes(userRole || '');

    // Build query conditions
    const whereConditions = canSeeAllStationMessages && stationId
      ? {
          OR: [
            { senderId: userId },
            { receiverId: userId },
            { stationId: stationId }
          ]
        }
      : {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        };

    const messages = await prisma.internalMessage.findMany({
      where: whereConditions,
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
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to recent 100 messages
    });

    // Format messages for frontend
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      senderBadge: msg.sender.badgeNumber || 'N/A',
      senderRole: msg.sender.role,
      receiverId: msg.receiverId,
      receiverName: msg.receiver.name,
      receiverBadge: msg.receiver.badgeNumber || 'N/A',
      subject: msg.subject,
      content: msg.content,
      status: msg.status,
      priority: msg.priority,
      isRead: msg.isRead,
      readAt: msg.readAt?.toISOString() || null,
      isArchived: msg.isArchived,
      threadId: msg.threadId,
      replyToId: msg.replyToId,
      attachments: msg.attachments,
      stationId: msg.stationId || '',
      stationName: msg.station?.name || 'N/A',
      createdAt: msg.createdAt.toISOString(),
      updatedAt: msg.updatedAt.toISOString(),
    }));

    // Calculate statistics
    const stats = {
      total: formattedMessages.length,
      unread: formattedMessages.filter(m => !m.isRead && m.receiverId === userId).length,
      sent: formattedMessages.filter(m => m.senderId === userId).length,
      received: formattedMessages.filter(m => m.receiverId === userId).length,
    };

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
      stats,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const stationId = request.headers.get('x-user-station');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      receiverId, 
      subject, 
      content, 
      priority = 'MEDIUM',
      threadId = null,
      replyToId = null,
      attachments = []
    } = body;

    // Validation
    if (!receiverId || !subject || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: receiverId, subject, content' },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, name: true, isActive: true }
    });

    if (!receiver) {
      return NextResponse.json(
        { success: false, error: 'Receiver not found' },
        { status: 404 }
      );
    }

    if (!receiver.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot send message to inactive user' },
        { status: 400 }
      );
    }

    // Create message
    const message = await prisma.internalMessage.create({
      data: {
        senderId: userId,
        receiverId,
        subject,
        content,
        priority: priority as AlertPriority,
        status: MessageStatus.SENT,
        stationId: stationId || undefined,
        threadId,
        replyToId,
        attachments,
        isRead: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            badgeNumber: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            badgeNumber: true,
          },
        },
      },
    });

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: 'New Message',
        message: `You have a new message from ${message.sender.name}: ${subject}`,
        type: 'MESSAGE',
        relatedId: message.id,
        relatedType: 'MESSAGE',
        actionUrl: `/communications/messages`,
      },
    }).catch(err => console.error('Failed to create notification:', err));

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        entity: 'MESSAGE',
        entityId: message.id,
        changes: {
          to: receiverId,
          subject,
        },
      },
    }).catch(err => console.error('Failed to create audit log:', err));

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        subject: message.subject,
        senderName: message.sender.name,
        receiverName: message.receiver.name,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

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
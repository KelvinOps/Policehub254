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
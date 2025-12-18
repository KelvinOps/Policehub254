// ============================================
// FILE: src/app/api/communications/messages/[id]/read/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { MessageStatus } from '@prisma/client';

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

    const message = await prisma.internalMessage.update({
      where: {
        id: params.id,
        receiverId: userId, // Only receiver can mark as read
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: MessageStatus.READ,
      },
    });

    return NextResponse.json({
      success: true,
      message: { 
        id: message.id, 
        isRead: message.isRead,
        readAt: message.readAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
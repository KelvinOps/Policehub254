// lib/actions/messages.actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; // adjust to your auth import
import prisma from "@/lib/prisma"; // adjust to your prisma import
import type { ComposeMessageData } from "@/types/communications";

/**
 * Fetch all messages for the current user (inbox, sent, archived)
 */
export async function getMessages() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const [inbox, sent, archived, unreadCount] = await Promise.all([
    prisma.internalMessage.findMany({
      where: {
        receiverId: userId,
        isArchived: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            badgeNumber: true,
            rank: true,
            department: true,
            avatar: true,
            stationId: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            badgeNumber: true,
            rank: true,
            department: true,
            avatar: true,
            stationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.internalMessage.findMany({
      where: {
        senderId: userId,
        isArchived: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            badgeNumber: true,
            rank: true,
            department: true,
            avatar: true,
            stationId: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            badgeNumber: true,
            rank: true,
            department: true,
            avatar: true,
            stationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.internalMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        isArchived: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            badgeNumber: true,
            rank: true,
            department: true,
            avatar: true,
            stationId: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            badgeNumber: true,
            rank: true,
            department: true,
            avatar: true,
            stationId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.internalMessage.count({
      where: {
        receiverId: userId,
        isRead: false,
        isArchived: false,
      },
    }),
  ]);

  // Fetch officers for compose
  const officers = await prisma.user.findMany({
    where: {
      isActive: true,
      NOT: { id: userId },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      badgeNumber: true,
      rank: true,
      department: true,
      avatar: true,
      stationId: true,
    },
    orderBy: { name: "asc" },
  });

  return {
    inbox: JSON.parse(JSON.stringify(inbox)),
    sent: JSON.parse(JSON.stringify(sent)),
    archived: JSON.parse(JSON.stringify(archived)),
    unreadCount,
    officers: JSON.parse(JSON.stringify(officers)),
  };
}

/**
 * Send a new internal message
 */
export async function sendMessage(data: ComposeMessageData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const message = await prisma.internalMessage.create({
    data: {
      senderId: session.user.id,
      receiverId: data.receiverId,
      subject: data.subject,
      content: data.content,
      priority: data.priority,
      attachments: data.attachments ?? [],
      replyToId: data.replyToId,
      threadId: data.threadId,
      status: "SENT",
    },
  });

  // Create notification for receiver
  await prisma.notification.create({
    data: {
      userId: data.receiverId,
      title: "New Message",
      message: `You have a new message from ${session.user.name ?? "an officer"}`,
      type: "MESSAGE",
      relatedId: message.id,
      relatedType: "InternalMessage",
      actionUrl: `/dashboard/communications/messages`,
    },
  });

  revalidatePath("/dashboard/communications/messages");
  return { success: true, messageId: message.id };
}

/**
 * Mark a message as read
 */
export async function markMessageRead(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.internalMessage.update({
    where: { id: messageId, receiverId: session.user.id },
    data: {
      isRead: true,
      readAt: new Date(),
      status: "READ",
    },
  });

  revalidatePath("/dashboard/communications/messages");
  return { success: true };
}

/**
 * Archive a message
 */
export async function archiveMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.internalMessage.update({
    where: {
      id: messageId,
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    data: {
      isArchived: true,
      archivedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/communications/messages");
  return { success: true };
}

/**
 * Delete a message (soft delete via archive)
 */
export async function deleteMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.internalMessage.update({
    where: {
      id: messageId,
      OR: [{ senderId: session.user.id }, { receiverId: session.user.id }],
    },
    data: { isArchived: true, archivedAt: new Date() },
  });

  revalidatePath("/dashboard/communications/messages");
  return { success: true };
}

/**
 * Mark all inbox messages as read
 */
export async function markAllRead() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await prisma.internalMessage.updateMany({
    where: {
      receiverId: session.user.id,
      isRead: false,
    },
    data: { isRead: true, readAt: new Date(), status: "READ" },
  });

  revalidatePath("/dashboard/communications/messages");
  return { success: true };
}
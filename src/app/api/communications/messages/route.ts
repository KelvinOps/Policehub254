// app/api/communications/messages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") ?? "inbox") as "inbox" | "sent" | "archived";
    const search = searchParams.get("search") ?? "";
    const priority = searchParams.get("priority") ?? "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    // ── Build where clause based on folder tab ───────────────────────────────
    const baseWhere =
      tab === "inbox"
        ? { receiverId: user.id, isArchived: false }
        : tab === "sent"
        ? { senderId: user.id, isArchived: false }
        : {
            OR: [{ senderId: user.id }, { receiverId: user.id }],
            isArchived: true,
          };

    // ── Search filter ────────────────────────────────────────────────────────
    const searchFilter =
      search.trim()
        ? {
            OR: [
              { subject: { contains: search, mode: "insensitive" as const } },
              { content: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

    // ── Priority filter ──────────────────────────────────────────────────────
    // InternalMessage.priority uses AlertPriority enum: HIGH | MEDIUM | LOW | URGENT
    const priorityFilter =
      priority !== "ALL"
        ? { priority: priority as "HIGH" | "MEDIUM" | "LOW" | "URGENT" }
        : {};

    const where = { ...baseWhere, ...searchFilter, ...priorityFilter };

    const [messages, total, unreadCount] = await Promise.all([
      prisma.internalMessage.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
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
        skip,
        take: limit,
      }),
      prisma.internalMessage.count({ where }),
      prisma.internalMessage.count({
        where: {
          receiverId: user.id,
          isRead: false,
          isArchived: false,
        },
      }),
    ]);

    return NextResponse.json(
      { messages, total, unreadCount, page, limit },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/communications/messages]", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, subject, content, priority, replyToId, threadId } = body;

    if (!receiverId || !subject?.trim() || !content?.trim()) {
      return NextResponse.json(
        { error: "receiverId, subject, and content are required" },
        { status: 400 }
      );
    }

    // Verify receiver exists and is active
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, isActive: true },
    });

    if (!receiver || !receiver.isActive) {
      return NextResponse.json(
        { error: "Recipient not found or inactive" },
        { status: 404 }
      );
    }

    // Cannot message yourself
    if (receiverId === user.id) {
      return NextResponse.json(
        { error: "Cannot send a message to yourself" },
        { status: 400 }
      );
    }

    const message = await prisma.internalMessage.create({
      data: {
        senderId: user.id,
        receiverId,
        subject: subject.trim(),
        content: content.trim(),
        // InternalMessage.priority is AlertPriority enum
        priority: (priority ?? "MEDIUM") as "HIGH" | "MEDIUM" | "LOW" | "URGENT",
        replyToId: replyToId ?? null,
        threadId: threadId ?? null,
        status: "SENT",
        stationId: user.stationId ?? null,
      },
    });

    // Create inbox notification for the receiver
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: "New Message",
        message: `You have a new message: "${subject.trim().slice(0, 80)}"`,
        type: "MESSAGE",
        relatedId: message.id,
        relatedType: "InternalMessage",
        actionUrl: `/dashboard/communications/messages`,
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/communications/messages]", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
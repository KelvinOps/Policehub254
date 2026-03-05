// app/api/communications/messages/[id]/read/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Only the receiver can mark a message as read
    const message = await prisma.internalMessage.findFirst({
      where: {
        id,
        receiverId: user.id,
      },
      select: { id: true, isRead: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found or you are not the recipient" },
        { status: 404 }
      );
    }

    // No-op if already read — avoid unnecessary DB write
    if (message.isRead) {
      return NextResponse.json({ success: true, alreadyRead: true }, { status: 200 });
    }

    await prisma.internalMessage.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
        status: "READ",
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/communications/messages/[id]/read]", error);
    return NextResponse.json(
      { error: "Failed to mark message as read" },
      { status: 500 }
    );
  }
}
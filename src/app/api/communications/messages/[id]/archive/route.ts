// app/api/communications/messages/[id]/archive/route.ts

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

    // Both sender and receiver can archive their copy
    const message = await prisma.internalMessage.findFirst({
      where: {
        id,
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      select: { id: true, isArchived: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message.isArchived) {
      return NextResponse.json(
        { success: true, alreadyArchived: true },
        { status: 200 }
      );
    }

    await prisma.internalMessage.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
        status: "ARCHIVED",
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/communications/messages/[id]/archive]", error);
    return NextResponse.json(
      { error: "Failed to archive message" },
      { status: 500 }
    );
  }
}
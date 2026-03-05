// app/api/communications/messages/markAllRead/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.internalMessage.updateMany({
      where: {
        receiverId: user.id,
        isRead: false,
        isArchived: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
        status: "READ",
      },
    });

    return NextResponse.json(
      { success: true, updatedCount: result.count },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PATCH /api/communications/messages/markAllRead]", error);
    return NextResponse.json(
      { error: "Failed to mark all messages as read" },
      { status: 500 }
    );
  }
}
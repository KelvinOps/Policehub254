// app/api/communications/messages/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const message = await prisma.internalMessage.findFirst({
      where: {
        id,
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
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
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/communications/messages/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch message" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Only sender or receiver can delete (soft delete via archive)
    const message = await prisma.internalMessage.findFirst({
      where: {
        id,
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
      select: { id: true },
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
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
    console.error("[DELETE /api/communications/messages/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
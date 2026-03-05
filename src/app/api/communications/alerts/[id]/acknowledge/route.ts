// app/api/communications/alerts/[id]/acknowledge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify alert exists
    const alert = await prisma.alert.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Parse optional notes from request body
    let notes: string | null = null;
    try {
      const body = await req.json();
      notes = body?.notes?.trim() || null;
    } catch {
      // Body is optional — silently ignore parse errors
    }

    // Upsert: prevents duplicate acknowledgments per @@unique([alertId, userId])
    const acknowledgment = await prisma.alertAcknowledgment.upsert({
      where: {
        alertId_userId: {
          alertId: id,
          userId: user.id,
        },
      },
      update: {
        // Refresh the timestamp and notes if re-acknowledging
        acknowledgedAt: new Date(),
        notes,
      },
      create: {
        alertId: id,
        userId: user.id,
        notes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            badgeNumber: true,
          },
        },
      },
    });

    return NextResponse.json({ acknowledgment }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/communications/alerts/[id]/acknowledge]", error);
    return NextResponse.json(
      { error: "Failed to acknowledge alert" },
      { status: 500 }
    );
  }
}
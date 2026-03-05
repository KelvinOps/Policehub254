// app/api/communications/alerts/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// Only these roles may permanently delete an alert
const DELETE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.STATION_COMMANDER,
];

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            role: true,
            badgeNumber: true,
          },
        },
        station: {
          select: { id: true, name: true, code: true },
        },
        acknowledgments: {
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
          orderBy: { acknowledgedAt: "desc" },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        alert: {
          ...alert,
          acknowledgedByMe: alert.acknowledgments.some(
            (ack) => ack.userId === user.id
          ),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/communications/alerts/[id]]", error);
    return NextResponse.json(
      { error: "Failed to fetch alert" },
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

    if (!DELETE_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions to delete alerts" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Cascade delete will remove AlertAcknowledgment records automatically
    await prisma.alert.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/communications/alerts/[id]]", error);
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }
}
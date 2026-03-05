// app/api/communications/alerts/[id]/deactivate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// Roles that can deactivate alerts
const DEACTIVATE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.STATION_COMMANDER,
  UserRole.OCS,
];

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!DEACTIVATE_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions to deactivate alerts" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const alert = await prisma.alert.findUnique({
      where: { id },
      select: { id: true, isActive: true, stationId: true },
    });

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    if (!alert.isActive) {
      return NextResponse.json(
        { success: true, alreadyInactive: true },
        { status: 200 }
      );
    }

    // Station commanders / OCS can only deactivate alerts for their own station
    const isGlobalAdmin =
      user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

    if (!isGlobalAdmin && alert.stationId && alert.stationId !== user.stationId) {
      return NextResponse.json(
        { error: "You can only deactivate alerts for your own station" },
        { status: 403 }
      );
    }

    const updated = await prisma.alert.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });

    return NextResponse.json({ success: true, alert: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/communications/alerts/[id]/deactivate]", error);
    return NextResponse.json(
      { error: "Failed to deactivate alert" },
      { status: 500 }
    );
  }
}
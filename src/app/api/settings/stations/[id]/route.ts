// app/api/settings/stations/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

const MANAGE_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

// ── GET  /api/settings/stations/[id] ───────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const station = await prisma.station.findUnique({
      where: { id },
      include: {
        _count: { select: { User: true, Case: true, OccurrenceBook: true } },
      },
    });

    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    if (!MANAGE_ROLES.includes(user.role as UserRole) && station.id !== user.stationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ station }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/settings/stations/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch station" }, { status: 500 });
  }
}

// ── PATCH  /api/settings/stations/[id] ────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!MANAGE_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const station = await prisma.station.findUnique({ where: { id }, select: { id: true } });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    if (body.code) {
      const conflict = await prisma.station.findFirst({
        where: { code: body.code.trim().toUpperCase(), NOT: { id } },
        select: { id: true },
      });
      if (conflict) return NextResponse.json({ error: `Code "${body.code.toUpperCase()}" already exists` }, { status: 409 });
    }

    const updated = await prisma.station.update({
      where: { id },
      data: {
        ...(body.name        && { name:        body.name.trim() }),
        ...(body.code        && { code:        body.code.trim().toUpperCase() }),
        ...(body.county      && { county:      body.county.trim() }),
        ...(body.subCounty   && { subCounty:   body.subCounty.trim() }),
        ...(body.address     && { address:     body.address.trim() }),
        ...(body.phoneNumber && { phoneNumber: body.phoneNumber.trim() }),
        ...(body.email       !== undefined && { email:     body.email?.trim()     || null }),
        ...(body.latitude    !== undefined && { latitude:  body.latitude }),
        ...(body.longitude   !== undefined && { longitude: body.longitude }),
        ...(body.commander   !== undefined && { commander: body.commander?.trim() || null }),
        ...(body.capacity    !== undefined && { capacity:  body.capacity ? Number(body.capacity) : null }),
        ...(body.isActive    !== undefined && { isActive:  Boolean(body.isActive) }),
      },
      include: { _count: { select: { User: true, Case: true, OccurrenceBook: true } } },
    });

    return NextResponse.json({ station: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/settings/stations/[id]]", error);
    return NextResponse.json({ error: "Failed to update station" }, { status: 500 });
  }
}

// ── DELETE  /api/settings/stations/[id]  (soft delete = deactivate) ───────

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Only Super Admins can deactivate stations" }, { status: 403 });
    }

    const { id } = await params;

    const station = await prisma.station.findUnique({
      where: { id },
      select: { id: true, _count: { select: { User: true } } },
    });
    if (!station) return NextResponse.json({ error: "Station not found" }, { status: 404 });

    if (station._count.User > 0) {
      return NextResponse.json(
        { error: "Cannot deactivate a station with assigned users. Reassign officers first." },
        { status: 409 }
      );
    }

    await prisma.station.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/settings/stations/[id]]", error);
    return NextResponse.json({ error: "Failed to deactivate station" }, { status: 500 });
  }
}
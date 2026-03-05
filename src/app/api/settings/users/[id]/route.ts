// app/api/settings/users/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ id: string }> };

const MANAGE_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN, UserRole.ADMIN,
  UserRole.STATION_COMMANDER, UserRole.OCS,
];

const USER_SELECT = {
  id: true, name: true, email: true, role: true,
  badgeNumber: true, phoneNumber: true, rank: true,
  department: true, avatar: true, stationId: true,
  isActive: true, lastLogin: true, createdAt: true, updatedAt: true,
  station: { select: { id: true, name: true, code: true } },
} as const;

// ── GET  /api/settings/users/[id] ──────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const target = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isGlobalAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    if (!isGlobalAdmin && target.stationId !== user.stationId && target.id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ user: target }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/settings/users/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}

// ── PATCH  /api/settings/users/[id] ────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const {
      name, email, role, badgeNumber, phoneNumber,
      rank, department, stationId, isActive, newPassword,
    } = body;

    const isSelf     = id === user.id;
    const canManage  = MANAGE_ROLES.includes(user.role as UserRole);

    if (!isSelf && !canManage) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id }, select: { id: true, stationId: true },
    });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isGlobalAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    if (!isGlobalAdmin && !isSelf && target.stationId !== user.stationId) {
      return NextResponse.json({ error: "You can only edit users in your station" }, { status: 403 });
    }

    // Email uniqueness check
    if (email) {
      const conflict = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), NOT: { id } }, select: { id: true },
      });
      if (conflict) return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Badge uniqueness check
    if (badgeNumber) {
      const conflict = await prisma.user.findFirst({
        where: { badgeNumber: badgeNumber.trim().toUpperCase(), NOT: { id } }, select: { id: true },
      });
      if (conflict) return NextResponse.json({ error: "Badge number already in use" }, { status: 409 });
    }

    const data: Record<string, unknown> = {};

    // Fields any authenticated user can change on their own record
    if (name?.trim())            data.name        = name.trim();
    if (phoneNumber !== undefined) data.phoneNumber = phoneNumber?.trim() || null;
    if (rank        !== undefined) data.rank        = rank?.trim()        || null;
    if (department  !== undefined) data.department  = department?.trim()  || null;

    // Manager-only fields
    if (canManage) {
      if (email?.trim())          data.email       = email.trim().toLowerCase();
      if (role)                   data.role        = role as UserRole;
      if (badgeNumber !== undefined) data.badgeNumber = badgeNumber?.trim().toUpperCase() || null;
      if (stationId   !== undefined) data.stationId   = stationId   || null;
      if (isActive    !== undefined) data.isActive    = Boolean(isActive);
    }

    // Manager password reset for another user
    if (newPassword && canManage && !isSelf) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      data.password = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id }, data, select: USER_SELECT,
    });

    return NextResponse.json({ user: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/settings/users/[id]]", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// ── DELETE  /api/settings/users/[id]  (soft deactivate) ────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Only Admins can deactivate users" }, { status: 403 });
    }

    const { id } = await params;

    if (id === user.id) {
      return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/settings/users/[id]]", error);
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
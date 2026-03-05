// app/api/settings/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import bcrypt from "bcryptjs";

// ── GET  /api/settings/profile ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true, role: true,
        badgeNumber: true, phoneNumber: true, rank: true,
        department: true, avatar: true, dateOfBirth: true,
        emergencyContact: true, emergencyPhone: true,
        stationId: true, isActive: true, lastLogin: true,
        createdAt: true, updatedAt: true,
        station: { select: { id: true, name: true, code: true } },
      },
    });

    if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/settings/profile]", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// ── PATCH  /api/settings/profile  (update personal info) ──────────────────

export async function PATCH(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      name, phoneNumber, rank, department,
      dateOfBirth, emergencyContact, emergencyPhone,
    } = body;

    if (name !== undefined && !name?.trim()) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name?.trim()           && { name: name.trim() }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber?.trim() || null }),
        ...(rank !== undefined        && { rank: rank?.trim() || null }),
        ...(department !== undefined  && { department: department?.trim() || null }),
        ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }),
        ...(emergencyContact !== undefined && { emergencyContact: emergencyContact?.trim() || null }),
        ...(emergencyPhone !== undefined   && { emergencyPhone: emergencyPhone?.trim() || null }),
      },
      select: {
        id: true, name: true, email: true, role: true,
        badgeNumber: true, phoneNumber: true, rank: true,
        department: true, avatar: true, dateOfBirth: true,
        emergencyContact: true, emergencyPhone: true,
        stationId: true, isActive: true, lastLogin: true,
        createdAt: true, updatedAt: true,
        station: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ profile: updated }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/settings/profile]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

// ── POST  /api/settings/profile  (change password) ────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { action, currentPassword, newPassword, confirmPassword } = body;

    if (action !== "change_password") {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: "All password fields are required" }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const isValid = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/settings/profile]", error);
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 });
  }
}
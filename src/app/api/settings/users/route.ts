// app/api/settings/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

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

// ── GET  /api/settings/users ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const search    = searchParams.get("search")    ?? "";
    const role      = searchParams.get("role")      ?? "";
    const stationId = searchParams.get("stationId") ?? "";
    const isActive  = searchParams.get("isActive");
    const page      = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip      = (page - 1) * limit;

    const isGlobalAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    const where: Record<string, unknown> = {};

    if (search.trim()) {
      where.OR = [
        { name:        { contains: search, mode: "insensitive" } },
        { email:       { contains: search, mode: "insensitive" } },
        { badgeNumber: { contains: search, mode: "insensitive" } },
        { rank:        { contains: search, mode: "insensitive" } },
      ];
    }

    if (role) where.role = role as UserRole;
    if (isActive !== null && isActive !== "") where.isActive = isActive === "true";

    if (!isGlobalAdmin) {
      where.stationId = user.stationId ?? "__none__";
    } else if (stationId) {
      where.stationId = stationId;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: USER_SELECT,
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, limit }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/settings/users]", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// ── POST  /api/settings/users  (create) ────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!MANAGE_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json({ error: "Insufficient permissions to create users" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, badgeNumber, phoneNumber, rank, department, stationId } = body;

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return NextResponse.json({ error: "name, email, password, and role are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const emailExists = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }, select: { id: true },
    });
    if (emailExists) return NextResponse.json({ error: "Email address already in use" }, { status: 409 });

    if (badgeNumber?.trim()) {
      const badgeExists = await prisma.user.findUnique({
        where: { badgeNumber: badgeNumber.trim().toUpperCase() }, select: { id: true },
      });
      if (badgeExists) return NextResponse.json({ error: "Badge number already in use" }, { status: 409 });
    }

    // Station-scoped users can only create within their station
    const isGlobalAdmin = user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
    const resolvedStationId = isGlobalAdmin ? (stationId || null) : (user.stationId || null);

    const hashed = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        password:    hashed,
        role:        role as UserRole,
        badgeNumber: badgeNumber?.trim().toUpperCase() || null,
        phoneNumber: phoneNumber?.trim()               || null,
        rank:        rank?.trim()                      || null,
        department:  department?.trim()                || null,
        stationId:   resolvedStationId,
        isActive:    true,
      },
      select: USER_SELECT,
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/settings/users]", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
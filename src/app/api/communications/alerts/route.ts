// app/api/communications/alerts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession, isStationLeadership } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AlertType, AlertPriority, UserRole } from "@prisma/client";

// Roles that may create/manage alerts
const ALERT_MANAGER_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.STATION_COMMANDER,
  UserRole.OCS,
  UserRole.DETECTIVE,
];

export async function GET(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type") ?? "ALL";
    const priorityFilter = searchParams.get("priority") ?? "ALL";
    const activeFilter = searchParams.get("active") ?? "ALL";
    const search = searchParams.get("search") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

    // ── Scope: admins see everything; others see station + national + role-targeted ──
    const isGlobalAdmin =
      user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

    const scopeWhere = isGlobalAdmin
      ? {}
      : {
          OR: [
            { scope: "NATIONAL" },
            { stationId: user.stationId ?? "__none__" },
            // Alerts targeting the user's role explicitly
            { targetRoles: { has: user.role } },
            // Alerts with no specific roles (broadcast to everyone)
            { targetRoles: { isEmpty: true } },
          ],
        };

    // ── Filters ──────────────────────────────────────────────────────────────
    const typeWhere =
      typeFilter !== "ALL"
        ? { type: typeFilter as AlertType }
        : {};

    const priorityWhere =
      priorityFilter !== "ALL"
        ? { priority: priorityFilter as AlertPriority }
        : {};

    const activeWhere =
      activeFilter === "ACTIVE"
        ? { isActive: true }
        : activeFilter === "INACTIVE"
        ? { isActive: false }
        : {};

    const searchWhere = search.trim()
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { message: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const where = {
      ...scopeWhere,
      ...typeWhere,
      ...priorityWhere,
      ...activeWhere,
      ...searchWhere,
    };

    const now = new Date();

    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({
        where,
        include: {
          // createdBy relation name from schema: "CreatedAlerts"
          createdBy: {
            select: {
              id: true,
              name: true,
              role: true,
              badgeNumber: true,
            },
          },
          // station relation name from schema: "StationAlerts"
          station: {
            select: { id: true, name: true, code: true },
          },
          // acknowledgments with nested user
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
        orderBy: [
          // Urgent first, then by creation date
          { priority: "asc" },
          { createdAt: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alert.count({ where }),
    ]);

    // Attach acknowledgedByMe flag for the current user
    const alertsWithFlag = alerts.map((a) => ({
      ...a,
      acknowledgedByMe: a.acknowledgments.some(
        (ack) => ack.userId === user.id
      ),
    }));

    // ── Stats (scoped to what the user can see) ───────────────────────────────
    const [totalCount, activeCount, criticalCount, unacknowledgedCount] =
      await Promise.all([
        prisma.alert.count({ where: scopeWhere }),
        prisma.alert.count({
          where: {
            ...scopeWhere,
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        }),
        prisma.alert.count({
          where: {
            ...scopeWhere,
            isActive: true,
            type: AlertType.CRITICAL,
          },
        }),
        prisma.alert.count({
          where: {
            ...scopeWhere,
            isActive: true,
            acknowledgments: {
              none: { userId: user.id },
            },
          },
        }),
      ]);

    return NextResponse.json(
      {
        alerts: JSON.parse(JSON.stringify(alertsWithFlag)),
        total,
        stats: {
          total: totalCount,
          active: activeCount,
          critical: criticalCount,
          unacknowledged: unacknowledgedCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/communications/alerts]", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getSession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!ALERT_MANAGER_ROLES.includes(user.role as UserRole)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create alerts" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { title, message, type, priority, scope, targetRoles, stationId, expiresAt } =
      body;

    if (!title?.trim() || !message?.trim() || !type || !priority || !scope) {
      return NextResponse.json(
        {
          error:
            "title, message, type, priority, and scope are required",
        },
        { status: 400 }
      );
    }

    // Validate enum values
    if (!Object.values(AlertType).includes(type)) {
      return NextResponse.json(
        { error: `Invalid alert type. Must be one of: ${Object.values(AlertType).join(", ")}` },
        { status: 400 }
      );
    }

    if (!Object.values(AlertPriority).includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${Object.values(AlertPriority).join(", ")}` },
        { status: 400 }
      );
    }

    // Use the requester's station if no stationId provided and scope is STATION
    const resolvedStationId =
      stationId ?? (scope === "STATION" ? user.stationId : null);

    const alert = await prisma.alert.create({
      data: {
        title: title.trim(),
        message: message.trim(),
        type: type as AlertType,
        priority: priority as AlertPriority,
        scope,
        targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
        createdById: user.id,
        stationId: resolvedStationId ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        attachments: [],
      },
    });

    // ── Notify relevant users ─────────────────────────────────────────────────
    const notifyWhere: Record<string, unknown> = {
      isActive: true,
      NOT: { id: user.id }, // don't notify self
    };

    if (scope === "STATION" && resolvedStationId) {
      notifyWhere.stationId = resolvedStationId;
    }

    if (Array.isArray(targetRoles) && targetRoles.length > 0) {
      notifyWhere.role = { in: targetRoles };
    }

    const usersToNotify = await prisma.user.findMany({
      where: notifyWhere,
      select: { id: true },
    });

    if (usersToNotify.length > 0) {
      await prisma.notification.createMany({
        data: usersToNotify.map((u) => ({
          userId: u.id,
          title: `${type} Alert: ${title.trim().slice(0, 60)}`,
          message: message.trim().slice(0, 200),
          type: "ALERT",
          relatedId: alert.id,
          relatedType: "Alert",
          actionUrl: `/dashboard/communications/alerts`,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/communications/alerts]", error);
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
// lib/actions/alerts.actions.ts

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth"; // adjust to your auth import
import prisma from "@/lib/prisma"; // adjust to your prisma import
import type { CreateAlertData } from "@/types/communications";

/**
 * Fetch all alerts for the current user/station
 */
export async function getAlerts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, stationId: true },
  });

  if (!currentUser) throw new Error("User not found");

  // Admins see all; station users see station + national alerts
  const whereClause =
    currentUser.role === "SUPER_ADMIN" || currentUser.role === "ADMIN"
      ? {}
      : {
          OR: [
            { scope: "NATIONAL" as const },
            { stationId: currentUser.stationId },
            {
              targetRoles: { has: currentUser.role },
            },
          ],
        };

  const alerts = await prisma.alert.findMany({
    where: whereClause,
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          badgeNumber: true,
          rank: true,
          department: true,
          avatar: true,
          stationId: true,
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
              email: true,
              role: true,
              badgeNumber: true,
              rank: true,
              department: true,
              avatar: true,
              stationId: true,
            },
          },
        },
        orderBy: { acknowledgedAt: "desc" },
      },
      _count: { select: { acknowledgments: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const activeCount = alerts.filter((a) => a.isActive).length;
  const criticalCount = alerts.filter(
    (a) => a.isActive && (a.type === "CRITICAL" || a.priority === "URGENT")
  ).length;

  return {
    alerts: JSON.parse(JSON.stringify(alerts)),
    activeCount,
    criticalCount,
  };
}

/**
 * Create a new alert
 */
export async function createAlert(data: CreateAlertData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Only certain roles can create alerts
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, stationId: true },
  });

  const allowedRoles = [
    "SUPER_ADMIN",
    "ADMIN",
    "STATION_COMMANDER",
    "OCS",
    "DETECTIVE",
  ];

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    throw new Error("Insufficient permissions to create alerts");
  }

  const alert = await prisma.alert.create({
    data: {
      title: data.title,
      message: data.message,
      type: data.type,
      priority: data.priority,
      scope: data.scope,
      targetRoles: data.targetRoles,
      createdById: session.user.id,
      stationId: data.stationId ?? currentUser.stationId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      attachments: data.attachments ?? [],
      metadata: data.metadata,
      isActive: true,
    },
  });

  // Create notifications for all relevant users
  const usersToNotify = await prisma.user.findMany({
    where: {
      isActive: true,
      ...(data.scope === "STATION"
        ? { stationId: data.stationId ?? currentUser.stationId }
        : {}),
      ...(data.targetRoles.length > 0
        ? { role: { in: data.targetRoles as never[] } }
        : {}),
    },
    select: { id: true },
  });

  if (usersToNotify.length > 0) {
    await prisma.notification.createMany({
      data: usersToNotify.map((u) => ({
        userId: u.id,
        title: `${data.type} Alert: ${data.title}`,
        message: data.message.substring(0, 200),
        type: "ALERT",
        relatedId: alert.id,
        relatedType: "Alert",
        actionUrl: `/dashboard/communications/alerts`,
      })),
    });
  }

  revalidatePath("/dashboard/communications/alerts");
  return { success: true, alertId: alert.id };
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Upsert acknowledgment (prevent duplicate)
  await prisma.alertAcknowledgment.upsert({
    where: {
      alertId_userId: {
        alertId,
        userId: session.user.id,
      },
    },
    update: { acknowledgedAt: new Date(), notes },
    create: {
      alertId,
      userId: session.user.id,
      notes,
    },
  });

  revalidatePath("/dashboard/communications/alerts");
  return { success: true };
}

/**
 * Deactivate / resolve an alert
 */
export async function deactivateAlert(alertId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "STATION_COMMANDER", "OCS"];
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.alert.update({
    where: { id: alertId },
    data: { isActive: false },
  });

  revalidatePath("/dashboard/communications/alerts");
  return { success: true };
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "STATION_COMMANDER"];
  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    throw new Error("Insufficient permissions");
  }

  await prisma.alert.delete({ where: { id: alertId } });

  revalidatePath("/dashboard/communications/alerts");
  return { success: true };
}
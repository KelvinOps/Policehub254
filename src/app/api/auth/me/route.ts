// src/app/api/auth/me/route.ts

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  try {
    // ── 1. Try middleware-injected headers first (fastest path) ───────────
    const userIdFromHeader = request.headers.get('x-user-id');

    let userId: string | null = userIdFromHeader;

    // ── 2. Fallback to cookie JWT ─────────────────────────────────────────
    if (!userId) {
      const token = request.cookies.get('auth-token')?.value;

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401 }
        );
      }

      try {
        // BUG FIX: was using decoded.userId — JWT payload uses `id`
        const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
        userId = decoded.id;
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // ── 3. Fetch fresh user data ───────────────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:          true,
        email:       true,
        name:        true,
        role:        true,
        stationId:   true,
        badgeNumber: true,
        isActive:    true,
        lastLogin:   true,
        station: {
          select: {
            id:        true,
            name:      true,
            code:      true,
            county:    true,
            subCounty: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // Remove isActive from response (internal field)
    const { isActive: _, ...safeUser } = user;

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Auth /me error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
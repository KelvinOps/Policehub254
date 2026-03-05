// src/lib/auth/server.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  stationId?: string;
  badgeNumber?: string;
}

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  stationId?: string;
}

// ─── Retry helper ─────────────────────────────────────────────────────────────
// Neon free-tier auto-pauses after 5 min of inactivity. When it wakes up the
// first query may fail with P1001 (can't reach server). We retry up to 3 times
// with an exponential back-off so the user never sees a 401 due to a cold start.

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1500
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Only retry on connection errors (P1001 / P1017), not logic errors
      const isConnectionError =
        err?.code === 'P1001' ||
        err?.code === 'P1017' ||
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes('Connection refused');

      if (!isConnectionError || attempt === retries) throw err;

      console.warn(
        `DB connection failed (attempt ${attempt}/${retries}). Retrying in ${delayMs}ms…`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 1.5; // back-off: 1500ms → 2250ms → 3375ms
    }
  }
  throw lastError;
}

// ─── User fetch (shared between header and cookie paths) ──────────────────────

async function fetchUserById(id: string): Promise<AuthUser | null> {
  const user = await withRetry(() =>
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stationId: true,
        badgeNumber: true,
        isActive: true,
      },
    })
  );

  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    stationId: user.stationId || undefined,
    badgeNumber: user.badgeNumber || undefined,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getUserFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  try {
    console.log('=== getUserFromRequest START ===');

    // ── 1. Try middleware-injected headers (fastest path) ──────────────────
    const userIdHeader = request.headers.get('x-user-id');
    const userRoleHeader = request.headers.get('x-user-role');

    console.log('Headers check:', {
      'x-user-id': userIdHeader || 'missing',
      'x-user-role': userRoleHeader || 'missing',
    });

    if (userIdHeader && userRoleHeader) {
      console.log('Using headers to fetch user:', userIdHeader);
      const user = await fetchUserById(userIdHeader);
      if (user) {
        console.log('User found via headers:', { id: user.id, email: user.email });
        return user;
      }
      console.log('User not found or inactive via headers');
      return null;
    }

    // ── 2. Fallback: cookie JWT ────────────────────────────────────────────
    console.log('No headers found, trying cookie...');
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      console.log('No auth-token cookie found');
      return null;
    }

    console.log('Found auth-token cookie, verifying...');
    console.log('JWT_SECRET:', JWT_SECRET.substring(0, 10) + '...');

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      console.log('JWT decoded successfully:', {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return null;
    }

    if (!decoded.id) {
      console.error('Decoded JWT has no id field:', decoded);
      return null;
    }

    console.log('Fetching user from DB with id:', decoded.id);
    const user = await fetchUserById(decoded.id);

    if (user) {
      console.log('User found via cookie:', { id: user.id, email: user.email });
    } else {
      console.log('User not found or inactive via cookie');
    }

    return user;
  } catch (error) {
    console.error('Auth error in getUserFromRequest:', error);
    return null;
  } finally {
    console.log('=== getUserFromRequest END ===\n');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

export function hasStationAccess(user: AuthUser, stationId: string): boolean {
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
  return user.stationId === stationId;
}

export function createUnauthorizedResponse(message = 'Unauthorized') {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createForbiddenResponse(
  message = 'Forbidden - Insufficient permissions'
) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
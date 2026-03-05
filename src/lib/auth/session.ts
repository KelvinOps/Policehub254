//src/lib/auth/session.ts

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  stationId?: string;
  badgeNumber?: string;
  // Add name if you want to include it, but make it optional
  name?: string;
}

export interface JWTPayload extends SessionUser {
  iat?: number;
  exp?: number;
}

/**
 * Get user session from request headers
 * Works with middleware-injected headers
 */
export function getUserFromHeaders(request: NextRequest): SessionUser | null {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role');
  const userStation = request.headers.get('x-user-station');
  const userName = request.headers.get('x-user-name');
  const userBadge = request.headers.get('x-user-badge');

  if (!userId || !userRole || !userEmail) {
    return null;
  }

  return {
    id: userId,
    email: userEmail,
    role: userRole as UserRole,
    stationId: userStation || undefined,
    badgeNumber: userBadge || undefined,
    name: userName || undefined,
  };
}

/**
 * Get user session from JWT token cookie
 */
export function getUserFromToken(request: NextRequest): SessionUser | null {
  try {
    const token = request.cookies.get('auth-token')?.value;
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      stationId: decoded.stationId,
      badgeNumber: decoded.badgeNumber,
      name: decoded.name,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Get user session - tries headers first, then token
 */
export function getSession(request: NextRequest): SessionUser | null {
  // Try headers first (injected by middleware)
  let user = getUserFromHeaders(request);
  
  // Fallback to token
  if (!user) {
    user = getUserFromToken(request);
  }
  
  return user;
}

/**
 * Require authentication - throws if not authenticated
 */
export function requireAuth(request: NextRequest): SessionUser {
  const user = getSession(request);
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: SessionUser, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user is admin (SUPER_ADMIN or ADMIN)
 */
export function isAdmin(user: SessionUser): boolean {
  return hasRole(user, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
}

/**
 * Check if user is station commander or higher
 */
export function isStationLeadership(user: SessionUser): boolean {
  return hasRole(user, [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.STATION_COMMANDER,
    UserRole.OCS,
  ]);
}
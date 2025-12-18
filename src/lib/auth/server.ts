// src/lib/auth/server.ts
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

/**
 * Get authenticated user from request
 * Use this in API routes (not in middleware)
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    console.log('=== getUserFromRequest START ===');
    
    // Try to get user info from headers (set by middleware)
    const userIdHeader = request.headers.get('x-user-id');
    const userRoleHeader = request.headers.get('x-user-role');
    
    console.log('Headers check:', {
      'x-user-id': userIdHeader || 'missing',
      'x-user-role': userRoleHeader || 'missing',
    });

    // If headers are present, fetch user from database
    if (userIdHeader && userRoleHeader) {
      console.log('Using headers to fetch user:', userIdHeader);
      
      const user = await prisma.user.findUnique({
        where: { id: userIdHeader },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          stationId: true,
          badgeNumber: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        console.log('User not found or inactive via headers');
        return null;
      }

      console.log('User found via headers:', { id: user.id, email: user.email });
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stationId: user.stationId || undefined,
        badgeNumber: user.badgeNumber || undefined,
      };
    }

    // Fallback: Get token from cookie
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
      console.log('JWT decoded successfully:', { id: decoded.id, email: decoded.email, role: decoded.role });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return null;
    }
    
    // Check if decoded has id
    if (!decoded.id) {
      console.error('Decoded JWT has no id field:', decoded);
      return null;
    }
    
    console.log('Fetching user from DB with id:', decoded.id);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        stationId: true,
        badgeNumber: true,
        isActive: true,
      },
    });
    
    if (!user || !user.isActive) {
      console.log('User not found or inactive via cookie');
      return null;
    }
    
    console.log('User found via cookie:', { id: user.id, email: user.email });
    
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      stationId: user.stationId || undefined,
      badgeNumber: user.badgeNumber || undefined,
    };
  } catch (error) {
    console.error('Auth error in getUserFromRequest:', error);
    return null;
  } finally {
    console.log('=== getUserFromRequest END ===\n');
  }
}

/**
 * Verify if user has required role
 */
export function hasRole(user: AuthUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Verify if user has access to station data
 */
export function hasStationAccess(user: AuthUser, stationId: string): boolean {
  // Super admins have access to all stations
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
    return true;
  }
  
  // Check if user belongs to the station
  return user.stationId === stationId;
}

/**
 * Create unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized') {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden - Insufficient permissions') {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { 
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
// middleware.ts (root level)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  id: string;
  email: string;
  role: string;
  stationId?: string;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🔒 Middleware running for:', pathname);

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/report-crime',
    '/stations',
    '/lost-found',
    '/clearance',
    '/tips',
  ];

  // API routes that should be public
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/public',
    '/api/health',
    '/api/webhooks',
    '/api/stations',  // Make stations public for registration
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  const isPublicApiRoute = publicApiRoutes.some(route =>
    pathname.startsWith(route)
  );

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value;
  console.log('Token present:', !!token);

  // Allow public routes and public API routes
  if (isPublicRoute || isPublicApiRoute) {
    console.log('✅ Public route, allowing access');
    
    // If accessing auth pages with valid token, redirect to dashboard
    if ((pathname === '/login' || pathname === '/register') && token) {
      try {
        jwt.verify(token, JWT_SECRET);
        console.log('Valid token found, redirecting to dashboard');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      } catch {
        console.log('Invalid token, allowing access to auth pages');
        return NextResponse.next();
      }
    }
    return NextResponse.next();
  }

  // Protected routes - require authentication
  if (!token) {
    console.log('❌ No token found for protected route');
    
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }
    // For page routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token
  try {
    console.log('Verifying token...');
    console.log('JWT_SECRET (first 10 chars):', JWT_SECRET.substring(0, 10));
    
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log('✅ Token verified successfully:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      hasStationId: !!decoded.stationId,
    });
    
    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.id);
    requestHeaders.set('x-user-role', decoded.role);
    if (decoded.stationId) {
      requestHeaders.set('x-user-station', decoded.stationId);
    }
    
    console.log('Headers set:', {
      'x-user-id': decoded.id,
      'x-user-role': decoded.role,
      'x-user-station': decoded.stationId || 'none',
    });

    // Role-based access control
    if (pathname.startsWith('/dashboard/settings/users') || pathname.startsWith('/dashboard/settings/stations')) {
      const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
      if (!adminRoles.includes(decoded.role)) {
        console.log('❌ Insufficient permissions for admin area');
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { success: false, error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    console.log('✅ Access granted');
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Invalid or expired token
    console.error('❌ Token verification failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
      });
    }

    // Clear the invalid token
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, error: 'Invalid or expired token' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url));

    response.cookies.delete('auth-token');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
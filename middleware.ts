// middleware.ts — root of project (same level as /src or /app)


import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JWTPayload {
  id:           string;
  email:        string;
  role:         string;
  name?:        string;
  stationId?:   string;
  badgeNumber?: string;
}

// Pages that don't require a token
const PUBLIC_PAGES = new Set([
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
]);

// API routes that are open without a token
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/public',
  '/api/health',
  '/api/webhooks',
  '/api/stations',
];

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  // Allow sub-paths of public pages (e.g. /report-crime/submit)
  for (const p of PUBLIC_PAGES) {
    if (p !== '/' && pathname.startsWith(p + '/')) return true;
  }
  return false;
}

function isPublicApi(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('auth-token')?.value;

  // ── Decode token once (if present) ────────────────────────────────────────
  let decoded: JWTPayload | null = null;
  if (token) {
    try {
      decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
      decoded = null;
    }
  }

  const isApi = pathname.startsWith('/api/');

  // ── Public API routes ──────────────────────────────────────────────────────
  // Still inject headers if we have a valid token (needed for /api/auth/logout etc.)
  if (isPublicApi(pathname)) {
    if (decoded) {
      const headers = buildUserHeaders(request, decoded);
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  // ── Public pages ───────────────────────────────────────────────────────────
  if (isPublicPage(pathname)) {
    // Already logged in → bounce to dashboard
    if ((pathname === '/login' || pathname === '/register') && decoded) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // ── Everything else is protected ───────────────────────────────────────────
  if (!decoded) {
    // Invalid / missing token — clear stale cookie and redirect
    if (isApi) {
      const res = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      res.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
      return res;
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const res = NextResponse.redirect(loginUrl);
    res.cookies.set('auth-token', '', { maxAge: 0, path: '/' });
    return res;
  }

  // ── Role-based access (admin-only areas) ───────────────────────────────────
  const adminOnlyPrefixes = [
    '/dashboard/settings/users',
    '/dashboard/settings/stations',
  ];
  const needsAdmin = adminOnlyPrefixes.some(p => pathname.startsWith(p));
  if (needsAdmin) {
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    if (!adminRoles.includes(decoded.role)) {
      if (isApi) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── Inject user headers and proceed ───────────────────────────────────────
  const headers = buildUserHeaders(request, decoded);
  return NextResponse.next({ request: { headers } });
}

// ── Helper: build request headers with user identity ──────────────────────────
function buildUserHeaders(request: NextRequest, user: JWTPayload): Headers {
  const headers = new Headers(request.headers);
  headers.set('x-user-id',    user.id);
  headers.set('x-user-email', user.email);
  headers.set('x-user-role',  user.role);
  if (user.name)        headers.set('x-user-name',    user.name);
  if (user.stationId)   headers.set('x-user-station', user.stationId);
  if (user.badgeNumber) headers.set('x-user-badge',   user.badgeNumber);
  return headers;
}

export const config = {
  matcher: [
    // Run on everything except Next.js internals and static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
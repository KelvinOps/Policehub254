// src/app/api/auth/logout/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Expire the auth cookie immediately
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,      // Expire immediately
    path:     '/',
    expires:  new Date(0),
  });

  return response;
}
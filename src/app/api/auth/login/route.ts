// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Session duration — keep in sync with cookie maxAge
const SESSION_HOURS = 8; // 8-hour working shift

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user with station details
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        station: {
          select: { id: true, name: true, code: true, county: true, subCounty: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Your account has been deactivated. Contact your administrator.' },
        { status: 401 }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLogin: new Date() },
    });

    // Create JWT — include `name` so middleware can inject it as a header
    const token = jwt.sign(
      {
        id:          user.id,
        email:       user.email,
        name:        user.name,
        role:        user.role,
        stationId:   user.stationId ?? undefined,
        badgeNumber: user.badgeNumber ?? undefined,
      },
      JWT_SECRET,
      { expiresIn: `${SESSION_HOURS}h` }
    );

    // Build safe user object (no password)
    const { password: _, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      user:    safeUser,
      message: 'Login successful',
    });

    // Set HTTP-only secure cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * SESSION_HOURS,
      path:     '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
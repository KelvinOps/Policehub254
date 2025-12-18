// ============================================
// FILE: src/app/api/auth/register/route.ts
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db/prisma';
import { UserRole } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, badgeNumber, stationId, phoneNumber } = body;

    // Validation
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Clean up stationId - convert empty string to null
    const cleanStationId = stationId && stationId.trim() !== '' ? stationId : null;

    // If stationId provided, verify it exists
    if (cleanStationId) {
      const station = await prisma.station.findUnique({
        where: { id: cleanStationId },
      });

      if (!station) {
        return NextResponse.json(
          { success: false, error: 'Invalid station ID' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Clean up badgeNumber - convert empty string to null
    const cleanBadgeNumber = badgeNumber && badgeNumber.trim() !== '' ? badgeNumber : null;
    const cleanPhoneNumber = phoneNumber && phoneNumber.trim() !== '' ? phoneNumber : null;

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role as UserRole,
        badgeNumber: cleanBadgeNumber,
        stationId: cleanStationId,
        phoneNumber: cleanPhoneNumber,
        isActive: true,
      },
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: 'User registered successfully',
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // More specific error handling
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: `Failed to register user: ${error.message}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
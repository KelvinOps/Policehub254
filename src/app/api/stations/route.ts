// src/app/api/stations/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma'; // FIX: Use shared singleton, NOT new PrismaClient()

export async function GET() {
  try {
    const stations = await prisma.station.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        county: true,
        subCounty: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: stations,
    });
  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stations' },
      { status: 500 }
    );
  }
}
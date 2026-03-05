//app/api/traffic/attachments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getUserFromRequest } from '@/lib/auth/server';
import { prisma } from '@/lib/db/prisma';
import { randomUUID } from 'crypto';

const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const formData  = await request.formData();
    const file      = formData.get('file')       as File   | null;
    const incidentId= formData.get('incidentId') as string | null;

    if (!file || !incidentId) {
      return NextResponse.json(
        { success: false, error: 'file and incidentId are both required' },
        { status: 400 },
      );
    }

    // FIX #32: verify incident exists before creating orphan attachment record
    const incident = await prisma.trafficIncident.findUnique({
      where:  { id: incidentId },
      select: { id: true },
    });
    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `File type not allowed. Accepted: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 10 MB' },
        { status: 400 },
      );
    }

    // ── Write to local disk ──────────────────────────────────────────────────
    // Replace this block with your cloud-storage SDK call for serverless deployments.
    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);
    const ext      = path.extname(file.name);
    const filename = `${randomUUID()}${ext}`;

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'traffic');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/traffic/${filename}`;
    // ────────────────────────────────────────────────────────────────────────

    const attachment = await prisma.attachment.create({
      data: {
        fileName:     file.name,
        fileUrl,
        fileType:     file.type,
        uploadedById: user.id,
        incidentId,
      },
    });

    return NextResponse.json({ success: true, data: attachment }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/traffic/attachments]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload attachment' },
      { status: 500 },
    );
  }
}

// ── GET /api/traffic/attachments ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauth();

    const incidentId = request.nextUrl.searchParams.get('incidentId');
    if (!incidentId) {
      return NextResponse.json(
        { success: false, error: 'incidentId query param is required' },
        { status: 400 },
      );
    }

    const attachments = await prisma.attachment.findMany({
      where:   { incidentId },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: attachments });
  } catch (error) {
    console.error('[GET /api/traffic/attachments]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attachments' },
      { status: 500 },
    );
  }
}

const unauth = () => NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
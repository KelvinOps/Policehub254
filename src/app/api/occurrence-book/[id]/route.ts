// src/app/api/occurrence-book/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import {
  getOBEntryById,
  updateOBEntry,
  deleteOBEntry,
} from '@/lib/db/queries/occurrence-book';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

// ─── GET /api/occurrence-book/[id] ───────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const entry = await getOBEntryById(params.id);

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'OB entry not found' },
        { status: 404 }
      );
    }

    // Non-admins can only view entries from their own station
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    if (!adminRoles.includes(user.role) && entry.stationId !== user.stationId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Remap Prisma uppercase relation names → lowercase for the frontend
    // Schema has: entry.Station, entry.User, entry.Case
    // View/edit pages expect: entry.station, entry.recordedBy, entry.case
    const remapped = {
      ...entry,
      station: entry.Station,
      recordedBy: entry.User,
      case: entry.Case
        ? {
            ...entry.Case,
            assignedTo:
              (entry.Case as any).User_Case_assignedToIdToUser ?? undefined,
            User_Case_assignedToIdToUser: undefined,
          }
        : undefined,
      Station: undefined,
      User: undefined,
      Case: undefined,
    };

    return NextResponse.json({ success: true, data: remapped });
  } catch (error) {
    console.error('Error fetching OB entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch OB entry' },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/occurrence-book/[id] ─────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const existing = await getOBEntryById(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'OB entry not found' },
        { status: 404 }
      );
    }

    // Admin roles OR the officer who recorded it OR same station
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    const canEdit =
      adminRoles.includes(user.role) ||
      existing.recordedById === user.id ||
      existing.stationId === user.stationId;

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions' },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Build update payload — only include fields that were sent
    const updateData: any = {};
    if (body.incidentDate !== undefined)
      updateData.incidentDate = new Date(body.incidentDate);
    if (body.category !== undefined)
      updateData.category = body.category as IncidentCategory;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.latitude !== undefined)
      updateData.latitude =
        body.latitude !== null && body.latitude !== ''
          ? parseFloat(body.latitude)
          : null;
    if (body.longitude !== undefined)
      updateData.longitude =
        body.longitude !== null && body.longitude !== ''
          ? parseFloat(body.longitude)
          : null;
    if (body.reportedBy !== undefined) updateData.reportedBy = body.reportedBy;
    if (body.contactNumber !== undefined)
      updateData.contactNumber = body.contactNumber;
    if (body.status !== undefined)
      updateData.status = body.status as IncidentStatus;
    if (body.witnesses !== undefined) updateData.witnesses = body.witnesses;
    if (body.suspects !== undefined) updateData.suspects = body.suspects;
    if (body.caseId !== undefined) updateData.caseId = body.caseId;

    const updated = await updateOBEntry(params.id, updateData);

    // Remap for frontend
    const remapped = {
      ...updated,
      station: updated.Station,
      recordedBy: updated.User,
      case: updated.Case ?? undefined,
      Station: undefined,
      User: undefined,
      Case: undefined,
    };

    return NextResponse.json({
      success: true,
      data: remapped,
      message: 'OB entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating OB entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update OB entry' },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/occurrence-book/[id] ────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const deleteRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    if (!deleteRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - insufficient permissions to delete' },
        { status: 403 }
      );
    }

    const existing = await getOBEntryById(params.id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'OB entry not found' },
        { status: 404 }
      );
    }

    await deleteOBEntry(params.id);

    return NextResponse.json({
      success: true,
      message: 'OB entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting OB entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete OB entry' },
      { status: 500 }
    );
  }
}
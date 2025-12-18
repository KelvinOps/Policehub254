// src/app/api/occurrence-book/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth/server';
import {
  getOBEntryById,
  updateOBEntry,
  deleteOBEntry,
} from '@/lib/db/queries/occurrence-book';
import { IncidentCategory, IncidentStatus } from '@prisma/client';

/**
 * GET /api/occurrence-book/[id]
 * Fetch a single OB entry by ID
 */
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

    const obEntry = await getOBEntryById(params.id);

    if (!obEntry) {
      return NextResponse.json(
        { success: false, error: 'OB entry not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this entry
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    const hasAccess = 
      adminRoles.includes(user.role) || 
      obEntry.stationId === user.stationId;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: obEntry,
    });
  } catch (error) {
    console.error('Error fetching OB entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch OB entry',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/occurrence-book/[id]
 * Update an OB entry
 */
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

    // Check if entry exists and user has access
    const existingEntry = await getOBEntryById(params.id);

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: 'OB entry not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'];
    const canEdit = 
      adminRoles.includes(user.role) || 
      existingEntry.recordedById === user.id ||
      existingEntry.stationId === user.stationId;

    if (!canEdit) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to edit this entry' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate and prepare update data
    const updateData: any = {};

    if (body.incidentDate) {
      updateData.incidentDate = new Date(body.incidentDate);
    }

    if (body.category) {
      updateData.category = body.category as IncidentCategory;
    }

    if (body.description !== undefined) {
      if (body.description.length < 20) {
        return NextResponse.json(
          { success: false, error: 'Description must be at least 20 characters' },
          { status: 400 }
        );
      }
      updateData.description = body.description;
    }

    if (body.location !== undefined) {
      updateData.location = body.location;
    }

    if (body.latitude !== undefined) {
      updateData.latitude = body.latitude ? parseFloat(body.latitude) : null;
    }

    if (body.longitude !== undefined) {
      updateData.longitude = body.longitude ? parseFloat(body.longitude) : null;
    }

    if (body.status) {
      updateData.status = body.status as IncidentStatus;
    }

    if (body.reportedBy !== undefined) {
      updateData.reportedBy = body.reportedBy;
    }

    if (body.contactNumber !== undefined) {
      updateData.contactNumber = body.contactNumber;
    }

    if (body.evidenceFiles !== undefined) {
      updateData.evidenceFiles = body.evidenceFiles;
    }

    if (body.witnesses !== undefined) {
      updateData.witnesses = body.witnesses;
    }

    if (body.suspects !== undefined) {
      updateData.suspects = body.suspects;
    }

    if (body.caseId !== undefined) {
      updateData.caseId = body.caseId;
    }

    // Update the entry
    const updatedEntry = await updateOBEntry(params.id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedEntry,
      message: 'OB entry updated successfully',
    });
  } catch (error) {
    console.error('Error updating OB entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update OB entry',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/occurrence-book/[id]
 * Delete an OB entry
 */
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

    // Check if entry exists
    const existingEntry = await getOBEntryById(params.id);

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: 'OB entry not found' },
        { status: 404 }
      );
    }

    // Only SUPER_ADMIN, ADMIN, and STATION_COMMANDER can delete
    const canDelete = ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(user.role);

    if (!canDelete) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You do not have permission to delete OB entries. Only administrators can delete records.' 
        },
        { status: 403 }
      );
    }

    // Check if entry has associated case
    if (existingEntry.caseId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot delete OB entry with associated case. Close the case first.' 
        },
        { status: 400 }
      );
    }

    // Delete the entry
    await deleteOBEntry(params.id);

    return NextResponse.json({
      success: true,
      message: 'OB entry deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting OB entry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete OB entry',
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getOBEntriesForReport } from '@/lib/db/queries/occurrence-book';
import { IncidentCategory, IncidentStatus } from '@prisma/client';
import { format } from 'date-fns';

/**
 * Type for OB Entry - Inferred from the actual return type
 */
type OBEntry = Awaited<ReturnType<typeof getOBEntriesForReport>>[number];

/**
 * GET: Generate OB Report
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportFormat = searchParams.get('format') || 'pdf';

    const filters = {
      stationId: searchParams.get('stationId') || undefined,
      category: searchParams.get('category') as IncidentCategory | undefined,
      status: searchParams.get('status') as IncidentStatus | undefined,
      dateFrom: searchParams.get('dateFrom')
        ? new Date(searchParams.get('dateFrom')!)
        : undefined,
      dateTo: searchParams.get('dateTo')
        ? new Date(searchParams.get('dateTo')!)
        : undefined,
    };

    const entries = await getOBEntriesForReport(filters);

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No entries found for the given filters' },
        { status: 404 }
      );
    }

    switch (reportFormat) {
      case 'csv':
        return generateCSVReport(entries);
      case 'excel':
        return generateExcelReport(entries);
      case 'json':
        return NextResponse.json({
          success: true,
          data: entries,
          metadata: {
            total: entries.length,
            generatedAt: new Date().toISOString(),
            filters,
          },
        });
      case 'pdf':
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'PDF generation not yet implemented. Please install jsPDF library.',
            message: 'Use CSV or JSON format for now.',
          },
          { status: 501 }
        );
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Custom Report Generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format = 'pdf',
      filters = {},
      includeEvidence = false,
      includeWitnesses = false,
      includeSuspects = false,
      groupBy,
    } = body;

    const entries = await getOBEntriesForReport(filters);

    let processedData = entries;
    if (groupBy) {
      processedData = groupEntries(entries, groupBy);
    }

    switch (format) {
      case 'csv':
        return generateCSVReport(processedData);
      case 'json':
        return NextResponse.json({
          success: true,
          data: processedData,
          metadata: {
            total: processedData.length,
            generatedAt: new Date().toISOString(),
            filters,
            options: {
              includeEvidence,
              includeWitnesses,
              includeSuspects,
              groupBy,
            },
          },
        });
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid format specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error generating custom report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate custom report',
      },
      { status: 500 }
    );
  }
}

/**
 * Group entries by a field and flatten
 */
function groupEntries(entries: OBEntry[], groupBy: string): OBEntry[] {
  const grouped: Record<string, OBEntry[]> = {};

  entries.forEach((entry) => {
    let key: string;
    switch (groupBy) {
      case 'category':
        key = entry.category || 'Unknown';
        break;
      case 'status':
        key = entry.status || 'Unknown';
        break;
      case 'station':
        key = entry.station?.name || 'Unknown';
        break;
      case 'date':
        key = entry.incidentDate
          ? format(new Date(entry.incidentDate), 'yyyy-MM-dd')
          : 'Unknown';
        break;
      default:
        key = 'Other';
    }

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(entry);
  });

  return Object.values(grouped).flat();
}

/**
 * Generate CSV Report
 */
function generateCSVReport(entries: OBEntry[]) {
  const headers = [
    'OB Number',
    'Incident Date',
    'Category',
    'Description',
    'Location',
    'Status',
    'Reported By',
    'Contact Number',
    'Station',
    'Recorded By',
    'Case Number',
  ];

  const rows = entries.map((entry) => [
    entry.obNumber || '',
    entry.incidentDate
      ? format(new Date(entry.incidentDate), 'yyyy-MM-dd HH:mm')
      : '',
    entry.category || '',
    entry.description?.replace(/,/g, ';') || '',
    entry.location || '',
    entry.status || '',
    entry.reportedBy || '',
    entry.contactNumber || '',
    entry.station?.name || '',
    entry.recordedBy?.name || '',
    entry.case?.caseNumber || 'N/A',
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="ob-report-${Date.now()}.csv"`,
    },
  });
}

/**
 * Generate Excel Report (placeholder)
 */
function generateExcelReport(entries: OBEntry[]) {
  return generateCSVReport(entries);
}
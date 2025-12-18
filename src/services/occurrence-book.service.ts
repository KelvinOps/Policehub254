// src/services/occurrence-book.service.ts
import {
  CreateOBInput,
  UpdateOBInput,
  OBSearchParams,
  OBApiResponse,
  OBListResponse,
  OccurrenceBookEntry,
} from '@/types/occurrence-book';
import { IncidentStatus } from '@prisma/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export class OccurrenceBookService {
  /**
   * Create a new OB entry
   */
  static async create(data: CreateOBInput): Promise<OBApiResponse<OccurrenceBookEntry>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/occurrence-book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create OB entry');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating OB entry:', error);
      throw error;
    }
  }

  /**
   * Get OB entry by ID
   */
  static async getById(id: string): Promise<OBApiResponse<OccurrenceBookEntry>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/occurrence-book/${id}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch OB entry');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching OB entry:', error);
      throw error;
    }
  }

  /**
   * Search/List OB entries with filters and pagination
   */
  static async search(params: OBSearchParams): Promise<OBListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.stationId) queryParams.append('stationId', params.stationId);
      if (params.category) queryParams.append('category', params.category);
      if (params.status) queryParams.append('status', params.status);
      if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom.toString());
      if (params.dateTo) queryParams.append('dateTo', params.dateTo.toString());
      if (params.searchTerm) queryParams.append('search', params.searchTerm);
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/api/occurrence-book?${queryParams.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search OB entries');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching OB entries:', error);
      throw error;
    }
  }

  /**
   * Update OB entry
   */
  static async update(
    id: string,
    data: UpdateOBInput
  ): Promise<OBApiResponse<OccurrenceBookEntry>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/occurrence-book/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update OB entry');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating OB entry:', error);
      throw error;
    }
  }

  /**
   * Update OB status
   */
  static async updateStatus(
    id: string,
    status: IncidentStatus
  ): Promise<OBApiResponse<OccurrenceBookEntry>> {
    return this.update(id, { status });
  }

  /**
   * Delete (close) OB entry
   */
  static async delete(id: string): Promise<OBApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/occurrence-book/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete OB entry');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting OB entry:', error);
      throw error;
    }
  }

  /**
   * Generate report
   */
  static async generateReport(
    format: 'pdf' | 'excel' | 'csv',
    filters?: OBSearchParams
  ): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('format', format);

      if (filters) {
        if (filters.stationId) queryParams.append('stationId', filters.stationId);
        if (filters.category) queryParams.append('category', filters.category);
        if (filters.status) queryParams.append('status', filters.status);
        if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom.toString());
        if (filters.dateTo) queryParams.append('dateTo', filters.dateTo.toString());
      }

      const response = await fetch(
        `${API_BASE_URL}/api/occurrence-book/report?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Download report
   */
  static async downloadReport(
    format: 'pdf' | 'excel' | 'csv',
    filters?: OBSearchParams,
    filename?: string
  ): Promise<void> {
    try {
      const blob = await this.generateReport(format, filters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `ob-report-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }

  /**
   * Get OB statistics
   */
  static async getStatistics(stationId?: string, dateFrom?: Date, dateTo?: Date) {
    try {
      const queryParams = new URLSearchParams();
      if (stationId) queryParams.append('stationId', stationId);
      if (dateFrom) queryParams.append('dateFrom', dateFrom.toISOString());
      if (dateTo) queryParams.append('dateTo', dateTo.toISOString());

      const response = await fetch(
        `${API_BASE_URL}/api/occurrence-book/statistics?${queryParams.toString()}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch statistics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  /**
   * Bulk update OB entries
   */
  static async bulkUpdate(
    ids: string[],
    data: UpdateOBInput
  ): Promise<OBApiResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/occurrence-book/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids, data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bulk update OB entries');
      }

      return await response.json();
    } catch (error) {
      console.error('Error bulk updating OB entries:', error);
      throw error;
    }
  }

  /**
   * Get recent OB entries
   */
  static async getRecent(limit: number = 10, stationId?: string) {
    return this.search({
      limit,
      stationId,
      sortBy: 'incidentDate',
      sortOrder: 'desc',
    });
  }

  /**
   * Search OB entries by location
   */
  static async searchByLocation(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<OBListResponse> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/occurrence-book/search/location?lat=${latitude}&lng=${longitude}&radius=${radiusKm}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to search by location');
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching by location:', error);
      throw error;
    }
  }
}

export default OccurrenceBookService;
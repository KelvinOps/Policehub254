// src/app/(dashboard)/dashboard/criminals/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Filter,
  X,
  CheckCircle,
} from 'lucide-react';
import {
  getWantedStatusColor,
  getWantedStatusLabel,
} from '@/lib/constants/criminal';

interface CriminalEvidence {
  id: string;
  type: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
}

interface Criminal {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  alias: string[];
  gender: string;
  nationality: string;
  isWanted: boolean;
  wantedReason?: string;
  phoneNumber?: string;
  photoUrl?: string;
  Station: {
    name: string;
    code: string;
  };
  cases: {
    id: string;
    caseNumber: string;
    title: string;
    status: string;
  }[];
  CriminalEvidence: CriminalEvidence[];
  fingerprintCount: number; // ← NEW: computed by API
  createdAt: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── NEW: Fingerprint Status Cell ─────────────────────────────────────────────

function FingerprintStatusCell({
  count,
  criminalId,
}: {
  count: number;
  criminalId: string;
}) {
  const complete = count === 10;
  const partial = count > 0 && count < 10;

  return (
    <Link
      href={`/dashboard/criminals/${criminalId}/fingerprints`}
      className="inline-flex items-center gap-1.5 group"
      title={`${count}/10 fingerprints captured — click to manage`}
    >
      {/* Mini bar — 10 slots */}
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-4 rounded-sm transition-colors ${
              i < count
                ? complete
                  ? 'bg-green-500'
                  : 'bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Badge */}
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${
          complete
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : partial
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
        }`}
      >
        {complete && <CheckCircle className="w-3 h-3" />}
        {count === 0 && <AlertTriangle className="w-3 h-3" />}
        {count}/10
      </span>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CriminalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [criminals, setCriminals] = useState<Criminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [wantedFilter, setWantedFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });

  useEffect(() => {
    const wantedParam = searchParams.get('wanted');
    if (wantedParam === 'true') {
      setWantedFilter('true');
    } else if (wantedParam === 'false') {
      setWantedFilter('false');
    } else {
      setWantedFilter('all');
    }
  }, []);

  const fetchCriminals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      if (wantedFilter !== 'all') {
        params.append('wanted', wantedFilter);
      }

      const response = await fetch(`/api/criminals?${params}`);
      const data = await response.json();

      if (data.success) {
        setCriminals(data.data);
        setPagination(data.pagination);
      } else {
        console.error('API Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching criminals:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, searchTerm, wantedFilter]);

  useEffect(() => {
    fetchCriminals();
  }, [fetchCriminals]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this criminal record? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/criminals/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Criminal record deleted successfully');
        fetchCriminals();
      } else {
        alert(data.error || 'Failed to delete record');
      }
    } catch (error) {
      console.error('Error deleting criminal:', error);
      alert('Failed to delete record');
    }
  };

  const getFullName = (criminal: Criminal) => {
    return `${criminal.firstName} ${criminal.middleName ? criminal.middleName + ' ' : ''}${criminal.lastName}`;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setWantedFilter('all');
    setPagination(prev => ({ ...prev, page: 1 }));
    router.push('/dashboard/criminals');
  };

  const hasActiveFilters = searchTerm.trim() || wantedFilter !== 'all';

  // Whether we are in the dedicated wanted-persons view
  const isWantedView = wantedFilter === 'true';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isWantedView ? 'Wanted Persons' : 'Criminal Records'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {wantedFilter === 'true'
              ? 'Showing all persons with active wanted status'
              : wantedFilter === 'false'
              ? 'Viewing non-wanted persons only'
              : 'Manage criminal database and records'}
          </p>
        </div>
        <Link
          href="/dashboard/criminals/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          Register Criminal
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, ID, or alias..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={wantedFilter}
              onChange={(e) => {
                setWantedFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="true">Wanted Only</option>
              <option value="false">Not Wanted</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={fetchCriminals}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {searchTerm.trim() && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                  <Filter className="w-3 h-3" />
                  Search: {searchTerm}
                </span>
              )}
              {wantedFilter !== 'all' && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  wantedFilter === 'true'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                }`}>
                  <AlertTriangle className="w-3 h-3" />
                  {wantedFilter === 'true' ? 'Wanted Only' : 'Not Wanted'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading criminals...</p>
          </div>
        ) : criminals.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No criminal records found
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your filters or search criteria'
                : 'Start by registering a new criminal record'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            ) : (
              <Link
                href="/dashboard/criminals/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Register Criminal
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nationality
                    </th>
                    {/* Status column — shows wanted/not-wanted badge normally,
                        switches to "Wanted Reason" header in wanted-only view */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {isWantedView ? 'Wanted Reason' : 'Status'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Station
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cases
                    </th>
                    {/* ── NEW column ── */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fingerprints
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {criminals.map((criminal) => (
                    <tr
                      key={criminal.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {criminal.photoUrl ? (
                            <img
                              src={criminal.photoUrl}
                              alt={getFullName(criminal)}
                              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {criminal.firstName[0]}{criminal.lastName[0]}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {getFullName(criminal)}
                            </p>
                            {criminal.alias.length > 0 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                aka: {criminal.alias.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {criminal.gender}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {criminal.nationality}
                      </td>

                      {/* Status cell — badge in normal view, wanted reason in wanted-only view */}
                      <td className="px-6 py-4">
                        {isWantedView ? (
                          <div className="flex items-start gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 whitespace-nowrap flex-shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              Wanted
                            </span>
                            {criminal.wantedReason ? (
                              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                {criminal.wantedReason}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                                No reason specified
                              </p>
                            )}
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getWantedStatusColor(
                              criminal.isWanted.toString()
                            )}`}
                          >
                            {criminal.isWanted && (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {getWantedStatusLabel(criminal.isWanted)}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {criminal.Station?.name ?? '—'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {criminal.Station?.code ?? ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-medium">
                          {criminal.cases?.length ?? 0}
                        </span>
                      </td>

                      {/* ── NEW: Fingerprints cell ── */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <FingerprintStatusCell
                          count={criminal.fingerprintCount ?? 0}
                          criminalId={criminal.id}
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/criminals/${criminal.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/dashboard/criminals/${criminal.id}/edit`}
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(criminal.id)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">
                    {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.total}</span> records
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1 || loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                  Page <span className="font-medium">{pagination.page}</span> of{' '}
                  <span className="font-medium">{pagination.totalPages || 1}</span>
                </span>
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages || loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
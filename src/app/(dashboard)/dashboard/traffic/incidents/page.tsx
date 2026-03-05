//dashboard/traffic/incidents/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrafficCone, Search, Filter, Plus, Eye, Edit,
  ChevronLeft, ChevronRight, RefreshCw, Clock,
  MapPin, User, AlertCircle, CheckCircle, Zap,
  ArrowUpDown, Download, Tag
} from 'lucide-react';

interface Incident {
  id: string;
  incidentNumber: string;
  type: string;
  status: string;
  reportedAt: string;
  location: string;
  description: string;
  assignedTo?: { id: string; name: string; badgeNumber: string };
  assignedToName?: string;
  station?: { name: string; code: string };
  severity?: string;
  citations?: any[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  INVESTIGATING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CITATION_ISSUED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

// Urgency derived from status age and status
function getUrgency(incident: Incident): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (incident.status === 'PENDING') {
    const age = Date.now() - new Date(incident.reportedAt).getTime();
    if (age > 3600000) return 'HIGH'; // >1 hour unresolved = HIGH
    return 'MEDIUM';
  }
  if (incident.status === 'INVESTIGATING') return 'MEDIUM';
  return 'LOW';
}

const URGENCY_COLORS: Record<string, string> = {
  HIGH: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  MEDIUM: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
  LOW: 'text-green-600 bg-green-50 dark:bg-green-900/20',
};

export default function TrafficIncidentsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState<'reportedAt' | 'status'>('reportedAt');

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: 'TRAFFIC', page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/traffic?${params}`);
      const data = await res.json();
      if (data.success) {
        let sorted = data.data;
        if (sortField === 'reportedAt') {
          sorted = sorted.sort((a: Incident, b: Incident) =>
            new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        }
        setIncidents(sorted);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        setError(data.error || 'Failed to load incidents');
      }
    } catch {
      setError('Network error – please try again');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page, sortField]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleStatus = (v: string) => { setStatusFilter(v); setPage(1); };

  // Export to CSV
  const handleExport = () => {
    const rows = [
      ['Incident #', 'Status', 'Location', 'Date', 'Officer', 'Citations'],
      ...incidents.map(i => [
        i.incidentNumber, i.status, i.location,
        new Date(i.reportedAt).toLocaleDateString('en-KE'),
        i.assignedTo?.name ?? i.assignedToName ?? 'Unassigned',
        (i.citations?.length ?? 0).toString(),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'traffic-incidents.csv'; a.click();
  };

  // Pending high-urgency count
  const highUrgencyCount = incidents.filter(i => getUrgency(i) === 'HIGH').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/dashboard/traffic" className="hover:text-gray-600 dark:hover:text-gray-300">Traffic</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Incidents</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrafficCone className="w-7 h-7 text-blue-600" />
            Traffic Incidents
            {highUrgencyCount > 0 && (
              <span className="text-sm font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {highUrgencyCount} urgent
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{total} total traffic stops &amp; violation incidents</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} title="Export CSV"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={fetchIncidents}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/traffic/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" /> New Incident
          </Link>
        </div>
      </div>

      {/* Urgency Banner */}
      {highUrgencyCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <Zap className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            {highUrgencyCount} incident{highUrgencyCount !== 1 ? 's' : ''} pending for over 1 hour — immediate officer assignment recommended.
          </p>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by incident #, location, officer..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${showFilters ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}>
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={statusFilter} onChange={e => handleStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="CITATION_ISSUED">Citation Issued</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort By</label>
              <select value={sortField} onChange={e => setSortField(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none">
                <option value="reportedAt">Date (Newest First)</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { handleStatus(''); handleSearch(''); }}
                className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center py-16">
            <TrafficCone className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No incidents found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {statusFilter || search ? 'Try adjusting your filters' : 'No traffic incidents recorded yet'}
            </p>
            <Link href="/dashboard/traffic/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Record First Incident
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Urgency', 'Incident #', 'Date/Time', 'Location', 'Status', 'Officer', 'Citations', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {incidents.map(incident => {
                    const urgency = getUrgency(incident);
                    const officer = incident.assignedTo?.name ?? incident.assignedToName;
                    return (
                      <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${URGENCY_COLORS[urgency]}`}>
                            {urgency === 'HIGH' && <AlertCircle className="w-3 h-3" />}
                            {urgency === 'LOW' && <CheckCircle className="w-3 h-3" />}
                            {urgency}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{incident.incidentNumber}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {new Date(incident.reportedAt).toLocaleString('en-KE')}
                          </div>
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{incident.location}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[incident.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {incident.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {officer ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              {officer}
                            </div>
                          ) : (
                            <span className="text-xs text-red-400 font-medium">⚠ Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {incident.citations?.length ?? 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => router.push(`/dashboard/traffic/${incident.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => router.push(`/dashboard/traffic/${incident.id}/edit`)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Page {page} of {totalPages} · {total} total</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
//dashboard/traffic/accidents/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, Search, Filter, Plus, Eye, Edit,
  ChevronLeft, ChevronRight, RefreshCw, Clock,
  MapPin, User, CloudRain, Wind, Download,
  AlertCircle, Activity, TrendingUp, Skull, Car
} from 'lucide-react';

interface Accident {
  id: string;
  incidentNumber: string;
  type: string;
  status: string;
  reportedAt: string;
  location: string;
  description: string;
  severity?: string;
  weatherConditions?: string;
  roadConditions?: string;
  visibility?: string;
  assignedTo?: { id: string; name: string; badgeNumber: string };
  assignedToName?: string;
  involvedVehicles?: any[];
  involvedPeople?: any[];
  witnesses?: any[];
  station?: { name: string; code: string };
}

const SEVERITY_COLORS: Record<string, string> = {
  MINOR: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  SERIOUS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  FATAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PROPERTY_DAMAGE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

const SEVERITY_ICONS: Record<string, React.ReactNode> = {
  MINOR: <Activity className="w-3 h-3" />,
  SERIOUS: <AlertTriangle className="w-3 h-3" />,
  FATAL: <Skull className="w-3 h-3" />,
  PROPERTY_DAMAGE: <Car className="w-3 h-3" />,
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  INVESTIGATING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CITATION_ISSUED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

// AI risk score based on conditions
function calcRiskScore(acc: Accident): number {
  let score = 0;
  if (acc.severity === 'FATAL') score += 40;
  else if (acc.severity === 'SERIOUS') score += 25;
  else if (acc.severity === 'MINOR') score += 10;
  if (acc.weatherConditions === 'RAIN' || acc.weatherConditions === 'FOG') score += 20;
  if (acc.roadConditions === 'WET' || acc.roadConditions === 'MUDDY') score += 15;
  if (acc.visibility === 'POOR') score += 15;
  if ((acc.involvedPeople?.length ?? 0) > 3) score += 10;
  return Math.min(100, score);
}

function RiskBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{score}</span>
    </div>
  );
}

export default function TrafficAccidentsPage() {
  const router = useRouter();
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Severity counts for header stats
  const [severityCounts, setSeverityCounts] = useState({ FATAL: 0, SERIOUS: 0, MINOR: 0, PROPERTY_DAMAGE: 0 });

  const fetchAccidents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ type: 'ACCIDENT', page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (severityFilter) params.set('severity', severityFilter);

      const [res, fRes, sRes, miRes, pdRes] = await Promise.all([
        fetch(`/api/traffic?${params}`),
        fetch('/api/traffic?type=ACCIDENT&severity=FATAL&limit=1'),
        fetch('/api/traffic?type=ACCIDENT&severity=SERIOUS&limit=1'),
        fetch('/api/traffic?type=ACCIDENT&severity=MINOR&limit=1'),
        fetch('/api/traffic?type=ACCIDENT&severity=PROPERTY_DAMAGE&limit=1'),
      ]);
      const data = await res.json();
      const fData = await fRes.json();
      const sData = await sRes.json();
      const miData = await miRes.json();
      const pdData = await pdRes.json();

      if (data.success) {
        setAccidents(data.data);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else setError(data.error || 'Failed to load');

      setSeverityCounts({
        FATAL: fData.pagination?.total ?? 0,
        SERIOUS: sData.pagination?.total ?? 0,
        MINOR: miData.pagination?.total ?? 0,
        PROPERTY_DAMAGE: pdData.pagination?.total ?? 0,
      });
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, severityFilter, page]);

  useEffect(() => { fetchAccidents(); }, [fetchAccidents]);

  const handleExport = () => {
    const rows = [
      ['Incident #', 'Severity', 'Status', 'Location', 'Weather', 'Road', 'Vehicles', 'People', 'Officer', 'Date'],
      ...accidents.map(a => [
        a.incidentNumber, a.severity ?? '', a.status, a.location,
        a.weatherConditions ?? '', a.roadConditions ?? '',
        (a.involvedVehicles?.length ?? 0).toString(),
        (a.involvedPeople?.length ?? 0).toString(),
        a.assignedTo?.name ?? a.assignedToName ?? 'Unassigned',
        new Date(a.reportedAt).toLocaleDateString('en-KE'),
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'accidents.csv'; a.click();
  };

  const fatalCount = accidents.filter(a => a.severity === 'FATAL' && a.status !== 'CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/dashboard/traffic" className="hover:text-gray-600 dark:hover:text-gray-300">Traffic</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Accidents</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <AlertTriangle className="w-7 h-7 text-red-600" />
            Accident Records
            {fatalCount > 0 && (
              <span className="text-sm font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full flex items-center gap-1">
                <Skull className="w-3.5 h-3.5" /> {fatalCount} fatal open
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{total} accident records · all severity levels</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} title="Export" className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={fetchAccidents} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/traffic/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" /> Record Accident
          </Link>
        </div>
      </div>

      {/* Fatal Alert Banner */}
      {fatalCount > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
            CRITICAL: {fatalCount} fatal accident{fatalCount !== 1 ? 's' : ''} require immediate senior officer review and coroner notification.
          </p>
        </div>
      )}

      {/* Severity Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'FATAL', label: 'Fatal', color: 'red', icon: Skull },
          { key: 'SERIOUS', label: 'Serious', color: 'orange', icon: AlertTriangle },
          { key: 'MINOR', label: 'Minor', color: 'yellow', icon: Activity },
          { key: 'PROPERTY_DAMAGE', label: 'Property Damage', color: 'blue', icon: Car },
        ].map(({ key, label, color, icon: Icon }) => (
          <button key={key}
            onClick={() => { setSeverityFilter(severityFilter === key ? '' : key); setPage(1); }}
            className={`bg-white dark:bg-gray-800 rounded-xl border-2 p-4 text-left transition-all
              ${severityFilter === key ? `border-${color}-500` : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
            <Icon className={`w-5 h-5 text-${color}-500 mb-2`} />
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {loading ? '—' : severityCounts[key as keyof typeof severityCounts]}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search accidents by location, officer, incident #..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${showFilters ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}>
            <Filter className="w-4 h-4" /> Filters {(statusFilter || severityFilter) && <span className="w-2 h-2 bg-red-500 rounded-full" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Severity</label>
              <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Severities</option>
                <option value="FATAL">Fatal</option>
                <option value="SERIOUS">Serious</option>
                <option value="MINOR">Minor</option>
                <option value="PROPERTY_DAMAGE">Property Damage Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setStatusFilter(''); setSeverityFilter(''); setSearch(''); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {/* Accidents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600" />
          </div>
        ) : accidents.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No accidents found</h3>
            <p className="text-gray-500 text-sm mb-4">
              {statusFilter || severityFilter || search ? 'Try adjusting your filters' : 'No accident records yet'}
            </p>
            <Link href="/dashboard/traffic/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Record Accident
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Severity', 'Incident #', 'Date/Time', 'Location', 'Conditions', 'Status', 'Parties', 'AI Risk', 'Officer', 'Actions'].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {accidents.map(acc => {
                    const riskScore = calcRiskScore(acc);
                    const officer = acc.assignedTo?.name ?? acc.assignedToName;
                    return (
                      <tr key={acc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${SEVERITY_COLORS[acc.severity ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
                            {SEVERITY_ICONS[acc.severity ?? '']}
                            {acc.severity?.replace(/_/g, ' ') ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{acc.incidentNumber}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {new Date(acc.reportedAt).toLocaleString('en-KE')}
                          </div>
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 truncate">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{acc.location}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            {acc.weatherConditions && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CloudRain className="w-3 h-3" /> {acc.weatherConditions}
                              </div>
                            )}
                            {acc.roadConditions && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Wind className="w-3 h-3" /> {acc.roadConditions}
                              </div>
                            )}
                            {!acc.weatherConditions && !acc.roadConditions && <span className="text-gray-400 text-xs">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[acc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {acc.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium">{acc.involvedVehicles?.length ?? 0}</span>
                            <span className="text-xs"> veh · </span>
                            <span className="font-medium">{acc.involvedPeople?.length ?? 0}</span>
                            <span className="text-xs"> ppl</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <RiskBar score={riskScore} />
                        </td>
                        <td className="px-4 py-4">
                          {officer ? (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <User className="w-3.5 h-3.5 shrink-0" />{officer}
                            </div>
                          ) : (
                            <span className="text-xs text-red-400 font-medium">⚠ Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => router.push(`/dashboard/traffic/${acc.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => router.push(`/dashboard/traffic/${acc.id}/edit`)}
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


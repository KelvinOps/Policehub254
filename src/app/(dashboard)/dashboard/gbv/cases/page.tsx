// src/app/dashboard/gbv/cases/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldAlert, Search, Filter, Plus, Eye, Edit,
  ChevronLeft, ChevronRight, RefreshCw, Download,
  MapPin, User, AlertCircle, Brain, Clock, CheckCircle
} from 'lucide-react';
import type { GBVCase, GBVCaseStatus, GBVRiskLevel } from '@/types/gbv';
import { GBV_INCIDENT_LABELS, GBV_STATUS_LABELS } from '@/types/gbv';

const RISK_BADGE: Record<GBVRiskLevel, string> = {
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  HIGH:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  MEDIUM:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  LOW:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};
const STATUS_BADGE: Record<GBVCaseStatus, string> = {
  REPORTED:            'bg-blue-100 text-blue-700',
  UNDER_INVESTIGATION: 'bg-indigo-100 text-indigo-700',
  REFERRED:            'bg-purple-100 text-purple-700',
  COURT_PROCEEDINGS:   'bg-orange-100 text-orange-700',
  CLOSED:              'bg-gray-100 text-gray-600',
  WITHDRAWN:           'bg-red-100 text-red-600',
};

export default function GBVCasesPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [cases,       setCases]       = useState<GBVCase[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState(searchParams.get('status') ?? '');
  const [riskFilter,  setRiskFilter]  = useState(searchParams.get('riskLevel') ?? '');
  const [typeFilter,  setTypeFilter]  = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);

  const fetchCases = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search)       params.set('search',       search);
      if (statusFilter) params.set('status',       statusFilter);
      if (riskFilter)   params.set('riskLevel',    riskFilter);
      if (typeFilter)   params.set('incidentType', typeFilter);

      const res  = await fetch(`/api/gbv/cases?${params}`);
      const data = await res.json();
      if (data.success) {
        setCases(data.data); setTotalPages(data.pagination?.totalPages ?? 1); setTotal(data.pagination?.total ?? 0);
      } else { setError(data.error ?? 'Failed to load cases'); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [search, statusFilter, riskFilter, typeFilter, page]);

  useEffect(() => { fetchCases(); }, [fetchCases]);

  const handleExport = () => {
    const rows = [
      ['Case #','Type','Status','Risk','Location','Victim Age','Victim Gender','Arrested','Date'],
      ...cases.map(c => [
        c.caseNumber, GBV_INCIDENT_LABELS[c.incidentType], GBV_STATUS_LABELS[c.status],
        c.riskLevel, c.location, c.victimAge?.toString() ?? '', c.victimGender ?? '',
        c.perpetratorArrested ? 'Yes' : 'No',
        new Date(c.incidentDate).toLocaleDateString('en-KE'),
      ]),
    ];
    const blob = new Blob([rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gbv-cases.csv'; a.click();
  };

  const criticalCount = cases.filter(c => c.riskLevel === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/dashboard/gbv" className="hover:text-gray-600 dark:hover:text-gray-300">GBV</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">All Cases</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            GBV Cases
            {criticalCount > 0 && (
              <span className="text-sm font-medium bg-red-100 text-red-600 px-2.5 py-1 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {criticalCount} critical
              </span>
            )}
          </h1>
          <p className="text-gray-500 mt-1">{total} total cases · AI risk-scored</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors" title="Export CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={fetchCases} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/gbv/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Case
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by case #, location, description..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${showFilters ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'}`}>
            <Filter className="w-4 h-4" /> Filters
            {(statusFilter || riskFilter || typeFilter) && <span className="w-2 h-2 bg-rose-500 rounded-full" />}
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {[
              { label: 'Status', val: statusFilter, set: setStatusFilter, opts: [
                ['','All Statuses'],['REPORTED','Reported'],['UNDER_INVESTIGATION','Under Investigation'],
                ['REFERRED','Referred'],['COURT_PROCEEDINGS','Court Proceedings'],['CLOSED','Closed'],['WITHDRAWN','Withdrawn'],
              ]},
              { label: 'Risk Level', val: riskFilter, set: setRiskFilter, opts: [
                ['','All Risk Levels'],['CRITICAL','Critical'],['HIGH','High'],['MEDIUM','Medium'],['LOW','Low'],
              ]},
              { label: 'Incident Type', val: typeFilter, set: setTypeFilter, opts: [
                ['','All Types'],['PHYSICAL_VIOLENCE','Physical Violence'],['SEXUAL_VIOLENCE','Sexual Violence'],
                ['EMOTIONAL_ABUSE','Emotional Abuse'],['ECONOMIC_ABUSE','Economic Abuse'],['STALKING','Stalking'],
                ['HARASSMENT','Harassment'],['FGM','FGM'],['CHILD_MARRIAGE','Child Marriage'],['OTHER','Other'],
              ]},
            ].map(({ label, val, set, opts }) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
                <select value={val} onChange={e => { set(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none">
                  {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            ))}
            <div className="flex items-end">
              <button onClick={() => { setStatusFilter(''); setRiskFilter(''); setTypeFilter(''); setSearch(''); setPage(1); }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rose-600" />
          </div>
        ) : cases.length === 0 ? (
          <div className="text-center py-16">
            <ShieldAlert className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No cases found</h3>
            <p className="text-gray-500 text-sm mb-4">{statusFilter || riskFilter || search ? 'Try adjusting filters' : 'No GBV cases recorded yet'}</p>
            <Link href="/dashboard/gbv/cases/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> Record First Case
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {['AI Risk','Case #','Type','Incident Date','Location','Status','Victim','Officer','Actions'].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider ${h==='Actions'?'text-right':'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {cases.map(c => (
                    <tr key={c.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors ${c.riskLevel === 'CRITICAL' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${RISK_BADGE[c.riskLevel]}`}>{c.riskLevel}</span>
                          <div className="flex items-center gap-1">
                            <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${c.riskScore >= 80 ? 'bg-red-500' : c.riskScore >= 60 ? 'bg-orange-500' : c.riskScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${c.riskScore}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{c.riskScore}</span>
                          </div>
                          {c.aiSummary && <Brain className="w-3 h-3 text-purple-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{c.caseNumber}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{GBV_INCIDENT_LABELS[c.incidentType]}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {new Date(c.incidentDate).toLocaleDateString('en-KE')}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 max-w-[140px]">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.location}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                          {GBV_STATUS_LABELS[c.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs text-gray-500">
                          {c.victimGender && <p>{c.victimGender.replace(/_/g,' ')}</p>}
                          {c.victimAge    && <p>Age: {c.victimAge}</p>}
                          {c.victimInjured && <p className="text-red-500 font-medium">Injured</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {c.assignedTo ? (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[100px]">{c.assignedTo.name}</span>
                          </div>
                        ) : <span className="text-xs text-red-400">⚠ Unassigned</span>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => router.push(`/dashboard/gbv/${c.id}`)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => router.push(`/dashboard/gbv/${c.id}/edit`)}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">Page {page} of {totalPages} · {total} total</p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages}
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
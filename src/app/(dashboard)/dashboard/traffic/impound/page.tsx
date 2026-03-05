//dashboard/traffic/impound/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Truck, Search, Filter, Plus, Eye, Edit,
  ChevronLeft, ChevronRight, RefreshCw,
  MapPin, User, DollarSign, Download, AlertCircle,
  CheckCircle, XCircle, Package, Calendar
} from 'lucide-react';

interface ImpoundRecord {
  id: string;
  incidentNumber: string;
  type: string;
  status: string;
  reportedAt: string;
  location: string;
  description: string;
  impoundReason?: string;
  impoundLocation?: string;
  storageLocation?: string;
  impoundedAt?: string;
  releasedAt?: string;
  releasedTo?: string;
  impoundFee?: number;
  paymentStatus?: string;
  assignedTo?: { id: string; name: string; badgeNumber: string };
  assignedToName?: string;
  involvedVehicles?: {
    registration: string;
    make: string;
    model: string;
    color?: string;
    type?: string;
    ownerName?: string;
  }[];
  station?: { name: string; code: string };
}

const IMPOUND_REASON_LABELS: Record<string, string> = {
  PARKING_VIOLATION: 'Parking Violation',
  EXPIRED_LICENSE:   'Expired License',
  NO_INSURANCE:      'No Insurance',
  STOLEN_VEHICLE:    'Stolen Vehicle',
  DANGEROUS_DRIVING: 'Dangerous Driving',
  OTHER:             'Other',
};

const PAYMENT_COLORS: Record<string, string> = {
  PAID:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  UNPAID:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  WAIVED:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:       'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  INVESTIGATING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  RESOLVED:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  CLOSED:        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const REASON_COLORS: Record<string, string> = {
  STOLEN_VEHICLE:    'bg-red-100 text-red-700 dark:bg-red-900/30',
  DANGEROUS_DRIVING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30',
  NO_INSURANCE:      'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
  EXPIRED_LICENSE:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
  PARKING_VIOLATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  OTHER:             'bg-gray-100 text-gray-700 dark:bg-gray-700',
};

function daysHeld(record: ImpoundRecord): number {
  const from = record.impoundedAt
    ? new Date(record.impoundedAt)
    : new Date(record.reportedAt);
  const to = record.releasedAt ? new Date(record.releasedAt) : new Date();
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86_400_000));
}

function isOverdue(record: ImpoundRecord): boolean {
  return !record.releasedAt && record.paymentStatus === 'UNPAID' && daysHeld(record) > 14;
}

export default function TrafficImpoundsPage() {
  const router = useRouter();

  const [records,       setRecords]       = useState<ImpoundRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [total,         setTotal]         = useState(0);

  const [stats, setStats] = useState({
    totalFees: 0, unpaidFees: 0, overdueCount: 0, releasedCount: 0,
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ Use /api/traffic/impounds (dedicated route) — NOT /api/traffic/impounds
      //    which would hit the [id] dynamic route with id="impounds" and 404.
      //    The dedicated route at src/app/api/traffic/impounds/route.ts handles this.
      const params = new URLSearchParams({
        page:  page.toString(),
        limit: '20',
      });
      if (search)        params.set('search', search);
      if (statusFilter)  params.set('status', statusFilter);
      if (paymentFilter) params.set('paymentStatus', paymentFilter);

      // Current filtered page + unfiltered stats in parallel
      const [pageRes, statsRes] = await Promise.all([
        fetch(`/api/traffic/impounds?${params}`),
        fetch('/api/traffic/impounds?limit=100&page=1'),
      ]);

      if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
      const pageData  = await pageRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : null;

      if (pageData.success) {
        setRecords(pageData.data ?? []);
        setTotalPages(pageData.pagination?.totalPages ?? 1);
        setTotal(pageData.pagination?.total ?? 0);
      } else {
        setError(pageData.error ?? 'Failed to load impound records');
      }

      if (statsData?.success) {
        const all: ImpoundRecord[] = statsData.data ?? [];
        setStats({
          totalFees:     all.reduce((s, r) => s + (r.impoundFee ?? 0), 0),
          unpaidFees:    all.filter(r => r.paymentStatus === 'UNPAID')
                            .reduce((s, r) => s + (r.impoundFee ?? 0), 0),
          overdueCount:  all.filter(isOverdue).length,
          releasedCount: all.filter(r => !!r.releasedAt).length,
        });
      }
    } catch (err) {
      console.error('[impounds] fetch error:', err);
      setError('Network error – please try again');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, page]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSearch  = (v: string) => { setSearch(v);        setPage(1); };
  const handleStatus  = (v: string) => { setStatusFilter(v);  setPage(1); };
  const handlePayment = (v: string) => { setPaymentFilter(v); setPage(1); };
  const handleRefresh = () => { fetchRecords(); };

  // ── CSV export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ['Incident #','Reason','Payment','Fee (KES)','Status',
       'Days Held','Released','Location','Officer','Date'],
      ...records.map(r => [
        r.incidentNumber,
        IMPOUND_REASON_LABELS[r.impoundReason ?? ''] ?? r.impoundReason ?? '',
        r.paymentStatus ?? '',
        (r.impoundFee ?? 0).toString(),
        r.status,
        daysHeld(r).toString(),
        r.releasedAt ? 'Yes' : 'No',
        r.impoundLocation ?? r.location,
        r.assignedTo?.name ?? r.assignedToName ?? 'Unassigned',
        new Date(r.reportedAt).toLocaleDateString('en-KE'),
      ]),
    ];
    const csv  = rows.map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'impounds.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/dashboard/traffic"
              className="hover:text-gray-600 dark:hover:text-gray-300">
              Traffic
            </Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Impounds</span>
          </nav>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Truck className="w-7 h-7 text-orange-600" />
            Impound Registry
            {stats.overdueCount > 0 && (
              <span className="text-sm font-medium bg-red-100 text-red-600
                dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full
                flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {stats.overdueCount} overdue
              </span>
            )}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {total} impound records · vehicle seizure management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleExport} title="Export CSV"
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
              dark:hover:bg-gray-600 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleRefresh}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200
              dark:hover:bg-gray-600 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/traffic/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600
              hover:bg-orange-700 text-white rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" /> New Impound
          </Link>
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.overdueCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20
          border border-amber-300 dark:border-amber-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold">
              {stats.overdueCount} vehicle{stats.overdueCount !== 1 ? 's' : ''} overdue
              (held &gt; 14 days unpaid)
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Consider escalating to court action or authorising waiver.
              Filter by &ldquo;Unpaid&rdquo; to review.
            </p>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {([
          { label: 'Total Records', value: total,                                     icon: Package,     color: 'orange' },
          { label: 'Total Fees',    value: `KES ${stats.totalFees.toLocaleString()}`,  icon: DollarSign,  color: 'blue'   },
          { label: 'Unpaid Fees',   value: `KES ${stats.unpaidFees.toLocaleString()}`, icon: XCircle,     color: 'red'    },
          { label: 'Released',      value: stats.releasedCount,                        icon: CheckCircle, color: 'green'  },
        ] as const).map(({ label, value, icon: Icon, color }) => (
          <div key={label}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200
              dark:border-gray-700 p-4">
            <div className={`inline-flex p-2 rounded-lg bg-${color}-100
              dark:bg-${color}-900/30 mb-3`}>
              <Icon className={`w-4 h-4 text-${color}-600`} />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              {loading ? '—' : value}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200
        dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by incident #, location, officer…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300
                dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm
                focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg
              text-sm transition-colors
              ${showFilters
                ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
            <Filter className="w-4 h-4" /> Filters
            {(statusFilter || paymentFilter) && (
              <span className="w-2 h-2 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4
            border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
              <select value={statusFilter} onChange={e => handleStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                  rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none">
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="INVESTIGATING">Active</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment</label>
              <select value={paymentFilter} onChange={e => handlePayment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600
                  rounded-lg bg-white dark:bg-gray-700 text-sm focus:outline-none">
                <option value="">All Payments</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="WAIVED">Waived</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { handleStatus(''); handlePayment(''); handleSearch(''); }}
                className="w-full px-3 py-2 text-sm border border-gray-300
                  dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700
                  text-gray-600 dark:text-gray-400 transition-colors">
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200
          dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200
        dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2
              border-b-2 border-orange-600" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <Truck className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No impound records found
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              {statusFilter || paymentFilter || search
                ? 'Try adjusting your filters'
                : 'No vehicles currently impounded'}
            </p>
            <Link href="/dashboard/traffic/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600
                hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
              <Plus className="w-4 h-4" /> Add Impound Record
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b
                  border-gray-200 dark:border-gray-700">
                  <tr>
                    {['Incident #','Vehicle(s)','Reason','Impound Location',
                      'Days Held','Fee (KES)','Payment','Status','Officer','Actions',
                    ].map(h => (
                      <th key={h}
                        className={`px-4 py-3.5 text-xs font-semibold text-gray-500
                          uppercase tracking-wider
                          ${h === 'Actions' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {records.map(record => {
                    const days    = daysHeld(record);
                    const overdue = isOverdue(record);
                    const officer = record.assignedTo?.name ?? record.assignedToName;
                    const vehicle = record.involvedVehicles?.[0];

                    return (
                      <tr key={record.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/40
                          transition-colors
                          ${overdue ? 'bg-red-50/30 dark:bg-red-900/5' : ''}`}>

                        {/* Incident # */}
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-bold
                            text-gray-900 dark:text-white">
                            {record.incidentNumber}
                          </span>
                          {overdue && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-500 font-semibold">
                                OVERDUE
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Vehicle */}
                        <td className="px-4 py-4">
                          {vehicle ? (
                            <div>
                              <p className="text-sm font-semibold font-mono
                                text-gray-900 dark:text-white">
                                {vehicle.registration}
                              </p>
                              <p className="text-xs text-gray-500">
                                {[vehicle.make, vehicle.model, vehicle.color]
                                  .filter(Boolean).join(' ')}
                              </p>
                              {vehicle.ownerName && (
                                <p className="text-xs text-gray-400">
                                  Owner: {vehicle.ownerName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                          {(record.involvedVehicles?.length ?? 0) > 1 && (
                            <p className="text-xs text-orange-500 mt-1">
                              +{(record.involvedVehicles?.length ?? 0) - 1} more
                            </p>
                          )}
                        </td>

                        {/* Reason */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full
                            text-xs font-medium
                            ${REASON_COLORS[record.impoundReason ?? '']
                              ?? 'bg-gray-100 text-gray-600'}`}>
                            {IMPOUND_REASON_LABELS[record.impoundReason ?? '']
                              ?? record.impoundReason ?? '—'}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-sm
                            text-gray-600 dark:text-gray-400">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[120px]">
                              {record.impoundLocation ?? record.location}
                            </span>
                          </div>
                          {record.storageLocation && (
                            <p className="text-xs text-gray-400 mt-0.5 pl-5">
                              Yard: {record.storageLocation}
                            </p>
                          )}
                        </td>

                        {/* Days Held */}
                        <td className="px-4 py-4">
                          <div className={`flex items-center gap-1 text-sm font-semibold
                            ${days > 14 && !record.releasedAt
                              ? 'text-red-600'
                              : 'text-gray-700 dark:text-gray-300'}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {days}d
                            {record.releasedAt && (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 ml-1" />
                            )}
                          </div>
                          {record.releasedAt && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              Released:{' '}
                              {new Date(record.releasedAt).toLocaleDateString('en-KE')}
                            </p>
                          )}
                        </td>

                        {/* Fee */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1 text-sm font-semibold
                            text-gray-900 dark:text-white">
                            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                            {record.impoundFee != null
                              ? record.impoundFee.toLocaleString()
                              : '—'}
                          </div>
                        </td>

                        {/* Payment */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full
                            text-xs font-medium
                            ${PAYMENT_COLORS[record.paymentStatus ?? '']
                              ?? 'bg-gray-100 text-gray-600'}`}>
                            {record.paymentStatus ?? '—'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full
                            text-xs font-medium
                            ${STATUS_COLORS[record.status]
                              ?? 'bg-gray-100 text-gray-600'}`}>
                            {record.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        {/* Officer */}
                        <td className="px-4 py-4">
                          {officer ? (
                            <div className="flex items-center gap-1.5 text-sm
                              text-gray-600 dark:text-gray-400">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              {officer}
                            </div>
                          ) : (
                            <span className="text-xs text-red-400 font-medium">
                              ⚠ Unassigned
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() =>
                                router.push(`/dashboard/traffic/${record.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50
                                dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                router.push(`/dashboard/traffic/${record.id}/edit`)}
                              className="p-1.5 text-gray-500 hover:bg-gray-100
                                dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Edit / Release">
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
              <div className="flex items-center justify-between px-5 py-4
                border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages} · {total} total
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                      disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700
                      disabled:opacity-40 transition-colors">
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
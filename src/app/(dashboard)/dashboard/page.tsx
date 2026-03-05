'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, FileText, Clock, CheckCircle,
  AlertCircle, XCircle, TrendingUp, BarChart3,
  Search, Plus, Eye, MapPin,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Statistics {
  total:            number;
  thisMonth:        number;
  lastMonth:        number;
  percentageChange: number;
  byCategory:       Array<{ category: string; count: number }>;
  byStatus:         Array<{ status: string;   count: number }>;
}

interface RecentEntry {
  id:        string;
  obNumber:  string;
  category:  string;
  location:  string;
  status:    string;
  createdAt: string;
}

interface UserData {
  name:     string;
  role:     string;
  station?: { name: string };
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title, value, change, icon: Icon, trend, onClick,
}: {
  title: string; value: string; change: string;
  icon: React.ComponentType<{ className?: string }>;
  trend: 'up' | 'down'; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={[
        'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200',
        'dark:border-gray-700 p-6 hover:shadow-md transition-all',
        onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          <p className={`text-sm mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
            {change}
          </p>
        </div>
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityItem({ entry }: { entry: RecentEntry }) {
  const router = useRouter();

  const statusConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
    REPORTED:            { icon: Clock,       color: 'text-blue-600 dark:text-blue-400'    },
    UNDER_INVESTIGATION: { icon: AlertCircle, color: 'text-yellow-600 dark:text-yellow-400'},
    RESOLVED:            { icon: CheckCircle, color: 'text-green-600 dark:text-green-400'  },
    CLOSED:              { icon: XCircle,     color: 'text-gray-600 dark:text-gray-400'    },
  };

  const { icon: StatusIcon, color } = statusConfig[entry.status] ?? { icon: Clock, color: 'text-gray-600' };

  return (
    <div
      onClick={() => router.push(`/dashboard/occurrence-book/${entry.id}`)}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
    >
      <StatusIcon className={`w-5 h-5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{entry.obNumber}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 truncate">
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 shrink-0" />{entry.location}
          </span>
          <span className="shrink-0">•</span>
          <span className="shrink-0">{new Date(entry.createdAt).toLocaleDateString()}</span>
        </p>
      </div>
      <Eye className="w-4 h-4 text-gray-400 shrink-0" />
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const [user,          setUser]          = useState<UserData | null>(null);
  const [stats,         setStats]         = useState<Statistics | null>(null);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [dataLoading,   setDataLoading]   = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');

  // ── Fetch user (layout already verified auth, this just reads display info) ─
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success) setUser(d.user); })
      .catch(() => null); // layout handles redirect if session gone
  }, []);

  // ── Fetch dashboard data ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      // Run in parallel — both return 200 even with empty data
      const [statsRes, entriesRes] = await Promise.allSettled([
        fetch('/api/occurrence-book/statistics'),
        fetch('/api/occurrence-book?limit=5'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const d = await statsRes.value.json();
        if (d.success) setStats(d.data);
      }

      if (entriesRes.status === 'fulfilled' && entriesRes.value.ok) {
        const d = await entriesRes.value.json();
        if (d.success) setRecentEntries(d.data?.entries ?? []);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const userName    = user?.name                      ?? 'Officer';
  const userRole    = user?.role?.replace(/_/g, ' ') ?? '';
  const stationName = user?.station?.name            ?? '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Welcome back, {userName}!</h1>
        <p className="text-blue-100 text-sm">
          {userRole}{stationName ? ` • ${stationName}` : ''}
        </p>
        <p className="text-blue-100 text-sm mt-1">
          {new Date().toLocaleDateString('en-KE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Quick search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" /> Quick Search
        </h2>
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by OB number, description, location…"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button type="submit" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            Search
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/search')}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Advanced
          </button>
        </form>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {dataLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <Skeleton className="h-4 w-3/4 mb-4" />
              <Skeleton className="h-8 w-1/2 mb-3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              title="Total Incidents"
              value={String(stats?.total ?? 0)}
              change={`${stats?.percentageChange?.toFixed(1) ?? '0'}% from last month`}
              icon={FileText}
              trend={(stats?.percentageChange ?? 0) >= 0 ? 'up' : 'down'}
              onClick={() => router.push('/dashboard/occurrence-book')}
            />
            <StatCard
              title="This Month"
              value={String(stats?.thisMonth ?? 0)}
              change={`${stats?.thisMonth ?? 0} new reports`}
              icon={AlertTriangle}
              trend="up"
              onClick={() => router.push('/dashboard/occurrence-book')}
            />
            <StatCard
              title="Under Investigation"
              value={String(stats?.byStatus?.find(s => s.status === 'UNDER_INVESTIGATION')?.count ?? 0)}
              change="Active cases"
              icon={Clock}
              trend="up"
              onClick={() => router.push('/dashboard/occurrence-book?status=UNDER_INVESTIGATION')}
            />
            <StatCard
              title="Resolved"
              value={String(stats?.byStatus?.find(s => s.status === 'RESOLVED')?.count ?? 0)}
              change="Closed cases"
              icon={CheckCircle}
              trend="up"
              onClick={() => router.push('/dashboard/occurrence-book?status=RESOLVED')}
            />
          </>
        )}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <button
              onClick={() => router.push('/dashboard/occurrence-book')}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              View All
            </button>
          </div>
          <div className="p-2">
            {dataLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-1/3 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : recentEntries.length > 0 ? (
              recentEntries.map(e => <ActivityItem key={e.id} entry={e} />)
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-6">

          {/* Quick actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              {[
                { label: 'New OB Entry',     href: '/dashboard/occurrence-book/new', className: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300 hover:from-blue-100 hover:to-cyan-100' },
                { label: 'New Case',         href: '/dashboard/cases/new',           className: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 hover:from-purple-100 hover:to-pink-100' },
              ].map(({ label, href, className }) => (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  className={`w-full text-left px-4 py-3 bg-gradient-to-r ${className} rounded-lg transition-all flex items-center gap-3 font-medium`}
                >
                  <Plus className="w-5 h-5" />{label}
                </button>
              ))}
              <button
                onClick={() => router.push('/dashboard/search')}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-3"
              >
                <Search className="w-5 h-5" /> Advanced Search
              </button>
              <button
                onClick={() => router.push('/dashboard/reports')}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-3"
              >
                <BarChart3 className="w-5 h-5" /> View Reports
              </button>
            </div>
          </div>

          {/* Top categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Categories</h2>
            {dataLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-8" />
                </div>
              ))
            ) : (stats?.byCategory?.length ?? 0) > 0 ? (
              stats!.byCategory.slice(0, 5).map(item => (
                <div key={item.category} className="flex items-center justify-between text-sm mb-3 last:mb-0">
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {item.category.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white ml-2 shrink-0">
                    {item.count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
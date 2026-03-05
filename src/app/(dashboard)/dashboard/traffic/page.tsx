//dashboard/traffic/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  TrafficCone, AlertTriangle, Truck, Activity,
  Search, Plus, RefreshCw, Users, TrendingUp,
  Clock, MapPin, Zap, Brain, Radio, ChevronRight,
  BarChart2, AlertCircle, CheckCircle, Shield
} from 'lucide-react';

interface TrafficStats {
  incidents: number;
  accidents: number;
  impounds: number;
  resolved: number;
  pending: number;
  activeOfficers: number;
}

interface RecentItem {
  id: string;
  incidentNumber: string;
  type: string;
  status: string;
  location: string;
  reportedAt: string;
  severity?: string;
}

interface AiAlert {
  id: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  type: string;
}

const AI_ALERTS: AiAlert[] = [
  { id: '1', message: 'High accident probability on Thika Superhighway — rain forecast 14:00–18:00', priority: 'HIGH', type: 'WEATHER' },
  { id: '2', message: 'Peak hour congestion predicted: CBD 07:30–09:00. Deploy 3 officers to Uhuru/Kenyatta junction.', priority: 'MEDIUM', type: 'TRAFFIC' },
  { id: '3', message: '5 impound fee payments overdue (>14 days). Auto-escalation recommended.', priority: 'LOW', type: 'IMPOUND' },
];

const PRIORITY_COLORS = {
  HIGH: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  MEDIUM: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  LOW: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
};

const TYPE_BADGE: Record<string, string> = {
  TRAFFIC: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ACCIDENT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  IMPOUND: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30',
  INVESTIGATING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-700',
  CITATION_ISSUED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
};

export default function TrafficOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<TrafficStats>({ incidents: 0, accidents: 0, impounds: 0, resolved: 0, pending: 0, activeOfficers: 0 });
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiDismissed, setAiDismissed] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [t, a, i, resolved, pending] = await Promise.all([
        fetch('/api/traffic?type=TRAFFIC&limit=1').then(r => r.json()),
        fetch('/api/traffic?type=ACCIDENT&limit=1').then(r => r.json()),
        fetch('/api/traffic?type=IMPOUND&limit=1').then(r => r.json()),
        fetch('/api/traffic?status=RESOLVED&limit=1').then(r => r.json()),
        fetch('/api/traffic?status=PENDING&limit=1').then(r => r.json()),
      ]);
      const recentRes = await fetch('/api/traffic?limit=8').then(r => r.json());

      setStats({
        incidents: t.pagination?.total ?? 0,
        accidents: a.pagination?.total ?? 0,
        impounds: i.pagination?.total ?? 0,
        resolved: resolved.pagination?.total ?? 0,
        pending: pending.pagination?.total ?? 0,
        activeOfficers: 12, // placeholder — wire to /api/users?isActive=true
      });
      if (recentRes.success) setRecent(recentRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const visibleAlerts = AI_ALERTS.filter(a => !aiDismissed.has(a.id));

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <TrafficCone className="w-6 h-6 text-white" />
            </div>
            Traffic Command
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Real-time traffic incident coordination · Kenya Police Service
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link href="/dashboard/traffic/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
            <Plus className="w-4 h-4" /> New Incident
          </Link>
        </div>
      </div>

      {/* ── AI Alerts Panel ── */}
      {visibleAlerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900 dark:text-white">AI Predictive Alerts</h2>
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
              {visibleAlerts.length} active
            </span>
          </div>
          <div className="space-y-3">
            {visibleAlerts.map(alert => (
              <div key={alert.id} className={`flex items-start justify-between gap-3 p-3 rounded-lg border-l-4 ${PRIORITY_COLORS[alert.priority]}`}>
                <div className="flex items-start gap-2">
                  <Zap className="w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-sm">{alert.message}</p>
                </div>
                <button onClick={() => setAiDismissed(prev => new Set([...prev, alert.id]))}
                  className="text-xs opacity-60 hover:opacity-100 shrink-0 transition-opacity">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: 'Traffic Stops', value: stats.incidents, icon: TrafficCone, color: 'blue', href: '/dashboard/traffic/incidents' },
          { label: 'Accidents', value: stats.accidents, icon: AlertTriangle, color: 'red', href: '/dashboard/traffic/accidents' },
          { label: 'Impounds', value: stats.impounds, icon: Truck, color: 'orange', href: '/dashboard/traffic/impounds' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'green', href: '/dashboard/traffic?status=RESOLVED' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'yellow', href: '/dashboard/traffic?status=PENDING' },
          { label: 'Officers On Duty', value: stats.activeOfficers, icon: Users, color: 'purple', href: '/dashboard/personnel' },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link key={label} href={href}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all group">
            <div className={`inline-flex p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 mb-3 group-hover:scale-110 transition-transform`}>
              <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {loading ? <span className="animate-pulse">—</span> : value}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Quick Navigation ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            href: '/dashboard/traffic/incidents',
            icon: TrafficCone,
            title: 'Traffic Incidents',
            desc: 'Citations, violations, traffic stops, officer logs',
            color: 'blue',
            badge: 'Manage',
          },
          {
            href: '/dashboard/traffic/accidents',
            icon: AlertTriangle,
            title: 'Accident Records',
            desc: 'Collision reports, severity levels, scene documentation',
            color: 'red',
            badge: 'Critical',
          },
          {
            href: '/dashboard/traffic/impounds',
            icon: Truck,
            title: 'Impound Registry',
            desc: 'Vehicle seizures, storage, fee management, releases',
            color: 'orange',
            badge: 'Registry',
          },
        ].map(({ href, icon: Icon, title, desc, color, badge }) => (
          <Link key={href} href={href}
            className={`group bg-white dark:bg-gray-800 rounded-xl border-2 border-${color}-100 dark:border-${color}-900/30
              hover:border-${color}-300 dark:hover:border-${color}-700 p-6 transition-all hover:shadow-lg`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-xl group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 text-${color}-600`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 rounded-full`}>
                {badge}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
            <div className={`mt-4 flex items-center gap-1 text-${color}-600 text-sm font-medium`}>
              Open module <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
          </div>
          <Link href="/dashboard/traffic/incidents" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Radio className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No incidents recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recent.map(item => (
              <div key={item.id}
                onClick={() => router.push(`/dashboard/traffic/${item.id}`)}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors">
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[item.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {item.type}
                </span>
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{item.incidentNumber}</span>
                <div className="flex-1 min-w-0 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {item.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(item.reportedAt).toLocaleDateString('en-KE')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
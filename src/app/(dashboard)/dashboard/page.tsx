// src/app/(dashboard)/dashboard/page.tsx - ENHANCED VERSION
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  AlertTriangle, 
  FileText, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Car,
  BarChart3,
  Search,
  Plus,
  Eye,
  MapPin
} from "lucide-react";

interface Statistics {
  total: number;
  thisMonth: number;
  lastMonth: number;
  percentageChange: number;
  byCategory: Array<{ category: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

interface RecentEntry {
  id: string;
  obNumber: string;
  category: string;
  location: string;
  status: string;
  createdAt: string;
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  onClick 
}: { 
  title: string; 
  value: string; 
  change: string; 
  icon: any; 
  trend: "up" | "down";
  onClick?: () => void;
}) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-blue-300 dark:hover:border-blue-700' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          <p className={`text-sm mt-2 flex items-center gap-1 ${
            trend === "up" ? "text-green-600" : "text-red-600"
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend === "down" ? "rotate-180" : ""}`} />
            {change}
          </p>
        </div>
        <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ 
  entry
}: { 
  entry: RecentEntry
}) {
  const router = useRouter();
  
  const statusConfig: Record<string, { icon: any; color: string }> = {
    REPORTED: { icon: Clock, color: "text-blue-600 dark:text-blue-400" },
    UNDER_INVESTIGATION: { icon: AlertCircle, color: "text-yellow-600 dark:text-yellow-400" },
    RESOLVED: { icon: CheckCircle, color: "text-green-600 dark:text-green-400" },
    CLOSED: { icon: XCircle, color: "text-gray-600 dark:text-gray-400" },
  };

  const StatusIcon = statusConfig[entry.status]?.icon || Clock;
  const statusColor = statusConfig[entry.status]?.color || "text-gray-600";

  return (
    <div 
      onClick={() => router.push(`/dashboard/occurrence-book/${entry.id}`)}
      className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
    >
      <StatusIcon className={`w-5 h-5 ${statusColor}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {entry.obNumber}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {entry.location}
          </span>
          <span>•</span>
          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
        </p>
      </div>
      <Eye className="w-4 h-4 text-gray-400" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await fetch('/api/occurrence-book/statistics');
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData.data);
      }

      // Fetch recent entries
      const entriesResponse = await fetch('/api/occurrence-book?limit=5');
      const entriesData = await entriesResponse.json();
      if (entriesData.success) {
        setRecentEntries(entriesData.data.entries || []);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user.name}!
        </h1>
        <p className="text-blue-100">
          Role: {user.role.replace(/_/g, ' ')} 
          {user.stationName && ` • ${user.stationName}`}
        </p>
        <p className="text-blue-100 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Quick Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Quick Search
        </h2>
        <form onSubmit={handleQuickSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by OB number, description, location..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/search')}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
          >
            Advanced
          </button>
        </form>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Incidents"
          value={stats?.total.toString() || '0'}
          change={`${stats?.percentageChange.toFixed(1) || '0'}% from last month`}
          icon={FileText}
          trend={stats && stats.percentageChange >= 0 ? "up" : "down"}
          onClick={() => router.push('/dashboard/occurrence-book')}
        />
        <StatCard
          title="This Month"
          value={stats?.thisMonth.toString() || '0'}
          change={`${stats?.thisMonth || 0} new reports`}
          icon={AlertTriangle}
          trend="up"
          onClick={() => router.push('/dashboard/occurrence-book')}
        />
        <StatCard
          title="Under Investigation"
          value={
            stats?.byStatus
              .find((s) => s.status === 'UNDER_INVESTIGATION')
              ?.count.toString() || '0'
          }
          change="Active cases"
          icon={Clock}
          trend="up"
          onClick={() => router.push('/dashboard/occurrence-book?status=UNDER_INVESTIGATION')}
        />
        <StatCard
          title="Resolved"
          value={
            stats?.byStatus
              .find((s) => s.status === 'RESOLVED')
              ?.count.toString() || '0'
          }
          change="Closed cases"
          icon={CheckCircle}
          trend="up"
          onClick={() => router.push('/dashboard/occurrence-book?status=RESOLVED')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <button
                onClick={() => router.push('/dashboard/occurrence-book')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-2">
            {recentEntries.length > 0 ? (
              recentEntries.map((entry) => (
                <ActivityItem key={entry.id} entry={entry} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No recent activity
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/dashboard/occurrence-book/new')}
                className="w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:from-blue-100 hover:to-cyan-100 dark:hover:from-blue-900/30 dark:hover:to-cyan-900/30 transition-all flex items-center gap-3 font-medium"
              >
                <Plus className="w-5 h-5" />
                New OB Entry
              </button>
              <button
                onClick={() => router.push('/dashboard/search')}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
              >
                <Search className="w-5 h-5" />
                Advanced Search
              </button>
              <button
                onClick={() => router.push('/dashboard/reports')}
                className="w-full text-left px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center gap-3"
              >
                <BarChart3 className="w-5 h-5" />
                View Reports
              </button>
            </div>
          </div>

          {/* Top Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Categories
            </h2>
            <div className="space-y-3">
              {stats?.byCategory.slice(0, 5).map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    {item.category.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
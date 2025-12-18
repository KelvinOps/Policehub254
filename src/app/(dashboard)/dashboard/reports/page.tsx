// src/app/(dashboard)/dashboard/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Shield,
  Users,
  MapPin,
  PieChart,
  Activity,
} from 'lucide-react';
import { IncidentCategory } from '@prisma/client';
import {
  INCIDENT_CATEGORIES,
  getCategoryLabel,
} from '@/lib/constants/occurrence-book';

interface Statistics {
  total: number;
  thisMonth: number;
  lastMonth: number;
  percentageChange: number;
  byCategory: Array<{ category: IncidentCategory; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export default function ReportsAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/occurrence-book/statistics');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        format,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
      });

      const response = await fetch(`/api/occurrence-book/report?${params}`);
      
      if (format === 'csv') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `police-report-${Date.now()}.csv`;
        a.click();
      } else {
        const data = await response.json();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `police-report-${Date.now()}.json`;
        a.click();
      }
      
      alert('Report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getCategoryPercentage = (count: number) => {
    if (!stats) return 0;
    return ((count / stats.total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Reports & Analytics
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Comprehensive crime statistics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExportReport('csv')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => handleExportReport('json')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Date Range
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchStatistics}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Update Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Incidents"
          value={stats?.total.toString() || '0'}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="This Month"
          value={stats?.thisMonth.toString() || '0'}
          icon={Activity}
          color="green"
          trend={stats?.percentageChange || 0}
        />
        <MetricCard
          title="Last Month"
          value={stats?.lastMonth.toString() || '0'}
          icon={Calendar}
          color="purple"
        />
        <MetricCard
          title="Change"
          value={`${stats?.percentageChange.toFixed(1) || '0'}%`}
          icon={stats && stats.percentageChange >= 0 ? TrendingUp : TrendingDown}
          color={stats && stats.percentageChange >= 0 ? 'red' : 'green'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Incidents by Category
          </h2>
          <div className="space-y-4">
            {stats?.byCategory
              .sort((a, b) => b.count - a.count)
              .slice(0, 8)
              .map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getCategoryLabel(item.category)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.count} incidents
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {getCategoryPercentage(item.count)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${getCategoryPercentage(item.count)}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Incidents by Status
          </h2>
          <div className="space-y-4">
            {stats?.byStatus.map((item) => {
              const statusColors: Record<string, string> = {
                REPORTED: 'from-blue-500 to-blue-600',
                UNDER_INVESTIGATION: 'from-yellow-500 to-yellow-600',
                RESOLVED: 'from-green-500 to-green-600',
                CLOSED: 'from-gray-500 to-gray-600',
                TRANSFERRED: 'from-purple-500 to-purple-600',
              };
              
              const percentage = ((item.count / (stats?.total || 1)) * 100).toFixed(1);

              return (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.count} cases
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${statusColors[item.status] || 'from-gray-500 to-gray-600'} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Insights */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Critical Insights
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="High Priority Cases"
            value={
              stats?.byCategory
                .filter((c) => ['MURDER', 'KIDNAPPING', 'RAPE'].includes(c.category))
                .reduce((sum, c) => sum + c.count, 0)
                .toString() || '0'
            }
            icon={Shield}
            color="red"
          />
          <InsightCard
            title="Under Investigation"
            value={
              stats?.byStatus
                .find((s) => s.status === 'UNDER_INVESTIGATION')
                ?.count.toString() || '0'
            }
            icon={Activity}
            color="yellow"
          />
          <InsightCard
            title="Resolved This Month"
            value={
              stats?.byStatus
                .find((s) => s.status === 'RESOLVED')
                ?.count.toString() || '0'
            }
            icon={FileText}
            color="green"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  trend?: number;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          {trend !== undefined && (
            <p className={`text-sm mt-2 flex items-center gap-1 ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {Math.abs(trend).toFixed(1)}% vs last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
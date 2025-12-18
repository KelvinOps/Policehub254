// src/app/(dashboard)/dashboard/cases/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Eye,
  Clock,
  User,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { getCaseStatusColor, getCaseStatusLabel, getCasePriorityColor, getCasePriorityLabel } from '@/lib/constants/case';
import { getCategoryLabel } from '@/lib/constants/occurrence-book';
import { Case } from '@/types/case';

export default function CasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  useEffect(() => {
    loadCases();
  }, [statusFilter, priorityFilter]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/cases?${params}`);
      const data = await response.json();

      if (data.success) {
        setCases(data.data);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases();
  };

  const filteredCases = cases.filter(c => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        c.caseNumber.toLowerCase().includes(query) ||
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const StatusIcon = ({ status }: { status: string }) => {
    const icons: Record<string, any> = {
      OPEN: AlertCircle,
      UNDER_INVESTIGATION: Clock,
      PENDING_TRIAL: Clock,
      IN_COURT: FileText,
      CLOSED: CheckCircle,
      DISMISSED: XCircle,
    };
    const Icon = icons[status] || FileText;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Cases
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track investigation cases
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard/cases/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Case
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by case number, title, or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Search
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="PENDING_TRIAL">Pending Trial</option>
              <option value="IN_COURT">In Court</option>
              <option value="CLOSED">Closed</option>
              <option value="DISMISSED">Dismissed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <span className="text-sm text-gray-600 dark:text-gray-400 ml-auto">
              {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
            </span>
          </div>
        </form>
      </div>

      {/* Cases Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCases.map((caseItem) => (
          <div
            key={caseItem.id}
            onClick={() => router.push(`/dashboard/cases/${caseItem.id}`)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {caseItem.caseNumber}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {caseItem.title}
                </h3>
              </div>
              <Eye className="w-5 h-5 text-gray-400" />
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
              {caseItem.description}
            </p>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCaseStatusColor(caseItem.status)}`}>
                <StatusIcon status={caseItem.status} />
                {getCaseStatusLabel(caseItem.status)}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCasePriorityColor(caseItem.priority)}`}>
                {getCasePriorityLabel(caseItem.priority)}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                {getCategoryLabel(caseItem.category)}
              </span>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                {caseItem.assignedToName && (
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{caseItem.assignedToName}</span>
                  </div>
                )}
                {caseItem.stationName && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{caseItem.stationName}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{new Date(caseItem.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCases.length === 0 && !loading && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No cases found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating a new case'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => router.push('/dashboard/cases/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Case
            </button>
          )}
        </div>
      )}
    </div>
  );
}
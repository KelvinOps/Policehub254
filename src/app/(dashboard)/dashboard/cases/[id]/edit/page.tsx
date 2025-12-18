// src/app/(dashboard)/dashboard/cases/[id]/edit/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Case } from '@/types/case';
import { CaseStatus, IncidentCategory } from '@prisma/client';
import { getCasePermissions } from '@/lib/auth/case-permissions';

interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
}

export default function EditCasePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [officers, setOfficers] = useState<Officer[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as IncidentCategory | '',
    priority: 'MEDIUM',
    status: '' as CaseStatus | '',
    assignedToId: '',
    courtDate: '',
    courtCase: '',
    outcome: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session?.user) {
      loadCase();
    }
  }, [params.id, session]);

  useEffect(() => {
    if (caseData?.stationId) {
      loadOfficers(caseData.stationId);
    }
  }, [caseData?.stationId]);

  const loadCase = async () => {
    try {
      const response = await fetch(`/api/cases/${params.id}`);
      const data = await response.json();

      if (data.success) {
        const caseInfo = data.data;
        setCaseData(caseInfo);
        
        setFormData({
          title: caseInfo.title,
          description: caseInfo.description,
          category: caseInfo.category,
          priority: caseInfo.priority,
          status: caseInfo.status,
          assignedToId: caseInfo.assignedToId || '',
          courtDate: caseInfo.courtDate ? new Date(caseInfo.courtDate).toISOString().split('T')[0] : '',
          courtCase: caseInfo.courtCase || '',
          outcome: caseInfo.outcome || '',
        });
      } else {
        if (response.status === 403) {
          alert('You do not have permission to edit this case');
          router.push('/dashboard/cases');
        }
      }
    } catch (error) {
      console.error('Error loading case:', error);
    }
  };

  const loadOfficers = async (stationId: string) => {
    try {
      const response = await fetch(`/api/users?stationId=${stationId}&role=DETECTIVE,OFFICER,CONSTABLE`);
      const data = await response.json();
      if (data.success) {
        setOfficers(data.data);
      }
    } catch (error) {
      console.error('Error loading officers:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Case title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Case description is required';
    }
    if (!formData.category) {
      newErrors.category = 'Case category is required';
    }
    if (!formData.status) {
      newErrors.status = 'Case status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      
      const submitData: any = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assignedToId: formData.assignedToId || null,
        courtCase: formData.courtCase || null,
        outcome: formData.outcome || null,
      };

      if (formData.courtDate) {
        submitData.courtDate = new Date(formData.courtDate).toISOString();
      }

      const response = await fetch(`/api/cases/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Case updated successfully');
        router.push(`/dashboard/cases/${params.id}`);
      } else {
        alert(data.error || 'Failed to update case');
      }
    } catch (error) {
      console.error('Error updating case:', error);
      alert('An error occurred while updating the case');
    } finally {
      setLoading(false);
    }
  };

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const permissions = getCasePermissions(session?.user.role || 'PUBLIC', session?.user.id || '', caseData);

  if (!permissions.canEdit) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You do not have permission to edit this case.
        </p>
        <button
          onClick={() => router.push(`/dashboard/cases/${params.id}`)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          Back to Case
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Case
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">
            {caseData.caseNumber}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Case Title */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Case Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className={`w-full px-4 py-2 border ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Status and Priority Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as CaseStatus })}
              className={`w-full px-4 py-2 border ${errors.status ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
            >
              <option value="OPEN">Open</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="PENDING_TRIAL">Pending Trial</option>
              <option value="IN_COURT">In Court</option>
              <option value="CLOSED">Closed</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
            {errors.status && (
              <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.status}
              </p>
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {/* Category (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Category
          </label>
          <input
            type="text"
            value={formData.category}
            disabled
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Category cannot be changed after case creation
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            className={`w-full px-4 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Assigned Officer */}
        {permissions.canAssign && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Assigned Officer
            </label>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Not assigned</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name} ({officer.badgeNumber})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Court Information */}
        {(formData.status === 'IN_COURT' || formData.status === 'PENDING_TRIAL') && (
          <div className="space-y-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Court Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Court Date
                </label>
                <input
                  type="date"
                  value={formData.courtDate}
                  onChange={(e) => setFormData({ ...formData, courtDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Court Case Number
                </label>
                <input
                  type="text"
                  value={formData.courtCase}
                  onChange={(e) => setFormData({ ...formData, courtCase: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CR-2024-12345"
                />
              </div>
            </div>
          </div>
        )}

        {/* Outcome */}
        {(formData.status === 'CLOSED' || formData.status === 'DISMISSED') && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Outcome
            </label>
            <textarea
              value={formData.outcome}
              onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the final outcome of the case"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
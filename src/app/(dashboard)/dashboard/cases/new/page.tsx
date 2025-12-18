// src/app/(dashboard)/dashboard/cases/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { IncidentCategory } from '@prisma/client';
import { getCasePermissions } from '@/lib/auth/case-permissions';
import { getSuggestedPriority } from '@/lib/constants/case';

interface Station {
  id: string;
  name: string;
  code: string;
}

interface Officer {
  id: string;
  name: string;
  badgeNumber: string;
}

export default function NewCasePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [stations, setStations] = useState<Station[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '' as IncidentCategory | '',
    priority: 'MEDIUM',
    stationId: '',
    assignedToId: '',
    obEntryId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session?.user) {
      const permissions = getCasePermissions(session.user.role, session.user.id);
      
      if (!permissions.canCreate) {
        alert('You do not have permission to create cases');
        router.push('/dashboard/cases');
        return;
      }

      loadStations();
      
      // Set default station for non-admin users
      if (!permissions.canAccessAllCases && session.user.stationId) {
        setFormData(prev => ({ ...prev, stationId: session.user.stationId }));
      }
    }
  }, [session]);

  useEffect(() => {
    if (formData.stationId) {
      loadOfficers(formData.stationId);
    }
  }, [formData.stationId]);

  // Auto-suggest priority based on category
  useEffect(() => {
    if (formData.category) {
      const suggestedPriority = getSuggestedPriority(formData.category);
      setFormData(prev => ({ ...prev, priority: suggestedPriority }));
    }
  }, [formData.category]);

  const loadStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (data.success) {
        setStations(data.data);
      }
    } catch (error) {
      console.error('Error loading stations:', error);
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
    if (!formData.stationId) {
      newErrors.stationId = 'Station is required';
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
      
      const submitData = {
        ...formData,
        createdById: session?.user.id,
        assignedToId: formData.assignedToId || undefined,
        obEntryId: formData.obEntryId || undefined,
      };

      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Case created successfully');
        router.push(`/dashboard/cases/${data.data.id}`);
      } else {
        alert(data.error || 'Failed to create case');
      }
    } catch (error) {
      console.error('Error creating case:', error);
      alert('An error occurred while creating the case');
    } finally {
      setLoading(false);
    }
  };

  const permissions = getCasePermissions(session?.user.role || 'PUBLIC', session?.user.id || '');

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
            Create New Case
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Fill in the details to create a new investigation case
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
            placeholder="Enter a brief, descriptive title for the case"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Category *
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as IncidentCategory })}
            className={`w-full px-4 py-2 border ${errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500`}
          >
            <option value="">Select category</option>
            <option value="THEFT">Theft</option>
            <option value="ROBBERY">Robbery</option>
            <option value="ASSAULT">Assault</option>
            <option value="MURDER">Murder</option>
            <option value="RAPE">Rape</option>
            <option value="DOMESTIC_VIOLENCE">Domestic Violence</option>
            <option value="FRAUD">Fraud</option>
            <option value="BURGLARY">Burglary</option>
            <option value="TRAFFIC_ACCIDENT">Traffic Accident</option>
            <option value="KIDNAPPING">Kidnapping</option>
            <option value="DRUG_RELATED">Drug Related</option>
            <option value="CYBERCRIME">Cybercrime</option>
            <option value="CORRUPTION">Corruption</option>
            <option value="MISSING_PERSON">Missing Person</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.category}
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
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Priority is auto-suggested based on category but can be changed
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
            placeholder="Provide a detailed description of the case, including relevant facts and circumstances"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.description}
            </p>
          )}
        </div>

        {/* Station */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Station *
          </label>
          <select
            value={formData.stationId}
            onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
            disabled={!permissions.canAccessAllCases}
            className={`w-full px-4 py-2 border ${errors.stationId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select station</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name} ({station.code})
              </option>
            ))}
          </select>
          {errors.stationId && (
            <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.stationId}
            </p>
          )}
        </div>

        {/* Assigned Officer */}
        {permissions.canAssign && (
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Assign To (Optional)
            </label>
            <select
              value={formData.assignedToId}
              onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              disabled={!formData.stationId}
            >
              <option value="">Select officer</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name} ({officer.badgeNumber})
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You can assign an officer now or later
            </p>
          </div>
        )}

        {/* OB Entry Link */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Link to OB Entry (Optional)
          </label>
          <input
            type="text"
            value={formData.obEntryId}
            onChange={(e) => setFormData({ ...formData, obEntryId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Enter OB Entry ID if this case is linked to an occurrence book entry"
          />
        </div>

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
            {loading ? 'Creating...' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  );
}
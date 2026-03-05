// src/app/(dashboard)/dashboard/occurrence-book/[id]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { IncidentCategory, IncidentStatus } from '@prisma/client';
import {
  INCIDENT_CATEGORIES,
  INCIDENT_STATUSES,
} from '@/lib/constants/occurrence-book';

interface WitnessInfo {
  name: string;
  contactNumber: string;
  idNumber: string;
  address: string;
  statement: string;
}

interface SuspectInfo {
  name: string;
  alias: string[];
  description: string;
  lastSeenLocation: string;
  lastSeenTime: string;
  identifyingFeatures: string[];
}

const getLocalDateTimeString = (date?: Date) => {
  const d = date || new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function EditOBEntryPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    incidentDate: '',
    category: '' as IncidentCategory | '',
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    reportedBy: '',
    contactNumber: '',
    status: '' as IncidentStatus | '',
  });

  const [witnesses, setWitnesses] = useState<WitnessInfo[]>([]);
  const [suspects, setSuspects] = useState<SuspectInfo[]>([]);

  useEffect(() => {
    fetchEntry();
  }, [params.id]);

  const fetchEntry = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/occurrence-book/${params.id}`);
      const data = await response.json();

      if (data.success) {
        const entry = data.data;
        setFormData({
          incidentDate: getLocalDateTimeString(new Date(entry.incidentDate)),
          category: entry.category,
          description: entry.description,
          location: entry.location,
          latitude: entry.latitude?.toString() || '',
          longitude: entry.longitude?.toString() || '',
          reportedBy: entry.reportedBy,
          contactNumber: entry.contactNumber,
          status: entry.status,
        });
        if (entry.witnesses && Array.isArray(entry.witnesses))
          setWitnesses(entry.witnesses);
        if (entry.suspects && Array.isArray(entry.suspects))
          setSuspects(entry.suspects);
      } else {
        alert(data.error || 'Failed to fetch entry');
        router.push('/dashboard/occurrence-book');
      }
    } catch (error) {
      console.error('Error fetching entry:', error);
      alert('Failed to load entry');
      router.push('/dashboard/occurrence-book');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // ── Witness helpers ────────────────────────────────────────────────────────
  const addWitness = () =>
    setWitnesses([
      ...witnesses,
      { name: '', contactNumber: '', idNumber: '', address: '', statement: '' },
    ]);

  const removeWitness = (index: number) =>
    setWitnesses(witnesses.filter((_, i) => i !== index));

  const updateWitness = (
    index: number,
    field: keyof WitnessInfo,
    value: string
  ) => {
    const updated = [...witnesses];
    updated[index] = { ...updated[index], [field]: value };
    setWitnesses(updated);
  };

  // ── Suspect helpers ────────────────────────────────────────────────────────
  const addSuspect = () =>
    setSuspects([
      ...suspects,
      {
        name: '',
        alias: [],
        description: '',
        lastSeenLocation: '',
        lastSeenTime: '',
        identifyingFeatures: [],
      },
    ]);

  const removeSuspect = (index: number) =>
    setSuspects(suspects.filter((_, i) => i !== index));

  const updateSuspect = (
    index: number,
    field: keyof SuspectInfo,
    value: string
  ) => {
    const updated = [...suspects];
    updated[index] = { ...updated[index], [field]: value };
    setSuspects(updated);
  };

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
      },
      (error) => alert('Unable to get location: ' + error.message)
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.incidentDate)
      newErrors.incidentDate = 'Incident date is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.description || formData.description.length < 20)
      newErrors.description = 'Description must be at least 20 characters';
    if (!formData.location) newErrors.location = 'Location is required';
    if (!formData.reportedBy) newErrors.reportedBy = 'Reporter name is required';
    if (!formData.contactNumber) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (
      !/^[0-9]{10}$/.test(formData.contactNumber.replace(/[\s+\-()]/g, ''))
    ) {
      newErrors.contactNumber = 'Contact number must be 10 digits';
    }
    if (!formData.status) newErrors.status = 'Status is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        incidentDate: new Date(formData.incidentDate).toISOString(),
        category: formData.category,
        description: formData.description,
        location: formData.location,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        reportedBy: formData.reportedBy,
        contactNumber: formData.contactNumber,
        status: formData.status,
        witnesses: witnesses.length > 0 ? witnesses : undefined,
        suspects: suspects.length > 0 ? suspects : undefined,
      };

      const response = await fetch(`/api/occurrence-book/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/dashboard/occurrence-book/${params.id}`);
      } else {
        alert(data.error || 'Failed to update entry');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      errors[field]
        ? 'border-red-500'
        : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/occurrence-book/${params.id}`}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit OB Entry
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Update incident details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Incident Details ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Incident Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Incident Date & Time *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="datetime-local"
                  name="incidentDate"
                  value={formData.incidentDate}
                  onChange={handleChange}
                  max={getLocalDateTimeString()}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    errors.incidentDate
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {errors.incidentDate && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.incidentDate}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={inputClass('category')}
              >
                <option value="">Select category</option>
                {Object.entries(INCIDENT_CATEGORIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.category}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className={inputClass('status')}
              >
                <option value="">Select status</option>
                {Object.entries(INCIDENT_STATUSES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.status}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Westlands, Nairobi"
                  className={`w-full pl-10 pr-32 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    errors.location
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  Use GPS
                </button>
              </div>
              {errors.location && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.location}
                </p>
              )}
            </div>

            {/* Lat/Lng */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Latitude
              </label>
              <input
                type="text"
                name="latitude"
                value={formData.latitude}
                onChange={handleChange}
                placeholder="e.g., -1.2921"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Longitude
              </label>
              <input
                type="text"
                name="longitude"
                value={formData.longitude}
                onChange={handleChange}
                placeholder="e.g., 36.8219"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Detailed Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                placeholder="Provide a detailed description of the incident..."
                className={inputClass('description')}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formData.description.length} characters (minimum 20)
              </p>
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Reporter Information ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <User className="w-5 h-5" />
            Reporter Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                name="reportedBy"
                value={formData.reportedBy}
                onChange={handleChange}
                placeholder="Full name"
                className={inputClass('reportedBy')}
              />
              {errors.reportedBy && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.reportedBy}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="0712345678"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    errors.contactNumber
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              </div>
              {errors.contactNumber && (
                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.contactNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Witnesses ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Witnesses
              {witnesses.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({witnesses.length})
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={addWitness}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Witness
            </button>
          </div>
          {witnesses.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No witnesses added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {witnesses.map((witness, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Witness {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeWitness(index)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={witness.name}
                        onChange={(e) =>
                          updateWitness(index, 'name', e.target.value)
                        }
                        placeholder="Full name"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="text"
                        value={witness.contactNumber}
                        onChange={(e) =>
                          updateWitness(index, 'contactNumber', e.target.value)
                        }
                        placeholder="Phone number"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Statement
                      </label>
                      <textarea
                        value={witness.statement}
                        onChange={(e) =>
                          updateWitness(index, 'statement', e.target.value)
                        }
                        rows={2}
                        placeholder="Witness statement..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Suspects ── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              Suspects
              {suspects.length > 0 && (
                <span className="text-sm font-normal text-gray-500">
                  ({suspects.length})
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={addSuspect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Suspect
            </button>
          </div>
          {suspects.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No suspects added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {suspects.map((suspect, index) => (
                <div
                  key={index}
                  className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suspect {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeSuspect(index)}
                      className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={suspect.name}
                        onChange={(e) =>
                          updateSuspect(index, 'name', e.target.value)
                        }
                        placeholder="Name or unknown"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Last Seen Location
                      </label>
                      <input
                        type="text"
                        value={suspect.lastSeenLocation}
                        onChange={(e) =>
                          updateSuspect(
                            index,
                            'lastSeenLocation',
                            e.target.value
                          )
                        }
                        placeholder="Location..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Description
                      </label>
                      <textarea
                        value={suspect.description}
                        onChange={(e) =>
                          updateSuspect(index, 'description', e.target.value)
                        }
                        rows={2}
                        placeholder="Physical description, clothing, etc..."
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href={`/dashboard/occurrence-book/${params.id}`}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
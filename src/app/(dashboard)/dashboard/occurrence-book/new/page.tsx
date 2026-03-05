//dashboard/occurrence-book/new/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  MapPin,
  Calendar,
  User,
  Phone,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { IncidentCategory } from '@prisma/client';
import { INCIDENT_CATEGORIES } from '@/lib/constants/occurrence-book';

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

const getLocalDateTimeString = (date?: Date): string => {
  const d = date ?? new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
};

export default function NewOBEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    incidentDate: getLocalDateTimeString(),
    category: '' as IncidentCategory,
    description: '',
    location: '',
    latitude: '',
    longitude: '',
    reportedBy: '',
    contactNumber: '',
  });

  const [witnesses, setWitnesses] = useState<WitnessInfo[]>([]);
  const [suspects, setSuspects] = useState<SuspectInfo[]>([]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (
          !parsedUser.stationId &&
          !['SUPER_ADMIN', 'ADMIN'].includes(parsedUser.role)
        ) {
          alert(
            'Error: Your account has no assigned station. Please contact your administrator.'
          );
        }
        setUser(parsedUser);
      } catch {
        alert('Session data is corrupted. Please log in again.');
        router.push('/login');
      }
    } else {
      alert('No user found. Please log in again.');
      router.push('/login');
    }
  }, [router]);

  // ── Form helpers ──────────────────────────────────────────────────────────

  // FIX: restored the missing opening `<` in the generic type
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
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

  // ── Witness helpers ───────────────────────────────────────────────────────

  const addWitness = () =>
    setWitnesses((prev) => [
      ...prev,
      { name: '', contactNumber: '', idNumber: '', address: '', statement: '' },
    ]);

  const removeWitness = (index: number) =>
    setWitnesses((prev) => prev.filter((_, i) => i !== index));

  const updateWitness = (
    index: number,
    field: keyof WitnessInfo,
    value: string
  ) =>
    setWitnesses((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ── Suspect helpers ───────────────────────────────────────────────────────

  const addSuspect = () =>
    setSuspects((prev) => [
      ...prev,
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
    setSuspects((prev) => prev.filter((_, i) => i !== index));

  const updateSuspect = (
    index: number,
    field: keyof SuspectInfo,
    value: string | string[]
  ) =>
    setSuspects((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });

  // ── GPS ───────────────────────────────────────────────────────────────────

  const getCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString(),
        })),
      (err) => alert('Unable to get location: ' + err.message)
    );
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.incidentDate)
      newErrors.incidentDate = 'Incident date is required';
    if (!formData.category)
      newErrors.category = 'Category is required';
    if (!formData.description || formData.description.length < 20)
      newErrors.description = 'Description must be at least 20 characters';
    if (!formData.location)
      newErrors.location = 'Location is required';
    if (!formData.reportedBy)
      newErrors.reportedBy = 'Reporter name is required';
    if (!formData.contactNumber) {
      newErrors.contactNumber = 'Contact number is required';
    } else if (
      !/^[0-9]{10}$/.test(formData.contactNumber.replace(/\s/g, ''))
    ) {
      newErrors.contactNumber = 'Contact number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!user) {
      alert('User not found. Please log in again.');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        incidentDate: new Date(formData.incidentDate).toISOString(),
        category: formData.category,
        description: formData.description,
        location: formData.location,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude
          ? parseFloat(formData.longitude)
          : undefined,
        reportedBy: formData.reportedBy,
        contactNumber: formData.contactNumber,
        witnesses: witnesses.length > 0 ? witnesses : undefined,
        suspects: suspects.length > 0 ? suspects : undefined,
      };

      const response = await fetch('/api/occurrence-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        alert('OB entry created successfully!');
        router.push('/dashboard/occurrence-book');
      } else {
        alert(data.error || 'Failed to create entry');
      }
    } catch (error) {
      console.error('Error creating entry:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Shared input class helpers ────────────────────────────────────────────

  const inputCls = (field: string) =>
    `w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
      errors[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`;

  const subInputCls =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500';

  const errorMsg = (field: string) =>
    errors[field] ? (
      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        {errors[field]}
      </p>
    ) : null;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/occurrence-book"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            New OB Entry
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Record a new incident in the occurrence book
          </p>
        </div>
      </div>

      {/* Logged-in user badge */}
      {user && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Logged in as:</strong> {user.name} ({user.role})
            {user.stationName && ` — ${user.stationName}`}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Incident Details ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Incident Details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incident Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Incident Date &amp; Time *
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
              {errorMsg('incidentDate')}
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
                className={inputCls('category')}
              >
                <option value="">Select category</option>
                {Object.entries(INCIDENT_CATEGORIES).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
              {errorMsg('category')}
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
              {errorMsg('location')}
            </div>

            {/* Latitude */}
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

            {/* Longitude */}
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
                className={`w-full px-4 py-3 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                  errors.description
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formData.description.length} / 20 minimum characters
              </p>
              {errorMsg('description')}
            </div>
          </div>
        </div>

        {/* ── Reporter Information ──────────────────────────────────────── */}
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
                className={inputCls('reportedBy')}
              />
              {errorMsg('reportedBy')}
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
              {errorMsg('contactNumber')}
            </div>
          </div>
        </div>

        {/* ── Witnesses ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5" />
              Witnesses
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                (optional)
              </span>
            </h2>
            <button
              type="button"
              onClick={addWitness}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Witness
            </button>
          </div>

          {witnesses.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
              No witnesses added. Click &quot;Add Witness&quot; to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {witnesses.map((witness, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Witness {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeWitness(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={witness.name}
                        onChange={(e) => updateWitness(index, 'name', e.target.value)}
                        placeholder="Witness full name"
                        className={subInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Contact Number
                      </label>
                      <input
                        type="tel"
                        value={witness.contactNumber}
                        onChange={(e) => updateWitness(index, 'contactNumber', e.target.value)}
                        placeholder="0712345678"
                        className={subInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        ID Number
                      </label>
                      <input
                        type="text"
                        value={witness.idNumber}
                        onChange={(e) => updateWitness(index, 'idNumber', e.target.value)}
                        placeholder="National ID / Passport"
                        className={subInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={witness.address}
                        onChange={(e) => updateWitness(index, 'address', e.target.value)}
                        placeholder="Residential address"
                        className={subInputCls}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Statement
                      </label>
                      <textarea
                        value={witness.statement}
                        onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                        rows={3}
                        placeholder="Witness statement..."
                        className={subInputCls}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Suspects ──────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Suspects
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                (optional)
              </span>
            </h2>
            <button
              type="button"
              onClick={addSuspect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-700 dark:text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Suspect
            </button>
          </div>

          {suspects.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">
              No suspects added. Click &quot;Add Suspect&quot; to add one.
            </p>
          ) : (
            <div className="space-y-4">
              {suspects.map((suspect, index) => (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Suspect {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() => removeSuspect(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Name (if known)
                      </label>
                      <input
                        type="text"
                        value={suspect.name}
                        onChange={(e) => updateSuspect(index, 'name', e.target.value)}
                        placeholder="Suspect name"
                        className={subInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Alias / Nickname
                      </label>
                      <input
                        type="text"
                        value={suspect.alias.join(', ')}
                        onChange={(e) =>
                          updateSuspect(
                            index,
                            'alias',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="e.g., Mwizi, Bully (comma separated)"
                        className={subInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Last Seen Location
                      </label>
                      <input
                        type="text"
                        value={suspect.lastSeenLocation}
                        onChange={(e) => updateSuspect(index, 'lastSeenLocation', e.target.value)}
                        placeholder="Location last seen"
                        className={subInputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Last Seen Time
                      </label>
                      <input
                        type="text"
                        value={suspect.lastSeenTime}
                        onChange={(e) => updateSuspect(index, 'lastSeenTime', e.target.value)}
                        placeholder="e.g., 14:30, yesterday evening"
                        className={subInputCls}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Physical Description
                      </label>
                      <textarea
                        value={suspect.description}
                        onChange={(e) => updateSuspect(index, 'description', e.target.value)}
                        rows={2}
                        placeholder="Height, build, clothing, etc."
                        className={subInputCls}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Identifying Features
                      </label>
                      <input
                        type="text"
                        value={suspect.identifyingFeatures.join(', ')}
                        onChange={(e) =>
                          updateSuspect(
                            index,
                            'identifyingFeatures',
                            e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                          )
                        }
                        placeholder="e.g., scar on left cheek, tattoo on arm (comma separated)"
                        className={subInputCls}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Action Buttons ────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/dashboard/occurrence-book"
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create Entry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
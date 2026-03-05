'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, AlertCircle, ChevronRight, Loader2,
} from 'lucide-react';
import { UserRole } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Station {
  id:       string;
  name:     string;
  code:     string;
  county:   string;
}

interface OfficerForm {
  name:        string;
  email:       string;
  role:        UserRole;
  badgeNumber: string;
  phoneNumber: string;
  stationId:   string;
  isActive:    boolean;
}

interface CurrentUser {
  id:    string;
  role:  string;
  stationId?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES: { value: UserRole; label: string }[] = [
  { value: 'SUPER_ADMIN',       label: 'Super Admin' },
  { value: 'ADMIN',             label: 'Admin' },
  { value: 'STATION_COMMANDER', label: 'Station Commander' },
  { value: 'OCS',               label: 'OCS' },
  { value: 'DETECTIVE',         label: 'Detective' },
  { value: 'OFFICER',           label: 'Police Officer' },
  { value: 'CONSTABLE',         label: 'Constable' },
  { value: 'PUBLIC',            label: 'Public' },
];

const ADMIN_ONLY_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditOfficerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id     = params.id;

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [stations,    setStations]    = useState<Station[]>([]);
  const [form,        setForm]        = useState<OfficerForm>({
    name: '', email: '', role: 'OFFICER', badgeNumber: '',
    phoneNumber: '', stationId: '', isActive: true,
  });
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  // Auth
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setCurrentUser(d.user);
    });
  }, []);

  // Load officer
  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/users/${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const o = d.data;
          setForm({
            name:        o.name         ?? '',
            email:       o.email        ?? '',
            role:        o.role         ?? 'OFFICER',
            badgeNumber: o.badgeNumber  ?? '',
            phoneNumber: o.phoneNumber  ?? '',
            stationId:   o.stationId    ?? '',
            isActive:    o.isActive     ?? true,
          });
        } else {
          setError(d.error || 'Failed to load officer');
        }
      })
      .catch(() => setError('Failed to load officer'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load stations (admins need the full list)
  useEffect(() => {
    fetch('/api/stations?limit=200')
      .then(r => r.json())
      .then(d => { if (d.success || d.data) setStations(d.data ?? []); });
  }, []);

  const canManage = currentUser && ['SUPER_ADMIN','ADMIN','STATION_COMMANDER'].includes(currentUser.role);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Determine which roles this user can assign
  const availableRoles = ALL_ROLES.filter(r => {
    if (isSuperAdmin) return true;
    if (currentUser?.role === 'ADMIN') return !ADMIN_ONLY_ROLES.includes(r.value) || r.value === 'ADMIN';
    return !['SUPER_ADMIN','ADMIN'].includes(r.value);
  });

  const set = (field: keyof OfficerForm, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.badgeNumber) {
      setError('Name, email and badge number are required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res  = await fetch(`/api/users/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess('Officer profile updated successfully');
        setTimeout(() => router.push(`/dashboard/personnel/${id}`), 1200);
      } else {
        setError(data.error || 'Update failed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage && currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircle className="w-16 h-16 text-red-400" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to edit officer profiles.</p>
        <Link href="/dashboard/personnel" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Personnel
        </Link>
      </div>
    );
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-200">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/personnel" className="hover:text-gray-700 dark:hover:text-gray-200">Personnel</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/dashboard/personnel/${id}`} className="hover:text-gray-700 dark:hover:text-gray-200">Profile</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">Edit</span>
      </nav>

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Officer</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Update officer profile information</p>
        </div>
        <Link href={`/dashboard/personnel/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-400">
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full name */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Sergeant John Kamau"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
            <input type="tel" value={form.phoneNumber} onChange={e => set('phoneNumber', e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Badge */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Badge Number *</label>
            <input type="text" value={form.badgeNumber} onChange={e => set('badgeNumber', e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Role / Rank *</label>
            <select value={form.role} onChange={e => set('role', e.target.value as UserRole)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {availableRoles.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* Station */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Station</label>
            <select value={form.stationId} onChange={e => set('stationId', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="">-- No Station --</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.county}</option>
              ))}
            </select>
          </div>

          {/* Active status */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" checked={form.isActive}
                  onChange={e => set('isActive', e.target.checked)}
                  className="sr-only" />
                <div className={`w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {form.isActive ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {form.isActive ? 'Officer can log in and access the system' : 'Officer cannot log in'}
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link href={`/dashboard/personnel/${id}`}
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
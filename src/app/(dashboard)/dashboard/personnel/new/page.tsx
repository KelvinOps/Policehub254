// src/app/(dashboard)/dashboard/personnel/new/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Save, AlertCircle, ChevronRight,
  Eye, EyeOff, Loader2, UserPlus, Camera, Upload, X
} from 'lucide-react';
import { UserRole } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Station {
  id:     string;
  name:   string;
  code:   string;
  county: string;
}

interface CurrentUser {
  id:        string;
  role:      string;
  stationId?: string;
}

interface FormState {
  name:        string;
  email:       string;
  password:    string;
  role:        UserRole;
  badgeNumber: string;
  phoneNumber: string;
  stationId:   string;
  avatar:      string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'STATION_COMMANDER', label: 'Station Commander', desc: 'Manages a station' },
  { value: 'OCS',               label: 'OCS',               desc: 'Officer in Charge of Station' },
  { value: 'DETECTIVE',         label: 'Detective',          desc: 'Investigative officer' },
  { value: 'OFFICER',           label: 'Police Officer',     desc: 'Uniformed officer' },
  { value: 'CONSTABLE',         label: 'Constable',          desc: 'Junior uniformed officer' },
];

const ADMIN_ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full system access' },
  { value: 'ADMIN',       label: 'Admin',       desc: 'Administration access' },
  ...ALL_ROLES,
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full px-3 py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
    err ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
  }`;

const Field = ({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

export default function NewOfficerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentUser,  setCurrentUser]  = useState<CurrentUser | null>(null);
  const [stations,     setStations]     = useState<Station[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [fieldErrors,  setFieldErrors]  = useState<Partial<Record<keyof FormState, string>>>({});
  const [uploading,    setUploading]    = useState(false);
  const [previewUrl,   setPreviewUrl]   = useState<string>('');

  const [form, setForm] = useState<FormState>({
    name: '', email: '', password: '', role: 'OFFICER',
    badgeNumber: '', phoneNumber: '', stationId: '', avatar: '',
  });

  // Auth
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) {
        setCurrentUser(d.user);
        if (d.user.stationId && !['SUPER_ADMIN', 'ADMIN'].includes(d.user.role)) {
          setForm(prev => ({ ...prev, stationId: d.user.stationId! }));
        }
      }
    });
  }, []);

  // Load stations
  useEffect(() => {
    fetch('/api/stations?limit=200')
      .then(r => r.json())
      .then(d => { if (d.data) setStations(d.data); });
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const canManage = currentUser && ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(currentUser.role);
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(currentUser?.role ?? '');

  const availableRoles = (isSuperAdmin || isAdmin) ? ADMIN_ROLES : ALL_ROLES;

  const set = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => ({ ...prev, [field]: '' }));
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload to server
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        set('avatar', data.url);
      } else {
        setError(data.error || 'Failed to upload image');
        setPreviewUrl('');
      }
    } catch (err) {
      setError('Failed to upload image');
      setPreviewUrl('');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    set('avatar', '');
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) errs.name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email address';
    if (!form.badgeNumber.trim()) errs.badgeNumber = 'Badge number is required';
    if (!form.stationId) errs.stationId = 'Station is required';
    if (form.password && form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password || form.badgeNumber,
          role: form.role,
          badgeNumber: form.badgeNumber,
          phone: form.phoneNumber,
          stationId: form.stationId,
          avatar: form.avatar, // Include avatar URL
        }),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/dashboard/personnel/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create officer');
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
        <p className="text-gray-500 dark:text-gray-400">You don't have permission to add new officers.</p>
        <Link href="/dashboard/personnel" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Personnel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-200">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/personnel" className="hover:text-gray-700 dark:hover:text-gray-200">Personnel</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">Add Officer</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-blue-600" /> Add New Officer
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Register a new officer in the system</p>
        </div>
        <Link href="/dashboard/personnel"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Cancel
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        
        {/* Profile Picture Section */}
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Avatar Preview */}
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-4 border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : form.avatar ? (
                  <img
                    src={form.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* Upload button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-2 -right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>

              {/* Remove button */}
              {(previewUrl || form.avatar) && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {uploading ? 'Uploading...' : 'Click camera to upload photo'}
            </p>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Profile Photo</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Upload a professional photo of the officer. <br />
              Accepted formats: JPG, PNG, GIF (max 5MB)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <Field label="Full Name *" error={fieldErrors.name}>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Sergeant John Kamau"
                className={inputCls(fieldErrors.name)}
              />
            </Field>
          </div>

          {/* Email */}
          <Field label="Email Address *" error={fieldErrors.email}>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="john.kamau@nps.go.ke"
              className={inputCls(fieldErrors.email)}
            />
          </Field>

          {/* Phone */}
          <Field label="Phone Number" error={fieldErrors.phoneNumber}>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={e => set('phoneNumber', e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className={inputCls()}
            />
          </Field>

          {/* Badge */}
          <Field label="Badge Number *" error={fieldErrors.badgeNumber}>
            <input
              type="text"
              value={form.badgeNumber}
              onChange={e => set('badgeNumber', e.target.value)}
              placeholder="NPS-12345"
              className={inputCls(fieldErrors.badgeNumber)}
            />
          </Field>

          {/* Role */}
          <Field label="Role / Rank *" error={fieldErrors.role}>
            <select
              value={form.role}
              onChange={e => set('role', e.target.value)}
              className={inputCls()}
            >
              {availableRoles.map(r => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </Field>

          {/* Station */}
          <div className="sm:col-span-2">
            <Field label="Assigned Station *" error={fieldErrors.stationId}>
              <select
                value={form.stationId}
                onChange={e => set('stationId', e.target.value)}
                disabled={!isAdmin && !!currentUser?.stationId}
                className={inputCls(fieldErrors.stationId)}
              >
                <option value="">-- Select Station --</option>
                {stations.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code}) — {s.county}</option>
                ))}
              </select>
              {!isAdmin && currentUser?.stationId && (
                <p className="mt-1 text-xs text-gray-400">Station is fixed to your station</p>
              )}
            </Field>
          </div>

          {/* Password */}
          <div className="sm:col-span-2">
            <Field label="Password" error={fieldErrors.password}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Leave blank to use badge number as default"
                  className={`${inputCls(fieldErrors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              If left blank, the badge number will be used as the initial password.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link href="/dashboard/personnel"
            className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Creating…' : 'Create Officer'}
          </button>
        </div>
      </form>
    </div>
  );
}
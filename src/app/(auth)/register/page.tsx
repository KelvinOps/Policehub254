'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface Station {
  id: string;
  name: string;
  code: string;
  county: string;
  subCounty: string;
}

enum UserRole {
  SUPER_ADMIN       = 'SUPER_ADMIN',
  ADMIN             = 'ADMIN',
  STATION_COMMANDER = 'STATION_COMMANDER',
  OCS               = 'OCS',
  DETECTIVE         = 'DETECTIVE',
  TRAFFIC_OFFICER   = 'TRAFFIC_OFFICER',
  GBV_OFFICER       = 'GBV_OFFICER',
  RECORDS_OFFICER   = 'RECORDS_OFFICER',
  OFFICER           = 'OFFICER',
  CONSTABLE         = 'CONSTABLE',
  DESK_OFFICER      = 'DESK_OFFICER',
}

const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:       'Super Administrator',
  [UserRole.ADMIN]:             'Administrator',
  [UserRole.STATION_COMMANDER]: 'Station Commander',
  [UserRole.OCS]:               'Officer Commanding Station',
  [UserRole.DETECTIVE]:         'Detective',
  [UserRole.TRAFFIC_OFFICER]:   'Traffic Officer',
  [UserRole.GBV_OFFICER]:       'GBV Officer',
  [UserRole.RECORDS_OFFICER]:   'Records Officer',
  [UserRole.OFFICER]:           'Officer',
  [UserRole.CONSTABLE]:         'Constable',
  [UserRole.DESK_OFFICER]:      'Desk Officer',
};

const ADMIN_ROLES: UserRole[] = [UserRole.SUPER_ADMIN, UserRole.ADMIN];

export default function RegisterPage() {
  const router = useRouter();

  const [stations, setStations]               = useState<Station[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [stationsError, setStationsError]     = useState('');

  const [formData, setFormData] = useState({
    email:           '',
    password:        '',
    confirmPassword: '',
    name:            '',
    role:            UserRole.OFFICER,
    badgeNumber:     '',
    stationId:       '',
    phoneNumber:     '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);

  // ─── Fetch stations ────────────────────────────────────────────────────────
  const fetchStations = async () => {
    setLoadingStations(true);
    setStationsError('');
    try {
      const response = await fetch('/api/stations');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      // ✅ FIX: API returns { success: true, data: [...] } — must extract .data
      setStations(json.data ?? []);
    } catch (err) {
      console.error('Failed to fetch stations:', err);
      setStationsError('Could not load stations. Please try again.');
    } finally {
      setLoadingStations(false);
    }
  };

  useEffect(() => { fetchStations(); }, []);

  // ─── Derived state ─────────────────────────────────────────────────────────
  const isAdminRole     = ADMIN_ROLES.includes(formData.role);
  const stationRequired = !isAdminRole;

  // Group stations alphabetically by county for <optgroup>
  const stationsByCounty = stations.reduce<Record<string, Station[]>>((acc, s) => {
    if (!acc[s.county]) acc[s.county] = [];
    acc[s.county].push(s);
    return acc;
  }, {});

  // ─── Form submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (stationRequired && !formData.stationId) {
      setError('Please select a police station.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:       formData.email,
          password:    formData.password,
          name:        formData.name,
          role:        formData.role,
          badgeNumber: formData.badgeNumber  || null,
          stationId:   formData.stationId    || null,
          phoneNumber: formData.phoneNumber  || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Registration failed');

      setSuccess(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Success screen ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-600 mb-4">Your account has been created. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Kenya Police Service</h1>
          <p className="text-blue-200">Register for Digital Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Account</h2>

          {/* Form error */}
          {error && (
            <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Name + Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text" required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email" required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="officer@police.go.ke"
                />
              </div>
            </div>

            {/* Passwords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role + Badge */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    // Clear station when switching to an admin role
                    setFormData({
                      ...formData,
                      role: newRole,
                      stationId: ADMIN_ROLES.includes(newRole) ? '' : formData.stationId,
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {(Object.entries(ROLE_DISPLAY_NAMES) as [UserRole, string][]).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Badge Number</label>
                <input
                  type="text"
                  value={formData.badgeNumber}
                  onChange={(e) => setFormData({ ...formData, badgeNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="OFF001"
                />
              </div>
            </div>

            {/* Station + Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Police Station{stationRequired ? ' *' : ''}
                  {!stationRequired && (
                    <span className="text-xs text-gray-500 ml-1">(Optional for admins)</span>
                  )}
                </label>

                {/* Stations fetch error */}
                {stationsError ? (
                  <div className="flex items-center gap-2 px-4 py-3 border border-red-300 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-red-600 flex-1">{stationsError}</span>
                    <button
                      type="button"
                      onClick={fetchStations}
                      className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <select
                    required={stationRequired}
                    disabled={isAdminRole || loadingStations}
                    value={formData.stationId}
                    onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {loadingStations
                        ? 'Loading stations...'
                        : isAdminRole
                        ? 'Not required for this role'
                        : stations.length === 0
                        ? 'No stations available'
                        : '— Select a station —'}
                    </option>

                    {/* Stations grouped by county */}
                    {Object.entries(stationsByCounty)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([county, list]) => (
                        <optgroup key={county} label={`${county} County`}>
                          {list
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((station) => (
                              <option key={station.id} value={station.id}>
                                {station.name} — {station.subCounty}
                              </option>
                            ))}
                        </optgroup>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+254700000000"
                />
              </div>
            </div>

            {/* Admin notice */}
            {isAdminRole && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> You are registering as an administrator. This role has
                  elevated permissions and access to all system features. Station assignment is
                  optional for admin roles.
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || loadingStations}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:text-blue-700">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
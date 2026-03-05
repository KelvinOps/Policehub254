// src/app/(dashboard)/dashboard/personnel/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft, Edit, UserCheck, UserX, Shield, Mail, Phone,
  MapPin, BadgeCheck, Calendar, Clock, Briefcase, AlertCircle,
  ChevronRight, Star, RefreshCw, Camera,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OfficerDetail {
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  badgeNumber: string;
  phoneNumber?: string;
  isActive:    boolean;
  createdAt:   string;
  updatedAt:   string;
  stationId?:  string;
  avatar?:     string; // ✅ Added avatar
  station?: {
    id:        string;
    name:      string;
    code:      string;
    county:    string;
    subCounty?: string;
  };
  Case_Case_assignedToIdToUser?: {
    id:         string;
    caseNumber: string;
    title:      string;
    status:     string;
    priority:   string;
  }[];
}

interface CurrentUser {
  id:    string;
  role:  string;
  stationId?: string;
}

// ── Rank config ───────────────────────────────────────────────────────────────

const RANK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  SUPER_ADMIN:       { label: 'Super Admin',       color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  ADMIN:             { label: 'Admin',              color: 'text-red-700 dark:text-red-300',       bg: 'bg-red-100 dark:bg-red-900/30' },
  STATION_COMMANDER: { label: 'Station Commander',  color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  DETECTIVE:         { label: 'Detective',          color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-100 dark:bg-blue-900/30' },
  OFFICER:           { label: 'Police Officer',     color: 'text-green-700 dark:text-green-300',   bg: 'bg-green-100 dark:bg-green-900/30' },
  CONSTABLE:         { label: 'Constable',          color: 'text-teal-700 dark:text-teal-300',     bg: 'bg-teal-100 dark:bg-teal-900/30' },
  OCS:               { label: 'OCS',                color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  PUBLIC:            { label: 'Public',             color: 'text-gray-700 dark:text-gray-300',     bg: 'bg-gray-100 dark:bg-gray-700' },
};

const CASE_STATUS_COLORS: Record<string, string> = {
  OPEN:               'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  UNDER_INVESTIGATION:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PENDING_TRIAL:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  IN_COURT:           'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  CLOSED:             'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  DISMISSED:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW:      'bg-gray-100 text-gray-600',
  MEDIUM:   'bg-amber-100 text-amber-700',
  HIGH:     'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function OfficerProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [officer, setOfficer] = useState<OfficerDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setCurrentUser(d.user);
    });
  }, []);

  const loadOfficer = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${id}`);
      const data = await res.json();
      if (data.success) {
        setOfficer(data.data);
      } else {
        setError(data.error || 'Failed to load officer');
      }
    } catch {
      setError('Failed to load officer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOfficer(); }, [id]);

  const canManage = currentUser && ['SUPER_ADMIN', 'ADMIN', 'STATION_COMMANDER'].includes(currentUser.role);

  const toggleActive = async () => {
    if (!officer) return;
    if (!confirm(`${officer.isActive ? 'Deactivate' : 'Reactivate'} ${officer.name}?`)) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !officer.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setOfficer(prev => prev ? { ...prev, isActive: !prev.isActive } : prev);
      } else {
        alert(data.error || 'Update failed');
      }
    } catch {
      alert('Failed to update officer status');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
    </div>
  );

  if (error || !officer) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertCircle className="w-16 h-16 text-red-400" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{error || 'Officer not found'}</h2>
      <Link href="/dashboard/personnel"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to Personnel
      </Link>
    </div>
  );

  const rankCfg = RANK_CONFIG[officer.role] ?? RANK_CONFIG.PUBLIC;
  const initials = officer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/dashboard" className="hover:text-gray-700 dark:hover:text-gray-200">Dashboard</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/dashboard/personnel" className="hover:text-gray-700 dark:hover:text-gray-200">Personnel</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-white">{officer.name}</span>
      </nav>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600" />

        <div className="px-6 pb-6">
          {/* Avatar + actions row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-4">
            {/* Avatar - Updated to show actual image if available */}
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-700 shadow-lg border-4 border-white dark:border-gray-800 flex items-center justify-center shrink-0 overflow-hidden">
                {officer.avatar ? (
                  <img
                    src={officer.avatar}
                    alt={officer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{initials}</span>
                )}
              </div>
              <div className="mb-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{officer.name}</h1>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${rankCfg.bg} ${rankCfg.color}`}>
                    <Shield className="w-3 h-3 mr-1" /> {rankCfg.label}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${officer.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {officer.isActive ? <UserCheck className="w-3 h-3 mr-1" /> : <UserX className="w-3 h-3 mr-1" />}
                    {officer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={loadOfficer}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
              {canManage && (
                <>
                  <Link href={`/dashboard/personnel/${id}/edit`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors">
                    <Edit className="w-4 h-4" /> Edit
                  </Link>
                  <button onClick={toggleActive} disabled={toggling}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      officer.isActive
                        ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400'
                        : 'bg-green-100 hover:bg-green-200 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-400'
                    }`}>
                    {officer.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    {toggling ? 'Updating…' : officer.isActive ? 'Deactivate' : 'Reactivate'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick info strip */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <BadgeCheck className="w-5 h-5 shrink-0 text-blue-500" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Badge Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">#{officer.badgeNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
              <Mail className="w-5 h-5 shrink-0 text-blue-500" />
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                <p className="font-semibold text-gray-900 dark:text-white truncate">{officer.email}</p>
              </div>
            </div>
            {officer.phoneNumber && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Phone className="w-5 h-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{officer.phoneNumber}</p>
                </div>
              </div>
            )}
            {officer.avatar && (
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                <Camera className="w-5 h-5 shrink-0 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Photo</p>
                  <p className="font-semibold text-gray-900 dark:text-white">Uploaded</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rest of the component remains the same... */}
      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Station info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" /> Station Assignment
          </h2>
          {officer.station ? (
            <div className="space-y-2">
              <p className="font-semibold text-gray-900 dark:text-white text-lg">{officer.station.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Code: {officer.station.code}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {officer.station.county}
                {officer.station.subCounty && `, ${officer.station.subCounty}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic">No station assigned</p>
          )}
        </div>

        {/* Account dates */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" /> Account Details
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Joined</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(officer.createdAt).toLocaleDateString('en-KE', { dateStyle: 'long' })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Last Updated</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(officer.updatedAt).toLocaleDateString('en-KE', { dateStyle: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {/* Case stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-500" /> Case Load
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Assigned Cases</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {officer.Case_Case_assignedToIdToUser?.length ?? 0}
              </span>
            </div>
            {officer.Case_Case_assignedToIdToUser && officer.Case_Case_assignedToIdToUser.length > 0 && (
              <div className="pt-2 space-y-1">
                {(['OPEN', 'UNDER_INVESTIGATION', 'IN_COURT'] as const).map(s => {
                  const count = officer.Case_Case_assignedToIdToUser!.filter(c => c.status === s).length;
                  if (!count) return null;
                  return (
                    <div key={s} className="flex justify-between text-xs">
                      <span className="text-gray-500 dark:text-gray-400">{s.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned cases table */}
      {officer.Case_Case_assignedToIdToUser && officer.Case_Case_assignedToIdToUser.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white">Assigned Cases</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Case #</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Priority</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {officer.Case_Case_assignedToIdToUser.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-mono text-blue-600 dark:text-blue-400">{c.caseNumber}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-900 dark:text-white max-w-xs truncate">{c.title}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CASE_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[c.priority] ?? ''}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link href={`/dashboard/cases/${c.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
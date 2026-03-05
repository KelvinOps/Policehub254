// src/app/(dashboard)/dashboard/personnel/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Search, Filter, Plus, Eye, Edit, UserCheck,
  UserX, Shield, Star, ChevronLeft, ChevronRight,
  Phone, Mail, MapPin, RefreshCw, Download,
} from 'lucide-react';
import { UserRole } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Officer {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  badgeNumber: string;
  phone?:      string;
  isActive:    boolean;
  stationId?:  string;
  Station?: {
    id:        string;
    name:      string;
    code:      string;
    county:    string;
    subCounty?: string;
  };
}

interface CurrentUser {
  id:        string;
  role:      string;
  stationId?: string;
}

// ── Rank display config ───────────────────────────────────────────────────────

const RANK_CONFIG: Record<string, { label: string; color: string; bg: string; order: number }> = {
  SUPER_ADMIN:       { label: 'Super Admin',        color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30', order: 1 },
  ADMIN:             { label: 'Admin',               color: 'text-red-700 dark:text-red-300',       bg: 'bg-red-100 dark:bg-red-900/30',       order: 2 },
  STATION_COMMANDER: { label: 'Station Commander',   color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30', order: 3 },
  DETECTIVE:         { label: 'Detective',           color: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-100 dark:bg-blue-900/30',     order: 4 },
  OFFICER:           { label: 'Police Officer',      color: 'text-green-700 dark:text-green-300',   bg: 'bg-green-100 dark:bg-green-900/30',   order: 5 },
  CONSTABLE:         { label: 'Constable',           color: 'text-teal-700 dark:text-teal-300',     bg: 'bg-teal-100 dark:bg-teal-900/30',     order: 6 },
  OCS:               { label: 'OCS',                  color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-100 dark:bg-indigo-900/30', order: 7 },
  PUBLIC:            { label: 'Public',              color: 'text-gray-700 dark:text-gray-300',     bg: 'bg-gray-100 dark:bg-gray-700',        order: 8 },
};

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN','ADMIN','STATION_COMMANDER','OCS','DETECTIVE','OFFICER','CONSTABLE'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PersonnelPage() {
  const router = useRouter();

  const [officers,     setOfficers]     = useState<Officer[]>([]);
  const [currentUser,  setCurrentUser]  = useState<CurrentUser | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all'); // Changed default to 'all'
  const [showFilters,  setShowFilters]  = useState(false);
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [total,        setTotal]        = useState(0);

  // Auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.success) setCurrentUser(d.user); })
      .catch(console.error);
  }, []);

  const fetchOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add search params
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (countyFilter) params.set('county', countyFilter);
      
      // Add active filter to API call instead of client-side filtering
      if (activeFilter === 'active') params.set('isActive', 'true');
      if (activeFilter === 'inactive') params.set('isActive', 'false');
      
      params.set('page', page.toString());
      params.set('limit', '20');

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      if (data.success) {
        setOfficers(data.data);
        setTotalPages(data.pagination?.totalPages ?? 1);
        setTotal(data.pagination?.total ?? 0); // Use the total from API
      }
    } catch (err) {
      console.error('Failed to fetch officers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, countyFilter, activeFilter, page]);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  const canManage = currentUser && ['SUPER_ADMIN','ADMIN','STATION_COMMANDER'].includes(currentUser.role);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOfficers();
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (!confirm(`${current ? 'Deactivate' : 'Reactivate'} this officer?`)) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      const data = await res.json();
      if (data.success) fetchOfficers();
      else alert(data.error || 'Update failed');
    } catch {
      alert('Failed to update officer status');
    }
  };

  // ── Rank breakdown counts ──────────────────────────────────────────────────
  const rankCounts = ALL_ROLES.reduce<Record<string, number>>((acc, r) => {
    acc[r] = officers.filter(o => o.role === r).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Personnel</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {total.toLocaleString()} officer{total !== 1 ? 's' : ''} across all stations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchOfficers()}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <Link href="/dashboard/personnel/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
              <Plus className="w-4 h-4" /> Add Officer
            </Link>
          )}
        </div>
      </div>

      {/* Rank summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_ROLES.map(role => {
          const cfg = RANK_CONFIG[role];
          if (!cfg) return null; // Skip if config not found
          return (
            <button
              key={role}
              onClick={() => { setRoleFilter(roleFilter === role ? '' : role); setPage(1); }}
              className={`rounded-xl p-3 text-left border transition-all ${
                roleFilter === role
                  ? 'border-blue-400 ring-2 ring-blue-300 dark:ring-blue-700'
                  : 'border-gray-200 dark:border-gray-700'
              } ${cfg.bg}`}
            >
              <p className={`text-xs font-medium truncate ${cfg.color}`}>{cfg.label}</p>
              <p className={`text-2xl font-bold mt-1 ${cfg.color}`}>{rankCounts[role] ?? 0}</p>
            </button>
          );
        })}
      </div>

      {/* Search & filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, badge number, or email…"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors">
              <Filter className="w-4 h-4" /> Filters
            </button>
            <button type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
              Search
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Rank / Role</label>
                <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">All Ranks</option>
                  {ALL_ROLES.map(r => {
                    const cfg = RANK_CONFIG[r];
                    return cfg ? <option key={r} value={r}>{cfg.label}</option> : null;
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">County</label>
                <input type="text" value={countyFilter}
                  onChange={e => { setCountyFilter(e.target.value); setPage(1); }}
                  placeholder="e.g. Nairobi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Status</label>
                <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value as any); setPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="all">All</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Officers table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : officers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No officers found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Officer</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rank</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Station</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {officers.map(officer => {
                    const rankCfg = RANK_CONFIG[officer.role] ?? RANK_CONFIG.PUBLIC;
                    return (
                      <tr key={officer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        {/* Officer info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
                                {officer.name?.charAt(0).toUpperCase() ?? '?'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">{officer.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">#{officer.badgeNumber}</p>
                            </div>
                          </div>
                        </td>

                        {/* Rank badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${rankCfg.bg} ${rankCfg.color}`}>
                            {rankCfg.label}
                          </span>
                        </td>

                        {/* Station */}
                        <td className="px-5 py-4">
                          {officer.Station ? (
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{officer.Station.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {officer.Station.county}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No station</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[140px]">{officer.email}</span>
                            </p>
                            {officer.phone && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                <Phone className="w-3 h-3" /> {officer.phone}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            officer.isActive
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {officer.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {officer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/personnel/${officer.id}`)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => router.push(`/dashboard/personnel/${officer.id}/edit`)}
                                  className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleActive(officer.id, officer.isActive)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    officer.isActive
                                      ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                      : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                  }`}
                                  title={officer.isActive ? 'Deactivate' : 'Reactivate'}
                                >
                                  {officer.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
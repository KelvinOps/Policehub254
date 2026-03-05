// src/app/(dashboard)/dashboard/personnel/roster/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, Clock,
  Sun, Moon, Sunset, Users, MapPin, RefreshCw, Save, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Officer {
  id:          string;
  name:        string;
  badgeNumber: string;
  role:        string;
  stationId?:  string;
}

interface DutyEntry {
  id:          string;
  officerId:   string;
  officerName: string;
  badge:       string;
  date:        string;   // YYYY-MM-DD
  shift:       'MORNING' | 'AFTERNOON' | 'NIGHT';
  duty:        string;
  location:    string;
  notes?:      string;
}

interface CurrentUser {
  id:        string;
  role:      string;
  stationId?: string;
  name:      string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SHIFTS = {
  MORNING:   { label: 'Morning',   hours: '06:00 – 14:00', icon: Sun,    color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-800' },
  AFTERNOON: { label: 'Afternoon', hours: '14:00 – 22:00', icon: Sunset, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800' },
  NIGHT:     { label: 'Night',     hours: '22:00 – 06:00', icon: Moon,   color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800' },
};

const DUTIES = [
  'Patrol Duty', 'Desk Duty', 'Guard Duty', 'Investigations',
  'Traffic Control', 'VIP Escort', 'Community Policing',
  'Border Patrol', 'Court Duty', 'Training',
];

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // start of week (Sun)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

function toYMD(date: Date) {
  return date.toISOString().split('T')[0];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DutyRosterPage() {
  const [currentUser,  setCurrentUser]  = useState<CurrentUser | null>(null);
  const [officers,     setOfficers]     = useState<Officer[]>([]);
  const [duties,       setDuties]       = useState<DutyEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [weekStart,    setWeekStart]    = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [showModal,    setShowModal]    = useState(false);
  const [editEntry,    setEditEntry]    = useState<Partial<DutyEntry> | null>(null);
  const [saving,       setSaving]       = useState(false);

  const weekDates = getWeekDates(weekStart);

  // Auth
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.success) setCurrentUser(d.user);
    });
  }, []);

  // Fetch officers for this station
  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/users?limit=100`)
      .then(r => r.json())
      .then(d => { if (d.success) setOfficers(d.data); });
  }, [currentUser]);

  // Fetch duty roster — in production this would be a real API
  // For now we use localStorage as a simple store
  const loadDuties = useCallback(() => {
    setLoading(true);
    try {
      // In production: fetch('/api/duty-roster?from=...&to=...')
      const stored = sessionStorage.getItem('duty_roster');
      setDuties(stored ? JSON.parse(stored) : []);
    } catch {
      setDuties([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDuties(); }, [loadDuties, weekStart]);

  const saveDuties = (updated: DutyEntry[]) => {
    sessionStorage.setItem('duty_roster', JSON.stringify(updated));
    setDuties(updated);
  };

  const canManage = currentUser && ['SUPER_ADMIN','ADMIN','STATION_COMMANDER'].includes(currentUser.role);

  const openAdd = (date: string, shift: DutyEntry['shift']) => {
    setEditEntry({ date, shift, duty: 'Patrol Duty', location: '' });
    setShowModal(true);
  };

  const openEdit = (entry: DutyEntry) => {
    setEditEntry({ ...entry });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editEntry?.officerId || !editEntry.date || !editEntry.shift || !editEntry.duty) {
      alert('Please fill in all required fields');
      return;
    }
    setSaving(true);

    const officer = officers.find(o => o.id === editEntry.officerId);
    const entry: DutyEntry = {
      id:          editEntry.id || `duty-${Date.now()}`,
      officerId:   editEntry.officerId!,
      officerName: officer?.name ?? '',
      badge:       officer?.badgeNumber ?? '',
      date:        editEntry.date!,
      shift:       editEntry.shift!,
      duty:        editEntry.duty!,
      location:    editEntry.location || '',
      notes:       editEntry.notes,
    };

    const updated = editEntry.id
      ? duties.map(d => d.id === entry.id ? entry : d)
      : [...duties, entry];

    saveDuties(updated);
    setShowModal(false);
    setEditEntry(null);
    setSaving(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Remove this duty assignment?')) return;
    saveDuties(duties.filter(d => d.id !== id));
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const todayYMD = toYMD(new Date());

  // Duties for a given cell
  const cellDuties = (date: string, shift: DutyEntry['shift']) =>
    duties.filter(d => d.date === date && d.shift === shift);

  // Summary stats for the week
  const weekStr   = weekDates.map(toYMD);
  const weekDuties = duties.filter(d => weekStr.includes(d.date));
  const officersOnDuty = new Set(weekDuties.map(d => d.officerId)).size;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Duty Roster</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Weekly shift scheduling and assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadDuties}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <button
              onClick={() => { setEditEntry({ shift: 'MORNING', duty: 'Patrol Duty', date: todayYMD, location: '' }); setShowModal(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
              <Plus className="w-4 h-4" /> Add Assignment
            </button>
          )}
        </div>
      </div>

      {/* Week summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Assignments This Week', value: weekDuties.length, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Officers on Duty',       value: officersOnDuty,   color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-900/20' },
          { label: 'Morning Shifts',  value: weekDuties.filter(d => d.shift === 'MORNING').length,   color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Night Shifts',    value: weekDuties.filter(d => d.shift === 'NIGHT').length,     color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{s.label}</p>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-4">
        <button onClick={prevWeek}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">
            {weekDates[0].toLocaleDateString('en-KE', { day: 'numeric', month: 'long' })} –{' '}
            {weekDates[6].toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <button onClick={() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); setWeekStart(d); }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium mt-0.5">
            Jump to current week
          </button>
        </div>
        <button onClick={nextWeek}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Roster grid */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Day headers */}
        <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
          <div className="px-3 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
            Shift
          </div>
          {weekDates.map((date, i) => {
            const ymd     = toYMD(date);
            const isToday = ymd === todayYMD;
            return (
              <div key={i} className={`px-3 py-3 text-center border-l border-gray-200 dark:border-gray-700 ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                <p className={`text-xs font-medium uppercase ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>{DAYS[i]}</p>
                <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>{date.getDate()}</p>
                {isToday && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mx-auto mt-1" />}
              </div>
            );
          })}
        </div>

        {/* Shift rows */}
        {(Object.keys(SHIFTS) as Array<keyof typeof SHIFTS>).map(shift => {
          const cfg  = SHIFTS[shift];
          const Icon = cfg.icon;
          return (
            <div key={shift} className={`grid grid-cols-8 border-b border-gray-200 dark:border-gray-700 last:border-b-0 min-h-[120px]`}>
              {/* Shift label */}
              <div className={`p-3 border-r border-gray-200 dark:border-gray-700 ${cfg.bg}`}>
                <div className={`flex items-center gap-1.5 ${cfg.color} mb-1`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{cfg.hours}</p>
              </div>

              {/* Day cells */}
              {weekDates.map((date, di) => {
                const ymd      = toYMD(date);
                const isToday  = ymd === todayYMD;
                const assigned = cellDuties(ymd, shift);
                return (
                  <div key={di}
                    className={`p-2 border-l border-gray-200 dark:border-gray-700 ${isToday ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                    <div className="space-y-1">
                      {assigned.map(entry => (
                        <div key={entry.id}
                          onClick={() => canManage && openEdit(entry)}
                          className={`rounded p-1.5 text-xs ${cfg.bg} ${cfg.border} border cursor-${canManage ? 'pointer' : 'default'} hover:opacity-80 transition-opacity`}>
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{entry.officerName}</p>
                          <p className="text-gray-500 dark:text-gray-400 truncate">{entry.duty}</p>
                          {entry.location && (
                            <p className="text-gray-400 flex items-center gap-0.5 truncate">
                              <MapPin className="w-2.5 h-2.5" />{entry.location}
                            </p>
                          )}
                          {canManage && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                              className="mt-1 text-red-500 hover:text-red-700 text-xs">
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      {canManage && (
                        <button
                          onClick={() => openAdd(ymd, shift)}
                          className="w-full rounded border border-dashed border-gray-300 dark:border-gray-600 p-1 text-xs text-gray-400 hover:text-blue-600 hover:border-blue-400 transition-colors flex items-center justify-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && editEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editEntry.id ? 'Edit Assignment' : 'Add Duty Assignment'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditEntry(null); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Officer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Officer *</label>
                <select value={editEntry.officerId ?? ''}
                  onChange={e => setEditEntry(p => ({ ...p, officerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="">Select officer…</option>
                  {officers.map(o => (
                    <option key={o.id} value={o.id}>{o.name} (#{o.badgeNumber})</option>
                  ))}
                </select>
              </div>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date *</label>
                <input type="date" value={editEntry.date ?? ''}
                  onChange={e => setEditEntry(p => ({ ...p, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Shift */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Shift *</label>
                <select value={editEntry.shift ?? ''}
                  onChange={e => setEditEntry(p => ({ ...p, shift: e.target.value as DutyEntry['shift'] }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                  {Object.entries(SHIFTS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} ({v.hours})</option>
                  ))}
                </select>
              </div>
              {/* Duty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Duty *</label>
                <select value={editEntry.duty ?? ''}
                  onChange={e => setEditEntry(p => ({ ...p, duty: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500">
                  {DUTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Location / Beat</label>
                <input type="text" value={editEntry.location ?? ''}
                  onChange={e => setEditEntry(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. CBD Zone A, Gate 2…"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <textarea value={editEntry.notes ?? ''} rows={2}
                  onChange={e => setEditEntry(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional notes…"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => { setShowModal(false); setEditEntry(null); }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
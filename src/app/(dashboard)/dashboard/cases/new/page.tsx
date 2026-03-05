// src/app/(dashboard)/dashboard/cases/new/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Link as LinkIcon, Info } from 'lucide-react';
import { IncidentCategory, UserRole } from '@prisma/client';
import { getCasePermissions } from '@/lib/auth/case-permissions';
import { getSuggestedPriority } from '@/lib/constants/case';
import { OBEntryPicker } from '@/components/occurrence-book/OBEntryPicker';
import type { SessionUser } from '@/types/case';
import { Suspense } from 'react';

interface Station { id: string; name: string; code: string }
interface Officer { id: string; name: string; badgeNumber: string }

interface LinkedOBEntry {
  id: string;
  obNumber: string;
  incidentDate: string;
  category: IncidentCategory;
  description: string;
  location: string;
  reportedBy: string;
  stationId?: string;
  Station: { id?: string; name: string; code: string };
}

function toSessionUser(user: Record<string, unknown>): SessionUser {
  return {
    id:          (user.id          as string)   ?? '',
    email:       (user.email       as string)   ?? '',
    role:        (user.role        as UserRole) ?? UserRole.OFFICER,
    stationId:   (user.stationId   as string | undefined),
    badgeNumber: (user.badgeNumber as string | undefined),
  };
}

function NewCasePageContent() {
  const router    = useRouter();
  const urlParams = useSearchParams();

  const [sessionUser,       setSessionUser]      = useState<SessionUser | null>(null);
  const [authLoading,       setAuthLoading]      = useState(true);
  const [loading,           setLoading]          = useState(false);
  const [stations,          setStations]         = useState<Station[]>([]);
  const [officers,          setOfficers]         = useState<Officer[]>([]);
  const [linkedOBEntry,     setLinkedOBEntry]    = useState<LinkedOBEntry | null>(null);
  const [autoFilledFields,  setAutoFilledFields] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    title:        '',
    description:  '',
    category:     '' as IncidentCategory | '',
    priority:     'MEDIUM',
    stationId:    '',
    assignedToId: '',
    obEntryId:    '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const res  = await fetch('/api/auth/me');
        if (!res.ok) { router.replace('/login?reason=unauthorized'); return; }

        const data = await res.json();
        if (!data.success || !data.user) { router.replace('/login?reason=unauthorized'); return; }

        const user        = toSessionUser(data.user);
        const permissions = getCasePermissions(user);

        if (!permissions.canCreate) {
          alert('You do not have permission to create cases');
          router.push('/dashboard/cases');
          return;
        }

        setSessionUser(user);
        loadStations();

        if (!permissions.canAccessAllCases && user.stationId) {
          setFormData(prev => ({ ...prev, stationId: user.stationId! }));
        }

        const preloadId = urlParams.get('obEntryId');
        if (preloadId) fetchAndPreloadOBEntry(preloadId);

      } catch {
        router.replace('/login');
      } finally {
        setAuthLoading(false);
      }
    };

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (formData.stationId) loadOfficers(formData.stationId);
  }, [formData.stationId]);

  useEffect(() => {
    if (formData.category) {
      setFormData(prev => ({
        ...prev,
        priority: getSuggestedPriority(formData.category as IncidentCategory),
      }));
    }
  }, [formData.category]);

  const loadStations = async () => {
    try {
      const res  = await fetch('/api/stations');
      const data = await res.json();
      if (data.success) setStations(data.data);
    } catch (err) { console.error('Failed to load stations:', err); }
  };

  const loadOfficers = async (stationId: string) => {
    try {
      const res  = await fetch(`/api/users?stationId=${stationId}&role=DETECTIVE,OFFICER,CONSTABLE`);
      const data = await res.json();
      if (data.success) setOfficers(data.data);
    } catch (err) { console.error('Failed to load officers:', err); }
  };

  const fetchAndPreloadOBEntry = async (obEntryId: string) => {
    try {
      const res  = await fetch(`/api/occurrence-book/${obEntryId}`);
      const data = await res.json();
      if (data.success) handleOBEntrySelect(data.data);
    } catch (err) { console.error('Failed to preload OB entry:', err); }
  };

  const handleOBEntrySelect = (entry: LinkedOBEntry) => {
    setLinkedOBEntry(entry);

    const filled  = new Set<string>();
    const updates: Partial<typeof formData> = { obEntryId: entry.id };

    if (!formData.category && entry.category) {
      updates.category = entry.category;
      filled.add('category');
    }
    if (!formData.description) {
      updates.description =
        `Incident reported on ${new Date(entry.incidentDate).toLocaleDateString('en-KE', {
          day: 'numeric', month: 'long', year: 'numeric',
        })} at ${entry.location}.\n\n` +
        `Original OB Report (${entry.obNumber}):\n${entry.description}`;
      filled.add('description');
    }
    if (!formData.title) {
      updates.title = `${String(entry.category).replace(/_/g, ' ')} – ${entry.location}`;
      filled.add('title');
    }

    const entryStationId = entry.stationId ?? entry.Station?.id;
    if (sessionUser) {
      const perms = getCasePermissions(sessionUser);
      if (!formData.stationId && entryStationId && perms.canAccessAllCases) {
        updates.stationId = entryStationId;
        filled.add('stationId');
      }
    }

    setAutoFilledFields(filled);
    setFormData(prev => ({ ...prev, ...updates }));
    setErrors(prev => {
      const next = { ...prev };
      filled.forEach(f => delete next[f]);
      return next;
    });
  };

  const handleOBEntryClear = () => {
    setLinkedOBEntry(null);
    setFormData(prev => {
      const updates: Partial<typeof formData> = { obEntryId: '' };
      if (autoFilledFields.has('category'))    updates.category    = '';
      if (autoFilledFields.has('description')) updates.description = '';
      if (autoFilledFields.has('title'))       updates.title       = '';
      if (autoFilledFields.has('stationId'))   updates.stationId   = '';
      return { ...prev, ...updates };
    });
    setAutoFilledFields(new Set());
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim())       errs.title       = 'Case title is required';
    if (!formData.description.trim()) errs.description = 'Case description is required';
    if (!formData.category)           errs.category    = 'Case category is required';
    if (!formData.stationId)          errs.stationId   = 'Station is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      const res = await fetch('/api/cases', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...formData,
          assignedToId: formData.assignedToId || undefined,
          obEntryId:    formData.obEntryId    || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/dashboard/cases');  // ← redirect to list until detail page is built
      } else {
        alert(data.error || 'Failed to create case');
      }
    } catch {
      alert('An error occurred while creating the case');
    } finally {
      setLoading(false);
    }
  };

  const permissions = getCasePermissions(
    sessionUser ?? { id: '', email: '', role: UserRole.PUBLIC }
  );

  const isAuto    = (f: string) => autoFilledFields.has(f);
  const clearAuto = (f: string) =>
    setAutoFilledFields(prev => { const s = new Set(prev); s.delete(f); return s; });

  const fieldCls = (hasErr: boolean, auto: boolean) =>
    [
      'w-full px-4 py-2 border rounded-lg text-gray-900 dark:text-white',
      'focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors',
      hasErr ? 'border-red-500 bg-white dark:bg-gray-700'
        : auto ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10'
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700',
    ].join(' ');

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create New Case</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Fill in the details to create a new investigation case
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* OB Entry linker */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-1">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Link to Occurrence Book Entry
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">(optional)</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Search for an OB entry to link this case to. Category, description, and station
            will be auto-populated from the selected entry.
          </p>
          <OBEntryPicker
            selectedEntry={linkedOBEntry}
            onSelect={handleOBEntrySelect}
            onClear={handleOBEntryClear}
          />
        </div>

        {/* Main fields */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Case Title *{isAuto('title') && <AutoBadge />}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => { setFormData(p => ({ ...p, title: e.target.value })); clearAuto('title'); }}
              className={fieldCls(!!errors.title, isAuto('title'))}
              placeholder="Enter a brief, descriptive title for the case"
            />
            {errors.title && <FieldError msg={errors.title} />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Category *{isAuto('category') && <AutoBadge />}
            </label>
            <select
              value={formData.category}
              onChange={e => {
                setFormData(p => ({ ...p, category: e.target.value as IncidentCategory }));
                clearAuto('category');
              }}
              className={fieldCls(!!errors.category, isAuto('category'))}
            >
              <option value="">Select category</option>
              {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {errors.category && <FieldError msg={errors.category} />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={e => setFormData(p => ({ ...p, priority: e.target.value }))}
              className={fieldCls(false, false)}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Auto-suggested from category — can be changed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Description *{isAuto('description') && <AutoBadge />}
            </label>
            {isAuto('description') && (
              <div className="flex items-start gap-2 mb-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                Pre-filled from OB entry — edit to add case-specific investigation details.
              </div>
            )}
            <textarea
              value={formData.description}
              onChange={e => { setFormData(p => ({ ...p, description: e.target.value })); clearAuto('description'); }}
              rows={6}
              className={fieldCls(!!errors.description, isAuto('description'))}
              placeholder="Detailed description of the case and relevant circumstances"
            />
            {errors.description && <FieldError msg={errors.description} />}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Station *{isAuto('stationId') && <AutoBadge />}
            </label>
            <select
              value={formData.stationId}
              onChange={e => { setFormData(p => ({ ...p, stationId: e.target.value })); clearAuto('stationId'); }}
              disabled={!permissions.canAccessAllCases}
              className={`${fieldCls(!!errors.stationId, isAuto('stationId'))} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <option value="">Select station</option>
              {stations.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            {errors.stationId && <FieldError msg={errors.stationId} />}
          </div>

          {permissions.canAssign && (
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Assign To (Optional)
              </label>
              <select
                value={formData.assignedToId}
                onChange={e => setFormData(p => ({ ...p, assignedToId: e.target.value }))}
                disabled={!formData.stationId}
                className={`${fieldCls(false, false)} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <option value="">Select officer</option>
                {officers.map(o => (
                  <option key={o.id} value={o.id}>{o.name} ({o.badgeNumber})</option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You can assign an officer now or later
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
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
            {loading ? 'Creating…' : 'Create Case'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewCasePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
      </div>
    }>
      <NewCasePageContent />
    </Suspense>
  );
}

function AutoBadge() {
  return (
    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
      auto-filled
    </span>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
      <AlertCircle className="w-4 h-4" />
      {msg}
    </p>
  );
}

const CATEGORIES: [string, string][] = [
  ['THEFT',            'Theft'],
  ['ROBBERY',          'Robbery'],
  ['ASSAULT',          'Assault'],
  ['MURDER',           'Murder'],
  ['RAPE',             'Rape'],
  ['DOMESTIC_VIOLENCE','Domestic Violence'],
  ['FRAUD',            'Fraud'],
  ['BURGLARY',         'Burglary'],
  ['TRAFFIC_ACCIDENT', 'Traffic Accident'],
  ['KIDNAPPING',       'Kidnapping'],
  ['DRUG_RELATED',     'Drug Related'],
  ['CYBERCRIME',       'Cybercrime'],
  ['CORRUPTION',       'Corruption'],
  ['MISSING_PERSON',   'Missing Person'],
  ['SEXUAL_HARASSMENT','Sexual Harassment'],
  ['OTHER',            'Other'],
];
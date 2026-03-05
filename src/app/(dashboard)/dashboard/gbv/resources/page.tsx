// src/app/dashboard/gbv/resources/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, Search, Phone, Mail, Globe, MapPin, Plus,
  RefreshCw, Home, Scale, Users, Radio, AlertCircle,
  Building, X, Loader2, CheckCircle,
} from 'lucide-react';
import type { GBVResource, SupportResourceType } from '@/types/gbv';
import { SUPPORT_RESOURCE_LABELS } from '@/types/gbv';

// ── Icon + colour maps ────────────────────────────────────────────────────────
type IconComponent = React.ElementType;

const TYPE_ICONS: Record<SupportResourceType, IconComponent> = {
  SHELTER:    Home,
  LEGAL_AID:  Scale,
  MEDICAL:    AlertCircle,
  COUNSELING: Heart,
  POLICE:     Building,
  NGO:        Users,
  HOTLINE:    Phone,
};

const TYPE_COLOR: Record<SupportResourceType, string> = {
  SHELTER:    'blue',
  LEGAL_AID:  'purple',
  MEDICAL:    'red',
  COUNSELING: 'pink',
  POLICE:     'indigo',
  NGO:        'green',
  HOTLINE:    'orange',
};

// ── Hard-coded Kenya GBV resources (always shown, no DB required) ─────────────
const BUILTIN: Omit<GBVResource, 'createdAt' | 'updatedAt'>[] = [
  {
    id: '__b1', name: 'National GBV Hotline', type: 'HOTLINE',
    phone: '1195', county: 'National',
    description: '24/7 free & confidential GBV support hotline — call from any network.',
    isActive: true,
  },
  {
    id: '__b2', name: 'FIDA Kenya', type: 'LEGAL_AID',
    phone: '0719-638-006', email: 'fida@fidakenya.org',
    website: 'https://www.fidakenya.org', county: 'Nairobi',
    description: 'Free legal aid and court representation for GBV survivors.',
    isActive: true,
  },
  {
    id: '__b3', name: 'Nairobi Women\'s Hospital GBV Centre', type: 'MEDICAL',
    phone: '0719-638-006', county: 'Nairobi',
    description: 'Comprehensive medical care, counselling and legal support for GBV survivors.',
    isActive: true,
  },
  {
    id: '__b4', name: 'Childline Kenya', type: 'HOTLINE',
    phone: '116', county: 'National',
    description: 'Free 24/7 child abuse & protection hotline accessible from any phone.',
    isActive: true,
  },
  {
    id: '__b5', name: 'Wangu Kanja Foundation', type: 'COUNSELING',
    phone: '0722-517-285', county: 'Nairobi',
    description: 'Psychosocial support and trauma counselling for GBV survivors.',
    isActive: true,
  },
  {
    id: '__b6', name: 'GENDER LINKS Kenya', type: 'NGO',
    phone: '0722-259-782', county: 'Nairobi',
    description: 'GBV prevention advocacy and survivor support programs.',
    isActive: true,
  },
  {
    id: '__b7', name: 'Kenya Women & Children Shelter', type: 'SHELTER',
    phone: '0800-720-093', county: 'Nairobi',
    description: 'Safe refuge accommodation for GBV survivors and their children.',
    isActive: true,
  },
];

const DEFAULT_FORM = {
  name: '', type: 'SHELTER' as SupportResourceType,
  county: '', subCounty: '', address: '', phone: '', email: '', website: '', description: '',
};

export default function GBVResourcesPage() {
  const [dbResources,  setDbResources]  = useState<GBVResource[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [typeFilter,   setTypeFilter]   = useState<SupportResourceType | ''>('');
  const [countyFilter, setCountyFilter] = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [form,         setForm]         = useState(DEFAULT_FORM);
  const [formSaving,   setFormSaving]   = useState(false);
  const [formError,    setFormError]    = useState('');
  const [formSuccess,  setFormSuccess]  = useState(false);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter)   p.set('type',   typeFilter);
      if (countyFilter) p.set('county', countyFilter);
      if (search)       p.set('search', search);
      const res  = await fetch(`/api/gbv/resources?${p}`);
      const data = await res.json();
      if (data.success) setDbResources(data.data ?? []);
    } catch { /* silent – built-ins still show */ }
    finally { setLoading(false); }
  }, [search, typeFilter, countyFilter]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // Merge built-ins + DB resources, apply client-side filter
  const allResources = [
    ...BUILTIN.filter(r =>
      r.isActive &&
      (!typeFilter   || r.type === typeFilter) &&
      (!countyFilter || r.county === 'National' ||
        r.county?.toLowerCase().includes(countyFilter.toLowerCase())) &&
      (!search || r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase()))
    ),
    ...dbResources,
  ];

  // Count per type across both sources
  const typeCounts = (Object.keys(SUPPORT_RESOURCE_LABELS) as SupportResourceType[]).reduce(
    (acc, t) => ({ ...acc, [t]: allResources.filter(r => r.type === t).length }),
    {} as Record<SupportResourceType, number>,
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    setFormSaving(true); setFormError('');
    try {
      const res  = await fetch('/api/gbv/resources', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { setFormError(data.error ?? 'Failed to add'); return; }
      setFormSuccess(true);
      setTimeout(() => {
        setShowAdd(false);
        setForm(DEFAULT_FORM);
        setFormSuccess(false);
        fetchResources();
      }, 1000);
    } catch { setFormError('Network error'); }
    finally { setFormSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Link href="/dashboard/gbv" className="hover:text-gray-600 dark:hover:text-gray-300">GBV</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Support Resources</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Heart className="w-7 h-7 text-rose-600" />
            GBV Support Resources
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Kenya directory — shelters, legal aid, counselling, hotlines
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchResources}
            className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition-colors text-sm">
            <Plus className="w-4 h-4" /> Add Resource
          </button>
        </div>
      </div>

      {/* ── Emergency banner ── */}
      <div className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-xl">
        <Radio className="w-5 h-5 text-red-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            Emergency GBV Hotline:{' '}
            <a href="tel:1195" className="text-xl hover:underline">1195</a>
            {' '}— Free · 24/7 · Confidential
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
            Available nationwide. Call immediately for urgent GBV situations.
          </p>
        </div>
        <a href="tel:1195"
          className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors">
          Call 1195
        </a>
      </div>

      {/* ── Type filter chips ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {(Object.entries(SUPPORT_RESOURCE_LABELS) as [SupportResourceType, string][]).map(([type, label]) => {
          const Icon    = TYPE_ICONS[type];
          const color   = TYPE_COLOR[type];
          const count   = typeCounts[type] ?? 0;
          const active  = typeFilter === type;
          return (
            <button key={type} onClick={() => setTypeFilter(active ? '' : type)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                active
                  ? `border-${color}-400 bg-${color}-50 dark:bg-${color}-900/20`
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
              <Icon className={`w-5 h-5 mb-1 ${active ? `text-${color}-600` : 'text-gray-400'}`} />
              <p className={`text-xs font-semibold leading-tight ${active ? `text-${color}-600` : 'text-gray-600 dark:text-gray-400'}`}>
                {label}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{count}</p>
            </button>
          );
        })}
      </div>

      {/* ── Search + county filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search resources by name or description..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
        <input
          type="text" value={countyFilter} onChange={e => setCountyFilter(e.target.value)}
          placeholder="Filter by county..."
          className="sm:w-44 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
        />
        {(search || typeFilter || countyFilter) && (
          <button
            onClick={() => { setSearch(''); setTypeFilter(''); setCountyFilter(''); }}
            className="px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
            Clear filters
          </button>
        )}
      </div>

      {/* ── Resource cards ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-rose-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allResources.map(r => {
            const Icon  = TYPE_ICONS[r.type];
            const color = TYPE_COLOR[r.type];
            const builtIn = r.id.startsWith('__');
            return (
              <div key={r.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border p-5 hover:shadow-md transition-all
                  ${builtIn
                    ? 'border-gray-200 dark:border-gray-700'
                    : 'border-dashed border-gray-300 dark:border-gray-600'
                  }`}>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className={`p-2 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg shrink-0`}>
                    <Icon className={`w-5 h-5 text-${color}-600`} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {builtIn && (
                      <span className="text-xs font-medium px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded">
                        Official
                      </span>
                    )}
                    <span className={`text-xs font-semibold px-2 py-0.5 bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 rounded-full`}>
                      {SUPPORT_RESOURCE_LABELS[r.type]}
                    </span>
                  </div>
                </div>

                <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 leading-snug">
                  {r.name}
                </h3>
                {r.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed line-clamp-2">
                    {r.description}
                  </p>
                )}

                <div className="space-y-1.5 mt-auto">
                  {r.county && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{r.county}{r.subCounty ? ` / ${r.subCounty}` : ''}</span>
                    </div>
                  )}
                  {r.address && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{r.address}</span>
                    </div>
                  )}
                  {r.phone && (
                    <a href={`tel:${r.phone}`}
                      className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {r.phone}
                    </a>
                  )}
                  {r.email && (
                    <a href={`mailto:${r.email}`}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 truncate">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {r.email}
                    </a>
                  )}
                  {r.website && (
                    <a href={r.website} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700">
                      <Globe className="w-3.5 h-3.5 shrink-0" />
                      Visit website
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {allResources.length === 0 && !loading && (
            <div className="col-span-3 text-center py-16 text-gray-400">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No resources found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new resource.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Add Resource Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-2xl z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Support Resource</h3>
              <button onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM); setFormError(''); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Organization Name <span className="text-red-500">*</span>
                </label>
                <input type="text" required value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Wangu Kanja Foundation"
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Resource Type <span className="text-red-500">*</span>
                </label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SupportResourceType }))}
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none">
                  {Object.entries(SUPPORT_RESOURCE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {[
                { key: 'county',    label: 'County',   ph: 'e.g. Nairobi'          },
                { key: 'subCounty', label: 'Sub-county',ph: 'e.g. Westlands'       },
                { key: 'address',   label: 'Address',   ph: 'Street or building'   },
                { key: 'phone',     label: 'Phone',     ph: 'e.g. 0722-000-000'    },
                { key: 'email',     label: 'Email',     ph: 'info@example.org'     },
                { key: 'website',   label: 'Website',   ph: 'https://example.org'  },
              ].map(({ key, label, ph }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                  <input type="text" placeholder={ph} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Brief description of services offered..."
                  className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowAdd(false); setForm(DEFAULT_FORM); setFormError(''); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formSaving || formSuccess || !form.name.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors min-w-[120px] justify-center">
                  {formSuccess
                    ? <><CheckCircle className="w-4 h-4" /> Saved!</>
                    : formSaving
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                      : <><Plus className="w-4 h-4" /> Add Resource</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
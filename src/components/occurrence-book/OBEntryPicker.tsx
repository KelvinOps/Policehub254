'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, FileText, MapPin, Calendar, Loader2, Link } from 'lucide-react';
import { IncidentCategory } from '@prisma/client';
import { getCategoryLabel } from '@/lib/constants/occurrence-book';

interface OBEntry {
  id: string;
  obNumber: string;
  incidentDate: string;
  category: IncidentCategory;
  description: string;
  location: string;
  reportedBy: string;
  Station: { name: string; code: string; id?: string };
  stationId?: string;
}

interface OBEntryPickerProps {
  onSelect: (entry: OBEntry) => void;
  onClear: () => void;
  selectedEntry: OBEntry | null;
}

export function OBEntryPicker({ onSelect, onClear, selectedEntry }: OBEntryPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OBEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/occurrence-book/search?search=${encodeURIComponent(term)}&limit=10`
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.data || []);
        setOpen(true);
      }
    } catch (err) {
      console.error('OB search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (entry: OBEntry) => {
    onSelect(entry);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  if (selectedEntry) {
    return (
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Link className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              {selectedEntry.obNumber}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
              {getCategoryLabel(selectedEntry.category)}
            </span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
            {selectedEntry.description}
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {selectedEntry.location}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(selectedEntry.incidentDate).toLocaleDateString('en-KE', {
                day: 'numeric', month: 'short', year: 'numeric'
              })}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0"
          title="Remove link"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        )}
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search by OB number, description, or location…"
          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => handleSelect(entry)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {entry.obNumber}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                  {getCategoryLabel(entry.category)}
                </span>
                <span className="text-xs text-gray-400 ml-auto shrink-0">
                  {entry.Station?.name}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate pl-5">
                {entry.description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 pl-5 mt-0.5">
                <MapPin className="w-3 h-3" />
                {entry.location}
              </p>
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          No OB entries found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
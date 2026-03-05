// src/components/criminals/FingerprintSummaryBadge.tsx
//
// Usage — drop into your criminal detail page [id]/page.tsx:
//
//   import FingerprintSummaryBadge from '@/components/criminals/FingerprintSummaryBadge';
//   <FingerprintSummaryBadge criminalId={criminal.id} />
//
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertTriangle, ChevronRight } from 'lucide-react';

interface FingerprintRecord {
  id: string;
  title: string; // stores fingerType key e.g. "RIGHT_THUMB"
  type: string;
}

const FINGER_SLOTS = [
  { key: 'RIGHT_THUMB',  short: 'RT', label: 'Right Thumb'  },
  { key: 'RIGHT_INDEX',  short: 'RI', label: 'Right Index'  },
  { key: 'RIGHT_MIDDLE', short: 'RM', label: 'Right Middle' },
  { key: 'RIGHT_RING',   short: 'RR', label: 'Right Ring'   },
  { key: 'RIGHT_PINKY',  short: 'RP', label: 'Right Pinky'  },
  { key: 'LEFT_THUMB',   short: 'LT', label: 'Left Thumb'   },
  { key: 'LEFT_INDEX',   short: 'LI', label: 'Left Index'   },
  { key: 'LEFT_MIDDLE',  short: 'LM', label: 'Left Middle'  },
  { key: 'LEFT_RING',    short: 'LR', label: 'Left Ring'    },
  { key: 'LEFT_PINKY',   short: 'LP', label: 'Left Pinky'   },
];

interface Props {
  criminalId: string;
}

export default function FingerprintSummaryBadge({ criminalId }: Props) {
  const [capturedKeys, setCapturedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/criminals/${criminalId}/fingerprints`);
        const data = await res.json();
        if (data.success) {
          setCapturedKeys(
            new Set((data.data as FingerprintRecord[]).map((fp) => fp.title))
          );
        }
      } catch (err) {
        console.error('Error loading fingerprint summary:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [criminalId]);

  const count = capturedKeys.size;
  const complete = count === 10;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Fingerprints
          </h3>

          {!loading && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                complete
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : count >= 5
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : count > 0
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {complete && <CheckCircle className="w-3 h-3" />}
              {count > 0 && !complete && <AlertTriangle className="w-3 h-3" />}
              {count}/10
            </span>
          )}
        </div>

        <Link
          href={`/dashboard/criminals/${criminalId}/fingerprints`}
          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          Manage <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* ── Loading skeleton ── */}
      {loading ? (
        <div className="flex gap-1.5">
          {FINGER_SLOTS.map((s) => (
            <div
              key={s.key}
              className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* ── Mini finger strip ── */}
          <div className="flex gap-1.5 mb-3">
            {FINGER_SLOTS.map((slot) => {
              const captured = capturedKeys.has(slot.key);
              return (
                <Link
                  key={slot.key}
                  href={`/dashboard/criminals/${criminalId}/fingerprints`}
                  title={slot.label}
                  className={`
                    flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors text-center
                    ${
                      captured
                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      captured ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-500'
                    }`}
                  />
                  <span
                    className={`text-[9px] font-bold leading-none ${
                      captured
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {slot.short}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* ── Progress bar ── */}
          <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                complete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(count / 10) * 100}%` }}
            />
          </div>

          {/* ── Caption ── */}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
            {complete
              ? 'All 10 fingerprints captured'
              : count === 0
              ? 'No fingerprints captured yet — click Manage to add'
              : `${10 - count} finger${10 - count !== 1 ? 's' : ''} remaining`}
          </p>
        </>
      )}
    </div>
  );
}
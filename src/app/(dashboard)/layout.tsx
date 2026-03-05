'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Bell, Search, LogOut, AlertTriangle } from 'lucide-react';

// ─── Inactivity settings ──────────────────────────────────────────────────────
const INACTIVITY_MS = 15 * 60 * 1000;   // 15 min → auto logout
const WARNING_MS    =  2 * 60 * 1000;   // show warning 2 min before

interface UserData {
  id:          string;
  name:        string;
  email:       string;
  role:        string;
  stationId?:  string;
  station?:    { name: string };
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [authState,    setAuthState]    = useState<AuthState>('loading');
  const [user,         setUser]         = useState<UserData | null>(null);
  const [showWarning,  setShowWarning]  = useState(false);
  const [secondsLeft,  setSecondsLeft]  = useState(0);

  const inactivityRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef    = useRef<NodeJS.Timeout | null>(null);
  const countdownRef  = useRef<NodeJS.Timeout | null>(null);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async (reason = '') => {
    // Clear all timers first
    [inactivityRef, warningRef].forEach(r => { if (r.current) clearTimeout(r.current); });
    if (countdownRef.current) clearInterval(countdownRef.current);

    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }

    setUser(null);
    setAuthState('unauthenticated');

    // Use window.location to guarantee a full navigation (clears all React state)
    const url = reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login';
    window.location.replace(url);
  }, []);

  // ── Reset inactivity timer ─────────────────────────────────────────────────
  const resetTimer = useCallback(() => {
    setShowWarning(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (inactivityRef.current) clearTimeout(inactivityRef.current);
    if (warningRef.current)    clearTimeout(warningRef.current);

    // Warn before timeout
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      let secs = Math.floor(WARNING_MS / 1000);
      setSecondsLeft(secs);
      countdownRef.current = setInterval(() => {
        secs -= 1;
        setSecondsLeft(secs);
      }, 1000);
    }, INACTIVITY_MS - WARNING_MS);

    // Auto logout
    inactivityRef.current = setTimeout(() => {
      logout('timeout');
    }, INACTIVITY_MS);
  }, [logout]);

  // ── Attach activity listeners ──────────────────────────────────────────────
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'] as const;
    const handler = () => { if (authState === 'authenticated') resetTimer(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [authState, resetTimer]);

  // ── Verify session on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const res  = await fetch('/api/auth/me');

        if (!res.ok) {
          if (!cancelled) {
            setAuthState('unauthenticated');
            window.location.replace('/login?reason=unauthorized');
          }
          return;
        }

        const data = await res.json();

        if (!data.success || !data.user) {
          if (!cancelled) {
            setAuthState('unauthenticated');
            window.location.replace('/login?reason=unauthorized');
          }
          return;
        }

        if (!cancelled) {
          setUser(data.user);
          setAuthState('authenticated');
          resetTimer();
        }
      } catch {
        if (!cancelled) {
          setAuthState('unauthenticated');
          window.location.replace('/login');
        }
      }
    };

    verify();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Cleanup ────────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      [inactivityRef, warningRef].forEach(r => { if (r.current) clearTimeout(r.current); });
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying session…</p>
        </div>
      </div>
    );
  }

  // Unauthenticated — redirect already triggered via window.location above
  if (authState === 'unauthenticated' || !user) return null;

  const fmt = (s: string) => s.replace(/_/g, ' ');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* ── Inactivity Warning Modal ──────────────────────────────────────── */}
      {showWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-amber-400 p-8 max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-9 h-9 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Session Expiring
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
              You will be signed out in
            </p>
            <p className="text-5xl font-bold text-amber-600 mb-4 tabular-nums">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
              {String(secondsLeft % 60).padStart(2, '0')}
            </p>
            <p className="text-xs text-gray-400 mb-6">
              Inactive sessions are terminated for security.
            </p>
            <div className="flex gap-3">
              <button
                onClick={resetTimer}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Stay Signed In
              </button>
              <button
                onClick={() => logout('manual')}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-semibold transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <MobileNav />
      <Sidebar />

      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div />

            <div className="flex items-center gap-2">
              {/* User pill */}
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-semibold text-gray-800 dark:text-white leading-tight">
                  {user.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {fmt(user.role)}{user.station?.name ? ` · ${user.station.name}` : ''}
                </span>
              </div>

              <button className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Search className="w-5 h-5" />
              </button>

              <button className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <button
                onClick={() => logout('manual')}
                title="Sign out"
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
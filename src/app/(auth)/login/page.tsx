'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Mail, Lock, AlertCircle, Eye, EyeOff, Clock } from 'lucide-react';

// ── Inner component that reads search params ──────────────────────────────────

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error,   setError]   = useState('');
  const [notice,  setNotice]  = useState('');
  const [loading, setLoading] = useState(false);

  // Show contextual message based on redirect reason
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'timeout') {
      setNotice('Your session expired due to inactivity. Please sign in again.');
    } else if (reason === 'unauthorized') {
      setNotice('You need to sign in to access that page.');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // ✅  Do NOT store user in localStorage — auth is cookie-based.
        //     The cookie is set by the server response; just redirect.

        // Check if we should redirect back to the originally-requested page
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

        // Validate callbackUrl is an internal path (security)
        const safePath = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard';

        // Warn if user has no station (but still allow access)
        if (!data.user.stationId && !['SUPER_ADMIN', 'ADMIN'].includes(data.user.role)) {
          setNotice(
            'Your account has no assigned station. Contact your administrator. ' +
            'Some features may be unavailable.'
          );
          setTimeout(() => router.replace(safePath), 3000);
          return;
        }

        router.replace(safePath);
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch {
      setError('An error occurred. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/50">
              <Shield className="w-9 h-9 text-white" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl blur opacity-50 animate-pulse" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-blue-200">Kenya Police Service Management System</p>
      </div>

      {/* Notice (session timeout, etc.) */}
      {notice && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-200 text-sm">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{notice}</p>
        </div>
      )}

      {/* Login Card */}
      <div className="relative bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="officer@police.go.ke"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex items-center justify-end">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} className="w-full relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg blur-lg opacity-75 group-hover:opacity-100 transition" />
            <div className="relative inline-flex items-center justify-center w-full gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </div>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium">
            Request Access
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-blue-200">
        For support, contact your station commander or IT administrator
      </p>
    </div>
  );
}

// ── Page wrapper (Suspense required because useSearchParams needs it) ──────────

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
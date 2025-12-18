//src/app/error.tsx


"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
            <svg
              className="w-10 h-10 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Something went wrong!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-1">
            An unexpected error occurred while processing your request.
          </p>
          {error.digest && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-smooth shadow-lg hover:shadow-xl"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.href = "/dashboard"}
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-smooth border-2 border-primary-600 dark:border-primary-400"
          >
            Go to Dashboard
          </button>
        </div>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          If this problem persists, please contact technical support at{" "}
          <a
            href="mailto:support@police.go.ke"
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            support@police.go.ke
          </a>
        </div>
      </div>
    </div>
  );
}
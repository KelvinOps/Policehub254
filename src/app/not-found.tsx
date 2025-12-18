//src/app/not-found.tsx

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary-600 dark:text-primary-400">
            404
          </h1>
          <div className="mt-4">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Page Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              The page you are looking for doesnt exist or has been moved.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-smooth shadow-lg hover:shadow-xl"
          >
            Go to Dashboard
          </Link>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 text-base font-medium text-primary-600 dark:text-primary-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-smooth border-2 border-primary-600 dark:border-primary-400"
          >
            Go to Home
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400">
          Need help? Contact support at{" "}
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
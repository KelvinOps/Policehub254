// app/dashboard/settings/layout.tsx

import type { Metadata } from "next";
import SettingsTabs from "@/components/settings/SettingsTabs";

export const metadata: Metadata = {
  title: "Settings | KPS Police Hub",
  description: "Manage your profile, stations, and system users",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-6 pb-0">
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage your account, stations, and system users
            </p>
          </div>
          <SettingsTabs />
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
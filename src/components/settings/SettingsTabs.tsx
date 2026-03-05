// components/settings/SettingsTabs.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Building2, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard/settings/profile",  label: "Profile",  icon: User,      description: "Personal info & security" },
  { href: "/dashboard/settings/stations", label: "Stations", icon: Building2, description: "Manage police stations" },
  { href: "/dashboard/settings/users",    label: "Users",    icon: Users,     description: "Officers & accounts" },
];

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0.5 mt-4 -mb-px">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              isActive
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
// src/components/layout/MobileNav.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  X, 
  Shield, 
  Menu,
  LayoutDashboard, 
  BookOpen, 
  Users, 
  FileText, 
  Car, 
  ShieldAlert,
  MessageSquare,
  BarChart3,
  Settings,
  AlertTriangle,
  Package,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  Eye,
  Briefcase,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Navigation item type
type NavItem = {
  id: string;
  name: string;
  href: string;
  icon: any;
  roles: string[];
  badge?: string;
  children?: { 
    name: string; 
    href: string; 
    icon?: any;
    badge?: string;
  }[];
};

const navigationItems: NavItem[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["all"],
  },
  {
    id: "occurrence-book",
    name: "Occurrence Book",
    href: "/dashboard/occurrence-book",
    icon: BookOpen,
    roles: ["all"],
    children: [
      { 
        name: "All Entries", 
        href: "/dashboard/occurrence-book",
        icon: List,
      },
      { 
        name: "Create New Entry", 
        href: "/dashboard/occurrence-book/new",
        icon: Plus,
        badge: "Quick"
      },
      { 
        name: "Recent Reports", 
        href: "/dashboard/occurrence-book?status=REPORTED",
        icon: Eye,
      },
      { 
        name: "Under Investigation", 
        href: "/dashboard/occurrence-book?status=UNDER_INVESTIGATION",
        icon: TrendingUp,
      },
    ],
  },
  {
    id: "criminals",
    name: "Criminal Records",
    href: "/dashboard/criminals",
    icon: ShieldAlert,
    roles: ["DETECTIVE", "OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { 
        name: "All Records", 
        href: "/dashboard/criminals",
        icon: List,
      },
      { 
        name: "Register New", 
        href: "/dashboard/criminals/new",
        icon: Plus,
      },
      { 
        name: "Wanted Persons", 
        href: "/dashboard/criminals?wanted=true",
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: "cases",
    name: "Cases",
    href: "/dashboard/cases",
    icon: FileText,
    roles: ["DETECTIVE", "OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { 
        name: "All Cases", 
        href: "/dashboard/cases",
        icon: List,
      },
      { 
        name: "Open Cases", 
        href: "/dashboard/cases?status=OPEN",
        icon: Briefcase,
      },
      { 
        name: "Assigned to Me", 
        href: "/dashboard/cases?assigned=me",
        icon: UserCheck,
      },
    ],
  },
  {
    id: "personnel",
    name: "Personnel",
    href: "/dashboard/personnel",
    icon: Users,
    roles: ["OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { 
        name: "All Officers", 
        href: "/dashboard/personnel",
        icon: List,
      },
      { 
        name: "Duty Roster", 
        href: "/dashboard/personnel/roster",
        icon: FileText,
      },
    ],
  },
  {
    id: "resources",
    name: "Resources",
    href: "/dashboard/resources",
    icon: Package,
    roles: ["OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { name: "Vehicles", href: "/dashboard/resources/vehicles", icon: Car },
      { name: "Firearms", href: "/dashboard/resources/firearms", icon: Shield },
      { name: "Equipment", href: "/dashboard/resources/equipment", icon: Package },
    ],
  },
  {
    id: "traffic",
    name: "Traffic",
    href: "/dashboard/traffic",
    icon: Car,
    roles: ["TRAFFIC_OFFICER", "OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { name: "Incidents", href: "/dashboard/traffic/incidents" },
      { name: "Accidents", href: "/dashboard/traffic/accidents" },
      { name: "Impounds", href: "/dashboard/traffic/impounds" },
    ],
  },
  {
    id: "gbv",
    name: "GBV Cases",
    href: "/dashboard/gbv",
    icon: AlertTriangle,
    roles: ["GBV_OFFICER", "OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { name: "All Cases", href: "/dashboard/gbv/cases" },
      { name: "Resources", href: "/dashboard/gbv/resources" },
    ],
  },
  {
    id: "reports",
    name: "Reports & Analytics",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    children: [
      { name: "Crime Statistics", href: "/dashboard/reports/crime-stats" },
      { name: "Analytics", href: "/dashboard/reports/analytics" },
    ],
  },
  {
    id: "communications",
    name: "Communications",
    href: "/dashboard/communications",
    icon: MessageSquare,
    roles: ["all"],
    children: [
      { name: "Messages", href: "/dashboard/communications/messages" },
      { name: "Alerts", href: "/dashboard/communications/alerts" },
    ],
  },
  {
    id: "settings",
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    roles: ["all"],
    children: [
      { name: "Profile", href: "/dashboard/settings/profile" },
      { name: "Stations", href: "/dashboard/settings/stations" },
      { name: "Users", href: "/dashboard/settings/users" },
    ],
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();

  // Fetch user data and auto-expand
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Auto-expand the section that matches current path
    const currentSection = navigationItems.find(item => {
      if (item.children) {
        return pathname.startsWith(item.href) || 
               item.children.some(child => pathname.startsWith(child.href.split('?')[0]));
      }
      return false;
    });
    
    if (currentSection) {
      setExpandedItems(new Set([currentSection.id]));
    }
  }, [pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActiveLink = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    const baseHref = href.split('?')[0];
    const basePath = pathname.split('?')[0];
    return basePath === baseHref || basePath.startsWith(baseHref + '/');
  };

  const hasAccess = (roles: string[]) => {
    if (!user) return false;
    return roles.includes("all") || roles.includes(user.role);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm lg:hidden z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile menu panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-full overflow-y-auto bg-white dark:bg-gray-800 px-6 py-6 sm:max-w-sm border-r border-gray-200 dark:border-gray-700 lg:hidden transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setIsOpen(false)}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                KPS
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Police Hub
              </p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        {user && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg">
                {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Badge: {user.badgeNumber || 'N/A'}
                </p>
              </div>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {user.role.replace(/_/g, ' ')}
            </div>
          </div>
        )}
        
        {/* Navigation */}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            if (!hasAccess(item.roles)) return null;

            const Icon = item.icon;
            const isActive = isActiveLink(item.href);
            const isExpanded = expandedItems.has(item.id);
            const hasChildren = item.children && item.children.length > 0;

            return (
              <div key={item.id}>
                {hasChildren ? (
                  // Items with children - button for dropdown
                  <>
                    <button
                      onClick={() => toggleExpanded(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                        "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <span>{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </button>

                    {/* Dropdown children */}
                    {isExpanded && item.children && (
                      <div className="mt-1 ml-6 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isChildActive = isActiveLink(child.href);
                          
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => setIsOpen(false)}
                              className={cn(
                                "flex items-center gap-x-3 px-4 py-2 text-sm rounded-lg transition-all",
                                isChildActive
                                  ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium"
                                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              )}
                            >
                              {ChildIcon && (
                                <ChildIcon className={cn(
                                  "h-4 w-4 shrink-0",
                                  isChildActive
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-400 dark:text-gray-500"
                                )} />
                              )}
                              <span className="flex-1">{child.name}</span>
                              {child.badge && (
                                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  // Items without children - direct link
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    )}
                  >
                    <Icon className={cn(
                      "h-5 w-5",
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                    )} />
                    {item.name}
                  </Link>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-6 flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );
}
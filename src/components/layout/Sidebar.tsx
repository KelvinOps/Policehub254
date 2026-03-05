// src/components/layout/Sidebar.tsx - FIXED VERSION
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
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
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  Eye,
  Briefcase,
  TrendingUp,
  UserCheck,
  Search,
  Download,
  PieChart,
  Activity
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

// Enhanced navigation items with Search & Reports
const defaultNavigationItems: NavItem[] = [
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["all"],
  },
  {
    id: "search",
    name: "Search",
    href: "/dashboard/search",
    icon: Search,
    roles: ["all"],
    badge: "New",
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
    id: "reports",
    name: "Reports & Analytics",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["OCS", "STATION_COMMANDER", "ADMIN", "SUPER_ADMIN"],
    badge: "New",
    children: [
      { 
        name: "Crime Statistics", 
        href: "/dashboard/reports",
        icon: PieChart,
      },
      { 
        name: "Export Reports", 
        href: "/dashboard/reports?tab=export",
        icon: Download,
      },
      { 
        name: "Analytics Dashboard", 
        href: "/dashboard/reports?tab=analytics",
        icon: Activity,
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
      { name: "Impounds", href: "/dashboard/traffic/impound" },
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

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Initialize user from localStorage synchronously
  useEffect(() => {
    // Try to get user from localStorage immediately
    const initializeUser = () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          console.log('User loaded from localStorage:', parsedUser);
        }
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();

    // Also fetch from API to ensure we have the latest data
    const fetchUserFromAPI = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            // Update localStorage with latest user data
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        }
      } catch (error) {
        console.error('Error fetching user from API:', error);
      }
    };

    fetchUserFromAPI();

    // Auto-expand the section that matches current path
    const currentSection = defaultNavigationItems.find(item => {
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

  const isActiveLink = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    // Handle query parameters
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
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('user');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if API fails
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  // Show loading spinner only briefly, then show navigation skeleton
  if (isLoading) {
    return (
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-6 pb-4">
          {/* Logo skeleton */}
          <div className="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div>
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          
          {/* Navigation skeleton */}
          <div className="flex-1 space-y-4 py-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If still no user after loading, show minimal sidebar with login prompt
  if (!user) {
    return (
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-6 pb-4">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  KPS
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Police Hub
                </p>
              </div>
            </Link>
          </div>

          {/* Login prompt */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Shield className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to access the sidebar</p>
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg blur opacity-50 animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                KPS
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Police Hub
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {defaultNavigationItems.map((item) => {
                  if (!hasAccess(item.roles)) return null;

                  const Icon = item.icon;
                  const isActive = isActiveLink(item.href);
                  const isExpanded = expandedItems.has(item.id);
                  const hasChildren = item.children && item.children.length > 0;

                  return (
                    <li key={item.id}>
                      {/* Main navigation item */}
                      {hasChildren ? (
                        // Items with children - button for dropdown
                        <>
                          <button
                            onClick={() => toggleExpanded(item.id)}
                            className={cn(
                              "w-full group flex items-center justify-between gap-x-3 rounded-lg p-3 text-sm font-semibold leading-6 transition-all duration-200",
                              "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            )}
                          >
                            <div className="flex items-center gap-x-3">
                              <Icon
                                className={cn(
                                  "h-5 w-5 shrink-0 transition-colors",
                                  "text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                                )}
                              />
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400 transition-transform" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400 transition-transform" />
                            )}
                          </button>

                          {/* Dropdown children */}
                          {isExpanded && item.children && (
                            <ul className="mt-1 space-y-1 pl-11">
                              {item.children.map((child) => {
                                const ChildIcon = child.icon;
                                const isChildActive = isActiveLink(child.href);
                                
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      className={cn(
                                        "flex items-center gap-x-3 px-3 py-2 text-sm rounded-lg transition-all duration-200",
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
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </>
                      ) : (
                        // Items without children - direct link
                        <Link
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-x-3 rounded-lg p-3 text-sm font-semibold leading-6 transition-all duration-200",
                            isActive
                              ? "bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 text-blue-600 dark:text-blue-400 shadow-sm"
                              : "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-colors",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                            )}
                          />
                          <span className="flex-1">{item.name}</span>
                          {item.badge && (
                            <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* User Info */}
            <li className="mt-auto space-y-2">
              {/* User Profile Card */}
              <div className="flex items-center gap-x-3 px-3 py-3 text-sm font-semibold leading-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {user.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name || 'Officer'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Badge: {user.badgeNumber || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Current Role
                </p>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  {user.role ? user.role.replace(/_/g, ' ') : 'Unknown'}
                </p>
                {user.stationName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {user.stationName}
                  </p>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
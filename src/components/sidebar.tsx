// src/components/sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart3,
  UserCog,
  Truck,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const dashboardSubItems = [
  { name: "Geral", href: "/dashboard", icon: BarChart3 },
  { name: "RH", href: "/dashboard/rh", icon: UserCog },
  { name: "Logística", href: "/dashboard/logistica", icon: Truck },
  { name: "Suprimentos", href: "/dashboard/suprimentos", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(
    pathname.startsWith("/dashboard"),
  );

  if (pathname === "/login") return null;

  const isDashboardActive = pathname.startsWith("/dashboard");

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card/50 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-17" : "w-64",
      )}
    >
      <div className="flex h-full flex-col px-2 py-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "mb-10 flex items-center",
            collapsed ? "justify-center" : "px-2 justify-between",
          )}
        >
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold tracking-tight text-primary">
                RefuncApp
              </h2>
              <p className="text-xs text-muted-foreground">v2.5.0</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav className="flex-1 space-y-1">
          {/* Central */}
          <Link href="/central">
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                pathname === "/central"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? "Central" : undefined}
            >
              <Users className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Central</span>}
            </span>
          </Link>

          {/* Dashboard dropdown */}
          <div>
            <button
              onClick={() => setDashboardOpen(!dashboardOpen)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer",
                isDashboardActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? "Dashboard" : undefined}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Dashboard</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      dashboardOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>

            {/* Sub-items */}
            {dashboardOpen && !collapsed && (
              <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-3">
                {dashboardSubItems.map((sub) => (
                  <Link key={sub.href} href={sub.href}>
                    <span
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                        pathname === sub.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      <sub.icon className="h-3.5 w-3.5 shrink-0" />
                      {sub.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Collapsed: popover/tooltip list on click */}
            {dashboardOpen && collapsed && (
              <div className="mt-1 space-y-0.5">
                {dashboardSubItems.map((sub) => (
                  <Link key={sub.href} href={sub.href}>
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-md py-1.5 transition-all hover:bg-accent hover:text-accent-foreground",
                        pathname === sub.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground",
                      )}
                      title={sub.name}
                    >
                      <sub.icon className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Configurações */}
          <Link href="/configuracoes">
            <span
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                pathname === "/configuracoes"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
                collapsed && "justify-center px-0",
              )}
              title={collapsed ? "Configurações" : undefined}
            >
              <Settings className="h-5 w-5 shrink-0" />
              {!collapsed && <span>Configurações</span>}
            </span>
          </Link>
        </nav>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="mt-auto border-t border-border pt-4">
          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "w-full gap-3 text-muted-foreground hover:text-destructive",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
            title={collapsed ? "Sair do Sistema" : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair do Sistema</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
}

// src/components/sidebar.tsx
"use client";

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
  ShieldCheck,
  Sun,
  Moon,
  CalendarClock,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CanAccess } from "@/components/CanAccess";

const dashboardSubItems = [
  { name: "Geral",       href: "/dashboard",             icon: BarChart3,   userOnly: false },
  { name: "RH",          href: "/dashboard/rh",          icon: UserCog,     userOnly: true  },
  { name: "Logística",   href: "/dashboard/logistica",   icon: Truck,       userOnly: true  },
  { name: "Segurança",   href: "/dashboard/seguranca",   icon: ShieldCheck, userOnly: true  },
  { name: "Suprimentos", href: "/dashboard/suprimentos", icon: Package,     userOnly: true  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(
    pathname.startsWith("/dashboard"),
  );

  // Evita hydration mismatch — ícone só renderiza no cliente
  useEffect(() => setMounted(true), []);

  if (pathname === "/login") return null;

  const isDashboardActive = pathname.startsWith("/dashboard");
  const isDark = theme === "dark";

  const navItem = (isActive: boolean) =>
    cn(
      "flex items-center gap-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer",
      !collapsed && "py-1.5 pr-3 pl-2.5 rounded-r-sm border-l-2",
      !collapsed && isActive &&
        "border-l-primary text-primary bg-primary/[0.06]",
      !collapsed && !isActive &&
        "border-l-transparent text-muted-foreground hover:text-foreground hover:bg-accent",
      collapsed && "justify-center rounded-sm py-2",
      collapsed && isActive && "bg-primary/[0.08] text-primary",
      collapsed && !isActive &&
        "text-muted-foreground hover:text-foreground hover:bg-accent",
    );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-[width] duration-300",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <div className="flex h-full flex-col px-2 py-4">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          className={cn(
            "mb-5 flex items-center",
            collapsed ? "justify-center" : "px-1 justify-between",
          )}
        >
          {!collapsed && (
            <div>
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-primary">
                MobilizaçãoAPP
              </h2>
              <p className="text-[10px] text-muted-foreground/60 tracking-wide">
                v2.5.0
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav className="flex-1 space-y-px">

          {/* Configurações do projeto — visível apenas para admins */}
          <CanAccess role="admin">
            <Link href="/configuracoes">
              <span
                className={navItem(pathname === "/configuracoes")}
                title={collapsed ? "Configurações do projeto" : undefined}
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Configurações do projeto</span>}
              </span>
            </Link>
          </CanAccess>

          {/* Cronograma - Avanço — visível apenas para admins */}
          <CanAccess role="admin">
            <Link href="/cronograma">
              <span
                className={navItem(pathname === "/cronograma")}
                title={collapsed ? "Cronograma - Avanço" : undefined}
              >
                <CalendarClock className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Cronograma - Avanço</span>}
              </span>
            </Link>
          </CanAccess>

          {/* Central de colaboradores — visível apenas para user/admin */}
          <CanAccess role="user">
            <Link href="/central">
              <span
                className={navItem(pathname === "/central")}
                title={collapsed ? "Central de colaboradores" : undefined}
              >
                <Users className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Central de colaboradores</span>}
              </span>
            </Link>
          </CanAccess>

          {/* Dashboard dropdown */}
          <div>
            <button
              onClick={() => setDashboardOpen(!dashboardOpen)}
              className={cn(navItem(isDashboardActive), "w-full")}
              title={collapsed ? "Dashboard" : undefined}
            >
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Dashboard</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-150",
                      dashboardOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>

            {/* Sub-items — expanded */}
            {dashboardOpen && !collapsed && (
              <div className="ml-3 mt-px space-y-px border-l border-border pl-2.5">
                {dashboardSubItems.map((sub) => {
                  const link = (
                    <Link key={sub.href} href={sub.href}>
                      <span
                        className={cn(
                          "flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] font-medium transition-colors duration-150",
                          pathname === sub.href
                            ? "text-primary bg-primary/[0.06]"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                      >
                        <sub.icon className="h-3.5 w-3.5 shrink-0" />
                        {sub.name}
                      </span>
                    </Link>
                  );
                  return sub.userOnly ? (
                    <CanAccess key={sub.href} role="user">{link}</CanAccess>
                  ) : link;
                })}
              </div>
            )}

            {/* Sub-items — collapsed */}
            {dashboardOpen && collapsed && (
              <div className="mt-px space-y-px">
                {dashboardSubItems.map((sub) => {
                  const link = (
                    <Link key={sub.href} href={sub.href}>
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-sm py-1.5 transition-colors duration-150",
                          pathname === sub.href
                            ? "bg-primary/[0.08] text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent",
                        )}
                        title={sub.name}
                      >
                        <sub.icon className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                  return sub.userOnly ? (
                    <CanAccess key={sub.href} role="user">{link}</CanAccess>
                  ) : link;
                })}
              </div>
            )}
          </div>

        </nav>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="mt-auto space-y-px border-t border-border pt-3">

          {/* Toggle de tema */}
          <Button
            variant="ghost"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "w-full gap-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
            title={
              collapsed
                ? isDark ? "Modo Claro" : "Modo Escuro"
                : undefined
            }
          >
            {/* mounted guard evita flash de ícone errado no SSR */}
            {mounted ? (
              isDark ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && (
              <span>{mounted && isDark ? "Modo Claro" : "Modo Escuro"}</span>
            )}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            onClick={logout}
            className={cn(
              "w-full gap-2.5 text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] transition-colors duration-150",
              collapsed ? "justify-center px-0" : "justify-start",
            )}
            title={collapsed ? "Sair do Sistema" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair do Sistema</span>}
          </Button>

        </div>
      </div>
    </aside>
  );
}

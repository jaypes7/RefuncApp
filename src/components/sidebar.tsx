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
  Building2,
  Database,
  Camera,
  ShieldAlert,
  ListChecks,
  FileText,
} from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import { CanAccess } from "@/components/CanAccess";
import { useAcessoRestrito } from "@/hooks/use-acesso-restrito";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const dashboardSubItems = [
  { name: "Gestão a Vista - Geral",       href: "/dashboard",             icon: BarChart3,   userOnly: false },
  { name: "Gestão a Vista - RH",          href: "/dashboard/rh",          icon: UserCog,     userOnly: true  },
  { name: "Gestão a Vista - Logística",   href: "/dashboard/logistica",   icon: Truck,       userOnly: true  },
  { name: "Gestão a Vista - Segurança",   href: "/dashboard/seguranca",   icon: ShieldCheck, userOnly: true  },
  { name: "Gestão a Vista - Suprimentos", href: "/dashboard/suprimentos", icon: Package,     userOnly: true  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

/**
 * Link condicional para Colaboradores Restritos.
 * Só renderiza se o usuário logado estiver na tabela de acessos restritos.
 */
function ColaboradoresRestritosLink({
  collapsed,
  pathname,
}: {
  collapsed: boolean;
  pathname: string;
}) {
  const { data: hasAccess } = useAcessoRestrito();

  if (!hasAccess) return null;

  const isActive = pathname === "/colaboradores-restritos";

  return (
    <Link href="/colaboradores-restritos">
      <span
        className={cn(
          "flex items-center gap-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer",
          !collapsed && "py-1.5 pr-3 pl-2.5 rounded-r-sm border-l-2",
          !collapsed && isActive &&
            "border-l-destructive text-white bg-destructive/10",
          !collapsed && !isActive &&
            "border-l-transparent text-white/70 hover:text-white hover:bg-white/10",
          collapsed && "justify-center rounded-sm py-2",
          collapsed && isActive && "bg-destructive/10 text-white",
          collapsed && !isActive &&
            "text-white/70 hover:text-white hover:bg-white/10",
        )}
        title={collapsed ? "Colaboradores Restritos" : undefined}
      >
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Colaboradores Restritos</span>}
      </span>
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { centroCusto, setCentroCusto, centrosDisponiveis } = useFilter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [dashboardOpen, setDashboardOpen] = useState(
    pathname.startsWith("/dashboard"),
  );
  const [projectOpen, setProjectOpen] = useState(false);

  if (pathname === "/login") return null;

  const isDashboardActive = pathname.startsWith("/dashboard");
  const isDark = theme === "dark";

  const handleSelectProject = (cc: string | null) => {
    setCentroCusto(cc);
    setProjectOpen(false);
    // Remove o cache para forçar loading state (skeleton) ao invés de mostrar dados stale do projeto anterior
    queryClient.removeQueries({ queryKey: ["config"] });
    queryClient.removeQueries({ queryKey: ["colaboradores"] });
    queryClient.removeQueries({ queryKey: ["dashboard-principal"] });
    queryClient.removeQueries({ queryKey: ["dashboard-rh"] });
    queryClient.removeQueries({ queryKey: ["dashboard-logistica"] });
    queryClient.removeQueries({ queryKey: ["dashboard-suprimentos"] });
    queryClient.removeQueries({ queryKey: ["seguranca-dashboard"] });
    queryClient.removeQueries({ queryKey: ["ocorrencias"] });
    queryClient.removeQueries({ queryKey: ["comentarios-cliente"] });
    queryClient.removeQueries({ queryKey: ["pendencias-manuais"] });
    queryClient.removeQueries({ queryKey: ["suprimentos-ordens"] });
    queryClient.removeQueries({ queryKey: ["registros-fotograficos"] });
    // Estas queries não precisam limpar o cache, apenas refetch em background
    queryClient.invalidateQueries({ queryKey: ["centros-custo"], type: "all" });
  };

  const navItem = (isActive: boolean) =>
    cn(
      "flex items-center gap-2.5 text-xs font-semibold transition-colors duration-150 cursor-pointer",
      !collapsed && "py-1.5 pr-3 pl-2.5 rounded-r-sm border-l-2",
      !collapsed && isActive &&
        "border-l-[#ff460a] text-white bg-[#ff460a]/10",
      !collapsed && !isActive &&
        "border-l-transparent text-white/70 hover:text-white hover:bg-white/10",
      collapsed && "justify-center rounded-sm py-2",
      collapsed && isActive && "bg-[#ff460a]/10 text-white",
      collapsed && !isActive &&
        "text-white/70 hover:text-white hover:bg-white/10",
    );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[#232323] border-r border-white/10 transition-[width] duration-300",
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
              <h2 className="text-[11px] font-bold tracking-widest uppercase text-white">
                Gestão de mobilização de contratos
              </h2>
              <p className="text-[10px] text-white/40 tracking-wide">
                v2.5.0
              </p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-7 w-7 shrink-0 text-white/60 hover:text-white hover:bg-white/10 transition-colors duration-150"
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* ── Project Selector ───────────────────────────────────────── */}
        <div className={cn("mb-4 w-full overflow-hidden", collapsed && "flex justify-center")}>
          {collapsed ? (
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                  title={centroCusto ?? "Todos"}
                >
                  <Building2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" align="start" className="w-56 p-1">
                <div className="max-h-64 overflow-y-auto">
                  {user?.perfil === "admin" && (
                    <button
                      onClick={() => handleSelectProject(null)}
                      className={cn(
                        "w-full rounded px-2 py-1.5 text-left text-sm",
                        centroCusto === null
                          ? "bg-[#ff460a]/10 text-[#ff460a] font-medium"
                          : "hover:bg-accent"
                      )}
                    >
                      Todos
                    </button>
                  )}
                  {centrosDisponiveis.map((cc) => (
                    <button
                      key={cc}
                      onClick={() => handleSelectProject(cc)}
                      className={cn(
                        "w-full rounded px-2 py-1.5 text-left text-sm",
                        cc === centroCusto
                          ? "bg-[#ff460a]/10 text-[#ff460a] font-medium"
                          : "hover:bg-accent"
                      )}
                    >
                      {cc}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Popover open={projectOpen} onOpenChange={setProjectOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between px-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 overflow-hidden shrink"
                  title={centroCusto ?? "Todos"}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate text-left">
                      {centroCusto ?? "Todos"}
                    </span>
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/40" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-1">
                <div className="max-h-64 overflow-y-auto">
                  {user?.perfil === "admin" && (
                    <button
                      onClick={() => handleSelectProject(null)}
                      className={cn(
                        "w-full rounded px-2 py-1.5 text-left text-sm",
                        centroCusto === null
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent"
                      )}
                    >
                      Todos
                    </button>
                  )}
                  {centrosDisponiveis.map((cc) => (
                    <button
                      key={cc}
                      onClick={() => handleSelectProject(cc)}
                      className={cn(
                        "w-full rounded px-2 py-1.5 text-left text-sm",
                        cc === centroCusto
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-accent"
                      )}
                    >
                      {cc}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
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

          {/* Checklist Mobilização */}
          <CanAccess role="admin">
            <Link href="/checklist-mobilizacao">
              <span
                className={navItem(pathname === "/checklist-mobilizacao")}
                title={collapsed ? "Checklist Mobilização" : undefined}
              >
                <ListChecks className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Checklist Mobilização</span>}
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

          {/* Banco de Talentos — visível apenas para admins */}
          <CanAccess role="admin">
            <Link href="/banco-talentos">
              <span
                className={navItem(pathname === "/banco-talentos")}
                title={collapsed ? "Banco de Talentos" : undefined}
              >
                <Database className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Banco de Talentos</span>}
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
                  <span className="flex-1 text-left">Gestão a Vista</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-white/40 transition-transform duration-150",
                      dashboardOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>

            {/* Sub-items — expanded */}
            {dashboardOpen && !collapsed && (
              <div className="ml-3 mt-px space-y-px border-l border-white/10 pl-2.5">
                {dashboardSubItems.map((sub) => {
                  const link = (
                    <Link href={sub.href}>
                      <span
                        className={cn(
                          "flex items-center gap-2 rounded-sm px-2 py-1.5 text-[11px] font-medium transition-colors duration-150",
                          pathname === sub.href
                            ? "text-[#ff460a] bg-[#ff460a]/10"
                            : "text-white/60 hover:text-white hover:bg-white/10",
                        )}
                      >
                        <sub.icon className="h-3.5 w-3.5 shrink-0" />
                        {sub.name}
                      </span>
                    </Link>
                  );
                  return sub.userOnly ? (
                    <CanAccess key={sub.href} role="user">{link}</CanAccess>
                  ) : (
                    <div key={sub.href}>{link}</div>
                  );
                })}
              </div>
            )}

            {/* Sub-items — collapsed */}
            {dashboardOpen && collapsed && (
              <div className="mt-px space-y-px">
                {dashboardSubItems.map((sub) => {
                  const link = (
                    <Link href={sub.href}>
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-sm py-1.5 transition-colors duration-150",
                          pathname === sub.href
                            ? "bg-[#ff460a]/10 text-[#ff460a]"
                            : "text-white/60 hover:text-white hover:bg-white/10",
                        )}
                        title={sub.name}
                      >
                        <sub.icon className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  );
                  return sub.userOnly ? (
                    <CanAccess key={sub.href} role="user">{link}</CanAccess>
                  ) : (
                    <div key={sub.href}>{link}</div>
                  );
                })}
              </div>
            )}
          </div>

          
          {/* Relatório Executivo — visível para user/admin */}
          <CanAccess role="user">
            <Link href="/relatorio-executivo">
              <span
                className={navItem(pathname === "/relatorio-executivo")}
                title={collapsed ? "Relatório Executivo" : undefined}
              >
                <FileText className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Relatório Executivo</span>}
              </span>
            </Link>
          </CanAccess>

          {/* Registros fotográficos — visível para user/admin */}
          <CanAccess role="user">
            <Link href="/registros-fotograficos">
              <span
                className={navItem(pathname === "/registros-fotograficos")}
                title={collapsed ? "Registros fotográficos" : undefined}
              >
                <Camera className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Registros fotográficos</span>}
              </span>
            </Link>
          </CanAccess>

          {/* Colaboradores Restritos — visível apenas para REs autorizados */}
          <ColaboradoresRestritosLink collapsed={collapsed} pathname={pathname} />

        </nav>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="mt-auto space-y-px border-t border-white/10 pt-3">

          {/* Toggle de tema */}
          <Button
            variant="ghost"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
              "w-full gap-2.5 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150",
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
              "w-full gap-2.5 text-xs font-semibold text-white/70 hover:text-red-400 hover:bg-red-400/10 transition-colors duration-150",
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

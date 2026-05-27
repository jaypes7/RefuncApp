// src/components/conditional-layout.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

const AUTH_ROUTES = ["/login"];
const FULLSCREEN_PREFIXES = ["/dashboard/tv", "/dashboard/cardtv"];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isFullscreen = FULLSCREEN_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAuthRoute || isFullscreen) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {/*
        pl acompanha a largura da sidebar:
          expanded → w-56 (224px) → pl-56
          collapsed → w-14  (56px) → pl-14
        transition-all garante que o conteúdo deslize junto com a sidebar.
      */}
      <main
        className={cn(
          "flex-1 min-w-0 transition-all duration-300",
          collapsed ? "pl-14" : "pl-56",
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

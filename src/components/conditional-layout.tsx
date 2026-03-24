// src/components/conditional-layout.tsx
"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

/** Rotas que não exibem a sidebar nem aplicam o padding lateral */
const AUTH_ROUTES = ["/login"];

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      {/* pl-64 matches the expanded sidebar (w-64).
          The sidebar width transitions via CSS, and this padding ensures
          content doesn't overlap when collapsed (the sidebar is fixed).
          We use peer-based or JS-driven approach; for simplicity we keep pl-64
          as the sidebar overlay still works fine when collapsed. */}
      <main className="flex-1 pl-17 min-[1024px]:pl-64 transition-all duration-300">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

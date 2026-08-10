import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { headers } from "next/headers";

import { getCurrentUser, normalizeCentroCusto } from "@/lib/auth";
import DashboardClient from "./DashboardClient";

// Server Component: pré-carrega os dados do dashboard no servidor e hidrata o
// React Query — o primeiro paint já chega com dados em vez de skeleton (PERF-01).
// O centro de custo é estimado a partir do JWT (admin = todos; user/guest = o
// primeiro autorizado). Se o cliente resolver outro CC (filtro salvo), a query
// hidratada simplesmente não é usada e o fetch normal acontece.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  try {
    const user = await getCurrentUser();
    if (user) {
      const cc =
        user.perfil === "admin"
          ? null
          : normalizeCentroCusto(user.centro_custo)[0] ?? null;

      const h = await headers();
      const host = h.get("host");
      if (host) {
        const proto = h.get("x-forwarded-proto") ?? "http";
        const cookie = h.get("cookie") ?? "";
        const params = cc ? `?centro_custo=${encodeURIComponent(cc)}` : "";

        const [dashRes, configRes] = await Promise.all([
          fetch(`${proto}://${host}/api/dashboard/principal${params}`, {
            headers: { cookie },
            cache: "no-store",
          }),
          fetch(`${proto}://${host}/api/config${params}`, {
            headers: { cookie },
            cache: "no-store",
          }),
        ]);

        if (dashRes.ok) {
          queryClient.setQueryData(["dashboard-principal", cc], await dashRes.json());
        }
        if (configRes.ok) {
          const json = await configRes.json();
          queryClient.setQueryData(["config", cc], json.data);
        }
      }
    }
  } catch {
    // Sem sessão ou falha no prefetch: o client busca normalmente
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Car, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CanAccess } from "@/components/CanAccess";
import { frotaApi } from "@/lib/axios";
import { FrotaDashboardTab } from "@/components/frota/FrotaDashboardTab";

/**
 * Painel da Frota — leitura gerencial (ver ANALISE_PGV.md §2).
 *
 * KPIs e gráficos, zero interação de edição. Responde "como estamos?".
 * A operação (cadastros, manutenções, cartões) vive em /frota/consulta.
 */
export default function FrotaPainelPage() {
  const { data: dashboard } = useQuery({
    queryKey: ["frota-dashboard"],
    queryFn: async () => {
      const res = await frotaApi.dashboard();
      return res.data;
    },
  });

  return (
    <ProtectedRoute>
      <CanAccess role="admin">
        <div className="flex flex-col gap-6 py-2">
          <PageHeader
            eyebrow="Painel de frota"
            title="Controle de Frota"
            subtitle="Visão consolidada e somente leitura dos veículos, manutenções e ativos da frota."
            icon={Car}
            badge={
              dashboard && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                  {dashboard.veiculos.total} veículos
                </span>
              )
            }
            action={
              <Button size="sm" className="gap-1.5" asChild>
                <Link href="/frota/consulta">
                  Abrir consulta detalhada
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />

          <FrotaDashboardTab />
        </div>
      </CanAccess>
    </ProtectedRoute>
  );
}

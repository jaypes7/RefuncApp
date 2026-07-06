"use client";

import { useQuery } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CanAccess } from "@/components/CanAccess";
import { frotaApi } from "@/lib/axios";
import { FrotaDashboardTab } from "@/components/frota/FrotaDashboardTab";
import { VeiculosTab } from "@/components/frota/VeiculosTab";
import { ManutencoesTab } from "@/components/frota/ManutencoesTab";
import { PrestadoresTab } from "@/components/frota/PrestadoresTab";
import { FornecedoresTab } from "@/components/frota/FornecedoresTab";
import { CartoesTagsTab } from "@/components/frota/CartoesTagsTab";

export default function FrotaPage() {
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

          {/* ── Page Header ── */}
          <div className="glass-card flex flex-col gap-4 rounded-md px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Controle de Frota
                  </h1>
                  {dashboard && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                      {dashboard.veiculos.total} veículos
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Veículos, manutenções, prestadores, fornecedores, cartões e tags.
                </p>
              </div>
            </div>
          </div>

          {/* ── Tabs ── */}
          <Tabs defaultValue="visao-geral">
            <TabsList>
              <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="veiculos">Veículos</TabsTrigger>
              <TabsTrigger value="manutencoes">Manutenções</TabsTrigger>
              <TabsTrigger value="prestadores">Prestadores</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="cartoes-tags">Cartões & Tags</TabsTrigger>
            </TabsList>

            <TabsContent value="visao-geral" className="mt-4">
              <FrotaDashboardTab />
            </TabsContent>
            <TabsContent value="veiculos" className="mt-4">
              <VeiculosTab />
            </TabsContent>
            <TabsContent value="manutencoes" className="mt-4">
              <ManutencoesTab />
            </TabsContent>
            <TabsContent value="prestadores" className="mt-4">
              <PrestadoresTab />
            </TabsContent>
            <TabsContent value="fornecedores" className="mt-4">
              <FornecedoresTab />
            </TabsContent>
            <TabsContent value="cartoes-tags" className="mt-4">
              <CartoesTagsTab />
            </TabsContent>
          </Tabs>
        </div>
      </CanAccess>
    </ProtectedRoute>
  );
}

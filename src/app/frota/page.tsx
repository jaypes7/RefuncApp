"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  LayoutDashboard,
  Wrench,
  MapPin,
  Building2,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const TAB_TRIGGER_CLASS = "data-[state=active]:bg-primary/10 data-[state=active]:text-primary";

export default function FrotaPage() {
  const [activeTab, setActiveTab] = useState("visao-geral");

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
          <Card className="glass-card">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="pb-0">
                <TabsList className="w-full flex justify-start gap-2 bg-transparent border-b border-border/50 pb-2 rounded-none h-auto">
                  <TabsTrigger value="visao-geral" className={TAB_TRIGGER_CLASS}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Visão Geral
                  </TabsTrigger>
                  <TabsTrigger value="veiculos" className={TAB_TRIGGER_CLASS}>
                    <Car className="w-4 h-4 mr-2" />
                    Veículos
                  </TabsTrigger>
                  <TabsTrigger value="manutencoes" className={TAB_TRIGGER_CLASS}>
                    <Wrench className="w-4 h-4 mr-2" />
                    Manutenções
                  </TabsTrigger>
                  <TabsTrigger value="prestadores" className={TAB_TRIGGER_CLASS}>
                    <MapPin className="w-4 h-4 mr-2" />
                    Prestadores
                  </TabsTrigger>
                  <TabsTrigger value="fornecedores" className={TAB_TRIGGER_CLASS}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Fornecedores
                  </TabsTrigger>
                  <TabsTrigger value="cartoes-tags" className={TAB_TRIGGER_CLASS}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cartões & Tags
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-6">
                <TabsContent value="visao-geral" className="w-full">
                  <FrotaDashboardTab />
                </TabsContent>
                <TabsContent value="veiculos" className="w-full">
                  <VeiculosTab />
                </TabsContent>
                <TabsContent value="manutencoes" className="w-full">
                  <ManutencoesTab />
                </TabsContent>
                <TabsContent value="prestadores" className="w-full">
                  <PrestadoresTab />
                </TabsContent>
                <TabsContent value="fornecedores" className="w-full">
                  <FornecedoresTab />
                </TabsContent>
                <TabsContent value="cartoes-tags" className="w-full">
                  <CartoesTagsTab />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </CanAccess>
    </ProtectedRoute>
  );
}

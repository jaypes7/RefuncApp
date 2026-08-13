"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  Wrench,
  MapPin,
  Building2,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CanAccess } from "@/components/CanAccess";
import { frotaApi } from "@/lib/axios";
import { VeiculosTab } from "@/components/frota/VeiculosTab";
import { ManutencoesTab } from "@/components/frota/ManutencoesTab";
import { PrestadoresTab } from "@/components/frota/PrestadoresTab";
import { FornecedoresTab } from "@/components/frota/FornecedoresTab";
import { CartoesTagsTab } from "@/components/frota/CartoesTagsTab";

const TAB_TRIGGER_CLASS = "data-[state=active]:bg-primary/10 data-[state=active]:text-primary";

/**
 * Consulta detalhada da Frota — os registros crus (ver ANALISE_PGV.md §2).
 *
 * Responde "quais registros exatamente?". Diferente do PGV, aqui a consulta
 * também edita: é onde o cadastro da frota acontece.
 */
export default function FrotaConsultaPage() {
  const [activeTab, setActiveTab] = useState("veiculos");

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
            eyebrow="Consulta detalhada"
            title="Controle de Frota"
            subtitle="Cadastro completo de veículos, manutenções, prestadores, fornecedores, cartões e tags."
            icon={Car}
            badge={
              dashboard && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                  {dashboard.veiculos.total} veículos
                </span>
              )
            }
            action={
              <Button size="sm" variant="ghost" className="gap-1.5" asChild>
                <Link href="/frota">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Painel
                </Link>
              </Button>
            }
          />

          {/* ── Tabs ── */}
          <Card className="glass-card">
            {/* flex-col explícito: o variant data-horizontal do tabs.tsx não casa com o
                data-orientation do Radix, então a direção padrão do root seria linha */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-col">
              <CardHeader className="pb-0">
                <TabsList className="w-full flex flex-wrap justify-start gap-2 bg-transparent border-b border-border/50 pb-2 rounded-none h-auto">
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
                <TabsContent value="veiculos" className="w-full mt-6">
                  <VeiculosTab />
                </TabsContent>
                <TabsContent value="manutencoes" className="w-full mt-6">
                  <ManutencoesTab />
                </TabsContent>
                <TabsContent value="prestadores" className="w-full mt-6">
                  <PrestadoresTab />
                </TabsContent>
                <TabsContent value="fornecedores" className="w-full mt-6">
                  <FornecedoresTab />
                </TabsContent>
                <TabsContent value="cartoes-tags" className="w-full mt-6">
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

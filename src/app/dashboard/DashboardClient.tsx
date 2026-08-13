"use client";

import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { ExportPdfButton } from "@/components/export-pdf-button";
import { useFilter } from "@/contexts/FilterContext";
import {
  colaboradoresApi,
  configApi,
  dashboardPrincipalApi,
  treinamentosApi,
  type DashboardPrincipalData,
} from "@/lib/axios";

import { DashboardSkeleton } from "./_components/DashboardSkeleton";
import { EtapasProjetoCard } from "./_components/EtapasProjetoCard";
import { EvolucaoProjetoCard } from "./_components/EvolucaoProjetoCard";
import { GanttSection } from "./_components/GanttSection";
import { KpiCards } from "./_components/KpiCards";
import { LinhaTempoCard } from "./_components/LinhaTempoCard";
import { ListaFuncoesCard } from "./_components/ListaFuncoesCard";
import { ProjetoInfoCard } from "./_components/ProjetoInfoCard";
import { StatusContratacaoCard } from "./_components/StatusContratacaoCard";
import { StatusGeralCard } from "./_components/StatusGeralCard";
import type { EtapasPorGrupo } from "./_components/helpers";

export default function DashboardClient() {
  const contentRef = useRef<HTMLDivElement>(null);
  const evolucaoTimelineRef = useRef<HTMLDivElement>(null);
  const { centroCusto, isReady: filterReady } = useFilter();

  // Busca dados da API
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-principal", centroCusto],
    queryFn: async () => {
      const response = await dashboardPrincipalApi.get(centroCusto);
      return response.data;
    },
    retry: 2,
    staleTime: 0,
    enabled: filterReady,
  });

  // Busca configurações do projeto para o card de cabeçalho
  const { data: configData } = useQuery({
    queryKey: ["config", centroCusto],
    queryFn: async () => {
      const response = await configApi.get(centroCusto);
      return response.data.data;
    },
    staleTime: 60000,
    enabled: filterReady,
  });

  const dashboardData: DashboardPrincipalData | undefined = data;

  // Busca todos os colaboradores para a lista de funções (inclui contratos indeterminados)
  const { data: colaboradoresData } = useQuery({
    queryKey: ["colaboradores", centroCusto],
    queryFn: async () => {
      const first = await colaboradoresApi.listar({
        centro_custo: centroCusto || undefined,
        limit: 100,
        page: 1,
      });
      const all = [...first.data.data];
      const totalPages = first.data.pagination.totalPages;
      if (totalPages > 1) {
        const promises = [];
        for (let p = 2; p <= totalPages; p++) {
          promises.push(
            colaboradoresApi.listar({
              centro_custo: centroCusto || undefined,
              limit: 100,
              page: p,
            })
          );
        }
        const rest = await Promise.all(promises);
        for (const r of rest) {
          all.push(...r.data.data);
        }
      }
      return { data: all, pagination: first.data.pagination };
    },
    enabled: filterReady,
    staleTime: 0,
  });
  const colaboradores = colaboradoresData?.data ?? [];

  // Agregado real de treinamentos (colaborador_treinamentos) para o Status Geral
  const { data: resumosTreinamentos } = useQuery({
    queryKey: ["treinamentos-resumo", centroCusto],
    queryFn: async () => {
      const response = await treinamentosApi.resumoPorColaborador(centroCusto || undefined);
      return response.data.data ?? [];
    },
    enabled: filterReady,
    staleTime: 0,
  });

  const etapasPorGrupo = useMemo<EtapasPorGrupo>(() => {
    if (!dashboardData?.etapas || !configData?.GRUPOS_ETAPAS?.length) return null;
    const grupos = [...configData.GRUPOS_ETAPAS].sort((a, b) => a.ordem - b.ordem);
    const grupoIdMap = new Map<number, number | null>();
    for (const e of configData.ETAPAS_PROJETO ?? []) {
      grupoIdMap.set(e.id, e.grupoId ?? null);
    }
    const byGrupo = new Map<number | null, typeof dashboardData.etapas>();
    for (const etapa of dashboardData.etapas) {
      const gId = grupoIdMap.get(etapa.id) ?? null;
      if (!byGrupo.has(gId)) byGrupo.set(gId, []);
      byGrupo.get(gId)!.push(etapa);
    }
    return { grupos, byGrupo };
  }, [dashboardData, configData]);

  if (isLoading || !data) {
    return (
      <ProtectedRoute>
        <DashboardSkeleton />
      </ProtectedRoute>
    );
  }

  if (isError) {
    const typedError = error as {
      response?: { data?: { error?: string }; status?: number };
      message?: string;
    };
    const errorMessage =
      typedError?.response?.data?.error ||
      typedError?.message ||
      "Erro desconhecido";
    const errorStatus = typedError?.response?.status;

    return (
      <ProtectedRoute>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">
            Erro ao carregar dashboard
          </p>
          {errorStatus && (
            <p className="text-sm text-destructive">Status: {errorStatus}</p>
          )}
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {errorMessage}
          </p>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="gap-2 mt-4"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full p-4 md:p-8">
        <div className="mx-auto max-w-7xl 2xl:max-w-[1800px]">

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="page-title">Gestão a Vista - Geral</h1>
              <p className="page-subtitle">
                Visão geral do projeto e métricas
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => refetch()}
              >
                <RefreshCw className="h-4 w-4" />
                Atualizar
              </Button>
              <ExportPdfButton targetRef={contentRef} filename="dashboard-principal" />
              <ExportPdfButton
                targetRef={evolucaoTimelineRef}
                filename="evolucao-e-timeline"
                label="Exportar Evolução + Timeline"
              />
            </div>
          </div>

          <div ref={contentRef}>

            {/* ── Card de Cabeçalho do Projeto ── */}
            {configData && centroCusto && <ProjetoInfoCard configData={configData} />}

            {/* ── Cards de KPIs ── */}
            <KpiCards dashboardData={dashboardData} />

            {/* ── Curva de mobilização + Plano de ação ── */}
            {/* Gated em configData (fonte canônica de datas) para não depender
              de dashboardData.projeto.dataInicio, que só existe quando a
              meta de admissões > 0. */}
            {configData?.DATA_INICIO_PROJETO && (
              <div ref={evolucaoTimelineRef}>
                <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                  <EvolucaoProjetoCard
                    dashboardData={dashboardData}
                    configData={configData}
                    etapasPorGrupo={etapasPorGrupo}
                  />
                  <LinhaTempoCard />
                </div>
              </div>
            )}

            {/* ── Cronograma de Etapas (Gantt) ── */}
            {dashboardData?.etapas && dashboardData.etapas.length > 0 && (
              <GanttSection
                etapas={dashboardData.etapas}
                etapasPorGrupo={etapasPorGrupo}
                configData={configData}
              />
            )}

            {/* ── Etapas do Projeto ── */}
            {dashboardData?.etapas && dashboardData.etapas.length > 0 && (
              <EtapasProjetoCard
                etapas={dashboardData.etapas}
                etapasPorGrupo={etapasPorGrupo}
              />
            )}

            {/* ── Status Contratual + Lista de Funções — grid side-by-side ── */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
              <StatusContratacaoCard statusCount={dashboardData?.graficos?.statusCount} />
              <ListaFuncoesCard colaboradores={colaboradores} />
            </div>

            {/* ── Status Geral ── */}
            <StatusGeralCard
              colaboradores={colaboradores}
              resumosTreinamentos={resumosTreinamentos}
            />

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

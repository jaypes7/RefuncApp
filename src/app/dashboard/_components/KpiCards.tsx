"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CanAccess } from "@/components/CanAccess";
import { useFilter } from "@/contexts/FilterContext";
import { pendenciasApi, type DashboardPrincipalData, type PendenciaManual } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { isEtapaAtrasada } from "./helpers";

export function KpiCards({ dashboardData }: { dashboardData: DashboardPrincipalData | undefined }) {
  const queryClient = useQueryClient();
  const { centroCusto, isReady: filterReady } = useFilter();

  // ── Pendências manuais ─────────────────────────────────────────────────────
  const [painelPendenciasAberto, setPainelPendenciasAberto] = useState(false);
  const [novoTextoPendencia, setNovoTextoPendencia] = useState("");

  const { data: pendenciasData } = useQuery({
    queryKey: ["pendencias-manuais", centroCusto],
    queryFn: async () => (await pendenciasApi.listar(centroCusto)).data.data,
    staleTime: 30_000,
    enabled: filterReady,
  });
  const pendenciasManuais = useMemo<PendenciaManual[]>(() => pendenciasData ?? [], [pendenciasData]);

  const criarPendencia = useMutation({
    mutationFn: () =>
      pendenciasApi.criar({ texto: novoTextoPendencia.trim(), centro_custo: centroCusto || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendencias-manuais", centroCusto], type: "all" });
      setNovoTextoPendencia("");
    },
  });

  const deletarPendencia = useMutation({
    mutationFn: (id: number) => pendenciasApi.deletar(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendencias-manuais", centroCusto], type: "all" }),
  });

  // Cálculos dos KPIs
  const kpis = useMemo(() => {
    const etapasAtrasadas = dashboardData?.etapas?.filter((e) => isEtapaAtrasada(e)).length ?? 0;
    const totalPendencias = etapasAtrasadas + pendenciasManuais.length;

    if (!dashboardData?.metricas) {
      return {
        total: 0,
        asoPercentual: 0,
        pendenciasSetoriais: totalPendencias,
        etapasAtrasadas,
      };
    }

    return {
      total: dashboardData.metricas.totalCadastrados,
      asoPercentual: dashboardData.metricas.percentualASO,
      pendenciasSetoriais: totalPendencias,
      etapasAtrasadas,
    };
  }, [dashboardData, pendenciasManuais]);

  const previsto = dashboardData?.metricas?.colaboradoresPrevistos ?? 0;
  const pct = previsto > 0
    ? Math.min(100, Math.round((kpis.total / previsto) * 100))
    : 0;

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Previsto vs Real */}
      <Card data-cardtv-id="geral-previsto-real" className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
            Previsto vs Real
          </CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="big-number text-[40px]">
            {kpis.total}
            {previsto > 0 && (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                / {previsto}
              </span>
            )}
          </div>
          {previsto > 0 ? (
            <>
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {pct}% do previsto atingido
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Cadastrados no sistema
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saúde (ASO) */}
      <Card data-cardtv-id="geral-saude-ocupacional" className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
            Saúde Ocupacional
          </CardTitle>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="big-number text-[40px]">
            {kpis.asoPercentual}%
          </div>
          <p className="text-xs text-muted-foreground">ASO Apto</p>
        </CardContent>
      </Card>

      {/* Pendências setoriais */}
      <Card
        data-cardtv-id="geral-pontos-atencao"
        className={cn(
          "glass-card transition-colors",
          kpis.pendenciasSetoriais > 0 && "border-[#FFB800]/60 bg-[#FFB800]/10"
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm 2xl:text-base font-medium text-muted-foreground">
            Pontos de atenção
          </CardTitle>
          <AlertCircle
            className={cn(
              "h-4 w-4",
              kpis.pendenciasSetoriais > 0 ? "text-[#FFB800]" : "text-destructive"
            )}
          />
        </CardHeader>
        <CardContent>
          <div
            className="big-number text-[40px]"
            style={{
              color: kpis.pendenciasSetoriais > 0 ? "#FFB800" : undefined,
            }}
          >
            {kpis.pendenciasSetoriais}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Etapas atrasadas + Pendências
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => setPainelPendenciasAberto((v) => !v)}
            >
              {painelPendenciasAberto ? (
                <>
                  Ocultar <ChevronUp className="h-3 w-3 ml-1" />
                </>
              ) : (
                <>
                  Ver detalhes <ChevronDown className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>

          {painelPendenciasAberto && (
            <div className="mt-3 space-y-3 border-t border-border/30 pt-3">
              {/* Etapas atrasadas */}
              {kpis.etapasAtrasadas > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1.5">
                    Etapas atrasadas
                  </p>
                  <div className="space-y-1">
                    {dashboardData?.etapas
                      ?.filter((e) => isEtapaAtrasada(e))
                      .map((etapa) => (
                        <div
                          key={etapa.id}
                          className="flex items-center gap-2 text-xs text-[#FFB800]"
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="truncate">{etapa.nome}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Pendências manuais */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70 mb-1.5">
                  Pendências manuais
                </p>
                {pendenciasManuais.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Nenhuma pendência manual registrada
                  </p>
                ) : (
                  <div className="space-y-1">
                    {pendenciasManuais.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-start justify-between gap-2 rounded-md border border-white/5 bg-white/5 px-2 py-1.5"
                      >
                        <span className="text-xs break-words leading-relaxed">{p.texto}</span>
                        <CanAccess role="user">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                            onClick={() => deletarPendencia.mutate(p.id)}
                            disabled={deletarPendencia.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </CanAccess>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulário de adicionar */}
                <CanAccess role="user">
                  <div className="flex gap-2 mt-2">
                    <Input
                      className="glass-input h-8 text-xs flex-1"
                      placeholder="Nova pendência..."
                      value={novoTextoPendencia}
                      onChange={(e) => setNovoTextoPendencia(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && novoTextoPendencia.trim() && !criarPendencia.isPending) {
                          criarPendencia.mutate();
                        }
                      }}
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      disabled={!novoTextoPendencia.trim() || criarPendencia.isPending}
                      onClick={() => criarPendencia.mutate()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CanAccess>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

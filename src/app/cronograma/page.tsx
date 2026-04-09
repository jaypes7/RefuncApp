// src/app/cronograma/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { calculateWorkingDays, calculateWorkingDaysDetailed, addWorkingDays, formatDateISO } from "@/lib/date-utils";
import { validateScheduleTotal } from "@/constants/cronograma-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  AlertCircle,
  CalendarClock,
  Building,
  Check,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CanAccess } from "@/components/CanAccess";

// --- Types ---
type EtapaCronograma = {
  id: number;
  nome: string;
  percentual_concluido: number;
  dias: number;
  concluida?: boolean;
  data_inicio?: string;
  data_fim?: string;
};

type ConfigCronograma = {
  etapas: EtapaCronograma[];
  dias_totais: number;
};

type ApiConfigResponse = {
  DIAS_TOTAIS_PROJETO: number;
  DATA_INICIO_PROJETO: string | null;
  DATA_FIM_PROJETO: string | null;
  ETAPA_ATUAL: number;
  META_ADMISSOES: number;
  ETAPAS_PROJETO: Array<{ id: number; nome: string; duracaoDias: number; concluida?: boolean; percentualConcluido?: number; dataInicio?: string; dataFim?: string }>;
  GERENTE_OPERACOES: string | null;
  GERENTE_CONTRATO: string | null;
  NOME_CLIENTE: string | null;
  CENTRO_CUSTO: string | null;
  COLABORADORES_PREVISTOS: number;
  ORCADO_SUPRIMENTOS: number;
};

const ETAPAS_DEFAULT: EtapaCronograma[] = [
  { id: 1,  nome: "Seleção de Mão de Obra",    dias: 3,  percentual_concluido: 0 },
  { id: 2,  nome: "Realização de Exames",       dias: 4,  percentual_concluido: 0 },
  { id: 3,  nome: "Liberação de ASO",           dias: 2,  percentual_concluido: 0 },
  { id: 4,  nome: "e-Social",                   dias: 4,  percentual_concluido: 0 },
  { id: 5,  nome: "Assinatura de contrato",     dias: 3,  percentual_concluido: 0 },
  { id: 6,  nome: "Treinamentos Normativos",    dias: 8,  percentual_concluido: 0 },
  { id: 7,  nome: "Portal do Colaborador",      dias: 3,  percentual_concluido: 0 },
  { id: 8,  nome: "Liberação de Credencial",    dias: 4,  percentual_concluido: 0 },
  { id: 9,  nome: "Liberação de EPIs",          dias: 3,  percentual_concluido: 0 },
  { id: 10, nome: "Início de Campo",            dias: 3,  percentual_concluido: 0 },
];

export default function CronogramaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [projetoData, setProjetoData] = useState<ApiConfigResponse | null>(null);

  const [cronograma, setCronograma] = useState<ConfigCronograma>({
    etapas: ETAPAS_DEFAULT,
    dias_totais: ETAPAS_DEFAULT.reduce((s, e) => s + e.dias, 0),
  });

  const { data: projetoQueryData } = useQuery<ApiConfigResponse>({
    queryKey: ["config", "projeto"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Falha ao carregar configurações");
      const json = await res.json();
      return json.data as ApiConfigResponse;
    },
  });

  // Buscar dias trabalhados do calendário
  const { data: diasTrabalhadosData } = useQuery({
    queryKey: ["config", "dias-trabalhados"],
    queryFn: async () => {
      const res = await fetch("/api/config/dias-trabalhados");
      if (!res.ok) throw new Error("Falha ao carregar dias trabalhados");
      const json = await res.json();
      return json.dias_trabalhados as string[];
    },
  });

  useEffect(() => {
    if (!projetoQueryData) return;
    setProjetoData(projetoQueryData);
    
    if (projetoQueryData.ETAPAS_PROJETO?.length) {
      const novasEtapas = ETAPAS_DEFAULT.map((etapaDefault) => {
        const salva = projetoQueryData.ETAPAS_PROJETO.find(
          (e) => e.nome === etapaDefault.nome,
        );
        return salva
          ? {
              ...etapaDefault,
              dias: salva.duracaoDias,
              concluida: salva.concluida ?? false,
              percentual_concluido: salva.percentualConcluido ?? 0,
              data_inicio: salva.dataInicio,
              data_fim: salva.dataFim,
            }
          : { ...etapaDefault, concluida: false };
      });
      const totalDias = novasEtapas.reduce((s, e) => s + e.dias, 0);
      setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
    }
  }, [projetoQueryData]);

  // Total de dias corridos = fim - início (inclusive)
  const diasCorridosTotal = useMemo(() => {
    if (!projetoData?.DATA_INICIO_PROJETO || !projetoData?.DATA_FIM_PROJETO) return null;
    const start = new Date(projetoData.DATA_INICIO_PROJETO);
    const end = new Date(projetoData.DATA_FIM_PROJETO);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [projetoData?.DATA_INICIO_PROJETO, projetoData?.DATA_FIM_PROJETO]);

  // Total de dias úteis = dias marcados no calendário
  const diasUteisTotal = useMemo<number | null>(() => {
    if (!diasTrabalhadosData) return null;
    return diasTrabalhadosData.length;
  }, [diasTrabalhadosData]);

  const scheduleValidation = useMemo(() => {
    if (diasUteisTotal === null) return null;
    const stepsDays = cronograma.etapas.map((e) => e.dias);
    return validateScheduleTotal(stepsDays, diasUteisTotal);
  }, [cronograma.etapas, diasUteisTotal]);

  const cronogramaMutation = useMutation({
    mutationFn: async (data: ConfigCronograma) => {
      const payload = {
        etapas: data.etapas.map((e) => ({
          id: e.id,
          nome: e.nome,
          duracaoDias: e.dias,
          concluida: e.concluida ?? false,
          percentualConcluido: e.percentual_concluido ?? 0,
          dataInicio: e.data_inicio || null,
          dataFim: e.data_fim || null,
        })),
      };

      const res = await fetch("/api/config/etapas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar cronograma");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Cronograma atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateEtapaDias = (id: number, dias: number) => {
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, dias: Math.max(0, dias) } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const updateEtapaConcluida = (id: number, concluida: boolean) => {
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, concluida } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    const novoEstado: ConfigCronograma = { etapas: novasEtapas, dias_totais: totalDias };
    setCronograma(novoEstado);
    cronogramaMutation.mutate(novoEstado);
  };

  const updateEtapaPercentual = (id: number, pct: number) => {
    const valor = Math.max(0, Math.min(100, pct || 0));
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, percentual_concluido: valor } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const updateEtapaDataInicio = (id: number, data: string) => {
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, data_inicio: data } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const updateEtapaDataFim = (id: number, data: string) => {
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, data_fim: data } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const etapasDatas = useMemo(() => {
    if (!projetoData?.DATA_INICIO_PROJETO) return null;
    let cursor = projetoData.DATA_INICIO_PROJETO;
    return cronograma.etapas.map((e) => {
      const startDate = cursor;
      const endDate = formatDateISO(addWorkingDays(startDate, Math.max(0, e.dias - 1)));
      const { calendarDays, workingDays } = calculateWorkingDaysDetailed(startDate, endDate);
      cursor = formatDateISO(addWorkingDays(endDate, 1));
      return { id: e.id, startDate, endDate, calendarDays, workingDays };
    });
  }, [projetoData?.DATA_INICIO_PROJETO, cronograma.etapas]);

  const etapasPesos = useMemo(() => {
    const totalDias = cronograma.dias_totais || 1;
    let acum = 0;
    return cronograma.etapas.map((e) => {
      const inicio = Math.round((acum / totalDias) * 100);
      acum += e.dias;
      const fim = Math.round((acum / totalDias) * 100);
      return { id: e.id, inicio, fim };
    });
  }, [cronograma.etapas, cronograma.dias_totais]);

  type EtapaDateError = {
    id: number;
    dataInicio: boolean;
    dataFim: boolean;
    dataStartGreaterThanEnd: boolean;
  };

  const etapasDateErrors = useMemo<EtapaDateError[]>(() => {
    if (!projetoData?.DATA_INICIO_PROJETO || !projetoData?.DATA_FIM_PROJETO) return [];
    return cronograma.etapas.map((etapa) => ({
      id: etapa.id,
      dataInicio: !!(
        etapa.data_inicio &&
        (etapa.data_inicio < projetoData.DATA_INICIO_PROJETO! || etapa.data_inicio > projetoData.DATA_FIM_PROJETO!)
      ),
      dataFim: !!(
        etapa.data_fim &&
        (etapa.data_fim < projetoData.DATA_INICIO_PROJETO! || etapa.data_fim > projetoData.DATA_FIM_PROJETO!)
      ),
      dataStartGreaterThanEnd: !!(
        etapa.data_inicio &&
        etapa.data_fim &&
        etapa.data_inicio > etapa.data_fim
      ),
    }));
  }, [cronograma.etapas, projetoData?.DATA_INICIO_PROJETO, projetoData?.DATA_FIM_PROJETO]);

  const hasDateErrors = useMemo(
    () => etapasDateErrors.some((e) => e.dataInicio || e.dataFim || e.dataStartGreaterThanEnd),
    [etapasDateErrors],
  );

  if (authLoading) return null;

  if (user?.perfil !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <CalendarClock className="h-8 w-8 text-destructive/60" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Acesso Negado</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Apenas administradores podem visualizar esta página.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <CanAccess role="admin">
        <div className="w-full max-w-6xl mx-auto p-6 md:p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CalendarClock className="h-8 w-8 text-primary" />
              Cronograma - Avanço
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as etapas e o avanço físico do projeto
            </p>
          </div>

          <Card className="glass-card">
            <CardContent className="p-6 space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                  <Building className="w-5 h-5 text-primary" />
                  Cronograma do Projeto
                </h2>
                <p className="text-sm text-muted-foreground">
                  Defina a duração e o avanço de cada etapa
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="font-medium">Soma das Etapas:</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {cronograma.etapas.reduce((s, e) => s + e.dias, 0)} dias úteis
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5 p-3 bg-primary/5 rounded-lg border border-primary/15">
                    <span className="text-xs text-muted-foreground">Total Dias Corridos</span>
                    <span className="text-xl font-bold text-primary tabular-nums">
                      {diasCorridosTotal ?? 0}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 p-3 bg-primary/5 rounded-lg border border-primary/15">
                    <span className="text-xs text-muted-foreground">Total Dias Úteis</span>
                    <span className="text-xl font-bold text-primary tabular-nums">
                      {diasUteisTotal ?? 0}
                    </span>
                  </div>
                </div>

                {diasUteisTotal !== null &&
                  scheduleValidation !== null &&
                  (scheduleValidation.valid ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                      <Check className="h-4 w-4 shrink-0" />
                      <span>
                        Cronograma balanceado — {scheduleValidation.stepsDaysTotal} dias úteis
                        alocados (meta: {diasUteisTotal} dias úteis do projeto).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                      <X className="h-4 w-4 shrink-0" />
                      <span>
                        {scheduleValidation.difference > 0
                          ? `As etapas excedem o projeto em ${scheduleValidation.difference} dia(s) útil(is).`
                          : `Faltam ${Math.abs(scheduleValidation.difference)} dia(s) útil(is).`}{" "}
                        <span className="opacity-70">
                          (Etapas: {scheduleValidation.stepsDaysTotal} · Projeto: {diasUteisTotal})
                        </span>
                      </span>
                    </div>
                  ))}

                {diasUteisTotal === null && (
                  <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Configure as datas de início e término na aba Projeto
                      e marque os dias trabalhados no calendário para validar o cronograma.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {cronograma.etapas.map((etapa) => {
                  const dateError = etapasDateErrors.find((e) => e.id === etapa.id);
                  return (
                    <div
                      key={etapa.id}
                      className={`space-y-3 p-4 rounded-lg border transition-colors ${
                        etapa.concluida
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-card/50 border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                            etapa.concluida
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {etapa.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-2">
                            <span className="truncate">{etapa.nome}</span>
                            {etapa.concluida && (
                              <Badge
                                variant="outline"
                                className="shrink-0 h-4 px-1.5 text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              >
                                Concluído
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(() => {
                              const p = etapasPesos.find((x) => x.id === etapa.id);
                              return p ? `${p.inicio}% – ${p.fim}% do cronograma` : "";
                            })()}
                          </div>
                          {etapasDatas && (() => {
                            const d = etapasDatas.find((x) => x.id === etapa.id);
                            return d ? (
                              <div className="text-xs text-muted-foreground/70 mt-0.5 tabular-nums">
                                Corridos: {d.calendarDays}&nbsp;|&nbsp;Úteis: {d.workingDays}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={0}
                            value={etapa.dias}
                            onChange={(e) =>
                              updateEtapaDias(etapa.id, parseInt(e.target.value) || 0)
                            }
                            className="w-20 glass-input text-center"
                            title="Duração em dias úteis"
                          />
                          <span className="text-sm text-muted-foreground w-10 shrink-0">
                            dias
                          </span>
                          <div className="flex flex-col items-center gap-0.5">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={etapa.percentual_concluido}
                              onChange={(e) =>
                                updateEtapaPercentual(etapa.id, parseInt(e.target.value))
                              }
                              className="w-16 glass-input text-center"
                              title="Avanço físico desta etapa (0–100%)"
                            />
                            <span className="text-[10px] text-muted-foreground">
                              % físico
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-0.5 ml-1">
                            <Switch
                              checked={etapa.concluida ?? false}
                              onCheckedChange={(checked: boolean) =>
                                updateEtapaConcluida(etapa.id, checked)
                              }
                              disabled={cronogramaMutation.isPending}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              Concluída
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-end gap-4 ml-12 pt-2 border-t border-border/30">
                        <div className="flex-1 flex gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              Data de Início
                            </label>
                            <Input
                              type="date"
                              value={etapa.data_inicio || ""}
                              onChange={(e) =>
                                updateEtapaDataInicio(etapa.id, e.target.value)
                              }
                              disabled={!projetoData?.DATA_INICIO_PROJETO || !projetoData?.DATA_FIM_PROJETO}
                              className={`glass-input ${
                                dateError?.dataInicio || dateError?.dataStartGreaterThanEnd
                                  ? "border-red-500/50 bg-red-500/5"
                                  : ""
                              }`}
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              Data de Fim
                            </label>
                            <Input
                              type="date"
                              value={etapa.data_fim || ""}
                              onChange={(e) =>
                                updateEtapaDataFim(etapa.id, e.target.value)
                              }
                              disabled={!projetoData?.DATA_INICIO_PROJETO || !projetoData?.DATA_FIM_PROJETO}
                              className={`glass-input ${
                                dateError?.dataFim || dateError?.dataStartGreaterThanEnd
                                  ? "border-red-500/50 bg-red-500/5"
                                  : ""
                              }`}
                            />
                          </div>
                        </div>
                        {dateError && (dateError.dataInicio || dateError.dataFim || dateError.dataStartGreaterThanEnd) && (
                          <div className="flex items-center gap-1.5 text-xs text-red-400 pb-0.5">
                            <X className="w-3.5 h-3.5" />
                            <span>
                              {dateError.dataStartGreaterThanEnd
                                ? "Início > Fim"
                                : dateError.dataInicio
                                ? "Início fora do intervalo"
                                : "Fim fora do intervalo"}
                            </span>
                          </div>
                        )}
                        {dateError && !(dateError.dataInicio || dateError.dataFim || dateError.dataStartGreaterThanEnd) && etapa.data_inicio && etapa.data_fim && (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 pb-0.5">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3">
                {hasDateErrors && (
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    Corrija os erros de data para salvar
                  </div>
                )}
                <Button
                  onClick={() => cronogramaMutation.mutate(cronograma)}
                  disabled={cronogramaMutation.isPending || hasDateErrors}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cronograma
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </CanAccess>
    </ProtectedRoute>
  );
}

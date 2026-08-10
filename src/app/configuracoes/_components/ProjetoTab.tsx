"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Building, CalendarClock, Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkingDaysCalendar } from "@/components/WorkingDaysCalendar";
import { useFilter } from "@/contexts/FilterContext";
import { getNationalHolidays } from "@/lib/date-utils";
import { useProjetos } from "./shared";

type ConfigProjeto = {
  gerente_operacoes: string;
  gerente_contrato: string;
  nome_cliente: string;
  centro_custo: string;
  data_inicio: string;
  data_fim: string;
  colaboradores_previstos: string;
  orcado_suprimentos: string;
};

// Tipo que reflete exatamente o shape retornado por GET /api/config
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
  FERIADOS_PROJETO: string[];
};

const EMPTY_PROJETO: ConfigProjeto = {
  gerente_operacoes: "",
  gerente_contrato: "",
  nome_cliente: "",
  centro_custo: "",
  data_inicio: "",
  data_fim: "",
  colaboradores_previstos: "",
  orcado_suprimentos: "",
};

function mapProjetoData(data: ApiConfigResponse | undefined): ConfigProjeto {
  if (!data) return EMPTY_PROJETO;
  return {
    gerente_operacoes: data.GERENTE_OPERACOES || "",
    gerente_contrato: data.GERENTE_CONTRATO || "",
    nome_cliente: data.NOME_CLIENTE || "",
    centro_custo: data.CENTRO_CUSTO || "",
    data_inicio: data.DATA_INICIO_PROJETO || "",
    data_fim: data.DATA_FIM_PROJETO || "",
    colaboradores_previstos:
      data.COLABORADORES_PREVISTOS > 0 ? String(data.COLABORADORES_PREVISTOS) : "",
    orcado_suprimentos:
      data.ORCADO_SUPRIMENTOS > 0 ? String(data.ORCADO_SUPRIMENTOS) : "",
  };
}

export function ProjetoTab() {
  const queryClient = useQueryClient();
  const { centroCusto, setCentroCusto, isReady: filterReady } = useFilter();
  const { data: projetosData } = useProjetos();

  // Projetos (CRUD)
  const [novoProjetoOpen, setNovoProjetoOpen] = useState(false);
  const [novoProjetoCC, setNovoProjetoCC] = useState("");
  const [novoProjetoNome, setNovoProjetoNome] = useState("");

  const [projetoDraft, setProjetoDraft] = useState<{
    key: string;
    value: ConfigProjeto;
  } | null>(null);

  // ── Dias trabalhados (calendário) ──────────────────────────────────────────
  const [diasTrabalhadosDraft, setDiasTrabalhadosDraft] = useState<{
    key: string | null;
    value: string[];
  } | null>(null);
  const [feriadosDraft, setFeriadosDraft] = useState<{
    key: string | null;
    value: string[];
  } | null>(null);
  const [calendarioAno, setCalendarioAno] = useState(new Date().getFullYear());
  const [calendarioMes, setCalendarioMes] = useState(new Date().getMonth());
  const [calendarioModo, setCalendarioModo] = useState<"working" | "holiday">("working");

  // Query para buscar dias trabalhados
  const { data: diasTrabalhadosData } = useQuery({
    queryKey: ["config", "dias-trabalhados", centroCusto],
    queryFn: async () => {
      const params = centroCusto
        ? `?centro_custo=${encodeURIComponent(centroCusto)}`
        : "";
      const res = await fetch(`/api/config/dias-trabalhados${params}`);
      if (!res.ok) throw new Error("Falha ao carregar dias trabalhados");
      const json = await res.json();
      return json.dias_trabalhados as string[];
    },
    enabled: filterReady && !!centroCusto,
  });

  const diasTrabalhados =
    diasTrabalhadosDraft?.key === centroCusto
      ? diasTrabalhadosDraft.value
      : diasTrabalhadosData ?? [];
  const setDiasTrabalhados = (
    updater: string[] | ((prev: string[]) => string[]),
  ) => {
    setDiasTrabalhadosDraft({
      key: centroCusto,
      value:
        typeof updater === "function"
          ? (updater as (prev: string[]) => string[])(diasTrabalhados)
          : updater,
    });
  };

  // Query para buscar feriados
  const { data: feriadosData } = useQuery({
    queryKey: ["config", "feriados", centroCusto],
    queryFn: async () => {
      const params = centroCusto
        ? `?centro_custo=${encodeURIComponent(centroCusto)}`
        : "";
      const res = await fetch(`/api/config/feriados${params}`);
      if (!res.ok) throw new Error("Falha ao carregar feriados");
      const json = await res.json();
      return json.feriados as string[];
    },
    enabled: filterReady && !!centroCusto,
  });

  const feriados =
    feriadosDraft?.key === centroCusto ? feriadosDraft.value : feriadosData ?? [];
  const setFeriados = (updater: string[] | ((prev: string[]) => string[])) => {
    setFeriadosDraft({
      key: centroCusto,
      value:
        typeof updater === "function"
          ? (updater as (prev: string[]) => string[])(feriados)
          : updater,
    });
  };

  // Handler para toggle de feriado (protege feriados nacionais)
  const toggleFeriado = (date: string) => {
    if (feriadosNacionais.includes(date)) {
      toast.error("Feriados nacionais não podem ser removidos manualmente.");
      return;
    }
    setFeriados((prev) => {
      const newFeriados = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date].sort();
      return newFeriados;
    });
  };

  // Handler para toggle de dia
  const toggleDiaTrabalhado = (date: string) => {
    setDiasTrabalhados((prev) => {
      const newDias = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date].sort();
      return newDias;
    });
  };

  const projetoQueryCc = centroCusto || projetosData?.[0]?.centro_custo || "";

  const { data: projetoData } = useQuery<ApiConfigResponse>({
    queryKey: ["config", "projeto", projetoQueryCc],
    queryFn: async () => {
      const params = projetoQueryCc
        ? `?centro_custo=${encodeURIComponent(projetoQueryCc)}`
        : "";
      const res = await fetch(`/api/config${params}`);
      if (!res.ok) throw new Error("Falha ao carregar configurações");
      const json = await res.json();
      return json.data as ApiConfigResponse;
    },
    enabled: filterReady && !!projetoQueryCc,
  });

  const projetoFromServer = useMemo(
    () => mapProjetoData(projetoData),
    [projetoData],
  );
  const projeto =
    projetoDraft?.key === projetoQueryCc ? projetoDraft.value : projetoFromServer;
  const setProjeto = (
    updater: ConfigProjeto | ((prev: ConfigProjeto) => ConfigProjeto),
  ) => {
    setProjetoDraft({
      key: projetoQueryCc,
      value:
        typeof updater === "function"
          ? (updater as (prev: ConfigProjeto) => ConfigProjeto)(projeto)
          : updater,
    });
  };

  // ── Feriados nacionais computados automaticamente ───────────────────────────
  const feriadosNacionais = (() => {
    if (!projeto.data_inicio || !projeto.data_fim) return [];
    const start = new Date(projeto.data_inicio);
    const end = new Date(projeto.data_fim);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const all: string[] = [];
    for (let year = startYear; year <= endYear; year++) {
      all.push(...getNationalHolidays(year));
    }
    // Filtra apenas os que estão dentro do intervalo do projeto
    return all.filter((d) => d >= projeto.data_inicio! && d <= projeto.data_fim!).sort();
  })();

  // Feriados exibidos = nacionais (automáticos) + regionais (manuais)
  const feriadosParaExibir = (() => {
    const set = new Set([...feriadosNacionais, ...feriados]);
    return Array.from(set).sort();
  })();

  // Calcula dias corridos totais
  const diasCorridosTotal = useMemo(() => {
    if (!projeto.data_inicio || !projeto.data_fim) return null;
    const start = new Date(projeto.data_inicio);
    const end = new Date(projeto.data_fim);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [projeto.data_inicio, projeto.data_fim]);

  const criarProjetoMutation = useMutation({
    mutationFn: async (data: { centro_custo: string; nome_cliente?: string }) => {
      const res = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao criar projeto");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projetos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["centros-custo"], type: "all" });
      setNovoProjetoOpen(false);
      setNovoProjetoCC("");
      setNovoProjetoNome("");
      setCentroCusto(variables.centro_custo);
      toast.success(`Projeto ${variables.centro_custo} criado com sucesso!`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const excluirProjetoMutation = useMutation({
    mutationFn: async (cc: string) => {
      const res = await fetch(`/api/projetos/${encodeURIComponent(cc)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao excluir projeto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projetos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["centros-custo"], type: "all" });
      toast.success("Projeto excluído com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const projetoMutation = useMutation({
    mutationFn: async (data: ConfigProjeto) => {
      // Envia apenas dados do projeto — etapas NÃO são incluídas
      const payload: Record<string, unknown> = {
        gerenteOperacoes: data.gerente_operacoes,
        gerenteContrato: data.gerente_contrato,
        nomeCliente: data.nome_cliente,
        centroCusto: data.centro_custo,
        centroCustoOriginal: data.centro_custo !== (projetoData?.CENTRO_CUSTO || "")
          ? (projetoData?.CENTRO_CUSTO || "")
          : data.centro_custo,
        dataInicio: data.data_inicio,
        dataFim: data.data_fim,
      };
      if (data.colaboradores_previstos) {
        payload.colaboradores_previstos = Number(data.colaboradores_previstos);
      }
      if (data.orcado_suprimentos) {
        payload.orcado_suprimentos = Number(data.orcado_suprimentos);
      }
      payload.feriados_projeto = feriados;

      const res = await fetch("/api/config/projeto-dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar projeto");
      }

      const feriadosRes = await fetch("/api/config/feriados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feriados, centro_custo: data.centro_custo }),
      });
      if (!feriadosRes.ok) {
        const body = await feriadosRes.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar feriados");
      }

      const diasRes = await fetch("/api/config/dias-trabalhados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dias_trabalhados: diasTrabalhados,
          centro_custo: data.centro_custo,
        }),
      });
      if (!diasRes.ok) {
        const body = await diasRes.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar dias trabalhados");
      }

      return res.json();
    },
    onSuccess: (_, variables) => {
      const novoCC = variables.centro_custo;
      const ccOriginal = projetoData?.CENTRO_CUSTO || "";

      if (novoCC !== ccOriginal) {
        setCentroCusto(novoCC);
      }

      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["config", "feriados"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["config", "dias-trabalhados"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["projetos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
      queryClient.setQueryData(["config", "feriados", novoCC], feriados);
      queryClient.setQueryData(["config", "dias-trabalhados", novoCC], diasTrabalhados);
      setFeriadosDraft(null);
      setDiasTrabalhadosDraft(null);
      toast.success("Configurações do projeto salvas!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      {/* ── Seleção e Gerenciamento de Projetos ── */}
      <Card className="border border-border/60 bg-card/40">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex-1 min-w-0">
              <label className="text-sm font-medium mb-1.5 block">Projeto ativo</label>
              <Select
                value={centroCusto || ""}
                onValueChange={(v) => setCentroCusto(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um projeto" />
                </SelectTrigger>
                <SelectContent>
                  {(projetosData || []).map((p) => (
                    <SelectItem key={p.centro_custo} value={p.centro_custo}>
                      {p.centro_custo}
                      {p.nome_cliente ? ` — ${p.nome_cliente}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => setNovoProjetoOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Novo Projeto
              </Button>
              <Button
                variant="destructive"
                className="gap-2"
                disabled={!centroCusto || projetosData?.length === 1}
                onClick={() => {
                  if (!centroCusto) return;
                  if (confirm(`Tem certeza que deseja excluir o projeto ${centroCusto}? Esta ação não pode ser desfeita.`)) {
                    excluirProjetoMutation.mutate(centroCusto);
                  }
                }}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Building className="w-5 h-5 text-primary" />
          Gestão do Projeto
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure as informações básicas da obra
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Gerente de Operações
          </label>
          <Input
            value={projeto.gerente_operacoes}
            onChange={(e) =>
              setProjeto({
                ...projeto,
                gerente_operacoes: e.target.value,
              })
            }
            className="glass-input"
            placeholder="Nome do gerente de operações"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Gerente de Contrato
          </label>
          <Input
            value={projeto.gerente_contrato}
            onChange={(e) =>
              setProjeto({
                ...projeto,
                gerente_contrato: e.target.value,
              })
            }
            className="glass-input"
            placeholder="Nome do gerente de contrato"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Nome do Cliente
          </label>
          <Input
            value={projeto.nome_cliente}
            onChange={(e) =>
              setProjeto({ ...projeto, nome_cliente: e.target.value })
            }
            className="glass-input"
            placeholder="Nome do cliente"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Centro de Custo
          </label>
          <Input
            value={projeto.centro_custo}
            onChange={(e) =>
              setProjeto({ ...projeto, centro_custo: e.target.value })
            }
            className="glass-input"
            placeholder="Código do centro de custo"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Data de Início
          </label>
          <Input
            type="date"
            value={projeto.data_inicio}
            onChange={(e) =>
              setProjeto({ ...projeto, data_inicio: e.target.value })
            }
            className="glass-input"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Data de Término
          </label>
          <Input
            type="date"
            value={projeto.data_fim}
            onChange={(e) =>
              setProjeto({ ...projeto, data_fim: e.target.value })
            }
            className="glass-input"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">
            Colaboradores Previstos
          </label>
          <Input
            type="number"
            min={0}
            value={projeto.colaboradores_previstos}
            onChange={(e) =>
              setProjeto({
                ...projeto,
                colaboradores_previstos: e.target.value,
              })
            }
            className="glass-input"
            placeholder="Ex: 200"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Orçamento de Suprimentos (R$)
          </label>
          <Input
            type="number"
            min={0}
            value={projeto.orcado_suprimentos}
            onChange={(e) =>
              setProjeto({
                ...projeto,
                orcado_suprimentos: e.target.value,
              })
            }
            className="glass-input"
            placeholder="Ex: 50000"
          />
        </div>

      </div>

      {/* ── Calendário de Dias Trabalhados ── */}
      <div className="border-t border-border/50 pt-8 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Dias Trabalhados do Projeto
          </h3>
          <p className="text-sm text-muted-foreground">
            Feriados nacionais são preenchidos automaticamente. Marque manualmente os dias em que houve trabalho no projeto e os feriados regionais. É possível marcar um feriado também como dia trabalhado.
          </p>
        </div>

        {projeto.data_inicio && projeto.data_fim ? (
          <div className="space-y-4">
            {/* Resumo estatístico */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1 p-4 bg-primary/5 rounded-lg border border-primary/15">
                <span className="text-xs text-muted-foreground">Dias Corridos</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {diasCorridosTotal ?? 0}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4 bg-primary/5 rounded-lg border border-primary/15">
                <span className="text-xs text-muted-foreground">Dias Trabalhados</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {diasTrabalhados.length}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4 bg-red-500/5 rounded-lg border border-red-500/15">
                <span className="text-xs text-muted-foreground">Feriados</span>
                <span className="text-2xl font-bold text-red-600 tabular-nums">
                  {feriadosParaExibir.length}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4 bg-red-500/5 rounded-lg border border-red-500/15">
                <span className="text-xs text-muted-foreground">Feriados Trabalhados</span>
                <span className="text-2xl font-bold text-red-600 tabular-nums">
                  {feriadosParaExibir.filter((d) => diasTrabalhados.includes(d)).length}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-4 bg-primary/5 rounded-lg border border-primary/15">
                <span className="text-xs text-muted-foreground">Percentual</span>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {diasCorridosTotal
                    ? ((diasTrabalhados.length / diasCorridosTotal) * 100).toFixed(2)
                    : "0.00"}
                  %
                </span>
              </div>
            </div>

            {/* Calendário */}
            <WorkingDaysCalendar
              year={calendarioAno}
              month={calendarioMes}
              workingDays={diasTrabalhados}
              holidays={feriadosParaExibir}
              onToggle={toggleDiaTrabalhado}
              onToggleHoliday={toggleFeriado}
              editMode={calendarioModo}
              onChangeEditMode={setCalendarioModo}
              minDate={projeto.data_inicio}
              maxDate={projeto.data_fim}
              nationalHolidays={feriadosNacionais}
              onPrevMonth={() => {
                if (calendarioMes === 0) {
                  setCalendarioMes(11);
                  setCalendarioAno(calendarioAno - 1);
                } else {
                  setCalendarioMes(calendarioMes - 1);
                }
              }}
              onNextMonth={() => {
                if (calendarioMes === 11) {
                  setCalendarioMes(0);
                  setCalendarioAno(calendarioAno + 1);
                } else {
                  setCalendarioMes(calendarioMes + 1);
                }
              }}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-4 text-sm text-yellow-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              Configure as datas de início e término do projeto para habilitar o calendário de dias trabalhados.
            </span>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => projetoMutation.mutate(projeto)}
          disabled={projetoMutation.isPending}
          className="gap-2"
          style={{
            backgroundColor: "#ff460a",
            borderColor: "#ff460a",
          }}
        >
          <Save className="w-4 h-4" />
          Salvar Configurações
        </Button>
      </div>

      {/* Dialog: Novo Projeto */}
      <Dialog open={novoProjetoOpen} onOpenChange={setNovoProjetoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Projeto</DialogTitle>
            <DialogDescription>
              Crie um novo projeto informando o centro de custo e, opcionalmente, o nome do cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Centro de Custo *</label>
              <Input
                placeholder="Ex: 09.06.0001.171"
                value={novoProjetoCC}
                onChange={(e) => setNovoProjetoCC(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome do Cliente</label>
              <Input
                placeholder="Ex: Cliente Alfa"
                value={novoProjetoNome}
                onChange={(e) => setNovoProjetoNome(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoProjetoOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!novoProjetoCC.trim() || criarProjetoMutation.isPending}
              onClick={() =>
                criarProjetoMutation.mutate({
                  centro_custo: novoProjetoCC.trim(),
                  nome_cliente: novoProjetoNome.trim() || undefined,
                })
              }
            >
              {criarProjetoMutation.isPending ? "Criando..." : "Criar Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

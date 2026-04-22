// src/app/cronograma/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  User,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
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
  responsavel?: string | null;
};

type ConfigCronograma = {
  etapas: EtapaCronograma[];
  dias_totais: number;
};

type ProgressoDiarioEntry = {
  etapa_id: number;
  data: string; // YYYY-MM-DD
  percentual: number;
};

type ApiConfigResponse = {
  DIAS_TOTAIS_PROJETO: number;
  DATA_INICIO_PROJETO: string | null;
  DATA_FIM_PROJETO: string | null;
  ETAPA_ATUAL: number;
  META_ADMISSOES: number;
  ETAPAS_PROJETO: Array<{ id: number; nome: string; duracaoDias: number; concluida?: boolean; percentualConcluido?: number; dataInicio?: string; dataFim?: string; responsavel?: string | null }>;
  GERENTE_OPERACOES: string | null;
  GERENTE_CONTRATO: string | null;
  NOME_CLIENTE: string | null;
  CENTRO_CUSTO: string | null;
  COLABORADORES_PREVISTOS: number;
  ORCADO_SUPRIMENTOS: number;
};

const ETAPAS_DEFAULT: EtapaCronograma[] = [
  { id: 1,  nome: "PGR E PCMSO",                dias: 3,  percentual_concluido: 0 },
  { id: 2,  nome: "Seleção de Mão de Obra",     dias: 3,  percentual_concluido: 0 },
  { id: 3,  nome: "Realização de Exames",       dias: 4,  percentual_concluido: 0 },
  { id: 4,  nome: "Liberação de ASO",           dias: 2,  percentual_concluido: 0 },
  { id: 5,  nome: "e-Social",                   dias: 4,  percentual_concluido: 0 },
  { id: 6,  nome: "Assinatura de contrato",     dias: 3,  percentual_concluido: 0 },
  { id: 7,  nome: "Treinamentos Normativos",    dias: 8,  percentual_concluido: 0 },
  { id: 8,  nome: "Portal do Colaborador",      dias: 3,  percentual_concluido: 0 },
  { id: 9,  nome: "Liberação de Credencial",    dias: 4,  percentual_concluido: 0 },
  { id: 10, nome: "Liberação de EPIs",          dias: 3,  percentual_concluido: 0 },
  { id: 11, nome: "Início de Campo",            dias: 3,  percentual_concluido: 0 },
];

// Retorna todos os dias corridos entre duas datas (inclusive), formato YYYY-MM-DD
function getDaysInRange(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const cur = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  while (cur <= end) {
    days.push(formatDateISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// Calcula dias úteis de uma etapa a partir das datas e do calendário
function calcularDiasUteisEtapa(
  dataInicio: string | undefined,
  dataFim: string | undefined,
  diasTrabalhadosData: string[] | undefined,
): number {
  if (!dataInicio || !dataFim) return 0;
  if (diasTrabalhadosData && diasTrabalhadosData.length > 0) {
    const diasTrabalhadosSet = new Set(diasTrabalhadosData);
    return getDaysInRange(dataInicio, dataFim).filter((dia) => diasTrabalhadosSet.has(dia)).length;
  }
  // Fallback: usa cálculo de dias úteis padrão quando calendário ainda não carregou
  return calculateWorkingDays(dataInicio, dataFim);
}

export default function CronogramaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { centroCusto } = useFilter();
  const queryClient = useQueryClient();

  const [projetoData, setProjetoData] = useState<ApiConfigResponse | null>(null);

  const [cronograma, setCronograma] = useState<ConfigCronograma>({
    etapas: ETAPAS_DEFAULT,
    dias_totais: ETAPAS_DEFAULT.reduce((s, e) => s + e.dias, 0),
  });

  // Estado para modal de confirmação quando cronograma desbalanceado
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<ConfigCronograma | null>(null);

  // Estado para painel de avanço diário por etapa
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  // progressoDiario: etapa_id → { "YYYY-MM-DD": percentual | null }
  const [progressoDiario, setProgressoDiario] = useState<Record<number, Record<string, number | null>>>({});

  // Edição inline do nome da etapa
  const [editingEtapaId, setEditingEtapaId] = useState<number | null>(null);
  const [editingEtapaNome, setEditingEtapaNome] = useState("");

  const { data: projetoQueryData } = useQuery<ApiConfigResponse>({
    queryKey: ["config", "projeto", centroCusto],
    queryFn: async () => {
      const params = centroCusto
        ? `?centro_custo=${encodeURIComponent(centroCusto)}`
        : "";
      const res = await fetch(`/api/config${params}`);
      if (!res.ok) throw new Error("Falha ao carregar configurações");
      const json = await res.json();
      return json.data as ApiConfigResponse;
    },
    enabled: !!centroCusto,
  });

  // Buscar dias trabalhados do calendário
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
    enabled: !!centroCusto,
  });

  // Buscar progresso diário das etapas
  const { data: progressoDiarioData } = useQuery<ProgressoDiarioEntry[]>({
    queryKey: ["etapas-progresso", centroCusto],
    queryFn: async () => {
      const params = centroCusto
        ? `?centro_custo=${encodeURIComponent(centroCusto)}`
        : "";
      const res = await fetch(`/api/etapas/progresso${params}`);
      if (!res.ok) throw new Error("Falha ao carregar progresso diário");
      const json = await res.json();
      return json.data as ProgressoDiarioEntry[];
    },
    enabled: !!centroCusto,
  });

  // Mutation para salvar progresso de um dia específico
  const progressoMutation = useMutation({
    mutationFn: async (entry: { etapa_id: number; data: string; percentual: number | null }) => {
      const res = await fetch("/api/etapas/progresso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centro_custo: centroCusto, ...entry }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar progresso");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-progresso"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    if (!projetoQueryData) return;
    setProjetoData(projetoQueryData);

    if (projetoQueryData.ETAPAS_PROJETO?.length) {
      const novasEtapas = ETAPAS_DEFAULT.map((etapaDefault, index) => {
        const salva = projetoQueryData.ETAPAS_PROJETO[index];
        if (!salva) return { ...etapaDefault, concluida: false };
        // Se existirem datas salvas, deriva dias do calendário; senão, usa duracaoDias
        const diasSalvos = salva.dataInicio && salva.dataFim
          ? calcularDiasUteisEtapa(salva.dataInicio, salva.dataFim, diasTrabalhadosData)
          : salva.duracaoDias;
        return {
          ...etapaDefault,
          nome: salva.nome ?? etapaDefault.nome,
          dias: diasSalvos,
          concluida: salva.concluida ?? false,
          percentual_concluido: salva.percentualConcluido ?? 0,
          data_inicio: salva.dataInicio,
          data_fim: salva.dataFim,
          responsavel: salva.responsavel ?? null,
        };
      });
      const totalDias = novasEtapas.reduce((s, e) => s + e.dias, 0);
      setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
    }
  }, [projetoQueryData, diasTrabalhadosData]);

  // Popula progressoDiario quando os dados chegam do servidor
  useEffect(() => {
    if (!progressoDiarioData) return;
    const mapa: Record<number, Record<string, number>> = {};
    for (const entry of progressoDiarioData) {
      if (!mapa[entry.etapa_id]) mapa[entry.etapa_id] = {};
      mapa[entry.etapa_id][entry.data] = entry.percentual;
    }
    setProgressoDiario(mapa);
  }, [progressoDiarioData]);

  // Total de dias corridos = fim - início (inclusive)
  const diasCorridosTotal = useMemo(() => {
    if (!projetoData?.DATA_INICIO_PROJETO || !projetoData?.DATA_FIM_PROJETO) return null;
    const start = new Date(projetoData.DATA_INICIO_PROJETO + "T00:00:00");
    const end = new Date(projetoData.DATA_FIM_PROJETO + "T00:00:00");
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [projetoData?.DATA_INICIO_PROJETO, projetoData?.DATA_FIM_PROJETO]);

  // Total de dias úteis = dias marcados no calendário DENTRO do intervalo do projeto
  const diasUteisTotal = useMemo<number | null>(() => {
    if (!diasTrabalhadosData || !projetoData?.DATA_INICIO_PROJETO || !projetoData?.DATA_FIM_PROJETO) return null;
    const inicio = projetoData.DATA_INICIO_PROJETO;
    const fim = projetoData.DATA_FIM_PROJETO;
    return diasTrabalhadosData.filter(
      (d) => d >= inicio && d <= fim
    ).length;
  }, [diasTrabalhadosData, projetoData?.DATA_INICIO_PROJETO, projetoData?.DATA_FIM_PROJETO]);

  const scheduleValidation = useMemo(() => {
    if (diasUteisTotal === null) return null;

    const todasComDatas = cronograma.etapas.every(e => e.data_inicio && e.data_fim);
    if (todasComDatas && diasTrabalhadosData?.length) {
      // Etapas com sobreposição de datas seriam contadas múltiplas vezes em uma soma
      // simples. Calculamos a união dos dias úteis únicos cobertos por todas as etapas.
      const diasTrabalhadosSet = new Set(diasTrabalhadosData);
      const diasCobertos = new Set<string>();
      for (const etapa of cronograma.etapas) {
        if (etapa.data_inicio && etapa.data_fim) {
          getDaysInRange(etapa.data_inicio, etapa.data_fim)
            .filter(d => diasTrabalhadosSet.has(d))
            .forEach(d => diasCobertos.add(d));
        }
      }
      return validateScheduleTotal([diasCobertos.size], diasUteisTotal);
    }

    const stepsDays = cronograma.etapas.map((e) => e.dias);
    return validateScheduleTotal(stepsDays, diasUteisTotal);
  }, [cronograma.etapas, diasUteisTotal, diasTrabalhadosData]);

  const cronogramaMutation = useMutation({
    mutationFn: async (data: ConfigCronograma) => {
      const payload = {
        centroCusto,
        etapas: data.etapas.map((e) => ({
          id: e.id,
          nome: e.nome,
          duracaoDias: e.dias,
          concluida: e.concluida ?? false,
          percentualConcluido: e.percentual_concluido ?? 0,
          dataInicio: e.data_inicio || null,
          dataFim: e.data_fim || null,
          responsavel: e.responsavel || null,
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
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"] });
      toast.success("Cronograma atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Handler de salvamento com verificação de balanceamento
  const handleSaveClick = (data: ConfigCronograma) => {
    // Se estiver desbalanceado, mostra modal de confirmação
    if (scheduleValidation && !scheduleValidation.valid) {
      setPendingSaveData(data);
      setShowConfirmModal(true);
      return;
    }
    // Se estiver balanceado, salva direto
    cronogramaMutation.mutate(data);
  };

  const confirmSave = () => {
    if (pendingSaveData) {
      cronogramaMutation.mutate(pendingSaveData);
      setShowConfirmModal(false);
      setPendingSaveData(null);
    }
  };

  const cancelSave = () => {
    setShowConfirmModal(false);
    setPendingSaveData(null);
  };

  // Helpers para avanço diário
  const toggleExpanded = (id: number) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };



  const handleProgressoDiarioChange = (
    etapa: EtapaCronograma,
    data: string,
    percentual: number | null,
  ) => {
    const valor = percentual == null ? null : Math.max(0, Math.min(100, percentual));

    // Update otimista local
    setProgressoDiario((prev) => {
      const map = { ...(prev[etapa.id] ?? {}) };
      if (valor == null) {
        delete map[data];
      } else {
        map[data] = valor;
      }
      return { ...prev, [etapa.id]: map };
    });

    // Salvar no servidor
    progressoMutation.mutate({ etapa_id: etapa.id, data, percentual: valor });

    // Atualizar percentual_concluido da etapa com a SOMA de todos os incrementos válidos
    const novoMap = { ...(progressoDiario[etapa.id] ?? {}) };
    if (valor == null) {
      delete novoMap[data];
    } else {
      novoMap[data] = valor;
    }
    const soma = Object.values(novoMap).reduce<number>((s, v) => (v == null ? s : s + v), 0);
    updateEtapaPercentual(etapa.id, Math.min(100, soma));
  };

  const updateEtapaConcluida = (id: number, concluida: boolean) => {
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, concluida, ...(concluida ? { percentual_concluido: 100 } : {}) } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    const novoEstado: ConfigCronograma = { etapas: novasEtapas, dias_totais: totalDias };
    setCronograma(novoEstado);
    cronogramaMutation.mutate(novoEstado);

    if (concluida) {
      const etapa = cronograma.etapas.find((e) => e.id === id);
      if (etapa?.data_inicio && etapa?.data_fim) {
        const diasTrabalhadosSet = new Set(diasTrabalhadosData ?? []);
        const dias = getDaysInRange(etapa.data_inicio, etapa.data_fim).filter(
          (dia) => diasTrabalhadosSet.has(dia),
        );
        if (dias.length > 0) {
          const base = Math.round(100 / dias.length);
          const novoMapa: Record<string, number> = {};
          dias.forEach((dia, idx) => {
            novoMapa[dia] = idx === dias.length - 1 ? 100 - base * (dias.length - 1) : base;
          });
          setProgressoDiario((prev) => ({
            ...prev,
            [id]: { ...(prev[id] ?? {}), ...novoMapa },
          }));
          Object.entries(novoMapa).forEach(([dia, valor]) => {
            progressoMutation.mutate({ etapa_id: id, data: dia, percentual: valor });
          });
        }
      }
    }
  };

  const updateEtapaNome = (id: number, nome: string) => {
    const nomeLimpo = nome.trim();
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, nome: nomeLimpo || e.nome } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const iniciarEdicaoNome = (etapa: EtapaCronograma) => {
    setEditingEtapaId(etapa.id);
    setEditingEtapaNome(etapa.nome);
  };

  const salvarEdicaoNome = () => {
    if (editingEtapaId != null) {
      updateEtapaNome(editingEtapaId, editingEtapaNome);
    }
    setEditingEtapaId(null);
    setEditingEtapaNome("");
  };

  const cancelarEdicaoNome = () => {
    setEditingEtapaId(null);
    setEditingEtapaNome("");
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
    const novasEtapas = cronograma.etapas.map((e) => {
      if (e.id !== id) return e;
      const novaInicio = data;
      const novaFim = e.data_fim;
      const dias = novaInicio && novaFim ? calcularDiasUteisEtapa(novaInicio, novaFim, diasTrabalhadosData) : e.dias;
      return { ...e, data_inicio: novaInicio, dias };
    });
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const updateEtapaDataFim = (id: number, data: string) => {
    const novasEtapas = cronograma.etapas.map((e) => {
      if (e.id !== id) return e;
      const novaInicio = e.data_inicio;
      const novaFim = data;
      const dias = novaInicio && novaFim ? calcularDiasUteisEtapa(novaInicio, novaFim, diasTrabalhadosData) : e.dias;
      return { ...e, data_fim: novaFim, dias };
    });
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const updateEtapaResponsavel = (id: number, responsavel: string) => {
    const valor = responsavel.trim() || null;
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, responsavel: valor } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

  const etapasDatas = useMemo(() => {
    if (!projetoData?.DATA_INICIO_PROJETO) return null;
    let cursor = projetoData.DATA_INICIO_PROJETO;
    return cronograma.etapas.map((e) => {
      // Se a etapa tem datas manuais, usa-as; senão, calcula sequencialmente a partir do cursor
      const startDate = e.data_inicio || cursor;
      const endDate = e.data_fim || formatDateISO(addWorkingDays(startDate, Math.max(0, e.dias - 1)));
      const { calendarDays, workingDays } = calculateWorkingDaysDetailed(startDate, endDate);
      // Avança o cursor para o próximo dia útil após o fim desta etapa
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
                    <div className="flex items-center gap-2 rounded-lg border border-[#337246]/30 bg-[#337246]/10 px-4 py-2.5 text-sm text-[#337246]">
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
                          ? "bg-[#337246]/10 border-[#337246]/30"
                          : "bg-card/50 border-border/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                            etapa.concluida
                              ? "bg-[#337246]/20 text-[#337246]"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {etapa.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-2">
                            {editingEtapaId === etapa.id ? (
                              <>
                                <Input
                                  value={editingEtapaNome}
                                  onChange={(e) => setEditingEtapaNome(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") salvarEdicaoNome();
                                    if (e.key === "Escape") cancelarEdicaoNome();
                                  }}
                                  onBlur={salvarEdicaoNome}
                                  autoFocus
                                  className="glass-input min-w-0 flex-1 h-8 text-sm"
                                  placeholder="Nome da etapa"
                                />
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={salvarEdicaoNome}
                                  title="Salvar nome"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-muted-foreground"
                                  onClick={cancelarEdicaoNome}
                                  title="Cancelar"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="truncate">{etapa.nome}</span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => iniciarEdicaoNome(etapa)}
                                  title="Editar nome"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {etapa.concluida && (
                              <Badge
                                variant="outline"
                                className="shrink-0 h-4 px-1.5 text-[10px] border-[#337246]/40 text-[#337246] bg-[#337246]/10"
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
                          <div className="flex flex-col items-center gap-0.5">
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
                        <div className="flex-1 flex flex-wrap gap-4">
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
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              Responsável
                            </label>
                            <Input
                              type="text"
                              value={etapa.responsavel || ""}
                              onChange={(e) =>
                                updateEtapaResponsavel(etapa.id, e.target.value)
                              }
                              placeholder="Nome do responsável"
                              className="glass-input"
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
                          <div className="flex items-center gap-1.5 text-xs text-[#337246] pb-0.5">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Botão Avanço por dia — só aparece se a etapa tem datas */}
                      {etapa.data_inicio && etapa.data_fim && (
                        <div className="ml-12 pt-1">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(etapa.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                expandedStages.has(etapa.id) ? "rotate-180" : ""
                              }`}
                            />
                            Avanço por dia
                          </button>
                        </div>
                      )}

                      {/* Painel de avanço diário — colapsa abaixo */}
                      {etapa.data_inicio && etapa.data_fim && expandedStages.has(etapa.id) && (() => {
                        const diasTrabalhadosSet = new Set(diasTrabalhadosData ?? []);
                        const dias = getDaysInRange(etapa.data_inicio!, etapa.data_fim!).filter(
                          (dia) => diasTrabalhadosSet.has(dia),
                        );
                        const totalDias = dias.length;
                        const etapaProgresso = progressoDiario[etapa.id] ?? {};
                        // Acumulado corrido — atualizado a cada linha
                        let acumulado = 0;
                        return (
                          <div className="ml-12 mt-2 border border-border/40 rounded-lg overflow-hidden">
                            <div className="grid grid-cols-5 text-[11px] font-medium text-muted-foreground bg-muted/30 px-3 py-2 border-b border-border/30">
                              <span>Data</span>
                              <span className="text-center">Planejado</span>
                              <span className="text-center">% do dia</span>
                              <span className="text-center">Acumulado</span>
                              <span className="text-center">Delta</span>
                            </div>
                            {dias.map((dia, idx) => {
                              const planejado = Math.round(((idx + 1) / totalDias) * 100);
                              const incremento = etapaProgresso[dia];
                              // Avança o acumulado apenas se houver entrada neste dia
                              if (incremento != null) acumulado += incremento;
                              // "Acumulado" só é exibido em dias com entrada
                              const realizadoCumulativo = incremento != null
                                ? Math.min(100, acumulado)
                                : undefined;
                              const delta = realizadoCumulativo != null
                                ? realizadoCumulativo - planejado
                                : undefined;
                              const diaSemana = new Date(dia + "T00:00:00").toLocaleDateString("pt-BR", {
                                weekday: "short",
                                timeZone: "UTC",
                              });
                              const diaMes = new Date(dia + "T00:00:00").toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                timeZone: "UTC",
                              });
                              return (
                                <div
                                  key={dia}
                                  className="grid grid-cols-5 items-center px-3 py-1.5 text-xs border-b border-border/20 last:border-b-0 hover:bg-muted/20 transition-colors"
                                >
                                  <span className="text-muted-foreground tabular-nums">
                                    {diaMes}{" "}
                                    <span className="text-muted-foreground/60 capitalize">{diaSemana}</span>
                                  </span>
                                  <span className="text-center tabular-nums text-muted-foreground">
                                    {planejado}%
                                  </span>
                                  <div className="flex justify-center">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={100}
                                      placeholder="—"
                                      defaultValue={incremento !== undefined && incremento !== null ? incremento : ""}
                                      key={`${dia}-${incremento}`}
                                      onBlur={(e) => {
                                        const raw = e.target.value.trim();
                                        if (raw === "") {
                                          handleProgressoDiarioChange(etapa, dia, null);
                                        } else {
                                          const val = parseInt(raw);
                                          if (!isNaN(val)) {
                                            handleProgressoDiarioChange(etapa, dia, val);
                                          }
                                        }
                                      }}
                                      className="w-16 h-6 glass-input text-center text-xs px-1"
                                    />
                                  </div>
                                  <span className="text-center tabular-nums font-medium">
                                    {realizadoCumulativo !== undefined
                                      ? `${realizadoCumulativo}%`
                                      : <span className="text-muted-foreground/40">—</span>}
                                  </span>
                                  <div className="flex justify-center">
                                    {delta !== undefined ? (
                                      <span
                                        className={`flex items-center gap-0.5 font-medium tabular-nums ${
                                          delta > 0
                                            ? "text-[#337246]"
                                            : delta < 0
                                            ? "text-red-400"
                                            : "text-muted-foreground"
                                        }`}
                                      >
                                        {delta > 0 ? (
                                          <TrendingUp className="w-3 h-3" />
                                        ) : delta < 0 ? (
                                          <TrendingDown className="w-3 h-3" />
                                        ) : (
                                          <Minus className="w-3 h-3" />
                                        )}
                                        {delta > 0 ? "+" : ""}{delta}%
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground/40">—</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
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
                  onClick={() => handleSaveClick(cronograma)}
                  disabled={cronogramaMutation.isPending || hasDateErrors}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Cronograma
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Modal de confirmação para cronograma desbalanceado */}
          <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Cronograma Desbalanceado
                </DialogTitle>
                <DialogDescription>
                  {scheduleValidation?.difference && scheduleValidation.difference > 0
                    ? `As etapas somam ${scheduleValidation.stepsDaysTotal} dias, mas o projeto tem ${diasUteisTotal} dias úteis. Sobram ${scheduleValidation.difference} dias.`
                    : `As etapas somam ${scheduleValidation?.stepsDaysTotal} dias, mas o projeto tem ${diasUteisTotal} dias úteis. Faltam ${Math.abs(scheduleValidation?.difference || 0)} dias.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={cancelSave}>
                  Cancelar
                </Button>
                <Button onClick={confirmSave}>
                  Salvar Mesmo Assim
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CanAccess>
    </ProtectedRoute>
  );
}

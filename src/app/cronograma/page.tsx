// src/app/cronograma/page.tsx
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  FolderOpen,
  Copy,
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
  grupo_id?: number | null;
};

type EtapaGrupo = { id: number; nome: string; ordem: number };

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
  ETAPAS_PROJETO: Array<{ id: number; nome: string; duracaoDias: number; concluida?: boolean; percentualConcluido?: number; dataInicio?: string; dataFim?: string; responsavel?: string | null; grupoId?: number | null }>;
  GRUPOS_ETAPAS: Array<{ id: number; nome: string; ordem: number }>;
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
  const { centroCusto, isReady: filterReady } = useFilter();
  const queryClient = useQueryClient();

  // projetoQueryData é usado diretamente — não mantemos estado espelho

  const [cronograma, setCronograma] = useState<ConfigCronograma>({
    etapas: ETAPAS_DEFAULT,
    dias_totais: ETAPAS_DEFAULT.reduce((s, e) => s + e.dias, 0),
  });

  // Estado para modal de confirmação ao remover etapa
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  // Estado para painel de avanço diário por etapa
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  // progressoDiario: etapa_id → { "YYYY-MM-DD": percentual | null }
  const [progressoDiario, setProgressoDiario] = useState<Record<number, Record<string, number | null>>>({});

  // Edição inline do nome da etapa
  const [editingEtapaId, setEditingEtapaId] = useState<number | null>(null);
  const [editingEtapaNome, setEditingEtapaNome] = useState("");

  // Contador para IDs temporários de novas etapas (negativos)
  const [nextTempId, setNextTempId] = useState(-1);

  // Grupos de etapas
  const [grupos, setGrupos] = useState<EtapaGrupo[]>([]);
  const [editingGrupoId, setEditingGrupoId] = useState<number | null>(null);
  const [editingGrupoNome, setEditingGrupoNome] = useState("");
  const [collapsedGrupos, setCollapsedGrupos] = useState<Set<number>>(new Set());
  const [selectedEtapas, setSelectedEtapas] = useState<Set<number>>(new Set());
  const [showBulkRemoveModal, setShowBulkRemoveModal] = useState(false);

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
    enabled: filterReady && !!centroCusto,
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
    enabled: filterReady && !!centroCusto,
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
    enabled: filterReady && !!centroCusto,
  });

  // Buscar grupos de etapas
  const { data: gruposData } = useQuery<EtapaGrupo[]>({
    queryKey: ["etapas-grupos", centroCusto],
    queryFn: async () => {
      const params = centroCusto ? `?centro_custo=${encodeURIComponent(centroCusto)}` : "";
      const res = await fetch(`/api/config/etapas-grupos${params}`);
      if (!res.ok) throw new Error("Falha ao carregar grupos");
      const json = await res.json();
      return json.data as EtapaGrupo[];
    },
    enabled: filterReady && !!centroCusto,
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
      queryClient.invalidateQueries({ queryKey: ["etapas-progresso"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Sincroniza cronograma quando projetoQueryData ou diasTrabalhadosData mudam
  useEffect(() => {
    if (!projetoQueryData?.ETAPAS_PROJETO) return;
    const etapasSalvas = projetoQueryData.ETAPAS_PROJETO;
    const novasEtapas = etapasSalvas.length
      ? etapasSalvas.map((salva) => {
          const diasSalvos = salva.dataInicio && salva.dataFim
            ? calcularDiasUteisEtapa(salva.dataInicio, salva.dataFim, diasTrabalhadosData)
            : salva.duracaoDias;
          return {
            id: salva.id,
            nome: salva.nome || `Etapa ${salva.id}`,
            dias: diasSalvos,
            concluida: salva.concluida ?? false,
            percentual_concluido: salva.percentualConcluido ?? 0,
            data_inicio: salva.dataInicio,
            data_fim: salva.dataFim,
            responsavel: salva.responsavel ?? null,
            grupo_id: salva.grupoId ?? null,
          };
        })
      : [];
    const totalDias = novasEtapas.reduce((s, e) => s + e.dias, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  }, [projetoQueryData, diasTrabalhadosData]);

  // Sincroniza grupos
  useEffect(() => {
    if (!gruposData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGrupos(gruposData);
  }, [gruposData]);

  // Sincroniza progressoDiario quando os dados chegam do servidor
  useEffect(() => {
    if (!progressoDiarioData) return;
    const mapa: Record<number, Record<string, number>> = {};
    for (const entry of progressoDiarioData) {
      if (!mapa[entry.etapa_id]) mapa[entry.etapa_id] = {};
      mapa[entry.etapa_id][entry.data] = entry.percentual;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgressoDiario(mapa);
  }, [progressoDiarioData]);

  // Total de dias corridos = fim - início (inclusive)
  // Extrai datas para deps estáveis (evita optional chaining no array de deps)
  const dataInicioProjeto = projetoQueryData?.DATA_INICIO_PROJETO ?? null;
  const dataFimProjeto = projetoQueryData?.DATA_FIM_PROJETO ?? null;

  const diasCorridosTotal = useMemo(() => {
    if (!dataInicioProjeto || !dataFimProjeto) return null;
    const start = new Date(dataInicioProjeto + "T00:00:00");
    const end = new Date(dataFimProjeto + "T00:00:00");
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [dataInicioProjeto, dataFimProjeto]);

  // Total de dias úteis = dias marcados no calendário DENTRO do intervalo do projeto
  const diasUteisTotal = useMemo<number | null>(() => {
    if (!diasTrabalhadosData || !dataInicioProjeto || !dataFimProjeto) return null;
    return diasTrabalhadosData.filter(
      (d) => d >= dataInicioProjeto && d <= dataFimProjeto
    ).length;
  }, [diasTrabalhadosData, dataInicioProjeto, dataFimProjeto]);

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
          grupoId: e.grupo_id ?? null,
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
    onSuccess: (data) => {
      const idMap: Record<string, number> = data?.data?.idMap ?? {};

      // Sincroniza IDs temporários → reais nos estados locais
      if (Object.keys(idMap).length > 0) {
        setCronograma((prev) => ({
          ...prev,
          etapas: prev.etapas.map((e) => ({
            ...e,
            id: idMap[String(e.id)] ?? e.id,
          })),
        }));

        setExpandedStages((prev) => {
          const next = new Set<number>();
          prev.forEach((id) => next.add(idMap[String(id)] ?? id));
          return next;
        });

        setProgressoDiario((prev) => {
          const next: Record<number, Record<string, number | null>> = {};
          Object.entries(prev).forEach(([oldId, map]) => {
            const newId = idMap[oldId] ?? Number(oldId);
            next[newId] = map;
          });
          return next;
        });
      }

      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
      setSelectedEtapas(new Set());
      toast.success("Cronograma atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Handler de salvamento
  const handleSaveClick = (data: ConfigCronograma) => {
    cronogramaMutation.mutate(data);
  };

  // --- Mutations de grupos ---
  const criarGrupoMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch("/api/config/etapas-grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, centroCusto }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Falha ao criar fase");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-grupos"], type: "all" });
      toast.success("Fase criada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const renomearGrupoMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: number; nome: string }) => {
      const res = await fetch(`/api/config/etapas-grupos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Falha ao renomear fase");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-grupos"], type: "all" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const excluirGrupoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/config/etapas-grupos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Falha ao excluir fase");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["etapas-grupos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
      toast.success("Fase removida");
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
    if (id < 0) return; // não permite marcar etapas não salvas como concluídas
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

  // --- Adicionar / Remover / Reordenar etapas ---
  const adicionarEtapa = (grupoId: number | null = null) => {
    const novoId = nextTempId;
    setNextTempId((id) => id - 1);
    const novaEtapa: EtapaCronograma = {
      id: novoId,
      nome: "Nova Etapa",
      dias: 1,
      percentual_concluido: 0,
      concluida: false,
      responsavel: null,
      grupo_id: grupoId,
    };
    setCronograma((prev) => {
      if (grupoId != null) {
        const lastGroupIdx = prev.etapas.reduce((maxIdx, e, i) =>
          e.grupo_id === grupoId ? i : maxIdx, -1);
        if (lastGroupIdx >= 0) {
          const etapas = [...prev.etapas];
          etapas.splice(lastGroupIdx + 1, 0, novaEtapa);
          return { etapas, dias_totais: etapas.reduce((s, e) => s + e.dias, 0) };
        }
      }
      const etapas = [...prev.etapas, novaEtapa];
      return { etapas, dias_totais: etapas.reduce((s, e) => s + e.dias, 0) };
    });
  };

  const confirmarRemoverEtapa = (id: number) => {
    setPendingRemoveId(id);
    setShowRemoveModal(true);
  };

  const executarRemoverEtapa = () => {
    if (pendingRemoveId == null) return;
    const id = pendingRemoveId;
    setCronograma((prev) => {
      const etapas = prev.etapas.filter((e) => e.id !== id);
      return { etapas, dias_totais: etapas.reduce((s, e) => s + e.dias, 0) };
    });
    setExpandedStages((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setProgressoDiario((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setShowRemoveModal(false);
    setPendingRemoveId(null);
  };

  const cancelarRemoverEtapa = () => {
    setShowRemoveModal(false);
    setPendingRemoveId(null);
  };

  const moverEtapa = (etapaId: number, direction: "up" | "down") => {
    setCronograma((prev) => {
      const etapas = [...prev.etapas];
      const index = etapas.findIndex((e) => e.id === etapaId);
      if (index < 0) return prev;
      const grupoId = etapas[index].grupo_id ?? null;
      const groupIndices = etapas.reduce<number[]>((acc, e, i) => {
        if ((e.grupo_id ?? null) === grupoId) acc.push(i);
        return acc;
      }, []);
      const posInGroup = groupIndices.indexOf(index);
      if (direction === "up" && posInGroup === 0) return prev;
      if (direction === "down" && posInGroup === groupIndices.length - 1) return prev;
      const swapIndex = direction === "up"
        ? groupIndices[posInGroup - 1]
        : groupIndices[posInGroup + 1];
      [etapas[index], etapas[swapIndex]] = [etapas[swapIndex], etapas[index]];
      return { etapas, dias_totais: etapas.reduce((s, e) => s + e.dias, 0) };
    });
  };

  // --- Handlers de grupos ---
  const iniciarEdicaoGrupo = (grupo: EtapaGrupo) => {
    setEditingGrupoId(grupo.id);
    setEditingGrupoNome(grupo.nome);
  };

  const salvarEdicaoGrupo = () => {
    if (editingGrupoId != null && editingGrupoNome.trim()) {
      renomearGrupoMutation.mutate({ id: editingGrupoId, nome: editingGrupoNome.trim() });
      setGrupos((prev) =>
        prev.map((g) => g.id === editingGrupoId ? { ...g, nome: editingGrupoNome.trim() } : g),
      );
    }
    setEditingGrupoId(null);
    setEditingGrupoNome("");
  };

  const cancelarEdicaoGrupo = () => {
    setEditingGrupoId(null);
    setEditingGrupoNome("");
  };

  const handleCriarGrupo = () => {
    criarGrupoMutation.mutate("Nova Fase");
  };

  const handleExcluirGrupo = (id: number) => {
    excluirGrupoMutation.mutate(id);
    setCronograma((prev) => ({
      ...prev,
      etapas: prev.etapas.map((e) =>
        e.grupo_id === id ? { ...e, grupo_id: null } : e,
      ),
    }));
  };

  const toggleSelectEtapa = (id: number) => {
    setSelectedEtapas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllInGroup = (grupoId: number | null) => {
    const etapasDoGrupo = cronograma.etapas.filter((e) => (e.grupo_id ?? null) === grupoId);
    const allSelected = etapasDoGrupo.length > 0 && etapasDoGrupo.every((e) => selectedEtapas.has(e.id));
    setSelectedEtapas((prev) => {
      const next = new Set(prev);
      etapasDoGrupo.forEach((e) => {
        if (allSelected) next.delete(e.id);
        else next.add(e.id);
      });
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = cronograma.etapas.length > 0 && cronograma.etapas.every((e) => selectedEtapas.has(e.id));
    if (allSelected) {
      setSelectedEtapas(new Set());
    } else {
      setSelectedEtapas(new Set(cronograma.etapas.map((e) => e.id)));
    }
  };

  const executarRemoverSelecionadas = () => {
    const ids = selectedEtapas;
    setCronograma((prev) => {
      const etapas = prev.etapas.filter((e) => !ids.has(e.id));
      return { etapas, dias_totais: etapas.reduce((s, e) => s + e.dias, 0) };
    });
    setExpandedStages((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    setProgressoDiario((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
    setSelectedEtapas(new Set());
    setShowBulkRemoveModal(false);
  };

  const duplicarGrupo = async (grupo: EtapaGrupo) => {
    try {
      const res = await fetch("/api/config/etapas-grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: `${grupo.nome} (Cópia)`, centroCusto }),
      });
      if (!res.ok) throw new Error("Falha ao criar fase");
      const data = await res.json();
      const novoGrupoId = data?.data?.id;
      if (!novoGrupoId) throw new Error("ID da nova fase não retornado");

      const etapasDoGrupo = cronograma.etapas.filter((e) => e.grupo_id === grupo.id);
      let tempId = nextTempId;
      const novasEtapas: EtapaCronograma[] = etapasDoGrupo.map((e) => {
        const id = tempId;
        tempId--;
        return {
          ...e,
          id,
          grupo_id: novoGrupoId,
          concluida: false,
          percentual_concluido: 0,
          data_inicio: undefined,
          data_fim: undefined,
        };
      });
      setNextTempId(tempId);

      setCronograma((prev) => {
        const etapas = [...prev.etapas, ...novasEtapas];
        return { etapas, dias_totais: etapas.reduce((s, e) => s + e.dias, 0) };
      });

      queryClient.invalidateQueries({ queryKey: ["etapas-grupos"], type: "all" });
      toast.success(`Fase "${grupo.nome}" duplicada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao duplicar fase");
    }
  };

  const etapasDatas = useMemo(() => {
    if (!dataInicioProjeto) return null;
    let cursor = dataInicioProjeto;
    return cronograma.etapas.map((e) => {
      // Se a etapa tem datas manuais, usa-as; senão, calcula sequencialmente a partir do cursor
      const startDate = e.data_inicio || cursor;
      const endDate = e.data_fim || formatDateISO(addWorkingDays(startDate, Math.max(0, e.dias - 1)));
      const { calendarDays, workingDays } = calculateWorkingDaysDetailed(startDate, endDate);
      // Avança o cursor para o próximo dia útil após o fim desta etapa
      cursor = formatDateISO(addWorkingDays(endDate, 1));
      return { id: e.id, startDate, endDate, calendarDays, workingDays };
    });
  }, [dataInicioProjeto, cronograma.etapas]);

  const etapasPesos = useMemo(() => {
    const totalDias = cronograma.dias_totais || 1;
    return cronograma.etapas.reduce<
      { acum: number; result: { id: number; inicio: number; fim: number }[] }
    >(
      (acc, e) => {
        const inicio = Math.round((acc.acum / totalDias) * 100);
        const novoAcum = acc.acum + e.dias;
        const fim = Math.round((novoAcum / totalDias) * 100);
        acc.result.push({ id: e.id, inicio, fim });
        return { acum: novoAcum, result: acc.result };
      },
      { acum: 0, result: [] },
    ).result;
  }, [cronograma.etapas, cronograma.dias_totais]);

  type EtapaDateError = {
    id: number;
    dataInicio: boolean;
    dataFim: boolean;
    dataStartGreaterThanEnd: boolean;
  };

  const etapasDateErrors = useMemo<EtapaDateError[]>(() => {
    if (!dataInicioProjeto || !dataFimProjeto) return [];
    return cronograma.etapas.map((etapa) => ({
      id: etapa.id,
      dataInicio: !!(
        etapa.data_inicio &&
        (etapa.data_inicio < dataInicioProjeto || etapa.data_inicio > dataFimProjeto)
      ),
      dataFim: !!(
        etapa.data_fim &&
        (etapa.data_fim < dataInicioProjeto || etapa.data_fim > dataFimProjeto)
      ),
      dataStartGreaterThanEnd: !!(
        etapa.data_inicio &&
        etapa.data_fim &&
        etapa.data_inicio > etapa.data_fim
      ),
    }));
  }, [cronograma.etapas, dataInicioProjeto, dataFimProjeto]);

  const hasDateErrors = useMemo(
    () => etapasDateErrors.some((e) => e.dataInicio || e.dataFim || e.dataStartGreaterThanEnd),
    [etapasDateErrors],
  );

  // Função auxiliar para renderizar o card de uma etapa
  const renderEtapaCard = (
    etapa: EtapaCronograma,
    globalIndex: number,
    isFirst: boolean,
    isLast: boolean,
    dateError: { id: number; dataInicio: boolean; dataFim: boolean; dataStartGreaterThanEnd: boolean } | undefined,
  ) => (
    <div
      key={etapa.id}
      className={`space-y-3 p-4 rounded-lg border transition-colors ${
        etapa.concluida
          ? "bg-[#337246]/10 border-[#337246]/30"
          : "bg-card/50 border-border/50"
      }`}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={selectedEtapas.has(etapa.id)}
          onChange={() => toggleSelectEtapa(etapa.id)}
          className="h-4 w-4 rounded border-border accent-primary shrink-0 cursor-pointer"
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
            etapa.concluida
              ? "bg-[#337246]/20 text-[#337246]"
              : "bg-primary/10 text-primary"
          }`}
        >
          {globalIndex + 1}
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
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <Switch
              checked={etapa.concluida ?? false}
              onCheckedChange={(checked: boolean) =>
                updateEtapaConcluida(etapa.id, checked)
              }
              disabled={cronogramaMutation.isPending || etapa.id < 0}
            />
            <span className="text-[10px] text-muted-foreground">
              Concluída
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => moverEtapa(etapa.id, "up")}
              disabled={isFirst || cronogramaMutation.isPending}
              title="Mover para cima"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => moverEtapa(etapa.id, "down")}
              disabled={isLast || cronogramaMutation.isPending}
              title="Mover para baixo"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => confirmarRemoverEtapa(etapa.id)}
            disabled={cronogramaMutation.isPending}
            title="Remover etapa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
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
              onChange={(e) => updateEtapaDataInicio(etapa.id, e.target.value)}
              disabled={etapa.id < 0 || !dataInicioProjeto || !dataFimProjeto}
              title={etapa.id < 0 ? "Salve o cronograma para definir datas" : undefined}
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
              onChange={(e) => updateEtapaDataFim(etapa.id, e.target.value)}
              disabled={etapa.id < 0 || !dataInicioProjeto || !dataFimProjeto}
              title={etapa.id < 0 ? "Salve o cronograma para definir datas" : undefined}
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
              onChange={(e) => updateEtapaResponsavel(etapa.id, e.target.value)}
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

      {/* Botão Avanço por dia */}
      {etapa.id > 0 && etapa.data_inicio && etapa.data_fim && (
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
      {etapa.id < 0 && (
        <div className="ml-12 pt-1 text-xs text-yellow-400">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Salve o cronograma para habilitar o avanço por dia
          </span>
        </div>
      )}

      {/* Painel de avanço diário */}
      {etapa.data_inicio && etapa.data_fim && expandedStages.has(etapa.id) && (() => {
        const diasTrabalhadosSet = new Set(diasTrabalhadosData ?? []);
        const dias = getDaysInRange(etapa.data_inicio!, etapa.data_fim!).filter(
          (dia) => diasTrabalhadosSet.has(dia),
        );
        const totalDias = dias.length;
        const etapaProgresso = progressoDiario[etapa.id] ?? {};
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
              if (incremento != null) acumulado += incremento;
              const realizadoCumulativo = incremento != null ? Math.min(100, acumulado) : undefined;
              const delta = realizadoCumulativo != null ? realizadoCumulativo - planejado : undefined;
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

  if (!filterReady) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <CalendarClock className="h-8 w-8 text-muted-foreground animate-pulse" />
          <p className="text-sm text-muted-foreground">Carregando projeto...</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (!centroCusto) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <CalendarClock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Selecione um centro de custo para editar o cronograma.
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

                {hasDateErrors && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {etapasDateErrors.filter((e) => e.dataInicio || e.dataFim || e.dataStartGreaterThanEnd).length}{" "}
                      etapa(s) com datas fora do intervalo do projeto.
                    </span>
                  </div>
                )}

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

              {/* Alerta: reordenar sem datas altera o cronograma planejado */}
              {cronograma.etapas.some((e) => !e.data_inicio || !e.data_fim) && (
                <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Algumas etapas não possuem datas definidas. Reordená-las ou adicionar/remover etapas
                    alterará o cronograma planejado calculado automaticamente.
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {grupos.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={() => adicionarEtapa(null)}
                    disabled={cronogramaMutation.isPending}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Etapa
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleCriarGrupo}
                  disabled={criarGrupoMutation.isPending}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Fase
                </Button>
              </div>

              {/* Render agrupado ou flat */}
              {grupos.length > 0 ? (
                <div className="space-y-6">
                  {[...grupos].sort((a, b) => a.ordem - b.ordem).map((grupo) => {
                    const etapasDoGrupo = cronograma.etapas.filter((e) => e.grupo_id === grupo.id);
                    const groupIndicesMap = cronograma.etapas.reduce<number[]>((acc, e, i) => {
                      if (e.grupo_id === grupo.id) acc.push(i);
                      return acc;
                    }, []);
                    const isCollapsed = collapsedGrupos.has(grupo.id);
                    const toggleCollapse = () =>
                      setCollapsedGrupos((prev) => {
                        const next = new Set(prev);
                        if (next.has(grupo.id)) next.delete(grupo.id);
                        else next.add(grupo.id);
                        return next;
                      });
                    return (
                      <div key={grupo.id} className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                        {/* Cabeçalho do grupo */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={toggleCollapse}
                            className="shrink-0 text-primary hover:text-primary/70 transition-colors"
                            title={isCollapsed ? "Expandir fase" : "Colapsar fase"}
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                            />
                          </button>
                          <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                          {editingGrupoId === grupo.id ? (
                            <>
                              <Input
                                value={editingGrupoNome}
                                onChange={(e) => setEditingGrupoNome(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") salvarEdicaoGrupo();
                                  if (e.key === "Escape") cancelarEdicaoGrupo();
                                }}
                                onBlur={salvarEdicaoGrupo}
                                autoFocus
                                className="glass-input flex-1 h-8 text-sm font-semibold"
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={salvarEdicaoGrupo}>
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelarEdicaoGrupo}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-foreground flex-1">{grupo.nome}</span>
                              <span className="text-xs text-muted-foreground">{etapasDoGrupo.length} etapa(s)</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => iniciarEdicaoGrupo(grupo)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleExcluirGrupo(grupo.id)} disabled={excluirGrupoMutation.isPending}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => duplicarGrupo(grupo)} title="Duplicar fase">
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                              <input
                                type="checkbox"
                                checked={etapasDoGrupo.length > 0 && etapasDoGrupo.every((e) => selectedEtapas.has(e.id))}
                                onChange={() => toggleSelectAllInGroup(grupo.id)}
                                className="h-4 w-4 rounded border-border accent-primary cursor-pointer ml-1"
                                title="Selecionar todas da fase"
                              />
                            </>
                          )}
                        </div>

                        {/* Etapas do grupo — ocultadas quando colapsado */}
                        {!isCollapsed && (
                          <>
                            <div className="space-y-4">
                              {etapasDoGrupo.map((etapa, indexInGroup) => {
                                const isFirst = indexInGroup === 0;
                                const isLast = indexInGroup === etapasDoGrupo.length - 1;
                                const dateError = etapasDateErrors.find((e) => e.id === etapa.id);
                                return renderEtapaCard(etapa, indexInGroup, isFirst, isLast, dateError);
                              })}
                            </div>

                            {/* Botão adicionar etapa no grupo */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => adicionarEtapa(grupo.id)}
                              disabled={cronogramaMutation.isPending}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar etapa
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* Etapas sem grupo */}
                  {cronograma.etapas.filter((e) => !e.grupo_id).length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={cronograma.etapas.filter((e) => !e.grupo_id).length > 0 && cronograma.etapas.filter((e) => !e.grupo_id).every((e) => selectedEtapas.has(e.id))}
                          onChange={() => toggleSelectAllInGroup(null)}
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                          title="Selecionar todas sem fase"
                        />
                        <span className="font-medium text-muted-foreground">Sem fase</span>
                        <span className="text-xs text-muted-foreground/60">
                          ({cronograma.etapas.filter((e) => !e.grupo_id).length} etapa(s))
                        </span>
                      </div>
                      {(() => {
                        const ungrouped = cronograma.etapas.filter((e) => !e.grupo_id);
                        return ungrouped.map((etapa, indexInGroup) => {
                            const dateError = etapasDateErrors.find((e) => e.id === etapa.id);
                            return renderEtapaCard(etapa, indexInGroup, indexInGroup === 0, indexInGroup === ungrouped.length - 1, dateError);
                          });
                      })()}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                        onClick={() => adicionarEtapa(null)}
                        disabled={cronogramaMutation.isPending}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar etapa sem fase
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Lista plana — sem grupos */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={cronograma.etapas.length > 0 && cronograma.etapas.every((e) => selectedEtapas.has(e.id))}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                    />
                    <span className="text-xs text-muted-foreground">Selecionar todas</span>
                  </div>
                  {cronograma.etapas.map((etapa, index) => {
                    const dateError = etapasDateErrors.find((e) => e.id === etapa.id);
                    return renderEtapaCard(etapa, index, index === 0, index === cronograma.etapas.length - 1, dateError);
                  })}
                </div>
              )}

              <div className="flex items-center justify-between">
                {selectedEtapas.size > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {selectedEtapas.size} etapa(s) selecionada(s)
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowBulkRemoveModal(true)}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir Selecionadas
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedEtapas(new Set())}
                    >
                      Limpar seleção
                    </Button>
                  </div>
                ) : <div />}
                <div className="flex items-center gap-3">
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
              </div>
            </CardContent>
          </Card>

          {/* Modal de confirmação ao remover etapa */}
          <Dialog open={showRemoveModal} onOpenChange={setShowRemoveModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Remover Etapa
                </DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover esta etapa? Todo o histórico de avanço diário
                  associado a ela será permanentemente excluído ao salvar o cronograma.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={cancelarRemoverEtapa}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={executarRemoverEtapa}>
                  Remover
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal de confirmação ao remover etapas selecionadas */}
          <Dialog open={showBulkRemoveModal} onOpenChange={setShowBulkRemoveModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Remover Etapas Selecionadas
                </DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover {selectedEtapas.size} etapa(s)? Todo o histórico de avanço diário
                  associado será permanentemente excluído ao salvar o cronograma.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBulkRemoveModal(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={executarRemoverSelecionadas}>
                  Remover {selectedEtapas.size} etapa(s)
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CanAccess>
    </ProtectedRoute>
  );
}

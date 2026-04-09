// src/app/configuracoes/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { calculateWorkingDays } from "@/lib/date-utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Save,
  AlertCircle,
  Building2,
  Users,
  CalendarClock,
  Bed,
  Activity,
  FileText,
  Building,
  Settings,
  UserPlus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { WorkingDaysCalendar } from "@/components/WorkingDaysCalendar";

// --- Types ---
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

type ConfigClinica = { id?: number; nome: string };
type ConfigHotel = { id?: string; nome: string; qt_vagas: number; vagas_ocupadas: number; vagas_disponiveis: number };
type ConfigAcesso = { id?: string; re: string; nome: string; perfil: string };

type LogEntry = {
  id: string;
  usuario: string;
  acao: string;
  detalhes: string;
  timestamp: string;
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
};



const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "user", label: "Usuário" },
  { value: "guest", label: "Convidado" },
];

const getAcaoBadgeVariant = (acao: string) => {
  const upperAcao = acao.toUpperCase();
  if (upperAcao.includes("ADICIONAR") || upperAcao.includes("CRIAR"))
    return "default";
  if (upperAcao.includes("EDITAR") || upperAcao.includes("ATUALIZAR"))
    return "secondary";
  if (
    upperAcao.includes("REMOVER") ||
    upperAcao.includes("EXCLUIR") ||
    upperAcao.includes("DELETAR")
  )
    return "destructive";
  if (upperAcao.includes("IMPORTAR")) return "outline";
  if (upperAcao.includes("LOGIN")) return "default";
  return "secondary";
};

// --- Component ---
export default function ConfiguracoesPage() {
  // ── RBAC: deve ser o primeiro hook para garantir ordem estável ───────────
  const { user, isLoading: authLoading } = useAuth();

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("projeto");

  // Projeto
  const [projeto, setProjeto] = useState<ConfigProjeto>({
    gerente_operacoes: "",
    gerente_contrato: "",
    nome_cliente: "",
    centro_custo: "",
    data_inicio: "",
    data_fim: "",
    colaboradores_previstos: "",
    orcado_suprimentos: "",
  });

  // ── Dias trabalhados (calendário) ──────────────────────────────────────────
  const [diasTrabalhados, setDiasTrabalhados] = useState<string[]>([]);
  const [calendarioAno, setCalendarioAno] = useState(new Date().getFullYear());
  const [calendarioMes, setCalendarioMes] = useState(new Date().getMonth());

  // Query para buscar dias trabalhados
  const { data: diasTrabalhadosData } = useQuery({
    queryKey: ["config", "dias-trabalhados"],
    queryFn: async () => {
      const res = await fetch("/api/config/dias-trabalhados");
      if (!res.ok) throw new Error("Falha ao carregar dias trabalhados");
      const json = await res.json();
      return json.dias_trabalhados as string[];
    },
  });

  // Sincroniza dias trabalhados do servidor
  useEffect(() => {
    if (diasTrabalhadosData) {
      setDiasTrabalhados(diasTrabalhadosData);
    }
  }, [diasTrabalhadosData]);

  // Mutation para salvar dias trabalhados
  const diasTrabalhadosMutation = useMutation({
    mutationFn: async (dias: string[]) => {
      const res = await fetch("/api/config/dias-trabalhados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dias_trabalhados: dias }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar dias trabalhados");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "dias-trabalhados"] });
      toast.success("Dias trabalhados salvos com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Handler para toggle de dia
  const toggleDiaTrabalhado = (date: string) => {
    setDiasTrabalhados((prev) => {
      const newDias = prev.includes(date)
        ? prev.filter((d) => d !== date)
        : [...prev, date].sort();
      return newDias;
    });
  };

  // ── Dias úteis calculados a partir das datas do projeto ─────────────────────
  const diasUteisTotal = useMemo<number | null>(() => {
    if (!projeto.data_inicio || !projeto.data_fim) return null;
    try {
      return calculateWorkingDays(projeto.data_inicio, projeto.data_fim);
    } catch {
      return null;
    }
  }, [projeto.data_inicio, projeto.data_fim]);

  // Calcula dias corridos totais
  const diasCorridosTotal = useMemo(() => {
    if (!projeto.data_inicio || !projeto.data_fim) return null;
    const start = new Date(projeto.data_inicio);
    const end = new Date(projeto.data_fim);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [projeto.data_inicio, projeto.data_fim]);

  // Acessos - inicializado como strings vazias para blindagem
  const [acessoRE, setAcessoRE] = useState("");
  const [acessoNome, setAcessoNome] = useState("");
  const [acessoRole, setAcessoRole] = useState("");
  // Clínicas - input para adicionar nova
  const [clinicaInput, setClinicaInput] = useState("");

  // Hotéis - inputs para adicionar novo
  const [hotelNome, setHotelNome] = useState("");
  const [hotelVagas, setHotelVagas] = useState("");

  // Hotéis - edição inline de qt_vagas
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [editingQtVagas, setEditingQtVagas] = useState("");

  // --- Data Fetching ---
  // Tipado com ApiConfigResponse para refletir as chaves uppercase da API
  const { data: projetoData } = useQuery<ApiConfigResponse>({
    queryKey: ["config", "projeto"],
    queryFn: async () => {
      const res = await fetch("/api/config");
      if (!res.ok) throw new Error("Falha ao carregar configurações");
      const json = await res.json();
      return json.data as ApiConfigResponse;
    },
  });

  const { data: clinicasData } = useQuery<ConfigClinica[]>({
    queryKey: ["config", "clinicas"],
    queryFn: async () => {
      const res = await fetch("/api/config/clinicas");
      if (!res.ok) throw new Error("Falha ao carregar clínicas");
      return res.json();
    },
  });

  const { data: hoteisData } = useQuery<ConfigHotel[]>({
    queryKey: ["config", "hoteis"],
    queryFn: async () => {
      const res = await fetch("/api/config/hoteis");
      if (!res.ok) throw new Error("Falha ao carregar hotéis");
      return res.json();
    },
  });

  const { data: acessosData } = useQuery<ConfigAcesso[]>({
    queryKey: ["config", "acessos"],
    queryFn: async () => {
      const res = await fetch("/api/config/acessos");
      if (!res.ok) throw new Error("Falha ao carregar acessos");
      return res.json();
    },
  });

  const { data: logsResponse } = useQuery<{ data: LogEntry[] }>({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Falha ao carregar logs");
      return res.json();
    },
  });

  // ── Derived data from queries (no local state needed) ──────────────────────
  const clinicas = clinicasData ?? [];
  const hoteis = hoteisData ?? [];
  const acessos = acessosData ?? [];
  const logs = logsResponse?.data ?? [];

  // ── Sync projeto form state from server data ───────────────────────────────
  useEffect(() => {
    if (!projetoData) return;
    setProjeto({
      gerente_operacoes: projetoData.GERENTE_OPERACOES || "",
      gerente_contrato: projetoData.GERENTE_CONTRATO || "",
      nome_cliente: projetoData.NOME_CLIENTE || "",
      centro_custo: projetoData.CENTRO_CUSTO || "",
      data_inicio: projetoData.DATA_INICIO_PROJETO || "",
      data_fim: projetoData.DATA_FIM_PROJETO || "",
      colaboradores_previstos:
        projetoData.COLABORADORES_PREVISTOS > 0
          ? String(projetoData.COLABORADORES_PREVISTOS)
          : "",
      orcado_suprimentos:
        projetoData.ORCADO_SUPRIMENTOS > 0
          ? String(projetoData.ORCADO_SUPRIMENTOS)
          : "",
    });
  }, [projetoData]);

  // --- Mutations ---
  const projetoMutation = useMutation({
    mutationFn: async (data: ConfigProjeto) => {
      // Envia apenas dados do projeto — etapas NÃO são incluídas
      const payload: Record<string, unknown> = {
        gerenteOperacoes: data.gerente_operacoes,
        gerenteContrato: data.gerente_contrato,
        nomeCliente: data.nome_cliente,
        centroCusto: data.centro_custo,
        dataInicio: data.data_inicio,
        dataFim: data.data_fim,
      };
      if (data.colaboradores_previstos) {
        payload.colaboradores_previstos = Number(data.colaboradores_previstos);
      }
      if (data.orcado_suprimentos) {
        payload.orcado_suprimentos = Number(data.orcado_suprimentos);
      }

      const res = await fetch("/api/config/projeto-dados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao salvar projeto");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Configurações do projeto salvas!");
    },
    onError: () => toast.error("Erro ao salvar configurações do projeto"),
  });

  const clinicaMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch("/api/config/clinicas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      if (!res.ok) throw new Error("Falha ao salvar clínica");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "clinicas"] });
      setClinicaInput("");
      toast.success("Clínica salva com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar clínica"),
  });

  const deleteClinicaMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/config/clinicas?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir clínica");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "clinicas"] });
      toast.success("Clínica excluída com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir clínica"),
  });

  const hotelMutation = useMutation({
    mutationFn: async (payload: { nome: string; qt_vagas: number }) => {
      const res = await fetch("/api/config/hoteis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar hotel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"] });
      setHotelNome("");
      setHotelVagas("");
      toast.success("Hotel salvo com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteHotelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/hoteis?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao excluir hotel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"] });
      toast.success("Hotel excluído com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateHotelMutation = useMutation({
    mutationFn: async (payload: { id: string; qt_vagas: number }) => {
      const res = await fetch("/api/config/hoteis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payload.id, qt_vagas: Number(payload.qt_vagas) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao atualizar hotel");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"] });
      setEditingHotelId(null);
      toast.success("Hotel atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addAcessoMutation = useMutation({
    mutationFn: async (data: { re: string; nome: string; role: string }) => {
      const res = await fetch("/api/config/acessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao salvar acesso");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"] });
      setAcessoRE("");
      setAcessoNome("");
      setAcessoRole("");
      toast.success("Acesso configurado com sucesso!");
    },
    onError: () => toast.error("Erro ao configurar acesso"),
  });

  const deleteAcessoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/acessos?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao remover acesso");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"] });
      toast.success("Acesso removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover acesso"),
  });

  const resetProjetoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/config/reset", {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao resetar projeto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Projeto resetado com sucesso! Recarregando página...");
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // --- Handlers ---

  // ── Guard: aguarda auth resolver, depois verifica perfil admin ─────────────
  if (authLoading) return null;

  if (user?.perfil !== "admin") {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Settings className="h-8 w-8 text-destructive/60" />
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
      <div className="w-full max-w-6xl mx-auto p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie configurações do sistema, projetos, acessos e integrações.
          </p>
        </div>

        <Card className="glass-card">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <CardHeader className="pb-0">
              <TabsList className="w-full flex justify-start gap-2 bg-transparent border-b border-border/50 pb-2 rounded-none h-auto">
                <TabsTrigger
                  value="projeto"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Projeto
                </TabsTrigger>
                <TabsTrigger
                  value="acessos"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Acessos
                </TabsTrigger>
                <TabsTrigger
                  value="clinicas"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Clínicas
                </TabsTrigger>
                <TabsTrigger
                  value="hoteis"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Bed className="w-4 h-4 mr-2" />
                  Hotéis
                </TabsTrigger>
                <TabsTrigger
                  value="logs"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Logs
                </TabsTrigger>
                <TabsTrigger
                  value="sistema"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Sistema
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* Projeto Tab */}
              <TabsContent value="projeto" className="w-full mt-10 space-y-8">
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
                      Marque manualmente os dias em que houve trabalho no projeto
                    </p>
                  </div>

                  {projeto.data_inicio && projeto.data_fim ? (
                    <div className="space-y-4">
                      {/* Resumo estatístico */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <div className="flex flex-col gap-1 p-4 bg-primary/5 rounded-lg border border-primary/15">
                          <span className="text-xs text-muted-foreground">Percentual</span>
                          <span className="text-2xl font-bold text-primary tabular-nums">
                            {diasCorridosTotal
                              ? Math.round((diasTrabalhados.length / diasCorridosTotal) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Calendário */}
                      <WorkingDaysCalendar
                        year={calendarioAno}
                        month={calendarioMes}
                        workingDays={diasTrabalhados}
                        onToggle={toggleDiaTrabalhado}
                        minDate={projeto.data_inicio}
                        maxDate={projeto.data_fim}
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

                      {/* Botão salvar dias trabalhados */}
                      <div className="flex justify-end">
                        <Button
                          onClick={() => diasTrabalhadosMutation.mutate(diasTrabalhados)}
                          disabled={diasTrabalhadosMutation.isPending}
                          className="gap-2"
                          variant="outline"
                        >
                          <Save className="w-4 h-4" />
                          Salvar Dias Trabalhados
                        </Button>
                      </div>
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
                      backgroundColor: "#5bc0ec",
                      borderColor: "#5bc0ec",
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </TabsContent>

              {/* Acessos Tab - Layout Split */}
              <TabsContent value="acessos" className="w-full mt-10 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-primary" />
                    Gestão de Acessos
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Configure permissões de acesso ao sistema
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Lado Esquerdo - Formulário */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
                      Novo Acesso
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          RE (Registro)
                        </label>
                        <Input
                          value={acessoRE}
                          onChange={(e) => setAcessoRE(e.target.value)}
                          className="glass-input"
                          placeholder="Número do RE"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Nome Completo
                        </label>
                        <Input
                          value={acessoNome}
                          onChange={(e) => setAcessoNome(e.target.value)}
                          className="glass-input"
                          placeholder="Nome completo do usuário"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Nível de Acesso (Role)
                        </label>
                        <Select
                          value={acessoRole}
                          onValueChange={setAcessoRole}
                        >
                          <SelectTrigger className="glass-input">
                            <SelectValue placeholder="Selecione o perfil" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        addAcessoMutation.mutate({
                          re: acessoRE,
                          nome: acessoNome,
                          role: acessoRole,
                        })
                      }
                      disabled={
                        !acessoRE?.trim() ||
                        !acessoNome?.trim() ||
                        !acessoRole ||
                        addAcessoMutation.isPending
                      }
                      className="gap-2 w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Acesso
                    </Button>
                  </div>

                  {/* Lado Direito - Lista */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
                      Usuários Cadastrados
                    </h3>

                    <div className="space-y-2 max-h-100 overflow-y-auto">
                      {acessos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhum usuário cadastrado</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {acessos.map((acesso) => (
                            <div
                              key={acesso.id}
                              className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <span className="font-medium block">
                                    {acesso.nome}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    RE: {acesso.re} •{" "}
                                    {ROLES.find((r) => r.value === acesso.perfil)
                                      ?.label || acesso.perfil}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  acesso.id &&
                                  deleteAcessoMutation.mutate(acesso.id)
                                }
                                disabled={deleteAcessoMutation.isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Clínicas Tab - Layout Split */}
              <TabsContent value="clinicas" className="w-full mt-10 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Gestão de Clínicas
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Cadastre e gerencie as clínicas parceiras
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Lado Esquerdo - Formulário */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
                      Nova Clínica
                    </h3>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Nome da Clínica
                      </label>
                      <Input
                        value={clinicaInput}
                        onChange={(e) => setClinicaInput(e.target.value)}
                        className="glass-input"
                        placeholder="Nome da clínica"
                      />
                    </div>

                    <Button
                      onClick={() => clinicaMutation.mutate(clinicaInput)}
                      disabled={
                        !clinicaInput?.trim() || clinicaMutation.isPending
                      }
                      className="gap-2 w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Clínica
                    </Button>
                  </div>

                  {/* Lado Direito - Lista */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
                      Clínicas Cadastradas
                    </h3>

                    <div className="space-y-2 max-h-100 overflow-y-auto">
                      {clinicas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhuma clínica cadastrada</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {clinicas.map((clinica) => (
                            <div
                              key={clinica.id}
                              className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Activity className="w-4 h-4 text-primary" />
                                </div>
                                <span className="font-medium">
                                  {clinica.nome}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  clinica.id &&
                                  deleteClinicaMutation.mutate(clinica.id)
                                }
                                disabled={deleteClinicaMutation.isPending}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Hotéis Tab - Layout Split */}
              <TabsContent value="hoteis" className="w-full mt-10 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <Bed className="w-5 h-5 text-primary" />
                    Gestão de Hotéis
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Cadastre e gerencie os hotéis parceiros
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Lado Esquerdo - Formulário */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
                      Novo Hotel
                    </h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Nome do Hotel
                        </label>
                        <Input
                          value={hotelNome}
                          onChange={(e) => setHotelNome(e.target.value)}
                          className="glass-input"
                          placeholder="Nome do hotel"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Quantidade de Vagas
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={hotelVagas}
                          onChange={(e) => setHotelVagas(e.target.value)}
                          className="glass-input"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() =>
                        hotelMutation.mutate({
                          nome: hotelNome,
                          qt_vagas: Number(hotelVagas) || 0,
                        })
                      }
                      disabled={!hotelNome?.trim() || hotelMutation.isPending}
                      className="gap-2 w-full"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Hotel
                    </Button>
                  </div>

                  {/* Lado Direito - Lista */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
                      Hotéis Cadastrados
                    </h3>

                    <div className="space-y-2 max-h-100 overflow-y-auto">
                      {hoteis.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bed className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="text-sm">Nenhum hotel cadastrado</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {hoteis.map((hotel) => (
                            <div
                              key={hotel.id}
                              className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Bed className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium block truncate">
                                    {hotel.nome}
                                  </span>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {/* Total de Vagas — inline edit or static */}
                                    {editingHotelId === hotel.id ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-muted-foreground">Total:</span>
                                        <Input
                                          type="number"
                                          min={0}
                                          value={editingQtVagas}
                                          onChange={(e) => setEditingQtVagas(e.target.value)}
                                          className="h-6 w-20 px-1.5 text-xs glass-input"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && hotel.id)
                                              updateHotelMutation.mutate({ id: hotel.id, qt_vagas: Number(editingQtVagas) || 0 });
                                            if (e.key === "Escape") setEditingHotelId(null);
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">
                                        Total: <span className="font-medium text-foreground">{hotel.qt_vagas}</span>
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      Ocupadas: <span className="font-medium text-amber-400">{hotel.vagas_ocupadas}</span>
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      Disponíveis: <span className="font-medium text-emerald-400">{hotel.vagas_disponiveis}</span>
                                    </span>
                                  </div>
                                  {hotel.qt_vagas > 0 && (
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden max-w-[120px]">
                                        <div
                                          className="h-full rounded-full bg-amber-400"
                                          style={{
                                            width: `${Math.min(100, Math.round((hotel.vagas_ocupadas / hotel.qt_vagas) * 100))}%`,
                                          }}
                                        />
                                      </div>
                                      <span className="text-xs text-muted-foreground tabular-nums">
                                        {Math.round((hotel.vagas_ocupadas / hotel.qt_vagas) * 100)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {editingHotelId === hotel.id ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        hotel.id &&
                                        updateHotelMutation.mutate({ id: hotel.id, qt_vagas: Number(editingQtVagas) || 0 })
                                      }
                                      disabled={updateHotelMutation.isPending}
                                      className="text-emerald-400 hover:text-emerald-400 hover:bg-emerald-400/10 h-7 w-7 p-0"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingHotelId(null)}
                                      disabled={updateHotelMutation.isPending}
                                      className="h-7 w-7 p-0"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingHotelId(hotel.id ?? null);
                                        setEditingQtVagas(String(hotel.qt_vagas));
                                      }}
                                      disabled={deleteHotelMutation.isPending}
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        hotel.id &&
                                        deleteHotelMutation.mutate(hotel.id)
                                      }
                                      disabled={deleteHotelMutation.isPending}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="w-full mt-10 space-y-8">
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Logs do Sistema
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Visualize o histórico de ações realizadas no sistema
                  </p>
                </div>

                <div className="space-y-2">
                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                      <p>Nenhum log encontrado</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-125 overflow-y-auto">
                      {logs.map((log, index) => (
                        <div
                          key={log.id || index}
                          className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-border/50"
                        >
                          <div className="text-xs text-muted-foreground w-32 shrink-0">
                            {new Date(log.timestamp).toLocaleString("pt-BR")}
                          </div>

                          <Badge
                            variant={getAcaoBadgeVariant(log.acao)}
                            className="w-24 shrink-0 justify-center"
                          >
                            {log.acao}
                          </Badge>

                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground">
                              {log.usuario}
                            </span>
                            <span className="text-sm text-muted-foreground truncate block">
                              {" "}
                              — {log.detalhes}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Sistema Tab */}
              <TabsContent value="sistema" className="w-full mt-10 space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                    Resetar Projeto
                  </h3>
                  <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100">
                          ⚠️ Esta ação é irreversível
                        </h4>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          Resetar o projeto limpará todos os dados operacionais (colaboradores, logística,
                          segurança, suprimentos, hotéis e clínicas). As seguintes informações serão mantidas:
                        </p>
                        <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc list-inside space-y-1 ml-2">
                          <li>Etapas do cronograma</li>
                          <li>Configurações do projeto (datas, gerentes, etc)</li>
                          <li>Usuários permitidos (acessos)</li>
                          <li>Logs de auditoria (histórico de ações)</li>
                        </ul>
                      </div>
                      <Button
                        onClick={() => {
                          if (
                            confirm(
                              "⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL e limpará todos os dados operacionais do projeto.\n\n" +
                              "Tem certeza que deseja continuar?\n\n" +
                              "Digite 'CONFIRMAR' para prosseguir.",
                            )
                          ) {
                            resetProjetoMutation.mutate();
                          }
                        }}
                        disabled={resetProjetoMutation.isPending}
                        variant="destructive"
                        className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                        {resetProjetoMutation.isPending ? "Resetando..." : "Resetar Projeto"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

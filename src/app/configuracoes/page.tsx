// src/app/configuracoes/page.tsx
"use client";

import { useState, useMemo } from "react";
import { calculateWorkingDays } from "@/lib/date-utils";
import { validateScheduleTotal } from "@/constants/cronograma-data";
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
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";

// --- Types ---
type ConfigProjeto = {
  gerente_operacoes: string;
  gerente_contrato: string;
  nome_cliente: string;
  centro_custo: string;
  data_inicio: string;
  data_fim: string;
};

type EtapaCronograma = {
  id: number;
  nome: string;
  porcentagem_acumulada: string;
  dias: number;
};

type ConfigCronograma = {
  etapas: EtapaCronograma[];
  dias_totais: number;
};

type ConfigClinica = { id?: number; nome: string };
type ConfigHotel = { id?: number; nome: string; vagas_totais: number };
type ConfigAcesso = { id?: number; re: string; nome: string; role: string };

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
  ETAPAS_PROJETO: Array<{ id: number; nome: string; duracaoDias: number }>;
  GERENTE_OPERACOES: string | null;
  GERENTE_CONTRATO: string | null;
  NOME_CLIENTE: string | null;
  CENTRO_CUSTO: string | null;
};

// ─── Etapas unificadas (10 etapas — fase 1) ────────────────────────────────
// Alterações vs. versão anterior:
//   • "Treinamento Yara" + "Treinamento MSV"  →  "Treinamentos Normativos"
//   • "Crachá" + "Credencial"                 →  "Liberação de Credencial"
const ETAPAS_DEFAULT: EtapaCronograma[] = [
  { id: 1, nome: "Seleção", porcentagem_acumulada: "0% - 10%", dias: 3 },
  { id: 2, nome: "Exames", porcentagem_acumulada: "10% - 20%", dias: 4 },
  { id: 3, nome: "ASO", porcentagem_acumulada: "20% - 28%", dias: 2 },
  { id: 4, nome: "e-Social", porcentagem_acumulada: "28% - 38%", dias: 4 },
  { id: 5, nome: "Contrato", porcentagem_acumulada: "38% - 48%", dias: 3 },
  {
    id: 6,
    nome: "Treinamentos Normativos",
    porcentagem_acumulada: "48% - 65%",
    dias: 8,
  },
  { id: 7, nome: "Portal", porcentagem_acumulada: "65% - 73%", dias: 3 },
  {
    id: 8,
    nome: "Liberação de Credencial",
    porcentagem_acumulada: "73% - 83%",
    dias: 4,
  },
  { id: 9, nome: "EPIs", porcentagem_acumulada: "83% - 92%", dias: 3 },
  {
    id: 10,
    nome: "Início de Campo",
    porcentagem_acumulada: "92% - 100%",
    dias: 3,
  },
];

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
  });

  // Cronograma
  const [cronograma, setCronograma] = useState<ConfigCronograma>({
    etapas: ETAPAS_DEFAULT,
    dias_totais: ETAPAS_DEFAULT.reduce((s, e) => s + e.dias, 0),
  });

  // ── Dias úteis calculados a partir das datas do projeto ─────────────────────
  // Recalcula sempre que data_inicio ou data_fim mudarem.
  // Retorna null enquanto alguma das datas estiver vazia.
  const diasUteisTotal = useMemo<number | null>(() => {
    if (!projeto.data_inicio || !projeto.data_fim) return null;
    try {
      return calculateWorkingDays(projeto.data_inicio, projeto.data_fim);
    } catch {
      return null;
    }
  }, [projeto.data_inicio, projeto.data_fim]);

  // ── Validação do cronograma vs. dias úteis do projeto ────────────────────────
  const scheduleValidation = useMemo(() => {
    if (diasUteisTotal === null) return null;
    const stepsDays = cronograma.etapas.map((e) => e.dias);
    return validateScheduleTotal(stepsDays, diasUteisTotal);
  }, [cronograma.etapas, diasUteisTotal]);

  // Acessos - inicializado como strings vazias para blindagem
  const [acessoRE, setAcessoRE] = useState("");
  const [acessoNome, setAcessoNome] = useState("");
  const [acessoRole, setAcessoRole] = useState("");
  // Clínicas - input para adicionar nova
  const [clinicaInput, setClinicaInput] = useState("");

  // Hotéis - inputs para adicionar novo
  const [hotelNome, setHotelNome] = useState("");
  const [hotelVagas, setHotelVagas] = useState("");

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

  // ── Sync projeto/cronograma form state from server data ────────────────────
  // Uses the "setState during render" pattern recommended by React to avoid
  // calling setState inside useEffect (which can cause cascading renders).
  const [syncedProjetoData, setSyncedProjetoData] = useState(projetoData);
  if (projetoData !== syncedProjetoData) {
    setSyncedProjetoData(projetoData);
    if (projetoData) {
      setProjeto({
        gerente_operacoes: projetoData.GERENTE_OPERACOES || "",
        gerente_contrato: projetoData.GERENTE_CONTRATO || "",
        nome_cliente: projetoData.NOME_CLIENTE || "",
        centro_custo: projetoData.CENTRO_CUSTO || "",
        data_inicio: projetoData.DATA_INICIO_PROJETO || "",
        data_fim: projetoData.DATA_FIM_PROJETO || "",
      });
      if (projetoData.ETAPAS_PROJETO?.length) {
        const novasEtapas = ETAPAS_DEFAULT.map((etapaDefault) => {
          const salva = projetoData.ETAPAS_PROJETO.find(
            (e) => e.nome === etapaDefault.nome,
          );
          return salva
            ? { ...etapaDefault, dias: salva.duracaoDias }
            : etapaDefault;
        });
        const totalDias = novasEtapas.reduce((s, e) => s + e.dias, 0);
        setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
      }
    }
  }

  // --- Mutations ---
  const projetoMutation = useMutation({
    mutationFn: async (data: ConfigProjeto) => {
      // Envia apenas dados do projeto — etapas NÃO são incluídas
      const payload = {
        gerenteOperacoes: data.gerente_operacoes,
        gerenteContrato: data.gerente_contrato,
        nomeCliente: data.nome_cliente,
        centroCusto: data.centro_custo,
        dataInicio: data.data_inicio,
        dataFim: data.data_fim,
      };

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

  const cronogramaMutation = useMutation({
    mutationFn: async (data: ConfigCronograma) => {
      // Envia apenas as etapas — dados do projeto NÃO são incluídos
      const payload = {
        etapas: data.etapas.map((e) => ({
          id: e.id,
          nome: e.nome,
          duracaoDias: e.dias,
        })),
      };

      const res = await fetch("/api/config/etapas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Falha ao salvar cronograma");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Cronograma atualizado com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar cronograma"),
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
    mutationFn: async (data: { nome: string; vagas: number }) => {
      const res = await fetch("/api/config/hoteis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: data.nome, vagas_totais: data.vagas }),
      });
      if (!res.ok) throw new Error("Falha ao salvar hotel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"] });
      setHotelNome("");
      setHotelVagas("");
      toast.success("Hotel salvo com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar hotel"),
  });

  const deleteHotelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/config/hoteis?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao excluir hotel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "hoteis"] });
      toast.success("Hotel excluído com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir hotel"),
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
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/config/acessos?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Falha ao remover acesso");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"] });
      toast.success("Acesso removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover acesso"),
  });

  // --- Handlers ---
  const updateEtapaDias = (id: number, dias: number) => {
    const novasEtapas = cronograma.etapas.map((e) =>
      e.id === id ? { ...e, dias: Math.max(1, dias) } : e,
    );
    const totalDias = novasEtapas.reduce((sum, e) => sum + e.dias, 0);
    setCronograma({ etapas: novasEtapas, dias_totais: totalDias });
  };

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
                  value="cronograma"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Cronograma
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

                  {/* ── Indicador de Dias Úteis ── */}
                  {diasUteisTotal !== null && (
                    <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Total de Dias Úteis do Projeto
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Seg – Sex, excluindo sáb/dom
                        </p>
                      </div>
                      <span className="text-3xl font-bold text-primary tabular-nums">
                        {diasUteisTotal}
                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                          dias
                        </span>
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

              {/* Cronograma Tab */}
              <TabsContent
                value="cronograma"
                className="w-full mt-10 space-y-8"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                    <CalendarClock className="w-5 h-5 text-primary" />
                    Cronograma do Projeto
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Defina a duração de cada etapa
                  </p>
                </div>

                {/* ── Painel de totais e validação ── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="font-medium">Soma das Etapas:</span>
                    <span className="text-2xl font-bold text-primary tabular-nums">
                      {cronograma.etapas.reduce((s, e) => s + e.dias, 0)} dias
                      úteis
                    </span>
                  </div>

                  {/* Aviso de validação — aparece apenas quando as datas do projeto estão definidas */}
                  {diasUteisTotal !== null &&
                    scheduleValidation !== null &&
                    (scheduleValidation.valid ? (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
                        <svg
                          className="h-4 w-4 shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          Cronograma balanceado —{" "}
                          {scheduleValidation.stepsDaysTotal} dias úteis
                          alocados (meta: {diasUteisTotal} dias úteis do
                          projeto).
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                        <svg
                          className="h-4 w-4 shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>
                          {scheduleValidation.difference > 0
                            ? `As etapas excedem o projeto em ${scheduleValidation.difference} dia(s) útil(is). Reduza alguma etapa.`
                            : `Faltam ${Math.abs(scheduleValidation.difference)} dia(s) útil(is) para cobrir o projeto. Aumente alguma etapa.`}{" "}
                          <span className="opacity-70">
                            (Etapas: {scheduleValidation.stepsDaysTotal} ·
                            Projeto: {diasUteisTotal} dias úteis)
                          </span>
                        </span>
                      </div>
                    ))}

                  {/* Aviso quando datas ainda não estão configuradas */}
                  {diasUteisTotal === null && (
                    <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2.5 text-sm text-yellow-400">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>
                        Configure as datas de início e término na aba Projeto
                        para validar o cronograma.
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                  {cronograma.etapas.map((etapa) => (
                    <div
                      key={etapa.id}
                      className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-border/50"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                        {etapa.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{etapa.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {etapa.porcentagem_acumulada}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={etapa.dias}
                          onChange={(e) =>
                            updateEtapaDias(
                              etapa.id,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-20 glass-input text-center"
                        />
                        <span className="text-sm text-muted-foreground w-10">
                          dias
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={() => cronogramaMutation.mutate(cronograma)}
                    disabled={cronogramaMutation.isPending}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Cronograma
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
                                    {ROLES.find((r) => r.value === acesso.role)
                                      ?.label || acesso.role}
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
                          vagas: parseInt(hotelVagas) || 0,
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
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Bed className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <span className="font-medium block">
                                    {hotel.nome}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {hotel.vagas_totais} vagas
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  hotel.id &&
                                  deleteHotelMutation.mutate(hotel.id)
                                }
                                disabled={deleteHotelMutation.isPending}
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
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

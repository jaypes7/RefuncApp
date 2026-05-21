"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  ListChecks,
  Pencil,
  FolderPlus,
  FolderOpen,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import { useRouter } from "next/navigation";
import {
  checklistMobilizacaoApi,
  checklistEtapasApi,
  configApi,
  type ChecklistSubetapa,
  type ChecklistEtapa,
  type GrupoEtapa,
} from "@/lib/axios";

type EditingRow = {
  id?: string;
  etapa_id: number;
  nome: string;
  setor: string;
  responsavel: string;
  previsto: string;
  avanco: string;
  data_inicio: string;
  data_termino: string;
  observacao: string;
};

export default function ChecklistMobilizacaoPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { centroCusto, isReady: filterReady } = useFilter();
  const router = useRouter();

  // Proteção: apenas admins podem acessar o checklist
  useEffect(() => {
    if (user && user.perfil !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const [expandedEtapa, setExpandedEtapa] = useState<Set<number>>(new Set());
  const [editingRows, setEditingRows] = useState<Record<string, EditingRow>>({});
  const [addingForEtapa, setAddingForEtapa] = useState<number | null>(null);

  // Estado para editar nome da etapa
  const [editingEtapaId, setEditingEtapaId] = useState<number | null>(null);
  const [editingEtapaNome, setEditingEtapaNome] = useState("");

  // Estado para nova etapa (top form)
  const [novaEtapaOpen, setNovaEtapaOpen] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState("");
  const [novaEtapaGrupoId, setNovaEtapaGrupoId] = useState<number | null>(null);

  // Estado para forms inline de nova etapa por grupo
  // "g_<id>" para grupo específico, "g_null" para "Sem grupo", null = nenhum aberto
  const [addingEtapaGrupoKey, setAddingEtapaGrupoKey] = useState<string | null>(null);
  const [addingEtapaNome, setAddingEtapaNome] = useState("");

  // Estado para ordem manual das etapas (apenas frontend)
  const [etapasOrder, setEtapasOrder] = useState<number[]>([]);
  const [ordemAlterada, setOrdemAlterada] = useState(false);

  // Estado para colapso de grupos
  const [collapsedGrupos, setCollapsedGrupos] = useState<Set<number>>(new Set());

  // Estado para edição de nome de grupo
  const [editingGrupoId, setEditingGrupoId] = useState<number | null>(null);
  const [editingGrupoNome, setEditingGrupoNome] = useState("");

  const toggleGrupo = (id: number) => {
    setCollapsedGrupos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["checklist-mobilizacao", centroCusto],
    queryFn: async () => {
      const res = await checklistMobilizacaoApi.listar(centroCusto);
      return res.data;
    },
    enabled: filterReady && !!centroCusto,
  });

  // Busca configurações do projeto para obter grupos de etapas
  const { data: configResponse } = useQuery({
    queryKey: ["config", centroCusto],
    queryFn: async () => {
      const res = await configApi.get(centroCusto);
      return res.data.data;
    },
    enabled: filterReady && !!centroCusto,
  });

  const configGrupos: GrupoEtapa[] = configResponse?.GRUPOS_ETAPAS ?? [];

  const etapasRaw = data?.etapas ?? [];
  const subetapas = data?.subetapas ?? [];

  // Sincroniza etapasOrder com novas etapas do backend (mantém ordem manual,
  // apenas adiciona novas IDs no final)
  const idsAtuais = etapasRaw.map((e) => e.id);
  const idsOrderSet = new Set(etapasOrder);
  const novosIds = idsAtuais.filter((id) => !idsOrderSet.has(id));
  const etapasOrderFinal = novosIds.length > 0 ? [...etapasOrder, ...novosIds] : etapasOrder;

  // Se ainda não inicializou, usa a ordem do backend
  const etapasOrderAtual = etapasOrderFinal.length === 0 && idsAtuais.length > 0
    ? idsAtuais
    : etapasOrderFinal;

  // Ordena etapas conforme ordem manual
  const etapas = [...etapasRaw].sort((a, b) => {
    const idxA = etapasOrderAtual.indexOf(a.id);
    const idxB = etapasOrderAtual.indexOf(b.id);
    return idxA - idxB;
  });

  // Agrupa checklist etapas pelos grupos do cronograma via etapa_origem_id
  const etapasPorGrupo = useMemo(() => {
    if (configGrupos.length === 0) return null;

    // Mapa: etapa_origem_id → grupo_id
    const origemParaGrupo = new Map<number, number>();
    for (const et of (configResponse?.ETAPAS_PROJETO ?? [])) {
      if (et.grupoId != null && et.id != null) {
        origemParaGrupo.set(et.id, et.grupoId);
      }
    }

    const byGrupo = new Map<number | null, ChecklistEtapa[]>();

    for (const etapa of etapas) {
      // Prioridade: grupo_id direto na etapa → grupo via etapa_origem_id → sem grupo
      let grupoId: number | null = null;
      if (etapa.grupo_id != null) {
        grupoId = etapa.grupo_id;
      } else if (etapa.etapa_origem_id != null) {
        grupoId = origemParaGrupo.get(etapa.etapa_origem_id) ?? null;
      }
      const list = byGrupo.get(grupoId) ?? [];
      list.push(etapa);
      byGrupo.set(grupoId, list);
    }

    return byGrupo;
  }, [etapas, configGrupos, configResponse?.ETAPAS_PROJETO]);

  const reordenarMutation = useMutation({
    mutationFn: (etapas: Array<{ id: number; ordem: number }>) =>
      checklistEtapasApi.reordenar(etapas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao reordenar etapas.");
    },
  });

  const moverEtapa = (id: number, direcao: "cima" | "baixo") => {
    const order = etapasOrder.length > 0 ? [...etapasOrder] : [...idsAtuais];
    const idx = order.indexOf(id);
    if (idx === -1) return;

    if (direcao === "cima" && idx > 0) {
      [order[idx], order[idx - 1]] = [order[idx - 1], order[idx]];
    } else if (direcao === "baixo" && idx < order.length - 1) {
      [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
    } else {
      return; // já está no limite
    }

    // Atualiza estado local imediatamente (UI responsiva)
    setEtapasOrder(order);
    setOrdemAlterada(true);
  };

  const salvarOrdem = () => {
    const order = etapasOrder.length > 0 ? etapasOrder : idsAtuais;
    const payload = order.map((etapaId, index) => ({ id: etapaId, ordem: index + 1 }));
    reordenarMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Ordem salva.");
        setOrdemAlterada(false);
      },
    });
  };

  const toggleEtapa = (id: number) => {
    setExpandedEtapa((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startAdd = (etapaId: number) => {
    const key = `new-${etapaId}`;
    setEditingRows((prev) => ({
      ...prev,
      [key]: {
        etapa_id: etapaId,
        nome: "",
        setor: "",
        responsavel: "",
        previsto: "",
        avanco: "",
        data_inicio: "",
        data_termino: "",
        observacao: "",
      },
    }));
    setAddingForEtapa(etapaId);
    setExpandedEtapa((prev) => new Set(prev).add(etapaId));
  };

  const startEdit = (s: ChecklistSubetapa) => {
    setEditingRows((prev) => ({
      ...prev,
      [s.id]: {
        id: s.id,
        etapa_id: s.etapa_id,
        nome: s.nome,
        setor: s.setor ?? "",
        responsavel: s.responsavel ?? "",
        previsto: s.previsto != null ? String(Math.round(s.previsto * 100)) : "",
        avanco: s.avanco != null ? String(Math.round(s.avanco * 100)) : "",
        data_inicio: s.data_inicio ?? "",
        data_termino: s.data_termino ?? "",
        observacao: s.observacao ?? "",
      },
    }));
  };

  const cancelEdit = (key: string) => {
    setEditingRows((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (key.startsWith("new-")) setAddingForEtapa(null);
  };

  const updateEditField = (key: string, field: keyof EditingRow, value: string) => {
    setEditingRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  // ── Mutations de Subetapas ────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (payload: Omit<ChecklistSubetapa, "id" | "created_at">) => checklistMobilizacaoApi.criar(payload),
    onSuccess: () => {
      toast.success("Subetapa adicionada.");
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
      setAddingForEtapa(null);
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao adicionar subetapa.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ChecklistSubetapa> }) =>
      checklistMobilizacaoApi.atualizar(id, payload),
    onSuccess: () => {
      toast.success("Subetapa atualizada.");
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao atualizar subetapa.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => checklistMobilizacaoApi.remover(id),
    onSuccess: () => {
      toast.success("Subetapa removida.");
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao remover subetapa.");
    },
  });

  // ── Mutations de Etapas ───────────────────────────────────────────────────

  const createEtapaMutation = useMutation({
    mutationFn: ({ nome, grupoId }: { nome: string; grupoId: number | null }) =>
      checklistEtapasApi.criar({
        centro_custo: centroCusto ?? "",
        nome,
        ordem: 0,
        etapa_origem_id: null,
        grupo_id: grupoId,
      }),
    onSuccess: () => {
      toast.success("Etapa adicionada.");
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao adicionar etapa.");
    },
  });

  const updateEtapaMutation = useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) =>
      checklistEtapasApi.atualizar(id, { nome }),
    onSuccess: () => {
      toast.success("Etapa atualizada.");
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
      setEditingEtapaId(null);
      setEditingEtapaNome("");
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao atualizar etapa.");
    },
  });

  const deleteEtapaMutation = useMutation({
    mutationFn: (id: number) => checklistEtapasApi.remover(id),
    onSuccess: () => {
      toast.success("Etapa removida.");
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Erro ao remover etapa.");
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSave = (key: string) => {
    const row = editingRows[key];
    if (!row.nome.trim()) {
      toast.error("Nome da subetapa é obrigatório.");
      return;
    }
    const payload = {
      etapa_id: row.etapa_id,
      centro_custo: centroCusto ?? null,
      nome: row.nome.trim(),
      setor: row.setor.trim() || null,
      responsavel: row.responsavel.trim() || null,
      previsto: row.previsto ? Number(row.previsto) / 100 : null,
      avanco: row.avanco ? Number(row.avanco) / 100 : null,
      data_inicio: row.data_inicio || null,
      data_termino: row.data_termino || null,
      observacao: row.observacao.trim() || null,
      ordem: 0,
    };

    if (key.startsWith("new-")) {
      createMutation.mutate(payload);
      cancelEdit(key);
    } else if (row.id) {
      updateMutation.mutate({ id: row.id, payload });
      cancelEdit(key);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Remover esta subetapa?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleSaveEtapaNome = (id: number) => {
    if (!editingEtapaNome.trim()) {
      toast.error("Nome da etapa é obrigatório.");
      return;
    }
    updateEtapaMutation.mutate({ id, nome: editingEtapaNome.trim() });
  };

  const handleDeleteEtapa = (etapa: ChecklistEtapa) => {
    if (confirm(`Remover a etapa "${etapa.nome}" e todas as suas subetapas?`)) {
      deleteEtapaMutation.mutate(etapa.id);
    }
  };

  const handleAddEtapa = () => {
    if (!novaEtapaNome.trim()) {
      toast.error("Nome da etapa é obrigatório.");
      return;
    }
    createEtapaMutation.mutate({ nome: novaEtapaNome.trim(), grupoId: novaEtapaGrupoId }, {
      onSuccess: () => {
        setNovaEtapaOpen(false);
        setNovaEtapaNome("");
        setNovaEtapaGrupoId(null);
      },
    });
  };

  const handleAddEtapaInGrupo = (grupoId: number | null) => {
    if (!addingEtapaNome.trim()) {
      toast.error("Nome da etapa é obrigatório.");
      return;
    }
    createEtapaMutation.mutate({ nome: addingEtapaNome.trim(), grupoId }, {
      onSuccess: () => {
        setAddingEtapaGrupoKey(null);
        setAddingEtapaNome("");
      },
    });
  };

  // ── Mutations de Grupos ───────────────────────────────────────────────────

  const criarGrupoMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch("/api/config/etapas-grupos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, centroCusto }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Falha ao criar grupo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
      toast.success("Grupo criado");
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
        throw new Error(b?.error ?? "Falha ao renomear grupo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const excluirGrupoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/config/etapas-grupos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error ?? "Falha ao excluir grupo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["checklist-mobilizacao"], type: "all" });
      toast.success("Grupo removido");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Handlers de grupos ────────────────────────────────────────────────────

  const handleCriarGrupo = () => {
    criarGrupoMutation.mutate("Novo Grupo");
  };

  const iniciarEdicaoGrupo = (grupo: GrupoEtapa) => {
    setEditingGrupoId(grupo.id);
    setEditingGrupoNome(grupo.nome);
  };

  const salvarEdicaoGrupo = () => {
    if (editingGrupoId != null && editingGrupoNome.trim()) {
      renomearGrupoMutation.mutate({ id: editingGrupoId, nome: editingGrupoNome.trim() });
    }
    setEditingGrupoId(null);
    setEditingGrupoNome("");
  };

  const cancelarEdicaoGrupo = () => {
    setEditingGrupoId(null);
    setEditingGrupoNome("");
  };

  const handleExcluirGrupo = (id: number) => {
    if (confirm("Remover este grupo? As etapas associadas ficarão sem grupo.")) {
      excluirGrupoMutation.mutate(id);
    }
  };

  const mediaAvanco = (items: ChecklistSubetapa[]) => {
    if (items.length === 0) return 0;
    const valid = items.filter((i) => i.avanco != null);
    if (valid.length === 0) return 0;
    return valid.reduce((s, i) => s + (i.avanco ?? 0), 0) / valid.length;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full p-4 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title">Checklist Mobilização</h1>
              <p className="page-subtitle">Controle de etapas e subetapas do projeto</p>
            </div>
            <div className="flex items-center gap-2">
              {ordemAlterada && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1"
                  onClick={salvarOrdem}
                  disabled={reordenarMutation.isPending}
                >
                  <Save className="h-4 w-4" />
                  {reordenarMutation.isPending ? "Salvando..." : "Salvar Posição"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleCriarGrupo}
                disabled={criarGrupoMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                Novo Grupo
              </Button>
              {!novaEtapaOpen ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setNovaEtapaOpen(true)}
                >
                  <FolderPlus className="h-4 w-4" />
                  Nova Etapa
                </Button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {configGrupos.length > 0 && (
                    <select
                      value={novaEtapaGrupoId ?? ""}
                      onChange={(e) => setNovaEtapaGrupoId(e.target.value ? Number(e.target.value) : null)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                    >
                      <option value="">Sem grupo</option>
                      {configGrupos.map((g) => (
                        <option key={g.id} value={g.id}>{g.nome}</option>
                      ))}
                    </select>
                  )}
                  <Input
                    value={novaEtapaNome}
                    onChange={(e) => setNovaEtapaNome(e.target.value)}
                    placeholder="Nome da nova etapa"
                    className="h-8 w-52 text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddEtapa();
                      if (e.key === "Escape") {
                        setNovaEtapaOpen(false);
                        setNovaEtapaNome("");
                        setNovaEtapaGrupoId(null);
                      }
                    }}
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleAddEtapa}
                    disabled={createEtapaMutation.isPending}>
                    <Save className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setNovaEtapaOpen(false);
                      setNovaEtapaNome("");
                      setNovaEtapaGrupoId(null);
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {!filterReady ? (
            <Card className="glass-card">
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                Carregando projeto...
              </CardContent>
            </Card>
          ) : !centroCusto ? (
            <Card className="glass-card">
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                Selecione um centro de custo para visualizar o checklist.
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card className="glass-card">
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                Carregando checklist...
              </CardContent>
            </Card>
          ) : etapas.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-20 text-center text-sm text-muted-foreground">
                Nenhuma etapa configurada no cronograma.
              </CardContent>
            </Card>
          ) : (() => {
            // Helper: renderiza o card de uma etapa individual
            const renderEtapaCard = (etapa: ChecklistEtapa) => {
              const items = subetapas.filter((s) => s != null && Number(s.etapa_id) === Number(etapa.id));
              const isOpen = expandedEtapa.has(etapa.id);
              const avanco = mediaAvanco(items);
              const editKey = `new-${etapa.id}`;
              const isAdding = addingForEtapa === etapa.id;
              const isEditingNome = editingEtapaId === etapa.id;

              return (
                <Card key={etapa.id} className="glass-card">
                  <CardHeader className="flex flex-row items-center gap-3 pb-2">
                    <ListChecks className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      {isEditingNome ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingEtapaNome}
                            onChange={(e) => setEditingEtapaNome(e.target.value)}
                            className="h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEtapaNome(etapa.id);
                              if (e.key === "Escape") {
                                setEditingEtapaId(null);
                                setEditingEtapaNome("");
                              }
                            }}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveEtapaNome(etapa.id)}
                          >
                            <Save className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingEtapaId(null);
                              setEditingEtapaNome("");
                            }}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <CardTitle className="text-base">{etapa.nome}</CardTitle>
                          <div className="mt-1 flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {items.length} subetapa{items.length !== 1 ? "s" : ""}
                            </span>
                            {items.length > 0 && (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {(() => {
                                    const concluidas = items.filter((s) => s.avanco != null && s.avanco >= 1).length;
                                    return `${concluidas}/${items.length} atividade${items.length !== 1 ? "s" : ""} concluída${items.length !== 1 ? "s" : ""}`;
                                  })()}
                                </span>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all"
                                      style={{ width: `${Math.min(100, avanco * 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{(avanco * 100).toFixed(0)}%</span>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {!isEditingNome && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => moverEtapa(etapa.id, "cima")}
                          title="Mover para cima"
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => moverEtapa(etapa.id, "baixo")}
                          title="Mover para baixo"
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingEtapaId(etapa.id);
                            setEditingEtapaNome(etapa.nome);
                          }}
                          title="Editar nome"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => handleDeleteEtapa(etapa)}
                          title="Excluir etapa"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1"
                          onClick={() => toggleEtapa(etapa.id)}
                        >
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  {isOpen && (
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <th className="pb-2 pr-3">Subetapa</th>
                              <th className="pb-2 pr-3">Setor</th>
                              <th className="pb-2 pr-3">Responsável</th>
                              <th className="pb-2 pr-3 w-16">Prev.</th>
                              <th className="pb-2 pr-3 w-16">Avan.</th>
                              <th className="pb-2 pr-3">Início</th>
                              <th className="pb-2 pr-3">Término</th>
                              <th className="pb-2 pr-3">Obs.</th>
                              <th className="pb-2 w-20 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => {
                              const edit = editingRows[item.id];
                              if (edit) {
                                return (
                                  <tr key={item.id} className="border-b border-border/40">
                                    <td className="py-1 pr-2">
                                      <Input value={edit.nome} onChange={(e) => updateEditField(item.id, "nome", e.target.value)} className="h-7 text-xs" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input value={edit.setor} onChange={(e) => updateEditField(item.id, "setor", e.target.value)} className="h-7 text-xs" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input value={edit.responsavel} onChange={(e) => updateEditField(item.id, "responsavel", e.target.value)} className="h-7 text-xs" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input value={edit.previsto} onChange={(e) => updateEditField(item.id, "previsto", e.target.value)} className="h-7 text-xs" placeholder="%" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input value={edit.avanco} onChange={(e) => updateEditField(item.id, "avanco", e.target.value)} className="h-7 text-xs" placeholder="%" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input type="date" value={edit.data_inicio} onChange={(e) => updateEditField(item.id, "data_inicio", e.target.value)} className="h-7 text-xs" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input type="date" value={edit.data_termino} onChange={(e) => updateEditField(item.id, "data_termino", e.target.value)} className="h-7 text-xs" />
                                    </td>
                                    <td className="py-1 pr-2">
                                      <Input value={edit.observacao} onChange={(e) => updateEditField(item.id, "observacao", e.target.value)} className="h-7 text-xs" />
                                    </td>
                                    <td className="py-1 text-right">
                                      <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(item.id)}>
                                          <Save className="h-3.5 w-3.5 text-green-600" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cancelEdit(item.id)}>
                                          <X className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }
                              return (
                                <tr
                                  key={item.id}
                                  className="border-b border-border/40 hover:bg-muted/30 cursor-pointer"
                                  onClick={() => startEdit(item)}
                                >
                                  <td className="py-1.5 pr-3 font-medium">{item.nome}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{item.setor || "—"}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{item.responsavel || "—"}</td>
                                  <td className="py-1.5 pr-3">{item.previsto != null ? `${(item.previsto * 100).toFixed(0)}%` : "—"}</td>
                                  <td className="py-1.5 pr-3">{item.avanco != null ? `${(item.avanco * 100).toFixed(0)}%` : "—"}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{item.data_inicio ? item.data_inicio.split("-").reverse().join("/") : "—"}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{item.data_termino ? item.data_termino.split("-").reverse().join("/") : "—"}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground truncate max-w-[120px]" title={item.observacao ?? undefined}>{item.observacao || "—"}</td>
                                  <td className="py-1.5 text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                                      >
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}

                            {isAdding && editingRows[editKey] && (
                              <tr key={editKey} className="border-b border-border/40 bg-primary/5">
                                <td className="py-1 pr-2">
                                  <Input value={editingRows[editKey].nome} onChange={(e) => updateEditField(editKey, "nome", e.target.value)} className="h-7 text-xs" placeholder="Nome" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input value={editingRows[editKey].setor} onChange={(e) => updateEditField(editKey, "setor", e.target.value)} className="h-7 text-xs" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input value={editingRows[editKey].responsavel} onChange={(e) => updateEditField(editKey, "responsavel", e.target.value)} className="h-7 text-xs" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input value={editingRows[editKey].previsto} onChange={(e) => updateEditField(editKey, "previsto", e.target.value)} className="h-7 text-xs" placeholder="%" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input value={editingRows[editKey].avanco} onChange={(e) => updateEditField(editKey, "avanco", e.target.value)} className="h-7 text-xs" placeholder="%" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input type="date" value={editingRows[editKey].data_inicio} onChange={(e) => updateEditField(editKey, "data_inicio", e.target.value)} className="h-7 text-xs" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input type="date" value={editingRows[editKey].data_termino} onChange={(e) => updateEditField(editKey, "data_termino", e.target.value)} className="h-7 text-xs" />
                                </td>
                                <td className="py-1 pr-2">
                                  <Input value={editingRows[editKey].observacao} onChange={(e) => updateEditField(editKey, "observacao", e.target.value)} className="h-7 text-xs" />
                                </td>
                                <td className="py-1 text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSave(editKey)}>
                                      <Save className="h-3.5 w-3.5 text-green-600" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => cancelEdit(editKey)}>
                                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {!isAdding && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1"
                          onClick={() => startAdd(etapa.id)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nova Subetapa
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            };

            // Render helper: grupo section
            const renderGrupoSection = (
              grupoId: number | null,
              grupoNome: string,
              grupoEtapas: ChecklistEtapa[],
            ) => {
              const collapseKey = grupoId ?? -1;
              const isCollapsed = collapsedGrupos.has(collapseKey);
              const grupoFormKey = grupoId != null ? `g_${grupoId}` : "g_null";
              const isAddingHere = addingEtapaGrupoKey === grupoFormKey;
              // Grupos do cronograma nunca são omitidos (têm botão "+ Nova Etapa")
              // "Sem grupo" é omitido somente se vazio e sem form aberto
              if (grupoId === null && grupoEtapas.length === 0 && !isAddingHere) return null;

              return (
                <div key={collapseKey} className="space-y-3">
                  {/* Header do grupo */}
                  <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5">
                    <button
                      type="button"
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => toggleGrupo(collapseKey)}
                      title={isCollapsed ? "Expandir" : "Colapsar"}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                      />
                    </button>
                    <FolderOpen className="h-4 w-4 shrink-0 text-primary" />

                    {/* Somente grupos reais (grupoId != null) são editáveis */}
                    {grupoId != null && editingGrupoId === grupoId ? (
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
                          className="flex-1 h-7 text-sm font-semibold"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary" onClick={salvarEdicaoGrupo}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={cancelarEdicaoGrupo}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-sm flex-1">{grupoNome}</span>
                        <span className="text-xs text-muted-foreground">
                          ({grupoEtapas.length} etapa{grupoEtapas.length !== 1 ? "s" : ""})
                        </span>
                        {grupoId != null && (
                          <>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                              onClick={() => iniciarEdicaoGrupo({ id: grupoId, nome: grupoNome, ordem: 0 })}
                              title="Renomear grupo"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleExcluirGrupo(grupoId)}
                              disabled={excluirGrupoMutation.isPending}
                              title="Excluir grupo"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {/* Etapas do grupo + form inline */}
                  {!isCollapsed && (
                    <div className="space-y-4 pl-4">
                      {grupoEtapas.map((etapa) => renderEtapaCard(etapa))}

                      {/* Form inline de nova etapa neste grupo */}
                      {isAddingHere ? (
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 bg-muted/10">
                          <Input
                            value={addingEtapaNome}
                            onChange={(e) => setAddingEtapaNome(e.target.value)}
                            placeholder={`Nova etapa em "${grupoNome}"`}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddEtapaInGrupo(grupoId);
                              if (e.key === "Escape") {
                                setAddingEtapaGrupoKey(null);
                                setAddingEtapaNome("");
                              }
                            }}
                          />
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                            onClick={() => handleAddEtapaInGrupo(grupoId)}
                            disabled={createEtapaMutation.isPending}
                          >
                            <Save className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                            onClick={() => { setAddingEtapaGrupoKey(null); setAddingEtapaNome(""); }}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setAddingEtapaGrupoKey(grupoFormKey);
                            setAddingEtapaNome("");
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Nova Etapa
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            };

            // Se não há grupos configurados → lista plana (retrocompatível)
            if (!etapasPorGrupo) {
              return (
                <div className="space-y-4">
                  {etapas.map((etapa) => renderEtapaCard(etapa))}
                </div>
              );
            }

            // Render agrupado
            const semGrupo = etapasPorGrupo.get(null) ?? [];
            return (
              <div className="space-y-6">
                {configGrupos.map((grupo) => {
                  const grupoEtapas = etapasPorGrupo.get(grupo.id) ?? [];
                  return renderGrupoSection(grupo.id, grupo.nome, grupoEtapas);
                })}
                {/* "Sem grupo" sempre visível para permitir adição */}
                {renderGrupoSection(null, "Sem grupo", semGrupo)}
              </div>
            );
          })()}
        </div>
      </div>
    </ProtectedRoute>
  );
}

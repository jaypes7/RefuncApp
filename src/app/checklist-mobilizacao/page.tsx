"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  X,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import { checklistMobilizacaoApi, type ChecklistSubetapa } from "@/lib/axios";
import { cn } from "@/lib/utils";

type EtapaBase = { id: number; nome: string };

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
  const { centroCusto } = useFilter();

  const [expandedEtapa, setExpandedEtapa] = useState<Set<number>>(new Set());
  const [editingRows, setEditingRows] = useState<Record<string, EditingRow>>({});
  const [addingForEtapa, setAddingForEtapa] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["checklist-mobilizacao", centroCusto],
    queryFn: async () => {
      const res = await checklistMobilizacaoApi.listar(centroCusto);
      return res.data;
    },
  });

  const etapas = data?.etapas ?? [];
  const subetapas = data?.subetapas ?? [];

  // Agrupa subetapas por etapa_id usando filter direto (evita problemas de tipos em Map keys)

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
          <div>
            <h1 className="page-title">Checklist Mobilização</h1>
            <p className="page-subtitle">Controle de etapas e subetapas do projeto</p>
          </div>

          {isLoading ? (
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
          ) : (
            <div className="space-y-4">
              {etapas.map((etapa) => {
                const items = subetapas.filter((s) => s != null && Number(s.etapa_id) === Number(etapa.id));
                const isOpen = expandedEtapa.has(etapa.id);
                const avanco = mediaAvanco(items);
                const editKey = `new-${etapa.id}`;
                const isAdding = addingForEtapa === etapa.id;

                return (
                  <Card key={etapa.id} className="glass-card">
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <ListChecks className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <CardTitle className="text-base">{etapa.nome}</CardTitle>
                        <div className="mt-1 flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {items.length} subetapa{items.length !== 1 ? "s" : ""}
                          </span>
                          {items.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(100, avanco * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{(avanco * 100).toFixed(0)}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() => toggleEtapa(etapa.id)}
                      >
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
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
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                      </Button>
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
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

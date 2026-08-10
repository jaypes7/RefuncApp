"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, Check, ChevronsUpDown, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFilter } from "@/contexts/FilterContext";

type ConfigCargo = { id?: string; nome: string; grupo?: string | null; ativo?: boolean };

export function CargosTab() {
  const queryClient = useQueryClient();
  const { isReady: filterReady } = useFilter();

  // Cargos
  const [cargoNome, setCargoNome] = useState("");
  const [cargoGrupo, setCargoGrupo] = useState("");
  const [editingCargoId, setEditingCargoId] = useState<string | null>(null);
  const [editingCargoNome, setEditingCargoNome] = useState("");
  const [editingCargoGrupo, setEditingCargoGrupo] = useState("");
  const [novoGrupoNome, setNovoGrupoNome] = useState("");
  const [novoGrupoCargoIds, setNovoGrupoCargoIds] = useState<string[]>([]);
  const [grupoPopoverOpen, setGrupoPopoverOpen] = useState(false);

  const { data: cargosData } = useQuery<ConfigCargo[]>({
    queryKey: ["config", "cargos"],
    queryFn: async () => {
      const res = await fetch("/api/config/cargos");
      if (!res.ok) throw new Error("Falha ao carregar cargos");
      return res.json();
    },
    enabled: filterReady,
  });

  const cargos = cargosData ?? [];

  // ── Grupos existentes (derivado dos cargos) ───────────────────────────────
  const gruposExistentes = useMemo(() => {
    const set = new Set<string>();
    for (const c of cargosData ?? []) {
      if (c.grupo) set.add(c.grupo);
    }
    return Array.from(set).sort();
  }, [cargosData]);

  const addCargoMutation = useMutation({
    mutationFn: async (data: { nome: string; grupo?: string }) => {
      const res = await fetch("/api/config/cargos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao salvar cargo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "cargos"], type: "all" });
      setCargoNome("");
      setCargoGrupo("");
      toast.success("Cargo adicionado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCargoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/cargos?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao remover cargo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "cargos"], type: "all" });
      toast.success("Cargo removido com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateCargoMutation = useMutation({
    mutationFn: async (payload: { id: string; nome: string; grupo?: string }) => {
      const res = await fetch("/api/config/cargos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao atualizar cargo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "cargos"], type: "all" });
      setEditingCargoId(null);
      setEditingCargoNome("");
      setEditingCargoGrupo("");
      toast.success("Cargo atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const aplicarGrupoMutation = useMutation({
    mutationFn: async (data: { nome: string; cargoIds: string[] }) => {
      const res = await fetch("/api/config/cargos/grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao aplicar grupo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "cargos"], type: "all" });
      setNovoGrupoNome("");
      setNovoGrupoCargoIds([]);
      toast.success("Grupo aplicado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removerGrupoMutation = useMutation({
    mutationFn: async (nome: string) => {
      const res = await fetch(`/api/config/cargos/grupo?nome=${encodeURIComponent(nome)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao remover grupo");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "cargos"], type: "all" });
      toast.success("Grupo removido com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" />
          Gestão de Cargos
        </h2>
        <p className="text-sm text-muted-foreground">
          Cadastre e gerencie os cargos e funções do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Lado Esquerdo */}
        <div className="space-y-6">
          {/* ── Novo Cargo ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
              Novo Cargo
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Cargo</label>
              <Input
                value={cargoNome}
                onChange={(e) => setCargoNome(e.target.value)}
                className="glass-input"
                placeholder="Ex: ENCARREGADO PINTURA"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Grupo</label>
              <Select value={cargoGrupo || "__none__"} onValueChange={(v) => setCargoGrupo(v === "__none__" ? "" : v)}>
                <SelectTrigger className="glass-input">
                  <SelectValue placeholder="Selecione um grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum grupo</SelectItem>
                  {gruposExistentes.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() =>
                addCargoMutation.mutate({
                  nome: cargoNome.trim(),
                  grupo: cargoGrupo.trim() || undefined,
                })
              }
              disabled={!cargoNome?.trim() || addCargoMutation.isPending}
              className="gap-2 w-full"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cargo
            </Button>
          </div>

          {/* ── Cargos Cadastrados ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
              Cargos Cadastrados
            </h3>

            <div className="space-y-2 max-h-100 overflow-y-auto">
              {cargos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum cargo cadastrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cargos.map((cargo) => (
                    <div
                      key={cargo.id}
                      className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                    >
                      {editingCargoId === cargo.id ? (
                        <div className="flex-1 space-y-2">
                          <Input
                            className="glass-input h-8 text-sm"
                            value={editingCargoNome}
                            onChange={(e) => setEditingCargoNome(e.target.value)}
                            placeholder="Nome do cargo"
                          />
                          <Select value={editingCargoGrupo || "__none__"} onValueChange={(v) => setEditingCargoGrupo(v === "__none__" ? "" : v)}>
                            <SelectTrigger className="glass-input h-8 text-sm">
                              <SelectValue placeholder="Selecione um grupo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Nenhum grupo</SelectItem>
                              {gruposExistentes.map((g) => (
                                <SelectItem key={g} value={g}>{g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex gap-1 pt-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              disabled={!editingCargoNome?.trim() || updateCargoMutation.isPending}
                              onClick={() =>
                                cargo.id &&
                                updateCargoMutation.mutate({
                                  id: cargo.id,
                                  nome: editingCargoNome.trim(),
                                  grupo: editingCargoGrupo.trim() || undefined,
                                })
                              }
                            >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingCargoId(null);
                                setEditingCargoNome("");
                                setEditingCargoGrupo("");
                              }}
                            >
                              <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Briefcase className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium block">{cargo.nome}</span>
                              {cargo.grupo && (
                                <span className="text-xs text-muted-foreground">Grupo: {cargo.grupo}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingCargoId(cargo.id ?? null);
                                setEditingCargoNome(cargo.nome);
                                setEditingCargoGrupo(cargo.grupo ?? "");
                              }}
                              className="text-muted-foreground hover:text-primary h-7 w-7 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => cargo.id && deleteCargoMutation.mutate(cargo.id)}
                              disabled={deleteCargoMutation.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito */}
        <div className="space-y-6">
          {/* ── Cadastrar Novos Grupos ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
              Cadastrar Novos Grupos
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Grupo</label>
              <Input
                value={novoGrupoNome}
                onChange={(e) => setNovoGrupoNome(e.target.value)}
                className="glass-input"
                placeholder="Ex: PINTOR"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cargos do Grupo</label>
              <Popover open={grupoPopoverOpen} onOpenChange={setGrupoPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="glass-input w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border border-input bg-transparent h-10">
                    <span className={novoGrupoCargoIds.length === 0 ? "text-muted-foreground" : ""}>
                      {novoGrupoCargoIds.length === 0
                        ? "Selecione os cargos"
                        : novoGrupoCargoIds.length === 1
                        ? `${cargos.find((c) => c.id === novoGrupoCargoIds[0])?.nome ?? 1} cargo`
                        : `${novoGrupoCargoIds.length} cargos selecionados`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cargo..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cargo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {cargos.map((c) => {
                          const isSelected = novoGrupoCargoIds.includes(c.id ?? "");
                          return (
                            <CommandItem
                              key={c.id}
                              onSelect={() =>
                                setNovoGrupoCargoIds(
                                  isSelected
                                    ? novoGrupoCargoIds.filter((id) => id !== c.id)
                                    : [...novoGrupoCargoIds, c.id ?? ""],
                                )
                              }
                            >
                              <Checkbox checked={isSelected} className="mr-2" />
                              {c.nome}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={() =>
                aplicarGrupoMutation.mutate({
                  nome: novoGrupoNome.trim(),
                  cargoIds: novoGrupoCargoIds,
                })
              }
              disabled={!novoGrupoNome?.trim() || novoGrupoCargoIds.length === 0 || aplicarGrupoMutation.isPending}
              className="gap-2 w-full"
            >
              <Plus className="w-4 h-4" />
              Aplicar Grupo
            </Button>
          </div>

          {/* ── Grupos Cadastrados ── */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider border-b pb-2">
              Grupos Cadastrados
            </h3>

            {gruposExistentes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum grupo cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-100 overflow-y-auto">
                {gruposExistentes.map((grupo) => {
                  const count = cargos.filter((c) => c.grupo === grupo).length;
                  return (
                    <div
                      key={grupo}
                      className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <span className="font-medium block">{grupo}</span>
                          <span className="text-xs text-muted-foreground">{count} cargo{count !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Remover o grupo "${grupo}" de todos os cargos?`)) {
                            removerGrupoMutation.mutate(grupo);
                          }
                        }}
                        disabled={removerGrupoMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

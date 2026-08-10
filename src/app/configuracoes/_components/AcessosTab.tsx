"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Key, Pencil, Plus, Trash2, UserPlus, Users, X } from "lucide-react";

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
import { ROLES, useProjetos } from "./shared";

type ConfigAcesso = {
  id?: string;
  re: string;
  nome: string;
  perfil: string;
  centro_custo?: string[] | null;
  precisa_redefinir_senha?: boolean;
};

export function AcessosTab() {
  const queryClient = useQueryClient();
  const { isReady: filterReady } = useFilter();
  const { data: projetosData } = useProjetos();

  // Acessos - inicializado como strings vazias para blindagem
  const [acessoRE, setAcessoRE] = useState("");
  const [acessoNome, setAcessoNome] = useState("");
  const [acessoRole, setAcessoRole] = useState("");
  const [acessoCentroCusto, setAcessoCentroCusto] = useState<string[]>([]);
  const [ccPopoverOpen, setCcPopoverOpen] = useState(false);

  // Acessos - edição inline
  const [editingAcessoId, setEditingAcessoId] = useState<string | null>(null);
  const [editingAcessoRE, setEditingAcessoRE] = useState("");
  const [editingAcessoNome, setEditingAcessoNome] = useState("");
  const [editingAcessoPerfil, setEditingAcessoPerfil] = useState("");
  const [editingAcessoCentroCusto, setEditingAcessoCentroCusto] = useState<string[]>([]);
  const [editCcPopoverOpen, setEditCcPopoverOpen] = useState(false);

  const { data: acessosData } = useQuery<ConfigAcesso[]>({
    queryKey: ["config", "acessos"],
    queryFn: async () => {
      const res = await fetch("/api/config/acessos");
      if (!res.ok) throw new Error("Falha ao carregar acessos");
      return res.json();
    },
    enabled: filterReady,
  });

  const acessos = acessosData ?? [];

  const addAcessoMutation = useMutation({
    mutationFn: async (data: { re: string; nome: string; perfil: string; centro_custo?: string[] }) => {
      const res = await fetch("/api/config/acessos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao salvar acesso");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"], type: "all" });
      setAcessoRE("");
      setAcessoNome("");
      setAcessoRole("");
      setAcessoCentroCusto([]);
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
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"], type: "all" });
      toast.success("Acesso removido com sucesso!");
    },
    onError: () => toast.error("Erro ao remover acesso"),
  });

  const updateAcessoMutation = useMutation({
    mutationFn: async (payload: { id: string; re: string; nome: string; perfil: string; centro_custo?: string[] }) => {
      const res = await fetch(`/api/config/acessos?id=${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ re: payload.re, nome: payload.nome, perfil: payload.perfil, centro_custo: payload.centro_custo || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao atualizar acesso");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"], type: "all" });
      setEditingAcessoId(null);
      setEditingAcessoRE("");
      setEditingAcessoNome("");
      setEditingAcessoPerfil("");
      setEditingAcessoCentroCusto([]);
      toast.success("Acesso atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetSenhaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/config/acessos?id=${id}&resetPassword=true`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao redefinir senha");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "acessos"], type: "all" });
      toast.success("Senha redefinida para o padrão. O usuário deverá alterá-la no próximo login.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Handler para iniciar edição de acesso
  const iniciarEdicaoAcesso = (acesso: ConfigAcesso) => {
    setEditingAcessoId(acesso.id || null);
    setEditingAcessoRE(acesso.re);
    setEditingAcessoNome(acesso.nome);
    setEditingAcessoPerfil(acesso.perfil);
    setEditingAcessoCentroCusto(acesso.centro_custo ?? []);
  };

  // Handler para cancelar edição de acesso
  const cancelarEdicaoAcesso = () => {
    setEditingAcessoId(null);
    setEditingAcessoRE("");
    setEditingAcessoNome("");
    setEditingAcessoPerfil("");
    setEditingAcessoCentroCusto([]);
  };

  return (
    <>
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
                onValueChange={(v) => setAcessoRole(v)}
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

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Centro de Custo
                {(acessoRole === "user" || acessoRole === "guest") && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </label>
              <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="glass-input w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border border-input bg-transparent h-10">
                    <span className={acessoCentroCusto.length === 0 ? "text-muted-foreground" : ""}>
                      {acessoCentroCusto.length === 0
                        ? "Selecione os projetos"
                        : acessoCentroCusto.length === 1
                        ? acessoCentroCusto[0]
                        : `${acessoCentroCusto.length} centros selecionados`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar projeto..." />
                    <CommandList>
                      <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(projetosData || []).map((p) => {
                          const isSelected = acessoCentroCusto.includes(p.centro_custo);
                          return (
                            <CommandItem
                              key={p.centro_custo}
                              onSelect={() =>
                                setAcessoCentroCusto(
                                  isSelected
                                    ? acessoCentroCusto.filter((v) => v !== p.centro_custo)
                                    : [...acessoCentroCusto, p.centro_custo],
                                )
                              }
                            >
                              <Checkbox checked={isSelected} className="mr-2" />
                              {p.centro_custo}
                              {p.nome_cliente ? ` — ${p.nome_cliente}` : ""}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={() =>
              addAcessoMutation.mutate({
                re: acessoRE,
                nome: acessoNome,
                perfil: acessoRole,
                centro_custo: acessoCentroCusto.length > 0 ? acessoCentroCusto : undefined,
              })
            }
            disabled={
              !acessoRE?.trim() ||
              !acessoNome?.trim() ||
              !acessoRole ||
              ((acessoRole === "user" || acessoRole === "guest") && acessoCentroCusto.length === 0) ||
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
                    {editingAcessoId === acesso.id ? (
                      // Modo de edição
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            className="glass-input h-8 text-sm flex-1"
                            value={editingAcessoRE}
                            onChange={(e) => setEditingAcessoRE(e.target.value)}
                            placeholder="RE"
                          />
                          <Select
                            value={editingAcessoPerfil}
                            onValueChange={setEditingAcessoPerfil}
                          >
                            <SelectTrigger className="glass-input h-8 text-sm w-32">
                              <SelectValue />
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
                        <Input
                          className="glass-input h-8 text-sm w-full"
                          value={editingAcessoNome}
                          onChange={(e) => setEditingAcessoNome(e.target.value)}
                          placeholder="Nome completo"
                        />
                        <Popover open={editCcPopoverOpen} onOpenChange={setEditCcPopoverOpen}>
                          <PopoverTrigger asChild>
                            <button className="glass-input w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md border border-input bg-transparent h-8">
                              <span className={editingAcessoCentroCusto.length === 0 ? "text-muted-foreground" : ""}>
                                {editingAcessoCentroCusto.length === 0
                                  ? "Selecione os projetos"
                                  : editingAcessoCentroCusto.length === 1
                                  ? editingAcessoCentroCusto[0]
                                  : `${editingAcessoCentroCusto.length} centros selecionados`}
                              </span>
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar projeto..." />
                              <CommandList>
                                <CommandEmpty>Nenhum projeto encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {(projetosData || []).map((p) => {
                                    const isSelected = editingAcessoCentroCusto.includes(p.centro_custo);
                                    return (
                                      <CommandItem
                                        key={p.centro_custo}
                                        onSelect={() =>
                                          setEditingAcessoCentroCusto(
                                            isSelected
                                              ? editingAcessoCentroCusto.filter((v) => v !== p.centro_custo)
                                              : [...editingAcessoCentroCusto, p.centro_custo],
                                          )
                                        }
                                      >
                                        <Checkbox checked={isSelected} className="mr-2" />
                                        {p.centro_custo}
                                        {p.nome_cliente ? ` — ${p.nome_cliente}` : ""}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <div className="flex gap-1 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={
                              !editingAcessoRE?.trim() ||
                              !editingAcessoNome?.trim() ||
                              !editingAcessoPerfil ||
                              ((editingAcessoPerfil === "user" || editingAcessoPerfil === "guest") && editingAcessoCentroCusto.length === 0) ||
                              updateAcessoMutation.isPending
                            }
                            onClick={() =>
                              acesso.id &&
                              updateAcessoMutation.mutate({
                                id: acesso.id,
                                re: editingAcessoRE,
                                nome: editingAcessoNome,
                                perfil: editingAcessoPerfil,
                                centro_custo: editingAcessoCentroCusto.length > 0 ? editingAcessoCentroCusto : undefined,
                              })
                            }
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={cancelarEdicaoAcesso}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Modo de visualização
                      <>
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
                              {acesso.centro_custo && acesso.centro_custo.length > 0 && (
                                <> • C.C.: {acesso.centro_custo.join(", ")}</>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => acesso.id && iniciarEdicaoAcesso(acesso)}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              acesso.id &&
                              resetSenhaMutation.mutate(acesso.id)
                            }
                            disabled={resetSenhaMutation.isPending}
                            className="text-amber-500 hover:text-amber-500 hover:bg-amber-500/10"
                            title="Redefinir senha para o padrão"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
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
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

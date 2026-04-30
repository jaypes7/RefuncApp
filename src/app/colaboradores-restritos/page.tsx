"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  ShieldAlert,
  Lock,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDebounce } from "@/hooks/use-debounce";
import { useAcessoRestrito } from "@/hooks/use-acesso-restrito";
import { colaboradoresRestritosApi, type ColaboradorRestrito } from "@/lib/axios";
import { ColaboradoresRestritosImportModal } from "@/components/ColaboradoresRestritosImportModal";
import { maskCPF } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-28" />
              <Skeleton className="h-12 w-36" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ColaboradoresRestritosPage() {
  const queryClient = useQueryClient();
  const { data: hasAccess, isLoading: isCheckingAccess } = useAcessoRestrito();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState<ColaboradorRestrito | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formCpf, setFormCpf] = useState("");
  const [formTipoDemissao, setFormTipoDemissao] = useState("");
  const [formMotivoDemissao, setFormMotivoDemissao] = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["colaboradores-restritos", page, limit, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await colaboradoresRestritosApi.listar(params);
      return response.data;
    },
    enabled: hasAccess === true,
  });

  // ── Mutations ───────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: Omit<ColaboradorRestrito, "id" | "created_at">) =>
      colaboradoresRestritosApi.criar(body),
    onSuccess: () => {
      toast.success("Colaborador restrito cadastrado.");
      queryClient.invalidateQueries({ queryKey: ["colaboradores-restritos"], type: "all" });
      closeModal();
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao cadastrar");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ColaboradorRestrito> }) =>
      colaboradoresRestritosApi.atualizar(id, body),
    onSuccess: () => {
      toast.success("Colaborador restrito atualizado.");
      queryClient.invalidateQueries({ queryKey: ["colaboradores-restritos"], type: "all" });
      closeModal();
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao atualizar");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => colaboradoresRestritosApi.remover(id),
    onSuccess: () => {
      toast.success("Colaborador restrito removido.");
      queryClient.invalidateQueries({ queryKey: ["colaboradores-restritos"], type: "all" });
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao remover");
    },
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openAdd = () => {
    setSelected(null);
    setFormNome("");
    setFormCpf("");
    setFormTipoDemissao("");
    setFormMotivoDemissao("");
    setModalOpen(true);
  };

  const openEdit = (item: ColaboradorRestrito) => {
    setSelected(item);
    setFormNome(item.nome);
    setFormCpf(item.cpf ?? "");
    setFormTipoDemissao(item.tipo_demissao ?? "");
    setFormMotivoDemissao(item.motivo_demissao ?? "");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
  };

  const handleSave = () => {
    if (!formNome.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const body = {
      nome: formNome.trim(),
      cpf: formCpf.trim() || null,
      tipo_demissao: formTipoDemissao.trim() || null,
      motivo_demissao: formMotivoDemissao.trim() || null,
    };
    if (selected) {
      updateMutation.mutate({ id: selected.id, body });
    } else {
      createMutation.mutate(body);
    }
  };

  const handleDelete = (item: ColaboradorRestrito) => {
    if (confirm(`Remover ${item.nome} da lista restrita?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const registros = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <ProtectedRoute>
      {isCheckingAccess ? (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !hasAccess ? (
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <ShieldAlert className="h-16 w-16 text-destructive/50" />
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não possui permissão para acessar esta área.
          </p>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <ShieldAlert className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">Erro ao carregar colaboradores restritos</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["colaboradores-restritos"], type: "all" })}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 py-2">
          {/* ── Page Header ── */}
          <div className="glass-card flex flex-col gap-4 rounded-md px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                <Lock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Colaboradores Restritos
                  </h1>
                  {pagination && (
                    <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-sm font-medium text-destructive">
                      {pagination.total} registros
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Informação confidencial — acesso restrito.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setImportOpen(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Importar Planilha
              </Button>
              <Button size="sm" className="gap-1.5" onClick={openAdd}>
                <Plus className="h-3.5 w-3.5" />
                Novo Registro
              </Button>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* ── Search ── */}
              <div className="glass-card rounded-md px-4 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisa avançada"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="h-9 pl-9 text-sm border-slate-300 bg-white placeholder:text-slate-400 focus-visible:border-primary/60 focus-visible:ring-primary/20 dark:border-input dark:bg-input/30 dark:placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              {/* ── Table ── */}
              <div className="glass-card overflow-hidden rounded-md w-full">
                <div className="overflow-x-auto">
                  <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="hover:bg-transparent bg-muted/40">
                        <TableHead className="pl-5 w-[30%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</TableHead>
                        <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF</TableHead>
                        <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo de Demissão</TableHead>
                        <TableHead className="w-[31%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo da Demissão</TableHead>
                        <TableHead className="pr-5 w-[9%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {registros.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={5} className="py-20 text-center text-sm text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <ShieldAlert className="h-8 w-8 opacity-20" />
                              <span>Nenhum registro encontrado.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        registros.map((item) => (
                          <TableRow key={item.id} className="transition-colors hover:bg-muted/50">
                            <TableCell className="py-3 pl-5">
                              <span className="font-medium text-foreground truncate block" title={item.nome}>
                                {item.nome}
                              </span>
                            </TableCell>

                            <TableCell className="py-3">
                              <span className="font-mono text-sm text-muted-foreground">
                                {maskCPF(item.cpf) || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="py-3">
                              <span className="text-sm text-foreground/80 truncate block">
                                {item.tipo_demissao || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="py-3">
                              <span className="text-sm text-foreground/80 truncate block" title={item.motivo_demissao ?? undefined}>
                                {item.motivo_demissao || "—"}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 pr-5 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Ações</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={(e) => { e.preventDefault(); openEdit(item); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="cursor-pointer gap-2"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => handleDelete(item)}
                                  >
                                    {deleteMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* ── Pagination ── */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} registros
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                      Próxima
                    </Button>
                  </div>
                </div>
              )}

              {(!pagination || pagination.totalPages <= 1) && (
                <p className="text-xs text-muted-foreground">
                  Exibindo{" "}
                  <span className="font-medium text-foreground">{registros.length}</span>{" "}
                  de{" "}
                  <span className="font-medium text-foreground">{pagination?.total ?? registros.length}</span>{" "}
                  registros
                </p>
              )}
            </>
          )}

          {/* ── Modal Add/Edit ── */}
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {selected ? "Editar Registro Restrito" : "Novo Registro Restrito"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label htmlFor="nome" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nome *</label>
                  <Input
                    id="nome"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="cpf" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">CPF</label>
                  <Input
                    id="cpf"
                    value={formCpf}
                    onChange={(e) => setFormCpf(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="tipo_demissao" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Tipo de Demissão</label>
                  <Input
                    id="tipo_demissao"
                    value={formTipoDemissao}
                    onChange={(e) => setFormTipoDemissao(e.target.value)}
                    placeholder="Ex: Justa Causa, Pedido, etc."
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="motivo_demissao" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Motivo da Demissão</label>
                  <Input
                    id="motivo_demissao"
                    value={formMotivoDemissao}
                    onChange={(e) => setFormMotivoDemissao(e.target.value)}
                    placeholder="Descreva o motivo..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ColaboradoresRestritosImportModal
            open={importOpen}
            onOpenChange={setImportOpen}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["colaboradores-restritos"], type: "all" })}
          />
        </div>
      )}
    </ProtectedRoute>
  );
}

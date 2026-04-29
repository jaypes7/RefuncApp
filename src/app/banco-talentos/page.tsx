"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Shuffle,
  Database,
  Loader2,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CanAccess } from "@/components/CanAccess";
import { useDebounce } from "@/hooks/use-debounce";
import { bancoTalentosApi, type BancoTalento } from "@/lib/axios";
import { BancoTalentosImportModal } from "@/components/BancoTalentosImportModal";
import { BancoTalentosAddEditModal } from "@/components/BancoTalentosAddEditModal";
import { BancoTalentosRealocarModal } from "@/components/BancoTalentosRealocarModal";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "—";
  const clean = String(cpf).replace(/\D/g, "");
  if (clean.length !== 11) return cpf;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary/10 text-primary",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  "bg-[#337246]/15 text-[#337246] dark:bg-[#337246]/20 dark:text-[#4a9960]",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
];

// ── Sub-components ────────────────────────────────────────────────────────────

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
              <Skeleton className="h-12 w-20" />
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

export default function BancoTalentosPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  // Filtros avançados
  const [filtroPessoa, setFiltroPessoa] = useState<string[]>([]);
  const [filtroCpf, setFiltroCpf] = useState<string[]>([]);
  const [filtroMunicipio, setFiltroMunicipio] = useState<string[]>([]);

  const [importOpen, setImportOpen] = useState(false);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [realocarOpen, setRealocarOpen] = useState(false);
  const [selectedTalento, setSelectedTalento] = useState<BancoTalento | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useQuery({
    queryKey: ["banco-talentos", page, limit, debouncedSearch, filtroPessoa, filtroCpf, filtroMunicipio],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filtroPessoa.length > 0) params.pessoa = filtroPessoa.join(",");
      if (filtroCpf.length > 0) params.cpf = filtroCpf.join(",");
      if (filtroMunicipio.length > 0) params.municipio = filtroMunicipio.join(",");
      const response = await bancoTalentosApi.listar(params);
      return response.data;
    },
  });

  // Buscar valores distintos para os filtros (todos os registros, sem paginação)
  const { data: todosTalentosData } = useQuery({
    queryKey: ["banco-talentos", "todos"],
    queryFn: async () => {
      const response = await bancoTalentosApi.listar({ limit: 9999 });
      return response.data.data ?? [];
    },
    staleTime: Infinity,
  });

  const opcoesPessoa = useMemo(() => {
    const valores = new Set(todosTalentosData?.map((t) => t.pessoa).filter(Boolean) as string[] ?? []);
    return Array.from(valores).sort().map((v) => ({ value: v, label: v }));
  }, [todosTalentosData]);

  const opcoesCpf = useMemo(() => {
    const valores = new Set(todosTalentosData?.map((t) => t.cpf).filter(Boolean) as string[] ?? []);
    return Array.from(valores).sort().map((v) => ({ value: v, label: formatCPF(v) }));
  }, [todosTalentosData]);

  const opcoesMunicipio = useMemo(() => {
    const valores = new Set(todosTalentosData?.map((t) => t.municipio).filter(Boolean) as string[] ?? []);
    return Array.from(valores).sort().map((v) => ({ value: v, label: v }));
  }, [todosTalentosData]);

  const { data: centrosDisponiveisData } = useQuery({
    queryKey: ["centros-custo"],
    queryFn: async () => {
      const res = await fetch("/api/colaboradores/centros-custo");
      if (!res.ok) return [];
      return res.json() as Promise<string[]>;
    },
  });
  const centrosDisponiveis: string[] = centrosDisponiveisData ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bancoTalentosApi.remover(id),
    onSuccess: () => {
      toast.success("Colaborador removido do banco de talentos.");
      queryClient.invalidateQueries({ queryKey: ["banco-talentos"], type: "all" });
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao remover");
    },
  });

  const handleDelete = (talento: BancoTalento) => {
    if (confirm(`Remover ${talento.nome} do banco de talentos?`)) {
      deleteMutation.mutate(talento.id);
    }
  };

  const handleEdit = (talento: BancoTalento) => {
    setSelectedTalento(talento);
    setAddEditOpen(true);
  };

  const handleRealocar = (talento: BancoTalento) => {
    setSelectedTalento(talento);
    setRealocarOpen(true);
  };

  const handleAddNew = () => {
    setSelectedTalento(null);
    setAddEditOpen(true);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info("Preparando exportação...");

      const response = await fetch("/api/export/banco-talentos");
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      const allTalentos: BancoTalento[] = json.data ?? [];

      if (allTalentos.length === 0) {
        toast.warning("Não há talentos para exportar");
        return;
      }

      const headers = [
        "PESSOA",
        "NOME",
        "IDADE",
        "DT_NASC",
        "CPF",
        "MUNICIPIO",
        "UF",
        "TELEFONE",
      ];

      const rows = allTalentos.map((t) => [
        t.pessoa || "",
        t.nome || "",
        t.idade != null ? String(t.idade) : "",
        t.dt_nasc ? new Date(t.dt_nasc).toLocaleDateString("pt-BR") : "",
        formatCPF(t.cpf),
        t.municipio || "",
        t.uf || "",
        t.telefone || "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      ws["!cols"] = headers.map(() => ({ wch: 18 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Banco de Talentos");
      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `banco_talentos_refuncapp_${dateStr}.xlsx`);

      toast.success(`${allTalentos.length} talentos exportados com sucesso!`);
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao exportar talentos");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const talentos = data?.data ?? [];
  const pagination = data?.pagination;

  if (isError) {
    return (
      <ProtectedRoute>
        <CanAccess role="admin">
          <div className="flex flex-col items-center justify-center gap-4 py-20">
            <Database className="h-16 w-16 text-destructive/50" />
            <p className="text-lg text-muted-foreground">Erro ao carregar banco de talentos</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["banco-talentos"], type: "all" })}>
              Tentar novamente
            </Button>
          </div>
        </CanAccess>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <CanAccess role="admin">
        <div className="flex flex-col gap-6 py-2">

          {/* ── Page Header ── */}
          <div className="glass-card flex flex-col gap-4 rounded-md px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    Banco de Talentos
                  </h1>
                  {pagination && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                      {pagination.total} colaboradores cadastrados
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Base global de colaboradores disponíveis para alocação.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Upload className="h-3.5 w-3.5" />
                {isExporting ? "Exportando..." : "Exportar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setImportOpen(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Fazer upload de planilha
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleAddNew}>
                <Plus className="h-3.5 w-3.5" />
                Novo Colaborador
              </Button>
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* ── Search & Filters ── */}
              <div className="glass-card rounded-md px-4 py-3 space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF ou pessoa..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="h-9 pl-9 text-sm border-slate-300 bg-white placeholder:text-slate-400 focus-visible:border-primary/60 focus-visible:ring-primary/20 dark:border-input dark:bg-input/30 dark:placeholder:text-muted-foreground/60"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MultiSelectFilter
                    placeholder="Pessoa (Oracle)"
                    selected={filtroPessoa}
                    onChange={(v) => { setFiltroPessoa(v); setPage(1); }}
                    options={opcoesPessoa}
                    width="w-48"
                  />
                  <MultiSelectFilter
                    placeholder="CPF"
                    selected={filtroCpf}
                    onChange={(v) => { setFiltroCpf(v); setPage(1); }}
                    options={opcoesCpf}
                    width="w-48"
                  />
                  <MultiSelectFilter
                    placeholder="Município"
                    selected={filtroMunicipio}
                    onChange={(v) => { setFiltroMunicipio(v); setPage(1); }}
                    options={opcoesMunicipio}
                    width="w-56"
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
                        <TableHead className="w-[10%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pessoa</TableHead>
                        <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF</TableHead>
                        <TableHead className="w-[18%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Município / UF</TableHead>
                        <TableHead className="w-[18%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</TableHead>
                        <TableHead className="pr-5 w-[9%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {talentos.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="py-20 text-center text-sm text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Database className="h-8 w-8 opacity-20" />
                              <span>Nenhum talento encontrado.</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        talentos.map((talento, index) => (
                          <TableRow key={talento.id} className="transition-colors hover:bg-muted/50">
                            {/* Nome + Avatar */}
                            <TableCell className="py-3 pl-5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold select-none",
                                  AVATAR_COLORS[index % AVATAR_COLORS.length],
                                )}>
                                  {getInitials(talento.nome)}
                                </div>
                                <span className="font-medium text-foreground truncate" title={talento.nome}>
                                  {talento.nome}
                                </span>
                              </div>
                            </TableCell>

                            {/* Pessoa */}
                            <TableCell className="py-3">
                              <span className="font-mono text-sm text-muted-foreground">
                                {talento.pessoa || "—"}
                              </span>
                            </TableCell>

                            {/* CPF */}
                            <TableCell className="py-3">
                              <span className="font-mono text-sm text-muted-foreground">
                                {formatCPF(talento.cpf)}
                              </span>
                            </TableCell>

                            {/* Município / UF */}
                            <TableCell className="py-3">
                              <span className="text-sm text-foreground/80 truncate block">
                                {talento.municipio
                                  ? `${talento.municipio}${talento.uf ? ` / ${talento.uf}` : ""}`
                                  : talento.uf || "—"}
                              </span>
                            </TableCell>

                            {/* Telefone */}
                            <TableCell className="py-3">
                              <span className="font-mono text-sm text-muted-foreground">
                                {talento.telefone || "—"}
                              </span>
                            </TableCell>

                            {/* Actions */}
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
                                    onSelect={(e) => { e.preventDefault(); handleEdit(talento); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={(e) => { e.preventDefault(); handleRealocar(talento); }}
                                  >
                                    <Shuffle className="h-4 w-4" />
                                    Realocar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="cursor-pointer gap-2"
                                    disabled={deleteMutation.isPending}
                                    onClick={() => handleDelete(talento)}
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
                    Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} talentos
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
                  <span className="font-medium text-foreground">{talentos.length}</span>{" "}
                  de{" "}
                  <span className="font-medium text-foreground">{pagination?.total ?? talentos.length}</span>{" "}
                  talentos
                </p>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        <BancoTalentosImportModal
          open={importOpen}
          onOpenChange={setImportOpen}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["banco-talentos"], type: "all" })}
        />
        <BancoTalentosAddEditModal
          open={addEditOpen}
          onOpenChange={(v) => { setAddEditOpen(v); if (!v) setSelectedTalento(null); }}
          talento={selectedTalento}
        />
        <BancoTalentosRealocarModal
          open={realocarOpen}
          onOpenChange={(v) => { setRealocarOpen(v); if (!v) setSelectedTalento(null); }}
          talento={selectedTalento}
          centrosDisponiveis={centrosDisponiveis}
        />
      </CanAccess>
    </ProtectedRoute>
  );
}

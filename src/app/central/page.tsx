"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFilter } from "@/contexts/FilterContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Download,
  MoreHorizontal,
  Pencil,
  Eye,
  Trash2,
  Users,
  Loader2,
  Plus,
  Shuffle,
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
import { MultiSelectFilter } from "@/components/MultiSelectFilter";

import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn, maskCPF, formatTelefone } from "@/lib/utils";
import { colaboradoresApi, exportApi, type Colaborador } from "@/lib/axios";
import { ImportModal } from "@/components/ImportModal";
import { ColaboradorDetailsModal } from "@/components/ColaboradorDetailsModal";
import { EditColaboradorModal } from "@/components/EditColaboradorModal";
import { RealocarColaboradorModal } from "@/components/RealocarColaboradorModal";
import { CanAccess } from "@/components/CanAccess";
import * as XLSX from "xlsx";
import { useDebounce } from "@/hooks/use-debounce";
// import { CARGOS, CARGOS_AGRUPADOS } from "@/constants/cargos";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "Ativo" | "Pendente" | "Inativo" | "Desligado";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Status,
  { dot: string; pill: string; label: string }
> = {
  Ativo: {
    dot: "bg-[#337246]",
    pill: "bg-[#337246]/10 text-[#337246] border border-[#337246]/30 dark:bg-[#337246]/15 dark:text-[#4a9960] dark:border-[#337246]/20",
    label: "Ativo",
  },
  Pendente: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    label: "Pendente",
  },
  Inativo: {
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
    label: "Inativo",
  },
  Desligado: {
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    label: "Desligado",
  },
};


const AVATAR_COLORS = [
  "bg-primary/10 text-primary",
  "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  "bg-[#337246]/15 text-[#337246] dark:bg-[#337246]/20 dark:text-[#4a9960]",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
];

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pendente"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.pill,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}


function AvatarInitials({ name, index }: { name: string; index: number }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold select-none",
        AVATAR_COLORS[index % AVATAR_COLORS.length],
      )}
    >
      {getInitials(name)}
    </div>
  );
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-24" />
              <Skeleton className="h-12 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CentralPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { centroCusto: globalCentroCusto, isReady: filterReady } = useFilter();
  const [localCentroCusto, setLocalCentroCusto] = useState<string | null>(null);

  // CC efetivo: se a sidebar tem um CC específico, usa-o; senão, usa o filtro local da central
  const effectiveCentroCusto = globalCentroCusto || localCentroCusto;

  // Redireciona guests para o Dashboard Geral (única página permitida)
  useEffect(() => {
    if (!authLoading && user?.perfil === "guest") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [cargoFilter, setCargoFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  // Estado do modal de upload
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados para modais de detalhes, edição e realocação
  const [selectedColaborador, setSelectedColaborador] =
    useState<Colaborador | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [realocarModalOpen, setRealocarModalOpen] = useState(false);

  const limit = 20;

  // Busca os centros de custo disponíveis para o dropdown
  const { data: centrosDisponiveisData } = useQuery({
    queryKey: ["centros-custo"],
    queryFn: async () => {
      const response = await fetch("/api/colaboradores/centros-custo");
      if (!response.ok) return [];
      return response.json() as Promise<string[]>;
    },
    enabled: filterReady,
  });
  const centrosDisponiveis: string[] = centrosDisponiveisData ?? [];

  // Função para exportar colaboradores para XLSX
  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info("Preparando exportação...");

      // Buscar todos os colaboradores usando a API de exportação (sem paginação)
      const exportParams: { cargo?: string; centro_custo?: string } = {};
      if (cargoFilter.length) exportParams.cargo = cargoFilter.join(",");
      if (effectiveCentroCusto) exportParams.centro_custo = effectiveCentroCusto;
      const response = await exportApi.exportar(exportParams);
      const allColaboradores = response.data.data || [];

      if (allColaboradores.length === 0) {
        toast.warning("Não há colaboradores para exportar");
        return;
      }

      // Headers na ordem exata - mesma ordem do import + campos extras do DB
      const headers = [
        "IND",
        "STATUS",
        "ENVIADO RH",
        "PESSOA",
        "REQ",
        "VINCULADO",
        "CARTA OFERTA",
        "COLAB. PEND.",
        "EXAME",
        "CLINICA",
        "DOCS",
        "ASO",
        "RPV",
        "PRÉ ADMISSÃO",
        "MOB",
        "OP",
        "DATA ADMISSÃO",
        "CONTRATO",
        "PORTAL",
        "CRACHA",
        "PONTO",
        "TREINAMENTO",
        "REALIZAR TREINAMENTO",
        "LOCAL TREINAMENTO",
        "RE",
        "NOME",
        "FUNÇÃO CLT",
        "HISTOGRAMA",
        "IDADE",
        "DT NASC",
        "CPF",
        "VR",
        "TERMINO",
        "PRORROGAÇÃO",
        "DEMISSÃO",
        "MUNICIPIO",
        "UF",
        "TELEFONE",
        "TURNO TRABALHO",
        "CHECK IN",
        "HOTEL",
        "DATA VIAGEM",
        "Nº ORACLE",
        "CENTRO CUSTO",
        "CREATED AT",
      ];

      // Converter colaboradores para linhas
      const rows = allColaboradores.map((c) => [
        c.IND || "",
        c.STATUS || "",
        c.ENVIADO_RH || "",
        c.PESSOA || "",
        c.REQ || "",
        c.VINCULADO || "",
        c.CARTA_OFERTA || "",
        c.COLAB_PEND || "",
        c.EXAME || "",
        c.CLINICA || "",
        c.DOCS || "",
        c.ASO || "",
        c.RPV || "",
        c.PRE_ADMISSAO || "",
        c.MOB || "",
        c.OP || "",
        c.DATA_ADMISSAO || "",
        c.CONTRATO || "",
        c.PORTAL || "",
        c.CRACHA || "",
        c.PONTO || "",
        c.TREINAMENTO || "",
        c.REALIZAR_TREINAMENTO || "",
        c.LOCAL_TREINAMENTO || "",
        c.RE || "",
        c.NOME || "",
        c.FUNCAO_CLT || "",
        c.HISTOGRAMA || "",
        c.IDADE || "",
        c.DT_NASCIMENTO || "",
        c.CPF || "",
        c.VR || "",
        c.TERMINO || "",
        c.PRORROGACAO || "",
        c.DEMISSAO || "",
        c.MUNICIPIO || "",
        c.UF || "",
        formatTelefone(c.TELEFONE) || "",
        c.TURNO_TRABALHO || "",
        c.CHECK_IN || "",
        c.HOTEL || "",
        c.DATA_VIAGEM || "",
        c.NUMERO_ORACLE || "",
        c.CENTRO_CUSTO || "",
        c.CREATED_AT || "",
      ]);

      // Criar worksheet
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      // Ajustar largura das colunas
      ws["!cols"] = headers.map(() => ({ wch: 15 }));

      // Criar workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Colaboradores");

      // Gerar nome do arquivo com data
      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `colaboradores_refuncapp_${dateStr}.xlsx`;

      // Download do arquivo
      XLSX.writeFile(wb, fileName);

      toast.success(
        `${allColaboradores.length} colaboradores exportados com sucesso!`,
      );
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar colaboradores");
    } finally {
      setIsExporting(false);
    }
  };

  // Busca colaboradores da API
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "colaboradores",
      page,
      limit,
      debouncedSearch,
      statusFilter,
      cargoFilter,
      effectiveCentroCusto,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter.length) params.status = statusFilter.join(",");
      if (cargoFilter.length) params.cargo = cargoFilter.join(",");
      if (effectiveCentroCusto) params.centro_custo = effectiveCentroCusto;

      const response = await colaboradoresApi.listar(params);
      return response.data;
    },
    enabled: filterReady,
  });

  // Mutação para remover colaborador
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await colaboradoresApi.remover(id);
    },
    onSuccess: () => {
      toast.success("Colaborador removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-rh"], type: "all" });
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao remover colaborador");
    },
  });

  const colaboradores = useMemo(() => data?.data || [], [data?.data]);
  const pagination = data?.pagination;

  // ── Filtros dinâmicos baseados nos dados carregados ──
  const statusDisponiveis = useMemo(() => {
    const unicos = new Set(
      colaboradores.map((c) => c.STATUS).filter((s): s is string => !!s),
    );
    return Array.from(unicos).sort();
  }, [colaboradores]);

  const cargosDisponiveis = useMemo(() => {
    const unicos = new Set(
      colaboradores.map((c) => c.FUNCAO_CLT).filter((c): c is string => !!c),
    );
    return Array.from(unicos).sort((a, b) => a.localeCompare(b));
  }, [colaboradores]);

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover ${nome}?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isError) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Users className="h-16 w-16 text-destructive/50" />
          <p className="text-lg text-muted-foreground">
            Erro ao carregar colaboradores
          </p>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
              queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
              queryClient.invalidateQueries({ queryKey: ["dashboard-rh"], type: "all" });
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="flex flex-col gap-6 py-2">
        {/* ── Page Header ── */}
        <div className="glass-card flex flex-col gap-4 rounded-md px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  Central de Colaboradores
                </h1>
                {pagination && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
                    {pagination.total} colaboradores cadastrados
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Gerencie informações, cargos e status da sua equipe em tempo
                real.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Upload className="h-3.5 w-3.5" />
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
            <CanAccess role="user">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setImportModalOpen(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Fazer upload
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => router.push("/central/novo")}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </CanAccess>
          </div>
        </div>

        {!filterReady || isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            {/* ── Filters ── */}
            <div className="glass-card rounded-md px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisa avançada"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 pl-9 text-sm
                           border-slate-300 bg-white placeholder:text-slate-400
                           focus-visible:border-primary/60 focus-visible:ring-primary/20
                           dark:border-input dark:bg-input/30 dark:placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Status filter */}
                <MultiSelectFilter
                  placeholder="Status do Contrato"
                  width="sm:w-44 w-full"
                  selected={statusFilter}
                  onChange={(values) => {
                    setStatusFilter(values);
                    setPage(1);
                  }}
                  options={statusDisponiveis.map((s) => ({ value: s, label: s }))}
                />

                {/* Cargo filter */}
                <MultiSelectFilter
                  placeholder="Cargos/Função"
                  width="sm:w-56 w-full"
                  selected={cargoFilter}
                  onChange={(values) => {
                    setCargoFilter(values);
                    setPage(1);
                  }}
                  options={cargosDisponiveis.map((c) => ({ value: c, label: c }))}
                />

                {/* Centro de Custo filter — só aparece quando a sidebar está em "Todos" */}
                {!globalCentroCusto && (
                  <MultiSelectFilter
                    placeholder="Centro de custo"
                    width="sm:w-44 w-full"
                    selected={localCentroCusto ? [localCentroCusto] : []}
                    onChange={(values) => {
                      setLocalCentroCusto(values[0] || null);
                      setPage(1);
                    }}
                    options={centrosDisponiveis.map((cc) => ({
                      value: cc,
                      label: cc,
                    }))}
                  />
                )}
              </div>
            </div>

            {/* ── Table ── */}
            <div className="glass-card overflow-hidden rounded-md w-full">
              <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/40">
                    <TableHead className="pl-5 w-[30%] truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome
                    </TableHead>
                    <TableHead className="w-[8%] truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      RE
                    </TableHead>
                    <TableHead className="w-[14%] truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      CPF
                    </TableHead>
                    <TableHead className="w-[10%] truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      C. Custo
                    </TableHead>
                    <TableHead className="w-[18%] truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Função
                    </TableHead>
                    <TableHead className="w-[12%] truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status do Contrato
                    </TableHead>
                    <TableHead className="pr-5 w-[8%] text-right truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {colaboradores.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={7}
                        className="py-20 text-center text-sm text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 opacity-20" />
                          <span>Nenhum colaborador encontrado.</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    colaboradores.map((colab, index) => {
                      return (
                        <TableRow
                          key={colab.id}
                          className="transition-colors hover:bg-muted/50"
                        >
                          {/* Nome + Avatar */}
                          <TableCell className="py-3 pl-5 overflow-hidden">
                            <div className="flex items-center gap-3 min-w-0">
                              <AvatarInitials
                                name={colab.NOME || "?"}
                                index={index}
                              />
                              <div className="flex min-w-0 flex-col">
                                <span className="font-medium text-foreground truncate" title={colab.NOME || ""}>
                                  {colab.NOME}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* RE */}
                          <TableCell className="py-3 overflow-hidden">
                            <span className="font-mono text-sm text-muted-foreground">
                              {colab.RE || "-"}
                            </span>
                          </TableCell>

                          {/* CPF */}
                          <TableCell className="py-3 overflow-hidden">
                            <span className="font-mono text-sm text-muted-foreground">
                              {maskCPF(colab.CPF) || "—"}
                            </span>
                          </TableCell>

                          {/* Centro de Custo */}
                          <TableCell className="py-3 overflow-hidden">
                            {colab.CENTRO_CUSTO ? (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/10 dark:bg-slate-500/10 dark:text-slate-400">
                                {colab.CENTRO_CUSTO}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>

                          {/* Função */}
                          <TableCell className="py-3 overflow-hidden">
                            <span className="text-sm text-foreground/80 block truncate" title={colab.FUNCAO_CLT || ""}>
                              {colab.FUNCAO_CLT || "-"}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 overflow-hidden">
                            <StatusBadge
                              status={(colab.STATUS as Status) || "Pendente"}
                            />
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
                                  <span className="sr-only">
                                    Abrir menu de ações
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setSelectedColaborador(colab);
                                    setDetailsModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <CanAccess role="user">
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      if (colab.id) {
                                        router.push(`/central/editar/${colab.id}`);
                                      }
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer gap-2"
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setSelectedColaborador(colab);
                                      setRealocarModalOpen(true);
                                    }}
                                  >
                                    <Shuffle className="h-4 w-4" />
                                    Realocar
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="cursor-pointer gap-2"
                                    disabled={deleteMutation.isPending}
                                    onClick={() =>
                                      handleDelete(
                                        colab.id || "",
                                        colab.NOME || "",
                                      )
                                    }
                                  >
                                    {deleteMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    Remover
                                  </DropdownMenuItem>
                                </CanAccess>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              </div>
            </div>

            {/* ── Pagination ── */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages} • Total:{" "}
                  {pagination.total} colaboradores
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}

            {/* ── Footer count ── */}
            {(!pagination || pagination.totalPages <= 1) && (
              <p className="text-xs text-muted-foreground">
                Exibindo{" "}
                <span className="font-medium text-foreground">
                  {colaboradores.length}
                </span>{" "}
                de{" "}
                <span className="font-medium text-foreground">
                  {pagination?.total || colaboradores.length}
                </span>{" "}
                colaboradores
              </p>
            )}
          </>
        )}
      </div>

      {/* Modal de Upload */}
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          // Recarrega a lista de colaboradores após upload
          queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
          queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
          queryClient.invalidateQueries({ queryKey: ["dashboard-rh"], type: "all" });
        }}
      />

      {/* Modal de Detalhes */}
      <ColaboradorDetailsModal
        colaborador={selectedColaborador}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
      />

      {/* Modal de Edição */}
      <EditColaboradorModal
        colaborador={selectedColaborador}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
      />

      {/* Modal de Realocação */}
      <RealocarColaboradorModal
        colaborador={selectedColaborador}
        open={realocarModalOpen}
        onOpenChange={setRealocarModalOpen}
        centrosDisponiveis={centrosDisponiveis}
      />
    </ProtectedRoute>
  );
}

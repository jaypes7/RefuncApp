"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Upload,
  Download,
  MoreHorizontal,
  Pencil,
  Eye,
  Trash2,
  Users,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import { colaboradoresApi, exportApi, type Colaborador } from "@/lib/axios";
import { ImportModal } from "@/components/ImportModal";
import { ColaboradorDetailsModal } from "@/components/ColaboradorDetailsModal";
import { EditColaboradorModal } from "@/components/EditColaboradorModal";
import * as XLSX from "xlsx";
import { useDebounce } from "@/hooks/use-debounce";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "Ativo" | "Pendente" | "Inativo" | "Desligado";
type Setor = "RH" | "Logística" | "Segurança";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Status,
  { dot: string; pill: string; label: string }
> = {
  Ativo: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    label: "Ativo",
  },
  Pendente: {
    dot: "bg-amber-400",
    pill: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    label: "Pendente",
  },
  Inativo: {
    dot: "bg-slate-400",
    pill: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
    label: "Inativo",
  },
  Desligado: {
    dot: "bg-red-400",
    pill: "bg-red-500/10 text-red-400 border border-red-500/20",
    label: "Desligado",
  },
};

const SETOR_CONFIG: Record<Setor, { color: string; bg: string }> = {
  RH: { color: "text-primary", bg: "bg-primary/10" },
  Logística: { color: "text-amber-400", bg: "bg-amber-500/10" },
  Segurança: { color: "text-emerald-400", bg: "bg-emerald-500/10" },
};

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-purple-500/20 text-purple-400",
  "bg-amber-500/20 text-amber-400",
  "bg-emerald-500/20 text-emerald-400",
  "bg-rose-500/20 text-rose-400",
];

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatCPF(cpf: string | number | null | undefined): string {
  if (!cpf) return "";
  const cpfString = String(cpf).trim();
  const clean = cpfString.replace(/\D/g, "");
  if (clean.length !== 11) return cpfString;
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

// Determina setor baseado nos campos do colaborador
function getSetor(colaborador: Colaborador): Setor {
  if (colaborador.TREINAMENTO || colaborador.ASO === "Apto") {
    return "Segurança";
  }
  if (colaborador.MOB === "Sim" || colaborador.PORTAL === "Liberado") {
    return "Logística";
  }
  return "RH";
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

function SetorBadge({ setor }: { setor: Setor }) {
  const cfg = SETOR_CONFIG[setor];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.color,
      )}
    >
      {setor}
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [setorFilter, setSetorFilter] = useState<string>("todos");
  const [page, setPage] = useState(1);

  // Estado do modal de importação
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados para modais de detalhes e edição
  const [selectedColaborador, setSelectedColaborador] =
    useState<Colaborador | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const limit = 20;

  // Função para exportar colaboradores para XLSX
  const handleExport = async () => {
    try {
      setIsExporting(true);
      toast.info("Preparando exportação...");

      // Buscar todos os colaboradores usando a API de exportação (sem paginação)
      const response = await exportApi.exportar();
      const allColaboradores = response.data.data || [];

      if (allColaboradores.length === 0) {
        toast.warning("Não há colaboradores para exportar");
        return;
      }

      // Headers na ordem exata (38 colunas) - mesma ordem do import
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
        c.TELEFONE || "",
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
      setorFilter,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== "todos") params.status = statusFilter;
      if (setorFilter !== "todos") params.setor = setorFilter.toUpperCase();

      const response = await colaboradoresApi.listar(params);
      return response.data;
    },
  });

  // Mutação para remover colaborador
  const deleteMutation = useMutation({
    mutationFn: async (cpf: string) => {
      await colaboradoresApi.remover(cpf);
    },
    onSuccess: () => {
      toast.success("Colaborador removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
    },
    onError: (error: unknown) => {
      const e = error as { response?: { data?: { error?: string } } };
      toast.error(e.response?.data?.error || "Erro ao remover colaborador");
    },
  });

  const colaboradores = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = async (cpf: string, nome: string) => {
    if (confirm(`Tem certeza que deseja remover ${nome}?`)) {
      deleteMutation.mutate(cpf);
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
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["colaboradores"] })
            }
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Central de Colaboradores
              </h1>
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
              className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-3.5 w-3.5" />
              {isExporting ? "Exportando..." : "Exportar"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setImportModalOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              Importar
            </Button>
            <Button
              size="sm"
              className="gap-1.5 font-semibold shadow-md shadow-primary/20"
              onClick={() => router.push("/central/novo")}
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Colaborador
            </Button>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : (
          <>
            {/* ── Filters ── */}
            <div className="glass-card rounded-xl px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, RE ou CPF..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="h-9 border-white/10 bg-white/5 pl-9 text-sm
                           placeholder:text-muted-foreground/50
                           focus-visible:border-primary/60
                           focus-visible:ring-primary/20"
                  />
                </div>

                {/* Status filter */}
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full border-white/10 bg-white/5 text-sm hover:bg-white/10 sm:w-44">
                    <SelectValue placeholder="Todos os Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Status</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                    <SelectItem value="Desligado">Desligado</SelectItem>
                  </SelectContent>
                </Select>

                {/* Setor filter */}
                <Select
                  value={setorFilter}
                  onValueChange={(value) => {
                    setSetorFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 w-full border-white/10 bg-white/5 text-sm hover:bg-white/10 sm:w-44">
                    <SelectValue placeholder="Todos os Setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Setores</SelectItem>
                    <SelectItem value="RH">RH</SelectItem>
                    <SelectItem value="Logística">Logística</SelectItem>
                    <SelectItem value="Segurança">Segurança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Table ── */}
            <div className="glass-card overflow-hidden rounded-xl w-full">
              <div className="overflow-x-auto">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="pl-5 w-[30%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome
                    </TableHead>
                    <TableHead className="w-[8%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      RE
                    </TableHead>
                    <TableHead className="w-[14%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      CPF
                    </TableHead>
                    <TableHead className="w-[10%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Setor
                    </TableHead>
                    <TableHead className="w-[20%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Função
                    </TableHead>
                    <TableHead className="w-[10%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="pr-5 w-[8%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                      const setor = getSetor(colab);
                      return (
                        <TableRow
                          key={colab.CPF}
                          className="border-white/5 transition-colors hover:bg-white/2.5"
                        >
                          {/* Nome + Avatar */}
                          <TableCell className="py-3 pl-5">
                            <div className="flex items-center gap-3 min-w-0">
                              <AvatarInitials
                                name={colab.NOME || "?"}
                                index={index}
                              />
                              <span className="font-medium text-foreground truncate" title={colab.NOME || ""}>
                                {colab.NOME}
                              </span>
                            </div>
                          </TableCell>

                          {/* RE */}
                          <TableCell className="py-3">
                            <span className="font-mono text-sm text-muted-foreground">
                              {colab.RE || "-"}
                            </span>
                          </TableCell>

                          {/* CPF */}
                          <TableCell className="py-3">
                            <span className="font-mono text-sm text-muted-foreground">
                              {formatCPF(colab.CPF || "")}
                            </span>
                          </TableCell>

                          {/* Setor */}
                          <TableCell className="py-3">
                            <SetorBadge setor={setor} />
                          </TableCell>

                          {/* Função */}
                          <TableCell className="py-3">
                            <span className="text-sm text-foreground/80 block truncate" title={colab.FUNCAO_CLT || ""}>
                              {colab.FUNCAO_CLT || "-"}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3">
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
                                <DropdownMenuItem
                                  className="cursor-pointer gap-2"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    // Navega para a rota dedicada de edição, passando o CPF limpo
                                    const cpfLimpo = String(
                                      colab.CPF || "",
                                    ).replace(/\D/g, "");
                                    router.push(`/central/editar/${cpfLimpo}`);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="cursor-pointer gap-2"
                                  disabled={deleteMutation.isPending}
                                  onClick={() =>
                                    handleDelete(
                                      colab.CPF || "",
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

      {/* Modal de Importação */}
      <ImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={() => {
          // Recarrega a lista de colaboradores após importação
          queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
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
    </ProtectedRoute>
  );
}

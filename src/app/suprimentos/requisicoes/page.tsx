"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Package, Trash2 } from "lucide-react";
import { requisicoesSuprimentosApi, type Requisicao } from "@/lib/axios";
import { formatDateBR } from "@/lib/date-utils";
import { toast } from "sonner";

// ============================================================================
// STATUS CONFIG
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
  rascunho:     { label: "Rascunho",    variant: "secondary", className: "bg-gray-100 text-gray-700 border-gray-300" },
  aberta:       { label: "Aberta",      variant: "default",   className: "bg-blue-100 text-blue-700 border-blue-300" },
  em_andamento: { label: "Em Andamento",variant: "default",   className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  concluida:    { label: "Concluída",   variant: "default",   className: "bg-green-100 text-green-700 border-green-300" },
  cancelada:    { label: "Cancelada",   variant: "destructive", className: "bg-red-100 text-red-700 border-red-300" },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const, className: "" };
  return (
    <Badge variant={config.variant} className={`text-xs font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    return formatDateBR(new Date(year, month - 1, day));
  } catch {
    return dateStr;
  }
}

// ============================================================================
// PAGE
// ============================================================================

function RequisicoesList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [page, setPage]         = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ ids: string[]; single: boolean } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["suprimentos-requisicoes", page, search, statusFilter],
    queryFn: () =>
      requisicoesSuprimentosApi
        .listar({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter === "todos" ? undefined : statusFilter,
        })
        .then((r) => r.data),
  });

  const requisicoes: Requisicao[] = data?.data ?? [];
  const totalPages = data?.pagination.totalPages ?? 1;

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 1) {
        await requisicoesSuprimentosApi.deletar(ids[0]);
      } else {
        await requisicoesSuprimentosApi.deletarVarios(ids);
      }
    },
    onSuccess: (_data, ids) => {
      queryClient.invalidateQueries({ queryKey: ["suprimentos-requisicoes"] });
      setSelected(new Set());
      setDeleteTarget(null);
      toast.success(ids.length === 1 ? "Requisição excluída." : `${ids.length} requisições excluídas.`);
    },
    onError: () => {
      toast.error("Erro ao excluir. Tente novamente.");
    },
  });

  const allPageIds = requisicoes.map((r) => r.id);
  const allSelected = allPageIds.length > 0 && allPageIds.every((id) => selected.has(id));
  const someSelected = allPageIds.some((id) => selected.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedCount = selected.size;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-500" />
              Requisições Suprimentos
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gerencie as requisições de materiais e serviços
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => setDeleteTarget({ ids: Array.from(selected), single: false })}
              >
                <Trash2 className="h-4 w-4" />
                Excluir {selectedCount} selecionada{selectedCount > 1 ? "s" : ""}
              </Button>
            )}
            <Button onClick={() => router.push("/suprimentos/requisicoes/nova")} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Requisição
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {isLoading ? "Carregando..." : `${data?.pagination.total ?? 0} requisição(ões)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todas"
                      disabled={isLoading || requisicoes.length === 0}
                    />
                  </TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Coordenador</TableHead>
                  <TableHead>Data Abertura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : requisicoes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Nenhuma requisição encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  requisicoes.map((req) => (
                    <TableRow
                      key={req.id}
                      className="cursor-pointer hover:bg-muted/50"
                      data-selected={selected.has(req.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selected.has(req.id)}
                          onCheckedChange={() => toggleOne(req.id)}
                          aria-label={`Selecionar ${req.titulo}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium" onClick={() => router.push(`/suprimentos/requisicoes/${req.id}`)}>
                        {req.titulo}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/suprimentos/requisicoes/${req.id}`)}>
                        {req.coordenador}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/suprimentos/requisicoes/${req.id}`)}>
                        {formatDate(req.data_abertura)}
                      </TableCell>
                      <TableCell onClick={() => router.push(`/suprimentos/requisicoes/${req.id}`)}>
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm" onClick={() => router.push(`/suprimentos/requisicoes/${req.id}`)}>
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget({ ids: [req.id], single: true })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Próxima
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmação de exclusão */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              {deleteTarget?.ids.length === 1
                ? "Tem certeza que deseja excluir esta requisição? Esta ação não pode ser desfeita."
                : `Tem certeza que deseja excluir ${deleteTarget?.ids.length} requisições? Esta ação não pode ser desfeita.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.ids)}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <RequisicoesList />
    </ProtectedRoute>
  );
}

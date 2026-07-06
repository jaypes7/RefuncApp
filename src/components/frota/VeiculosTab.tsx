"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Car,
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
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { frotaApi, type FrotaVeiculo } from "@/lib/axios";
import { VeiculoFormModal } from "@/components/frota/VeiculoFormModal";
import { VeiculoDetailsModal } from "@/components/frota/VeiculoDetailsModal";
import {
  VEICULO_STATUS,
  VEICULO_TIPOS,
  statusBadgeClass,
  formatDate,
  apiErrorMessage,
} from "@/components/frota/frota-utils";

export function VeiculosTab() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [filtroStatus, setFiltroStatus] = useState<string[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<string[]>([]);
  const [filtroPropriedade, setFiltroPropriedade] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<FrotaVeiculo | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["frota-veiculos", page, debouncedSearch, filtroStatus, filtroTipo, filtroPropriedade],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filtroStatus.length) params.status = filtroStatus.join(",");
      if (filtroTipo.length) params.tipo = filtroTipo.join(",");
      if (filtroPropriedade.length) params.propriedade = filtroPropriedade.join(",");
      const res = await frotaApi.veiculos.listar(params);
      return res.data;
    },
  });

  // Todos os veículos (uma vez) para extrair opções de filtro de locadora
  const { data: todosVeiculos } = useQuery({
    queryKey: ["frota-veiculos", "todos"],
    queryFn: async () => {
      const res = await frotaApi.veiculos.listar({ limit: 1000 });
      return res.data.data;
    },
    staleTime: Infinity,
  });

  const opcoesPropriedade = useMemo(() => {
    const valores = new Set((todosVeiculos ?? []).map((v) => v.propriedade).filter(Boolean) as string[]);
    return Array.from(valores).sort().map((v) => ({ value: v, label: v }));
  }, [todosVeiculos]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => frotaApi.veiculos.remover(id),
    onSuccess: () => {
      toast.success("Veículo removido.");
      queryClient.invalidateQueries({ queryKey: ["frota-veiculos"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["frota-dashboard"], type: "all" });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao remover veículo")),
  });

  const handleDelete = (veiculo: FrotaVeiculo) => {
    if (confirm(`Remover o veículo ${veiculo.placa}? As manutenções ficam no histórico, sem vínculo.`)) {
      deleteMutation.mutate(veiculo.id);
    }
  };

  const veiculos = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      {/* Search + filtros + novo */}
      <div className="glass-card rounded-md px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, modelo, marca ou condutor"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <MultiSelectFilter
            placeholder="Status"
            selected={filtroStatus}
            onChange={(v) => { setFiltroStatus(v); setPage(1); }}
            options={VEICULO_STATUS.map((s) => ({ value: s, label: s }))}
            width="w-40"
          />
          <MultiSelectFilter
            placeholder="Tipo"
            selected={filtroTipo}
            onChange={(v) => { setFiltroTipo(v); setPage(1); }}
            options={VEICULO_TIPOS.map((t) => ({ value: t, label: t }))}
            width="w-48"
          />
          <MultiSelectFilter
            placeholder="Locadora"
            selected={filtroPropriedade}
            onChange={(v) => { setFiltroPropriedade(v); setPage(1); }}
            options={opcoesPropriedade}
            width="w-52"
          />
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelected(null); setFormOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Novo Veículo
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <div className="glass-card w-full overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Veículo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condutor</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Locadora</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Local</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data aplicação</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9} className="py-2"><Skeleton className="h-9 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : veiculos.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={9} className="py-20 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Car className="h-8 w-8 opacity-20" />
                      <span>Nenhum veículo encontrado.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                veiculos.map((v) => (
                  <TableRow key={v.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-3 pl-5">
                      <span className="font-mono font-medium">{v.placa}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm">{[v.marca, v.modelo].filter(Boolean).join(" ") || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">{v.tipo || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-44">
                      <span className="block truncate text-sm" title={v.condutor_nome ?? undefined}>{v.condutor_nome || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-36">
                      <span className="block truncate text-sm text-muted-foreground" title={v.propriedade ?? undefined}>{v.propriedade || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-36">
                      <span className="block truncate text-sm text-muted-foreground" title={v.local_trabalho ?? undefined}>{v.local_trabalho || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">{formatDate(v.data_aplicacao)}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusBadgeClass(v.status))}>
                        {v.status || "N/I"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 pr-5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onSelect={(e) => { e.preventDefault(); setSelected(v); setDetailsOpen(true); }}
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onSelect={(e) => { e.preventDefault(); setSelected(v); setFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer gap-2"
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(v)}
                          >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

      {/* Paginação */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} veículos
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

      <VeiculoFormModal
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setSelected(null); }}
        veiculo={selected}
      />
      <VeiculoDetailsModal
        open={detailsOpen}
        onOpenChange={(v) => { setDetailsOpen(v); if (!v) setSelected(null); }}
        veiculo={selected}
      />
    </div>
  );
}

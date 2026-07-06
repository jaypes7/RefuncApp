"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  Loader2,
  ExternalLink,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { frotaApi, type FrotaPrestador } from "@/lib/axios";
import { CLASSIFICACOES, classificacaoBadgeClass, apiErrorMessage } from "@/components/frota/frota-utils";

const opt = z.string().optional().or(z.literal(""));

const Schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cidade: opt,
  classificacao: opt,
  telefone: opt,
  contato: opt,
  link_maps: opt,
  motivo_classificacao: opt,
});

type FormValues = z.infer<typeof Schema>;

const EMPTY: FormValues = {
  nome: "", cidade: "", classificacao: "", telefone: "", contato: "", link_maps: "", motivo_classificacao: "",
};

function PrestadorFormModal({
  open,
  onOpenChange,
  prestador,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prestador?: FrotaPrestador | null;
}) {
  const isEdit = !!prestador;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: prestador?.nome ?? "",
        cidade: prestador?.cidade ?? "",
        classificacao: prestador?.classificacao ?? "",
        telefone: prestador?.telefone ?? "",
        contato: prestador?.contato ?? "",
        link_maps: prestador?.link_maps ?? "",
        motivo_classificacao: prestador?.motivo_classificacao ?? "",
      });
    }
  }, [open, prestador, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        nome: values.nome,
        cidade: values.cidade || null,
        classificacao: values.classificacao || null,
        telefone: values.telefone || null,
        contato: values.contato || null,
        link_maps: values.link_maps || null,
        motivo_classificacao: values.motivo_classificacao || null,
      };
      if (isEdit && prestador?.id) {
        await frotaApi.prestadores.atualizar(prestador.id, payload);
      } else {
        await frotaApi.prestadores.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Prestador atualizado!" : "Prestador cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["frota-prestadores"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao salvar prestador")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Prestador" : "Novo Prestador"}</DialogTitle>
          <DialogDescription>Oficinas e prestadores de serviço credenciados.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-2 gap-4 pt-2">
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Fornecedor / Endereço <span className="text-destructive">*</span></label>
            <Input {...register("nome")} placeholder="Nome da oficina - endereço" />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Cidade</label>
            <Input {...register("cidade")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Classificação</label>
            <Controller
              name="classificacao"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CLASSIFICACOES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Telefone</label>
            <Input {...register("telefone")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Contato</label>
            <Input {...register("contato")} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Link Google Maps</label>
            <Input {...register("link_maps")} placeholder="https://maps.google.com/..." />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Motivo da classificação</label>
            <Input {...register("motivo_classificacao")} />
          </div>

          <div className="col-span-2 flex justify-end gap-3 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PrestadoresTab() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [filtroClassificacao, setFiltroClassificacao] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<FrotaPrestador | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["frota-prestadores", page, debouncedSearch, filtroClassificacao],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filtroClassificacao.length) params.classificacao = filtroClassificacao.join(",");
      const res = await frotaApi.prestadores.listar(params);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => frotaApi.prestadores.remover(id),
    onSuccess: () => {
      toast.success("Prestador removido.");
      queryClient.invalidateQueries({ queryKey: ["frota-prestadores"], type: "all" });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao remover prestador")),
  });

  const prestadores = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-md px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, cidade ou contato"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <MultiSelectFilter
            placeholder="Classificação"
            selected={filtroClassificacao}
            onChange={(v) => { setFiltroClassificacao(v); setPage(1); }}
            options={CLASSIFICACOES.map((c) => ({ value: c, label: c }))}
            width="w-44"
          />
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelected(null); setFormOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Novo Prestador
          </Button>
        </div>
      </div>

      <div className="glass-card w-full overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fornecedor</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cidade</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classificação</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</TableHead>
                <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="py-2"><Skeleton className="h-9 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : prestadores.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-20 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <MapPin className="h-8 w-8 opacity-20" />
                      <span>Nenhum prestador encontrado.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                prestadores.map((p) => (
                  <TableRow key={p.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-3 pl-5 max-w-96">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-medium" title={p.nome}>{p.nome}</span>
                        {p.link_maps && (
                          <a href={p.link_maps} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">{p.cidade || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", classificacaoBadgeClass(p.classificacao))}>
                        {p.classificacao || "N/I"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 max-w-48">
                      <span className="block truncate font-mono text-sm text-muted-foreground" title={p.telefone ?? undefined}>{p.telefone || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-48">
                      <span className="block truncate text-sm text-muted-foreground" title={p.contato ?? undefined}>{p.contato || "—"}</span>
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
                            onSelect={(e) => { e.preventDefault(); setSelected(p); setFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer gap-2"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              if (confirm(`Remover ${p.nome}?`)) deleteMutation.mutate(p.id);
                            }}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} prestadores
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

      <PrestadorFormModal
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setSelected(null); }}
        prestador={selected}
      />
    </div>
  );
}

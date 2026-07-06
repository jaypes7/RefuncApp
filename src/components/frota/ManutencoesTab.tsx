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
  Wrench,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { frotaApi, type FrotaManutencao } from "@/lib/axios";
import { MANUTENCAO_TIPOS, formatDate, apiErrorMessage } from "@/components/frota/frota-utils";

// ── Form modal ────────────────────────────────────────────────────────────────

const opt = z.string().optional().or(z.literal(""));

const Schema = z.object({
  placa: z.string().min(1, "Placa é obrigatória").max(10),
  tipo: z.enum(MANUTENCAO_TIPOS),
  situacao: opt,
  km_atual: opt,
  data_atendimento: opt,
  data_parada: opt,
  hora: opt,
  previsao_proxima: opt,
  km_proxima_revisao: opt,
  local_oficina: opt,
  descricao_servico: opt,
  protocolo: opt,
});

type FormValues = z.infer<typeof Schema>;

const EMPTY: FormValues = {
  placa: "", tipo: "PREVENTIVA", situacao: "", km_atual: "", data_atendimento: "",
  data_parada: "", hora: "", previsao_proxima: "", km_proxima_revisao: "",
  local_oficina: "", descricao_servico: "", protocolo: "",
};

function ManutencaoFormModal({
  open,
  onOpenChange,
  manutencao,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manutencao?: FrotaManutencao | null;
}) {
  const isEdit = !!manutencao;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset({
        ...EMPTY,
        ...(manutencao
          ? {
              placa: manutencao.placa ?? "",
              tipo: manutencao.tipo,
              situacao: manutencao.situacao ?? "",
              km_atual: manutencao.km_atual != null ? String(manutencao.km_atual) : "",
              data_atendimento: manutencao.data_atendimento?.split("T")[0] ?? "",
              data_parada: manutencao.data_parada?.split("T")[0] ?? "",
              hora: manutencao.hora ?? "",
              previsao_proxima: manutencao.previsao_proxima?.split("T")[0] ?? "",
              km_proxima_revisao: manutencao.km_proxima_revisao != null ? String(manutencao.km_proxima_revisao) : "",
              local_oficina: manutencao.local_oficina ?? "",
              descricao_servico: manutencao.descricao_servico ?? "",
              protocolo: manutencao.protocolo ?? "",
            }
          : {}),
      });
    }
  }, [open, manutencao, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      // Vincula automaticamente ao veículo cadastrado com a mesma placa
      const placa = values.placa.toUpperCase().replace(/[\s-]/g, "");
      const veiculosRes = await frotaApi.veiculos.listar({ search: placa, limit: 5 });
      const veiculo = veiculosRes.data.data.find((v) => v.placa === placa);

      const payload: Partial<FrotaManutencao> = {
        placa,
        veiculo_id: veiculo?.id ?? null,
        tipo: values.tipo,
        situacao: values.situacao || null,
        km_atual: values.km_atual ? parseInt(values.km_atual, 10) || null : null,
        data_atendimento: values.data_atendimento || null,
        data_parada: values.data_parada || null,
        hora: values.hora || null,
        previsao_proxima: values.previsao_proxima || null,
        km_proxima_revisao: values.km_proxima_revisao ? parseInt(values.km_proxima_revisao, 10) || null : null,
        local_oficina: values.local_oficina || null,
        descricao_servico: values.descricao_servico || null,
        protocolo: values.protocolo || null,
      };

      if (isEdit && manutencao?.id) {
        await frotaApi.manutencoes.atualizar(manutencao.id, payload);
      } else {
        await frotaApi.manutencoes.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Manutenção atualizada!" : "Manutenção registrada!");
      queryClient.invalidateQueries({ queryKey: ["frota-manutencoes"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["frota-dashboard"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao salvar manutenção")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Manutenção" : "Nova Manutenção"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Atualize os dados da manutenção." : "Registre uma manutenção preventiva, corretiva ou sinistro."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Placa <span className="text-destructive">*</span></label>
            <Input {...register("placa")} placeholder="AAA0A00" className="uppercase" />
            {errors.placa && <p className="text-xs text-destructive">{errors.placa.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo <span className="text-destructive">*</span></label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MANUTENCAO_TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Situação</label>
            <Controller
              name="situacao"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {["AGENDADO", "EM ANDAMENTO", "FINALIZADO", "CANCELADO"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">KM atual</label>
            <Input type="number" {...register("km_atual")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Data atendimento</label>
            <Input type="date" {...register("data_atendimento")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Data parada na oficina</label>
            <Input type="date" {...register("data_parada")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Hora</label>
            <Input placeholder="08:00" {...register("hora")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Protocolo / Nº atendimento</label>
            <Input {...register("protocolo")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Previsão próxima revisão</label>
            <Input type="date" {...register("previsao_proxima")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">KM próxima revisão</label>
            <Input type="number" {...register("km_proxima_revisao")} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Local da oficina</label>
            <Input {...register("local_oficina")} />
          </div>
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Descrição do serviço</label>
            <Textarea rows={2} {...register("descricao_servico")} />
          </div>

          <div className="col-span-2 flex justify-end gap-3 border-t pt-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Tab ───────────────────────────────────────────────────────────────────────

const TIPO_BADGE: Record<string, string> = {
  PREVENTIVA: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
  CORRETIVA: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  SINISTRO: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
};

export function ManutencoesTab() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [filtroTipo, setFiltroTipo] = useState<string[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<FrotaManutencao | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["frota-manutencoes", page, debouncedSearch, filtroTipo],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filtroTipo.length) params.tipo = filtroTipo.join(",");
      const res = await frotaApi.manutencoes.listar(params);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => frotaApi.manutencoes.remover(id),
    onSuccess: () => {
      toast.success("Manutenção removida.");
      queryClient.invalidateQueries({ queryKey: ["frota-manutencoes"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["frota-dashboard"], type: "all" });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao remover manutenção")),
  });

  const manutencoes = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, serviço ou oficina"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <MultiSelectFilter
            placeholder="Tipo"
            selected={filtroTipo}
            onChange={(v) => { setFiltroTipo(v); setPage(1); }}
            options={MANUTENCAO_TIPOS.map((t) => ({ value: t, label: t }))}
            width="w-44"
          />
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelected(null); setFormOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Nova Manutenção
          </Button>
        </div>
      </div>

      <div className="glass-card w-full overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Situação</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data atend.</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KM</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próx. revisão</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serviço</TableHead>
                <TableHead className="pr-5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8} className="py-2"><Skeleton className="h-9 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : manutencoes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="py-20 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Wrench className="h-8 w-8 opacity-20" />
                      <span>Nenhuma manutenção encontrada.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                manutencoes.map((m) => (
                  <TableRow key={m.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-3 pl-5">
                      <span className="font-mono font-medium">{m.placa}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TIPO_BADGE[m.tipo] ?? "bg-muted text-muted-foreground")}>
                        {m.tipo}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">{m.situacao || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm">{formatDate(m.data_atendimento)}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">{m.km_atual != null ? m.km_atual.toLocaleString("pt-BR") : "—"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(m.previsao_proxima)}
                        {m.km_proxima_revisao != null ? ` / ${m.km_proxima_revisao.toLocaleString("pt-BR")} km` : ""}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 max-w-64">
                      <span className="block truncate text-sm text-muted-foreground" title={m.descricao_servico ?? undefined}>
                        {m.descricao_servico || "—"}
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
                            onSelect={(e) => { e.preventDefault(); setSelected(m); setFormOpen(true); }}
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
                              if (confirm(`Remover esta manutenção de ${m.placa}?`)) deleteMutation.mutate(m.id);
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
            Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} manutenções
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

      <ManutencaoFormModal
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setSelected(null); }}
        manutencao={selected}
      />
    </div>
  );
}

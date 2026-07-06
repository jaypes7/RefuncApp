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
  Building2,
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
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { frotaApi, type FrotaFornecedor } from "@/lib/axios";
import { statusBadgeClass, apiErrorMessage } from "@/components/frota/frota-utils";

const opt = z.string().optional().or(z.literal(""));

const Schema = z.object({
  empresa: z.string().min(1, "Empresa é obrigatória"),
  status: opt,
  servicos: opt,
  atendimento: opt,
  contato: opt,
  telefone: opt,
  whatsapp: opt,
  site_email: opt,
});

type FormValues = z.infer<typeof Schema>;

const EMPTY: FormValues = {
  empresa: "", status: "ATIVO", servicos: "", atendimento: "", contato: "",
  telefone: "", whatsapp: "", site_email: "",
};

function FornecedorFormModal({
  open,
  onOpenChange,
  fornecedor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: FrotaFornecedor | null;
}) {
  const isEdit = !!fornecedor;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (open) {
      reset({
        empresa: fornecedor?.empresa ?? "",
        status: fornecedor?.status ?? "ATIVO",
        servicos: fornecedor?.servicos ?? "",
        atendimento: fornecedor?.atendimento ?? "",
        contato: fornecedor?.contato ?? "",
        telefone: fornecedor?.telefone ?? "",
        whatsapp: fornecedor?.whatsapp ?? "",
        site_email: fornecedor?.site_email ?? "",
      });
    }
  }, [open, fornecedor, reset]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        empresa: values.empresa,
        status: values.status || null,
        servicos: values.servicos || null,
        atendimento: values.atendimento || null,
        contato: values.contato || null,
        telefone: values.telefone || null,
        whatsapp: values.whatsapp || null,
        site_email: values.site_email || null,
      };
      if (isEdit && fornecedor?.id) {
        await frotaApi.fornecedores.atualizar(fornecedor.id, payload);
      } else {
        await frotaApi.fornecedores.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Fornecedor atualizado!" : "Fornecedor cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["frota-fornecedores"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao salvar fornecedor")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          <DialogDescription>Locadoras, rastreadores e serviços de pedágio.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Empresa <span className="text-destructive">*</span></label>
            <Input {...register("empresa")} />
            {errors.empresa && <p className="text-xs text-destructive">{errors.empresa.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ATIVO">ATIVO</SelectItem>
                    <SelectItem value="INATIVO">INATIVO</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Serviços</label>
            <Input {...register("servicos")} placeholder="FROTA E DESMOBILIZAÇÃO..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Atendimento</label>
            <Input {...register("atendimento")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Contato</label>
            <Input {...register("contato")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Telefone</label>
            <Input {...register("telefone")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">WhatsApp</label>
            <Input {...register("whatsapp")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Site / E-mail</label>
            <Input {...register("site_email")} />
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

export function FornecedoresTab() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<FrotaFornecedor | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["frota-fornecedores", page, debouncedSearch],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await frotaApi.fornecedores.listar(params);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => frotaApi.fornecedores.remover(id),
    onSuccess: () => {
      toast.success("Fornecedor removido.");
      queryClient.invalidateQueries({ queryKey: ["frota-fornecedores"], type: "all" });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao remover fornecedor")),
  });

  const fornecedores = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card rounded-md px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa, serviço ou contato"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 text-sm"
            />
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelected(null); setFormOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Novo Fornecedor
          </Button>
        </div>
      </div>

      <div className="glass-card w-full overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Empresa</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Serviços</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contato</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
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
              ) : fornecedores.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-20 text-center text-sm text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 opacity-20" />
                      <span>Nenhum fornecedor encontrado.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                fornecedores.map((f) => (
                  <TableRow key={f.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-3 pl-5 max-w-56">
                      <span className="block truncate text-sm font-medium" title={f.empresa}>{f.empresa}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-56">
                      <span className="block truncate text-sm text-muted-foreground" title={f.servicos ?? undefined}>{f.servicos || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-44">
                      <span className="block truncate text-sm text-muted-foreground" title={f.contato ?? undefined}>{f.contato || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3 max-w-48">
                      <span className="block truncate font-mono text-sm text-muted-foreground" title={f.telefone ?? undefined}>{f.telefone || "—"}</span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", statusBadgeClass(f.status))}>
                        {f.status || "N/I"}
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
                            onSelect={(e) => { e.preventDefault(); setSelected(f); setFormOpen(true); }}
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
                              if (confirm(`Remover ${f.empresa}?`)) deleteMutation.mutate(f.id);
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
            Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} fornecedores
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

      <FornecedorFormModal
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setSelected(null); }}
        fornecedor={selected}
      />
    </div>
  );
}

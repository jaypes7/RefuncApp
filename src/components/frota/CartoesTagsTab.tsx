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
  CreditCard,
  Tag as TagIcon,
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
import { frotaApi, type FrotaCartao, type FrotaTag } from "@/lib/axios";
import { formatBRL, apiErrorMessage } from "@/components/frota/frota-utils";

/** Resolve o id do veículo cadastrado com a placa informada (ou null). */
async function resolverVeiculoId(placa: string): Promise<string | null> {
  const normalizada = placa.toUpperCase().replace(/[\s-]/g, "");
  if (!normalizada) return null;
  const res = await frotaApi.veiculos.listar({ search: normalizada, limit: 5 });
  return res.data.data.find((v) => v.placa === normalizada)?.id ?? null;
}

// ── Modal Cartão ──────────────────────────────────────────────────────────────

const opt = z.string().optional().or(z.literal(""));

const CartaoSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  status: opt,
  tipo: opt,
  placa_vinculada: opt,
  limite_atual: opt,
  saldo_atual: opt,
  ultimo_condutor: opt,
});

type CartaoFormValues = z.infer<typeof CartaoSchema>;

function CartaoFormModal({
  open,
  onOpenChange,
  cartao,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao?: FrotaCartao | null;
}) {
  const isEdit = !!cartao;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CartaoFormValues>({
    resolver: zodResolver(CartaoSchema),
    defaultValues: { numero: "", status: "", tipo: "ESTOQUE", placa_vinculada: "", limite_atual: "", saldo_atual: "", ultimo_condutor: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        numero: cartao?.numero ?? "",
        status: cartao?.status ?? "",
        tipo: cartao?.tipo ?? "ESTOQUE",
        placa_vinculada: cartao?.ultima_placa ?? "",
        limite_atual: cartao?.limite_atual != null ? String(cartao.limite_atual) : "",
        saldo_atual: cartao?.saldo_atual != null ? String(cartao.saldo_atual) : "",
        ultimo_condutor: cartao?.ultimo_condutor ?? "",
      });
    }
  }, [open, cartao, reset]);

  const mutation = useMutation({
    mutationFn: async (values: CartaoFormValues) => {
      const placa = values.placa_vinculada?.toUpperCase().replace(/[\s-]/g, "") || "";
      const payload: Partial<FrotaCartao> = {
        numero: values.numero,
        status: values.status || null,
        tipo: values.tipo || null,
        veiculo_id: placa ? await resolverVeiculoId(placa) : null,
        ultima_placa: placa || null,
        limite_atual: values.limite_atual ? parseFloat(values.limite_atual.replace(",", ".")) || null : null,
        saldo_atual: values.saldo_atual ? parseFloat(values.saldo_atual.replace(",", ".")) || null : null,
        ultimo_condutor: values.ultimo_condutor || null,
      };
      if (isEdit && cartao?.id) {
        await frotaApi.cartoes.atualizar(cartao.id, payload);
      } else {
        await frotaApi.cartoes.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cartão atualizado!" : "Cartão cadastrado!");
      queryClient.invalidateQueries({ queryKey: ["frota-cartoes"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["frota-dashboard"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao salvar cartão")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
          <DialogDescription>Cartão de combustível (Alelo/Veloe). A senha não é armazenada no sistema.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="grid grid-cols-2 gap-4 pt-2">
          <div className="col-span-2 space-y-1">
            <label className="text-sm font-medium">Número <span className="text-destructive">*</span></label>
            <Input {...register("numero")} placeholder="5067 5201 0000 0000" />
            {errors.numero && <p className="text-xs text-destructive">{errors.numero.message}</p>}
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
                    {["ATIVO", "INATIVO", "BLOQUEADO", "EXTRAVIADO", "ESTOQUE (LOGÍSTICA)"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <Select value={field.value || ""} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VEÍCULO">VEÍCULO</SelectItem>
                    <SelectItem value="ESTOQUE">ESTOQUE</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Placa vinculada</label>
            <Input {...register("placa_vinculada")} placeholder="AAA0A00" className="uppercase" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Último condutor</label>
            <Input {...register("ultimo_condutor")} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Limite atual (R$)</label>
            <Input {...register("limite_atual")} placeholder="0,00" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Saldo atual (R$)</label>
            <Input {...register("saldo_atual")} placeholder="0,00" />
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

// ── Modal Tag ─────────────────────────────────────────────────────────────────

const TagSchema = z.object({
  numero: z.string().min(1, "Número é obrigatório"),
  status: opt,
  marca: opt,
  placa_vinculada: opt,
});

type TagFormValues = z.infer<typeof TagSchema>;

function TagFormModal({
  open,
  onOpenChange,
  tag,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tag?: FrotaTag | null;
}) {
  const isEdit = !!tag;
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TagFormValues>({
    resolver: zodResolver(TagSchema),
    defaultValues: { numero: "", status: "", marca: "VELOE", placa_vinculada: "" },
  });

  useEffect(() => {
    if (open) {
      reset({
        numero: tag?.numero ?? "",
        status: tag?.status ?? "",
        marca: tag?.marca ?? "VELOE",
        placa_vinculada: "",
      });
    }
  }, [open, tag, reset]);

  const mutation = useMutation({
    mutationFn: async (values: TagFormValues) => {
      const placa = values.placa_vinculada?.toUpperCase().replace(/[\s-]/g, "") || "";
      const payload: Partial<FrotaTag> = {
        numero: values.numero,
        status: values.status || null,
        marca: values.marca || null,
        veiculo_id: placa ? await resolverVeiculoId(placa) : (isEdit ? tag?.veiculo_id ?? null : null),
      };
      if (isEdit && tag?.id) {
        await frotaApi.tags.atualizar(tag.id, payload);
      } else {
        await frotaApi.tags.criar(payload);
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Tag atualizada!" : "Tag cadastrada!");
      queryClient.invalidateQueries({ queryKey: ["frota-tags"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["frota-dashboard"], type: "all" });
      onOpenChange(false);
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao salvar tag")),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Tag" : "Nova Tag"}</DialogTitle>
          <DialogDescription>Tag de pedágio (Veloe/Sem Parar).</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Número <span className="text-destructive">*</span></label>
            <Input {...register("numero")} />
            {errors.numero && <p className="text-xs text-destructive">{errors.numero.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Marca</label>
            <Input {...register("marca")} placeholder="VELOE" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Status</label>
            <Input {...register("status")} placeholder="ATIVO, ESTOQUE..." />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Placa vinculada</label>
            <Input {...register("placa_vinculada")} placeholder="AAA0A00" className="uppercase" />
          </div>

          <div className="flex justify-end gap-3 border-t pt-3">
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

// ── Tab ───────────────────────────────────────────────────────────────────────

export function CartoesTagsTab() {
  const queryClient = useQueryClient();

  // Cartões
  const [searchCartao, setSearchCartao] = useState("");
  const debouncedCartao = useDebounce(searchCartao, 500);
  const [pageCartao, setPageCartao] = useState(1);
  const [cartaoFormOpen, setCartaoFormOpen] = useState(false);
  const [selectedCartao, setSelectedCartao] = useState<FrotaCartao | null>(null);

  const { data: cartoesData, isLoading: loadingCartoes } = useQuery({
    queryKey: ["frota-cartoes", pageCartao, debouncedCartao],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: pageCartao, limit: 10 };
      if (debouncedCartao) params.search = debouncedCartao;
      const res = await frotaApi.cartoes.listar(params);
      return res.data;
    },
  });

  const deleteCartao = useMutation({
    mutationFn: (id: string) => frotaApi.cartoes.remover(id),
    onSuccess: () => {
      toast.success("Cartão removido.");
      queryClient.invalidateQueries({ queryKey: ["frota-cartoes"], type: "all" });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao remover cartão")),
  });

  // Tags
  const [searchTag, setSearchTag] = useState("");
  const debouncedTag = useDebounce(searchTag, 500);
  const [pageTag, setPageTag] = useState(1);
  const [tagFormOpen, setTagFormOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<FrotaTag | null>(null);

  const { data: tagsData, isLoading: loadingTags } = useQuery({
    queryKey: ["frota-tags", pageTag, debouncedTag],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: pageTag, limit: 10 };
      if (debouncedTag) params.search = debouncedTag;
      const res = await frotaApi.tags.listar(params);
      return res.data;
    },
  });

  const deleteTag = useMutation({
    mutationFn: (id: string) => frotaApi.tags.remover(id),
    onSuccess: () => {
      toast.success("Tag removida.");
      queryClient.invalidateQueries({ queryKey: ["frota-tags"], type: "all" });
    },
    onError: (error: unknown) => toast.error(apiErrorMessage(error, "Erro ao remover tag")),
  });

  const cartoes = cartoesData?.data ?? [];
  const pagCartoes = cartoesData?.pagination;
  const tags = tagsData?.data ?? [];
  const pagTags = tagsData?.pagination;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── Cartões ── */}
      <div className="flex flex-col gap-3">
        <div className="glass-card rounded-md px-4 py-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Cartões combustível (Alelo)</h3>
            {pagCartoes && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {pagCartoes.total}
              </span>
            )}
            <div className="relative ml-auto w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                value={searchCartao}
                onChange={(e) => { setSearchCartao(e.target.value); setPageCartao(1); }}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelectedCartao(null); setCartaoFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              Novo
            </Button>
          </div>
        </div>

        <div className="glass-card w-full overflow-hidden rounded-md">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCartoes ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="py-2"><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : cartoes.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum cartão encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                cartoes.map((c) => (
                  <TableRow key={c.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-2.5 pl-4">
                      <span className="font-mono text-xs">{c.numero}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-muted-foreground">{c.tipo || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="font-mono text-xs">{c.ultima_placa || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-muted-foreground">{formatBRL(c.saldo_atual)}</span>
                    </TableCell>
                    <TableCell className="py-2.5 max-w-28">
                      <span className="block truncate text-xs text-muted-foreground" title={c.status ?? undefined}>{c.status || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onSelect={(e) => { e.preventDefault(); setSelectedCartao(c); setCartaoFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer gap-2"
                            disabled={deleteCartao.isPending}
                            onClick={() => {
                              if (confirm(`Remover o cartão ${c.numero}?`)) deleteCartao.mutate(c.id);
                            }}
                          >
                            {deleteCartao.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

        {pagCartoes && pagCartoes.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Página {pagCartoes.page} de {pagCartoes.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageCartao === 1} onClick={() => setPageCartao((p) => Math.max(1, p - 1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={pageCartao >= pagCartoes.totalPages} onClick={() => setPageCartao((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tags ── */}
      <div className="flex flex-col gap-3">
        <div className="glass-card rounded-md px-4 py-3">
          <div className="flex items-center gap-2">
            <TagIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Tags de pedágio (Veloe)</h3>
            {pagTags && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {pagTags.total}
              </span>
            )}
            <div className="relative ml-auto w-52">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar"
                value={searchTag}
                onChange={(e) => { setSearchTag(e.target.value); setPageTag(1); }}
                className="h-8 pl-8 text-sm"
              />
            </div>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelectedTag(null); setTagFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5" />
              Nova
            </Button>
          </div>
        </div>

        <div className="glass-card w-full overflow-hidden rounded-md">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-transparent">
                <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Número</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marca</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="pr-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTags ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={4} className="py-2"><Skeleton className="h-8 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : tags.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhuma tag encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                tags.map((t) => (
                  <TableRow key={t.id} className="transition-colors hover:bg-muted/50">
                    <TableCell className="py-2.5 pl-4">
                      <span className="font-mono text-xs">{t.numero}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-xs text-muted-foreground">{t.marca || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 max-w-40">
                      <span className="block truncate text-xs text-muted-foreground" title={t.status ?? undefined}>{t.status || "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2"
                            onSelect={(e) => { e.preventDefault(); setSelectedTag(t); setTagFormOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            className="cursor-pointer gap-2"
                            disabled={deleteTag.isPending}
                            onClick={() => {
                              if (confirm(`Remover a tag ${t.numero}?`)) deleteTag.mutate(t.id);
                            }}
                          >
                            {deleteTag.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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

        {pagTags && pagTags.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Página {pagTags.page} de {pagTags.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageTag === 1} onClick={() => setPageTag((p) => Math.max(1, p - 1))}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={pageTag >= pagTags.totalPages} onClick={() => setPageTag((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      <CartaoFormModal
        open={cartaoFormOpen}
        onOpenChange={(v) => { setCartaoFormOpen(v); if (!v) setSelectedCartao(null); }}
        cartao={selectedCartao}
      />
      <TagFormModal
        open={tagFormOpen}
        onOpenChange={(v) => { setTagFormOpen(v); if (!v) setSelectedTag(null); }}
        tag={selectedTag}
      />
    </div>
  );
}

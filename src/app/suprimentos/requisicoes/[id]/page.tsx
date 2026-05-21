"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Package,
  ClipboardList,
  ShoppingCart,
  Truck,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock,
  Save,
} from "lucide-react";
import {
  requisicoesSuprimentosApi,
  type Requisicao,
  type RequisicaoItem,
} from "@/lib/axios";
import { formatDateBR } from "@/lib/date-utils";

// ============================================================================
// HELPERS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  rascunho:     { label: "Rascunho",    className: "bg-gray-100 text-gray-700 border-gray-300" },
  aberta:       { label: "Aberta",      className: "bg-blue-100 text-blue-700 border-blue-300" },
  em_andamento: { label: "Em Andamento",className: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  concluida:    { label: "Concluída",   className: "bg-green-100 text-green-700 border-green-300" },
  cancelada:    { label: "Cancelada",   className: "bg-red-100 text-red-700 border-red-300" },
};

const CRITICIDADE_LABELS: Record<string, string> = {
  baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica",
};

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    const [y, m, day] = d.split("T")[0].split("-").map(Number);
    return formatDateBR(new Date(y, m - 1, day));
  } catch { return d; }
}

function formatCurrency(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ============================================================================
// KPI COMPUTATION
// ============================================================================

function computeKpis(req: Requisicao) {
  const itens = req.itens ?? [];
  const recebimentos = req.recebimentos ?? [];
  const ocs = req.ocs ?? [];

  const totalItens = itens.length;
  const noEstoque  = itens.reduce((s, i) => s + Number(i.quantidade_estoque), 0);
  const aComprar   = itens.reduce((s, i) => s + Math.max(0, Number(i.quantidade) - Number(i.quantidade_estoque)), 0);

  const recebidoPorItem = new Map<string, number>();
  for (const receb of recebimentos) {
    for (const ri of receb.suprimentos_recebimento_itens ?? []) {
      recebidoPorItem.set(ri.item_id, (recebidoPorItem.get(ri.item_id) ?? 0) + Number(ri.quantidade_recebida));
    }
  }

  const recebidos = Array.from(recebidoPorItem.values()).reduce((s, v) => s + v, 0);
  const falta     = Math.max(0, aComprar - recebidos);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const emAtraso = ocs.filter((oc) => {
    if (!oc.previsao_entrega) return false;
    const [y, m, d] = oc.previsao_entrega.split("-").map(Number);
    return new Date(y, m - 1, d) < hoje && req.status !== "concluida";
  }).length;

  return { totalItens, noEstoque, aComprar, recebidos, falta, emAtraso };
}

// ============================================================================
// SCHEMAS para formulários
// ============================================================================

const ocSchema = z.object({
  numero_oc:        z.string().min(1, "Obrigatório"),
  fornecedor:       z.string().min(1, "Obrigatório"),
  valor:            z.number().optional(),
  valor_previsto:   z.number().optional(),
  previsao_entrega: z.string().optional(),
  item_ids:         z.array(z.string()).min(1, "Selecione ao menos 1 item"),
});
type OCForm = z.infer<typeof ocSchema>;

const recebSchema = z.object({
  tipo:             z.enum(["total", "parcial"]),
  numero_nota:      z.string().min(1, "Obrigatorio"),
  data_recebimento: z.string().min(1, "Obrigatório"),
  observacao:       z.string().optional(),
});
type RecebForm = z.infer<typeof recebSchema>;

// ============================================================================
// REVISÃO (rascunho)
// ============================================================================

function AbaRevisao({ req, onSaved }: { req: Requisicao; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const [editedItens, setEditedItens] = useState<Record<string, Partial<RequisicaoItem>>>({});
  const [saving, setSaving] = useState<"rascunho" | "aberta" | null>(null);

  const mutation = useMutation({
    mutationFn: ({ status }: { status: string }) => {
      const itensPayload = Object.entries(editedItens).map(([id, changes]) => ({ id, ...changes }));
      return requisicoesSuprimentosApi.atualizar(req.id, { status, itens: itensPayload });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.status === "rascunho" ? "Rascunho salvo!" : "Requisição aberta!");
      queryClient.invalidateQueries({ queryKey: ["req", req.id] });
      if (vars.status === "aberta") onSaved();
      setSaving(null);
    },
    onError: () => { toast.error("Erro ao salvar"); setSaving(null); },
  });

  function updateItem(id: string, field: string, value: unknown) {
    setEditedItens((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function getVal<K extends keyof RequisicaoItem>(id: string, field: K, fallback: RequisicaoItem[K]) {
    return (editedItens[id]?.[field] as RequisicaoItem[K]) ?? fallback;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Revisão dos Itens
        </CardTitle>
        <p className="text-sm text-muted-foreground">Ajuste quantidades, estoque e criticidade antes de abrir a RQ</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Und</TableHead>
                <TableHead className="min-w-[100px]">Qtde</TableHead>
                <TableHead className="min-w-[130px]">Valor Item</TableHead>
                <TableHead className="min-w-[150px]">Necessidade</TableHead>
                <TableHead className="min-w-[110px]">Em Estoque</TableHead>
                <TableHead className="min-w-[130px]">Criticidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(req.itens ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome_item}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.categoria}</TableCell>
                  <TableCell>{item.unidade}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getVal(item.id, "quantidade", item.quantidade)}
                      onChange={(e) => updateItem(item.id, "quantidade", parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getVal(item.id, "valor_item", item.valor_item) ?? ""}
                      onChange={(e) => updateItem(item.id, "valor_item", e.target.value === "" ? null : parseFloat(e.target.value) || 0)}
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      value={getVal(item.id, "data_necessidade", item.data_necessidade) ?? ""}
                      onChange={(e) => updateItem(item.id, "data_necessidade", e.target.value || null)}
                      className="w-36"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={getVal(item.id, "quantidade_estoque", item.quantidade_estoque)}
                      onChange={(e) => updateItem(item.id, "quantidade_estoque", parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={getVal(item.id, "criticidade", item.criticidade)}
                      onValueChange={(v) => updateItem(item.id, "criticidade", v)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CRITICIDADE_LABELS).map(([val, lbl]) => (
                          <SelectItem key={val} value={val}>{lbl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t">
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => { setSaving("rascunho"); mutation.mutate({ status: "rascunho" }); }}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving === "rascunho" && mutation.isPending ? "Salvando..." : "Salvar Rascunho"}
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => { setSaving("aberta"); mutation.mutate({ status: "aberta" }); }}
          >
            {saving === "aberta" && mutation.isPending ? "Abrindo..." : "Salvar RQ"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ABA RESUMO
// ============================================================================

function AbaResumo({ req }: { req: Requisicao }) {
  const kpis = computeKpis(req);

  const cards = [
    { label: "Itens na RQ",  value: kpis.totalItens,         icon: ClipboardList,  color: "text-blue-600",   bg: "bg-blue-50" },
    { label: "No Estoque",   value: kpis.noEstoque,          icon: Package,        color: "text-green-600",  bg: "bg-green-50" },
    { label: "A Comprar",    value: kpis.aComprar,           icon: ShoppingCart,   color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Recebidos",    value: kpis.recebidos,          icon: CheckCircle2,   color: "text-emerald-600",bg: "bg-emerald-50" },
    { label: "Falta",        value: kpis.falta,              icon: AlertCircle,    color: "text-red-600",    bg: "bg-red-50" },
    { label: "Em Atraso",    value: `${kpis.emAtraso} OC(s)`,icon: Clock,          color: "text-yellow-600", bg: "bg-yellow-50" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <Card key={label} className="border border-border/60">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <div className={`p-2 rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// ABA ITENS
// ============================================================================

function AbaItens({ req }: { req: Requisicao }) {
  const recebidoPorItem = new Map<string, number>();
  for (const receb of req.recebimentos ?? []) {
    for (const ri of receb.suprimentos_recebimento_itens ?? []) {
      recebidoPorItem.set(ri.item_id, (recebidoPorItem.get(ri.item_id) ?? 0) + Number(ri.quantidade_recebida));
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Und</TableHead>
              <TableHead>Criticidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor Item</TableHead>
              <TableHead>Necessidade</TableHead>
              <TableHead className="text-right">Qtde Total</TableHead>
              <TableHead className="text-right">Em Estoque</TableHead>
              <TableHead className="text-right">A Comprar</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(req.itens ?? []).map((item) => {
              const aComprar = Math.max(0, Number(item.quantidade) - Number(item.quantidade_estoque));
              const recebido = recebidoPorItem.get(item.id) ?? 0;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nome_item}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.categoria}</TableCell>
                  <TableCell>{item.unidade}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {CRITICIDADE_LABELS[item.criticidade] ?? item.criticidade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{item.tipo}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.valor_item)}</TableCell>
                  <TableCell>{formatDate(item.data_necessidade)}</TableCell>
                  <TableCell className="text-right">{item.quantidade}</TableCell>
                  <TableCell className="text-right">{item.quantidade_estoque}</TableCell>
                  <TableCell className="text-right">{aComprar}</TableCell>
                  <TableCell className="text-right">
                    <span className={recebido >= aComprar && aComprar > 0 ? "text-green-600 font-medium" : ""}>
                      {recebido}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ABA OC
// ============================================================================

function AbaOC({ req }: { req: Requisicao }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedOcItemIds, setSelectedOcItemIds] = useState<string[]>([]);

  const form = useForm<OCForm>({
    resolver: zodResolver(ocSchema),
    defaultValues: { item_ids: [] },
  });

  function toggleOcItem(itemId: string, checked: boolean) {
    setSelectedOcItemIds((current) => {
      const next = checked
        ? Array.from(new Set([...current, itemId]))
        : current.filter((id) => id !== itemId);
      form.setValue("item_ids", next, { shouldValidate: true, shouldDirty: true });
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: (data: OCForm) =>
      requisicoesSuprimentosApi.registrarOC(req.id, {
        ...data,
        valor:            data.valor ?? null,
        valor_previsto:   data.valor_previsto ?? null,
        previsao_entrega: data.previsao_entrega || null,
        item_ids:         data.item_ids,
      }),
    onSuccess: () => {
      toast.success("OC registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["req", req.id] });
      form.reset();
      setSelectedOcItemIds([]);
      setShowForm(false);
    },
    onError: () => toast.error("Erro ao registrar OC"),
  });

  const ocs = req.ocs ?? [];

  return (
    <div className="space-y-4 w-full">
      <Card className="border border-border/60 w-full">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">
            {ocs.length > 0 ? `${ocs.length} OC(s) registrada(s)` : "Ordens de Compra"}
          </CardTitle>
          {!showForm && (
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
              <ShoppingCart className="h-4 w-4" />
              Registrar OC
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {ocs.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p className="text-sm">Nenhuma OC registrada para esta requisição</p>
            </div>
          ) : ocs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº OC</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead className="text-right">Valor Previsto</TableHead>
                  <TableHead className="text-right">Valor Real</TableHead>
                  <TableHead>Previsão Entrega</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocs.map((oc) => (
                  <TableRow key={oc.id}>
                    <TableCell className="font-medium">{oc.numero_oc}</TableCell>
                    <TableCell>{oc.fornecedor}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {oc.itens && oc.itens.length > 0
                        ? oc.itens.map((item) => item.nome_item).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(oc.valor_previsto)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(oc.valor)}</TableCell>
                    <TableCell>{formatDate(oc.previsao_entrega)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>

      {showForm && (
        <Card className="border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">Nova Ordem de Compra</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Número OC *</label>
                <Input placeholder="Ex: OC9363801" {...form.register("numero_oc")} />
                {form.formState.errors.numero_oc && (
                  <p className="text-xs text-destructive">{form.formState.errors.numero_oc.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Fornecedor *</label>
                <Input placeholder="Nome do fornecedor" {...form.register("fornecedor")} />
                {form.formState.errors.fornecedor && (
                  <p className="text-xs text-destructive">{form.formState.errors.fornecedor.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Previsão de Entrega</label>
                <Input type="date" {...form.register("previsao_entrega")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Valor Previsto (R$)</label>
                <Input type="number" min="0" step="0.01" placeholder="0,00" {...form.register("valor_previsto", { setValueAs: (value) => value === "" ? undefined : Number(value) })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none">Valor Real (R$)</label>
                <Input type="number" min="0" step="0.01" placeholder="0,00" {...form.register("valor", { setValueAs: (value) => value === "" ? undefined : Number(value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Itens cobertos pela OC *</label>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[52px]"></TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">A Comprar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(req.itens ?? []).map((item) => {
                      const aComprar = Math.max(0, Number(item.quantidade) - Number(item.quantidade_estoque));
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOcItemIds.includes(item.id)}
                              onCheckedChange={(checked) => toggleOcItem(item.id, checked === true)}
                              aria-label={`Selecionar item ${item.nome_item}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.nome_item}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.categoria}</TableCell>
                          <TableCell className="text-right">{aComprar}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.item_ids && (
                <p className="text-xs text-destructive">{form.formState.errors.item_ids.message}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowForm(false); form.reset(); setSelectedOcItemIds([]); }}>
                Cancelar
              </Button>
              <Button
                disabled={mutation.isPending}
                onClick={form.handleSubmit((data) => mutation.mutate(data))}
              >
                {mutation.isPending ? "Salvando..." : "Registrar OC"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// ABA RECEBIMENTO
// ============================================================================

function AbaRecebimento({ req }: { req: Requisicao }) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [partialQtds, setPartialQtds] = useState<Record<string, number>>({});

  const form = useForm<RecebForm>({
    resolver: zodResolver(recebSchema),
    defaultValues: {
      tipo:             "total",
      numero_nota:      "",
      data_recebimento: new Date().toISOString().split("T")[0],
    },
  });

  const tipo = form.watch("tipo");

  const mutation = useMutation({
    mutationFn: (data: RecebForm) => {
      const itensParciais = tipo === "parcial"
        ? Object.entries(partialQtds)
            .filter(([, q]) => q > 0)
            .map(([item_id, quantidade_recebida]) => ({ item_id, quantidade_recebida }))
        : undefined;

      return requisicoesSuprimentosApi.registrarRecebimento(req.id, {
        ...data,
        itens: itensParciais,
      });
    },
    onSuccess: () => {
      toast.success("Recebimento registrado!");
      queryClient.invalidateQueries({ queryKey: ["req", req.id] });
      form.reset({ tipo: "total", numero_nota: "", data_recebimento: new Date().toISOString().split("T")[0] });
      setPartialQtds({});
      setDialogOpen(false);
    },
    onError: () => toast.error("Erro ao registrar recebimento"),
  });

  const recebimentos = req.recebimentos ?? [];

  return (
    <div className="space-y-4 w-full">
      <Card className="border border-border/60 w-full">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <CardTitle className="text-base">
            {recebimentos.length > 0 ? `${recebimentos.length} recebimento(s) registrado(s)` : "Histórico de Recebimentos"}
          </CardTitle>
          <Button className="gap-2" size="sm" onClick={() => setDialogOpen(true)}>
            <Truck className="h-4 w-4" />
            Registrar Recebimento
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recebimentos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Truck className="h-12 w-12 opacity-20" />
              <p className="text-sm">Nenhum recebimento registrado para esta requisição</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recebimentos.map((receb) => (
                  <TableRow key={receb.id}>
                    <TableCell>{formatDate(receb.data_recebimento)}</TableCell>
                    <TableCell className="font-medium">{receb.numero_nota || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={receb.tipo === "total" ? "bg-green-50 text-green-700 border-green-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {receb.tipo === "total" ? "Total" : "Parcial"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{receb.observacao ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[700px] sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Registrar Recebimento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="space-y-1.5 w-[220px]">
                <label className="text-sm font-medium leading-none">Tipo *</label>
                <Select
                  value={form.watch("tipo")}
                  onValueChange={(v) => form.setValue("tipo", v as "total" | "parcial")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total">Total (todos os itens)</SelectItem>
                    <SelectItem value="parcial">Parcial (itens selecionados)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 w-[180px]">
                <label className="text-sm font-medium leading-none">Data do Recebimento *</label>
                <Input type="date" {...form.register("data_recebimento")} />
                {form.formState.errors.data_recebimento && (
                  <p className="text-xs text-destructive">{form.formState.errors.data_recebimento.message}</p>
                )}
              </div>
              <div className="space-y-1.5 flex-1 min-w-[180px]">
                <label className="text-sm font-medium leading-none">Numero da Nota *</label>
                <Input placeholder="Ex: NF-12345" {...form.register("numero_nota")} />
                {form.formState.errors.numero_nota && (
                  <p className="text-xs text-destructive">{form.formState.errors.numero_nota.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none">Observação</label>
              <Input placeholder="Opcional" {...form.register("observacao")} />
            </div>

            {tipo === "parcial" && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">Quantidades Recebidas por Item</label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Und</TableHead>
                      <TableHead>Falta Receber</TableHead>
                      <TableHead className="min-w-[100px]">Recebido Agora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const jaRecebidoPorItem = new Map<string, number>();
                      for (const receb of req.recebimentos ?? []) {
                        for (const ri of receb.suprimentos_recebimento_itens ?? []) {
                          jaRecebidoPorItem.set(ri.item_id, (jaRecebidoPorItem.get(ri.item_id) ?? 0) + Number(ri.quantidade_recebida));
                        }
                      }
                      return (req.itens ?? []).map((item) => {
                        const aComprar = Math.max(0, Number(item.quantidade) - Number(item.quantidade_estoque));
                        const jaRecebido = jaRecebidoPorItem.get(item.id) ?? 0;
                        const restante = Math.max(0, aComprar - jaRecebido);
                        if (restante === 0) return null;
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{item.nome_item}</TableCell>
                            <TableCell className="text-sm">{item.unidade}</TableCell>
                            <TableCell className="text-sm font-medium">{restante}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={restante}
                                step="0.01"
                                value={partialQtds[item.id] ?? 0}
                                onChange={(e) =>
                                  setPartialQtds((prev) => ({
                                    ...prev,
                                    [item.id]: Math.min(restante, parseFloat(e.target.value) || 0),
                                  }))
                                }
                                className="w-24"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              disabled={mutation.isPending}
              onClick={form.handleSubmit((data) => mutation.mutate(data))}
            >
              {mutation.isPending ? "Salvando..." : "Confirmar Recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// PÁGINA PRINCIPAL
// ============================================================================

function RequisicaoDetalhe({ id }: { id: string }) {
  const router = useRouter();

  const { data: req, isLoading } = useQuery({
    queryKey: ["req", id],
    queryFn: () => requisicoesSuprimentosApi.buscar(id).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!req) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Requisição não encontrada.</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[req.status] ?? { label: req.status, className: "" };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/suprimentos/requisicoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Package className="h-6 w-6 text-orange-500" />
                {req.titulo}
              </h1>
              <Badge variant="outline" className={`text-xs font-medium ${statusCfg.className}`}>
                {statusCfg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Coordenador: <span className="font-medium text-foreground">{req.coordenador}</span>
              {" · "}Abertura: {formatDate(req.data_abertura)}
            </p>
          </div>
        </div>

        {/* Conteúdo por status */}
        {req.status === "rascunho" ? (
          <AbaRevisao req={req} onSaved={() => {}} />
        ) : (
          <div className="rounded-md border bg-card text-card-foreground shadow-sm w-full">
            <Tabs defaultValue="resumo" className="w-full flex flex-col">
              <div className="px-6 pt-4 border-b border-border/50">
                <TabsList className="flex justify-start gap-1 bg-transparent rounded-none h-auto pb-2 w-auto">
                  <TabsTrigger
                    value="resumo"
                    className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Resumo
                  </TabsTrigger>
                  <TabsTrigger
                    value="itens"
                    className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Itens
                  </TabsTrigger>
                  <TabsTrigger
                    value="oc"
                    className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    OC
                  </TabsTrigger>
                  <TabsTrigger
                    value="recebimento"
                    className="gap-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                  >
                    <Truck className="h-4 w-4" />
                    Recebimento
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="resumo" className="p-6 w-full">
                <AbaResumo req={req} />
              </TabsContent>
              <TabsContent value="itens" className="w-full">
                <AbaItens req={req} />
              </TabsContent>
              <TabsContent value="oc" className="p-6 w-full">
                <AbaOC req={req} />
              </TabsContent>
              <TabsContent value="recebimento" className="p-6 w-full">
                <AbaRecebimento req={req} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ProtectedRoute>
      <RequisicaoDetalhe id={id} />
    </ProtectedRoute>
  );
}

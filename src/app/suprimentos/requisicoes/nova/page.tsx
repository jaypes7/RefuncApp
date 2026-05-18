"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ArrowLeft, Plus, Trash2, Package } from "lucide-react";
import { requisicoesSuprimentosApi } from "@/lib/axios";

// ============================================================================
// SCHEMA
// ============================================================================

const itemSchema = z.object({
  nome_item:   z.string().min(1, "Nome obrigatório"),
  categoria:   z.string().min(1, "Categoria obrigatória"),
  unidade:     z.string().min(1, "Unidade obrigatória"),
  quantidade:  z.coerce.number().min(0.01, "Quantidade deve ser maior que 0"),
  criticidade: z.enum(["baixa", "media", "alta", "critica"]),
  tipo:        z.enum(["item", "servico"]),
});

const schema = z.object({
  titulo:        z.string().min(1, "Título obrigatório"),
  coordenador:   z.string().min(1, "Coordenador obrigatório"),
  data_abertura: z.string().min(1, "Data obrigatória"),
  itens:         z.array(itemSchema).min(1, "Adicione ao menos 1 item"),
});

type FormData = z.infer<typeof schema>;

const CATEGORIAS_FALLBACK = [
  "MAT. USO E CONSUMO",
  "MAT. LIMPEZA",
  "MAT. EQUIPAMENTO",
  "MAT. USO EM ESCRITÓRIO",
  "FERRAMENTAL",
  "EPI",
  "GASES",
  "SERVIÇO",
  "OUTROS",
];

const UNIDADES = ["und", "kg", "m", "cm", "litros", "m²", "m³", "par", "caixa", "rolo", "conjunto"];

const CRITICIDADE_LABELS: Record<string, string> = {
  baixa:   "Baixa",
  media:   "Média",
  alta:    "Alta",
  critica: "Crítica",
};

// ============================================================================
// PAGE
// ============================================================================

function NovaRequisicaoForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { data: categoriasData } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ["suprimentos-categorias"],
    queryFn: () => fetch("/api/suprimentos/categorias").then((r) => r.json()),
  });
  const CATEGORIAS = categoriasData && categoriasData.length > 0
    ? categoriasData.map((c) => c.nome)
    : CATEGORIAS_FALLBACK;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo:        "",
      coordenador:   "",
      data_abertura: new Date().toISOString().split("T")[0],
      itens: [
        { nome_item: "", categoria: "", unidade: "und", quantidade: 1, criticidade: "media", tipo: "item" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "itens" });

  const mutation = useMutation({
    mutationFn: (data: FormData & { status: string }) =>
      requisicoesSuprimentosApi.criar(data).then((r) => r.data),
    onSuccess: (data) => {
      toast.success("Requisição criada! Revise os itens antes de abrir.");
      router.push(`/suprimentos/requisicoes/${data.id}`);
    },
    onError: () => {
      toast.error("Erro ao salvar requisição. Tente novamente.");
      setSaving(false);
    },
  });

  function handleSubmit() {
    setSaving(true);
    form.handleSubmit((data) => {
      mutation.mutate({ ...data, status: "rascunho" });
    })();
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-500" />
              Nova Requisição
            </h1>
            <p className="text-sm text-muted-foreground">Preencha os dados e adicione os itens</p>
          </div>
        </div>

        {/* Cabeçalho da RQ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da Requisição</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none"htmlFor="titulo">Título da RQ *</label>
              <Input id="titulo" placeholder="Ex: RQ-001 Ferramentas Parada" {...form.register("titulo")} />
              {form.formState.errors.titulo && (
                <p className="text-xs text-destructive">{form.formState.errors.titulo.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none"htmlFor="coordenador">Coordenador *</label>
              <Input id="coordenador" placeholder="Nome do coordenador" {...form.register("coordenador")} />
              {form.formState.errors.coordenador && (
                <p className="text-xs text-destructive">{form.formState.errors.coordenador.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium leading-none"htmlFor="data_abertura">Data de Abertura *</label>
              <Input id="data_abertura" type="date" {...form.register("data_abertura")} />
              {form.formState.errors.data_abertura && (
                <p className="text-xs text-destructive">{form.formState.errors.data_abertura.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Itens da Requisição</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => append({ nome_item: "", categoria: "", unidade: "und", quantidade: 1, criticidade: "media", tipo: "item" })}
            >
              <Plus className="h-4 w-4" />
              Adicionar Item
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {form.formState.errors.itens?.root && (
              <p className="text-xs text-destructive px-6 pb-2">{form.formState.errors.itens.root.message}</p>
            )}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Nome do Item *</TableHead>
                    <TableHead className="min-w-[160px]">Categoria *</TableHead>
                    <TableHead className="min-w-[100px]">Unidade *</TableHead>
                    <TableHead className="min-w-[100px]">Quantidade *</TableHead>
                    <TableHead className="min-w-[120px]">Criticidade</TableHead>
                    <TableHead className="min-w-[120px]">Tipo</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input
                          placeholder="Nome do item ou serviço"
                          {...form.register(`itens.${index}.nome_item`)}
                          className={form.formState.errors.itens?.[index]?.nome_item ? "border-destructive" : ""}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={form.watch(`itens.${index}.categoria`)}
                          onValueChange={(v) => form.setValue(`itens.${index}.categoria`, v)}
                        >
                          <SelectTrigger className={form.formState.errors.itens?.[index]?.categoria ? "border-destructive" : ""}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={form.watch(`itens.${index}.unidade`)}
                          onValueChange={(v) => form.setValue(`itens.${index}.unidade`, v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIDADES.map((u) => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          {...form.register(`itens.${index}.quantidade`)}
                          className={form.formState.errors.itens?.[index]?.quantidade ? "border-destructive" : ""}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={form.watch(`itens.${index}.criticidade`)}
                          onValueChange={(v) => form.setValue(`itens.${index}.criticidade`, v as "baixa" | "media" | "alta" | "critica")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(CRITICIDADE_LABELS).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={form.watch(`itens.${index}.tipo`)}
                          onValueChange={(v) => form.setValue(`itens.${index}.tipo`, v as "item" | "servico")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="servico">Serviço</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => fields.length > 1 && remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending}
            onClick={() => handleSubmit()}
          >
            {saving && mutation.isPending ? "Salvando..." : "Salvar RQ"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ProtectedRoute>
      <NovaRequisicaoForm />
    </ProtectedRoute>
  );
}

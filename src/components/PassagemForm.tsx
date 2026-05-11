"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Plane, Route } from "lucide-react";
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
import { passagensApi, type ColaboradorPassagem, type PassagemTrecho } from "@/lib/axios";

interface PassagemFormProps {
  colaboradorId: string;
}

const MOTIVOS = [
  "Afastamento",
  "Apoio técnico",
  "Desmobilização",
  "Férias",
  "Folga Campo",
  "Mobilização",
  "Parada",
  "Retorno",
  "Treinamento",
  "Visita Técnica",
];

const TIPOS_PASSAGEM = ["Aéreo", "Terrestre", "Veículo Próprio"];

const EMPTY_TRECHO: Omit<PassagemTrecho, "id" | "passagem_id"> = {
  ordem: 1,
  cidade_embarque: "",
  data_embarque: "",
  horario_embarque: "",
  cidade_desembarque: "",
  data_desembarque: "",
  horario_desembarque: "",
  valor_com_taxas: null,
};

const EMPTY_PASSAGEM: Omit<ColaboradorPassagem, "id" | "colaborador_id" | "created_at"> = {
  motivo: "",
  tipo_passagem: "",
  observacoes: "",
  trechos: [{ ...EMPTY_TRECHO }],
};

export function PassagemForm({ colaboradorId }: PassagemFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_PASSAGEM);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["passagens", colaboradorId],
    queryFn: async () => {
      const response = await passagensApi.listar(colaboradorId);
      return response.data.data ?? [];
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      return passagensApi.criar(colaboradorId, body);
    },
    onSuccess: () => {
      toast.success("Passagem cadastrada!");
      setForm(EMPTY_PASSAGEM);
      queryClient.invalidateQueries({ queryKey: ["passagens", colaboradorId] });
    },
    onError: () => toast.error("Erro ao cadastrar passagem"),
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<typeof form> }) => {
      return passagensApi.atualizar(colaboradorId, id, body);
    },
    onSuccess: () => {
      toast.success("Passagem atualizada!");
      setEditandoId(null);
      setForm(EMPTY_PASSAGEM);
      queryClient.invalidateQueries({ queryKey: ["passagens", colaboradorId] });
    },
    onError: () => toast.error("Erro ao atualizar passagem"),
  });

  const removerMutation = useMutation({
    mutationFn: async (id: string) => {
      return passagensApi.remover(colaboradorId, id);
    },
    onSuccess: () => {
      toast.success("Passagem removida!");
      queryClient.invalidateQueries({ queryKey: ["passagens", colaboradorId] });
    },
    onError: () => toast.error("Erro ao remover passagem"),
  });

  const handleAddTrecho = () => {
    setForm((prev) => ({
      ...prev,
      trechos: [
        ...(prev.trechos ?? []),
        { ...EMPTY_TRECHO, ordem: (prev.trechos?.length ?? 0) + 1 },
      ],
    }));
  };

  const handleRemoveTrecho = (index: number) => {
    setForm((prev) => ({
      ...prev,
      trechos: (prev.trechos ?? []).filter((_, i) => i !== index).map((t, i) => ({ ...t, ordem: i + 1 })),
    }));
  };

  const handleTrechoChange = (index: number, field: keyof PassagemTrecho, value: string | number | null) => {
    setForm((prev) => ({
      ...prev,
      trechos: (prev.trechos ?? []).map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, body: form });
    } else {
      criarMutation.mutate(form);
    }
  };

  const handleEditar = (p: ColaboradorPassagem) => {
    setEditandoId(p.id!);
    setForm({
      motivo: p.motivo ?? "",
      tipo_passagem: p.tipo_passagem ?? "",
      observacoes: p.observacoes ?? "",
      trechos: (p.trechos ?? []).map((t) => ({
        ordem: t.ordem ?? 1,
        cidade_embarque: t.cidade_embarque ?? "",
        data_embarque: t.data_embarque ?? "",
        horario_embarque: t.horario_embarque ?? "",
        cidade_desembarque: t.cidade_desembarque ?? "",
        data_desembarque: t.data_desembarque ?? "",
        horario_desembarque: t.horario_desembarque ?? "",
        valor_com_taxas: t.valor_com_taxas ?? null,
      })),
    });
  };

  const handleCancelar = () => {
    setEditandoId(null);
    setForm(EMPTY_PASSAGEM);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const passagens = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Plane className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Passagens</h3>
          <p className="text-sm text-muted-foreground">Gerenciar passagens e trechos do colaborador</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo</label>
            <Select
              value={form.motivo ?? undefined}
              onValueChange={(v) => setForm((prev) => ({ ...prev, motivo: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Passagem</label>
            <Select
              value={form.tipo_passagem ?? undefined}
              onValueChange={(v) => setForm((prev) => ({ ...prev, tipo_passagem: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PASSAGEM.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Input
              value={form.observacoes ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações gerais"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Route className="h-4 w-4" />
              Trechos
            </h4>
            <Button type="button" variant="outline" size="sm" onClick={handleAddTrecho} className="gap-1">
              <Plus className="h-3.5 w-3.5" />
              Adicionar Trecho
            </Button>
          </div>

          {(form.trechos ?? []).map((trecho, idx) => (
            <div
              key={idx}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 rounded-md border border-border/60 p-3 relative"
            >
              <div className="absolute -top-2 left-3 bg-background px-1 text-[10px] font-medium text-muted-foreground">
                Trecho {idx + 1} {idx === 0 ? "(Origem)" : "(Conexão)"}
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cidade Embarque</label>
                <Input
                  value={trecho.cidade_embarque ?? ""}
                  onChange={(e) => handleTrechoChange(idx, "cidade_embarque", e.target.value)}
                  placeholder="Cidade"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data Embarque</label>
                <Input
                  type="date"
                  value={trecho.data_embarque ?? ""}
                  onChange={(e) => handleTrechoChange(idx, "data_embarque", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Horário Embarque</label>
                <Input
                  type="time"
                  value={trecho.horario_embarque ?? ""}
                  onChange={(e) => handleTrechoChange(idx, "horario_embarque", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Cidade Desembarque</label>
                <Input
                  value={trecho.cidade_desembarque ?? ""}
                  onChange={(e) => handleTrechoChange(idx, "cidade_desembarque", e.target.value)}
                  placeholder="Cidade"
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Data Desembarque</label>
                <Input
                  type="date"
                  value={trecho.data_desembarque ?? ""}
                  onChange={(e) => handleTrechoChange(idx, "data_desembarque", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Horário Desembarque</label>
                <Input
                  type="time"
                  value={trecho.horario_desembarque ?? ""}
                  onChange={(e) => handleTrechoChange(idx, "horario_desembarque", e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Valor c/ Taxas</label>
                <Input
                  type="number"
                  step="0.01"
                  value={trecho.valor_com_taxas ?? ""}
                  onChange={(e) =>
                    handleTrechoChange(idx, "valor_com_taxas", e.target.value ? parseFloat(e.target.value) : null)
                  }
                  placeholder="0,00"
                  className="h-8"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => handleRemoveTrecho(idx)}
                  disabled={(form.trechos ?? []).length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={criarMutation.isPending || atualizarMutation.isPending}
            className="gap-2"
          >
            {criarMutation.isPending || atualizarMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {editandoId ? "Atualizar Passagem" : "Adicionar Passagem"}
          </Button>
          {editandoId && (
            <Button type="button" variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {passagens.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Motivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Trechos</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passagens.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.motivo}</TableCell>
                  <TableCell>{p.tipo_passagem}</TableCell>
                  <TableCell>{p.trechos?.length ?? 0} trecho(s)</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditar(p)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => removerMutation.mutate(p.id!)}
                        disabled={removerMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Hotel } from "lucide-react";
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
import { hospedagensApi, type ColaboradorHospedagem } from "@/lib/axios";

interface HospedagemFormProps {
  colaboradorId: string;
}

const EMPTY_HOSPEDAGEM: Omit<ColaboradorHospedagem, "id" | "colaborador_id" | "created_at"> = {
  hotel_nome: "",
  hotel_endereco: "",
  hotel_telefone: "",
  tipo_apto: undefined,
  valor_diaria: null,
  qtd_leitos_bloqueados: 0,
  data_bloqueio: "",
  qtd_leitos_disponiveis: 0,
  data_checkin: "",
  horario_checkin: "",
  observacoes: "",
};

export function HospedagemForm({ colaboradorId }: HospedagemFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_HOSPEDAGEM);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hospedagens", colaboradorId],
    queryFn: async () => {
      const response = await hospedagensApi.listar(colaboradorId);
      return response.data.data ?? [];
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (body: typeof form) => {
      return hospedagensApi.criar(colaboradorId, body);
    },
    onSuccess: () => {
      toast.success("Hospedagem cadastrada!");
      setForm(EMPTY_HOSPEDAGEM);
      queryClient.invalidateQueries({ queryKey: ["hospedagens", colaboradorId] });
    },
    onError: () => toast.error("Erro ao cadastrar hospedagem"),
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<typeof form> }) => {
      return hospedagensApi.atualizar(colaboradorId, id, body);
    },
    onSuccess: () => {
      toast.success("Hospedagem atualizada!");
      setEditandoId(null);
      setForm(EMPTY_HOSPEDAGEM);
      queryClient.invalidateQueries({ queryKey: ["hospedagens", colaboradorId] });
    },
    onError: () => toast.error("Erro ao atualizar hospedagem"),
  });

  const removerMutation = useMutation({
    mutationFn: async (id: string) => {
      return hospedagensApi.remover(colaboradorId, id);
    },
    onSuccess: () => {
      toast.success("Hospedagem removida!");
      queryClient.invalidateQueries({ queryKey: ["hospedagens", colaboradorId] });
    },
    onError: () => toast.error("Erro ao remover hospedagem"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, body: form });
    } else {
      criarMutation.mutate(form);
    }
  };

  const handleEditar = (h: ColaboradorHospedagem) => {
    setEditandoId(h.id!);
    setForm({
      hotel_nome: h.hotel_nome ?? "",
      hotel_endereco: h.hotel_endereco ?? "",
      hotel_telefone: h.hotel_telefone ?? "",
      tipo_apto: h.tipo_apto ?? undefined,
      valor_diaria: h.valor_diaria ?? null,
      qtd_leitos_bloqueados: h.qtd_leitos_bloqueados ?? 0,
      data_bloqueio: h.data_bloqueio ?? "",
      qtd_leitos_disponiveis: h.qtd_leitos_disponiveis ?? 0,
      data_checkin: h.data_checkin ?? "",
      horario_checkin: h.horario_checkin ?? "",
      observacoes: h.observacoes ?? "",
    });
  };

  const handleCancelar = () => {
    setEditandoId(null);
    setForm(EMPTY_HOSPEDAGEM);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const hospedagens = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Hotel className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">Hospedagem</h3>
          <p className="text-sm text-muted-foreground">Gerenciar hospedagens do colaborador</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Hotel</label>
            <Input
              value={form.hotel_nome ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, hotel_nome: e.target.value }))}
              placeholder="Ex: Hotel Ibis"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input
              value={form.hotel_telefone ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, hotel_telefone: e.target.value }))}
              placeholder="(00) 0000-0000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de Apartamento</label>
            <Select
              value={form.tipo_apto ?? undefined}
              onValueChange={(v: "Single" | "Duplo" | "Triplo") =>
                setForm((prev) => ({ ...prev, tipo_apto: v }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Duplo">Duplo</SelectItem>
                <SelectItem value="Triplo">Triplo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Valor da Diária</label>
            <Input
              type="number"
              step="0.01"
              value={form.valor_diaria ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, valor_diaria: e.target.value ? parseFloat(e.target.value) : null }))
              }
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Check-in</label>
            <Input
              type="date"
              value={form.data_checkin ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, data_checkin: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Horário Check-in</label>
            <Input
              type="time"
              value={form.horario_checkin ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, horario_checkin: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Leitos Bloqueados</label>
            <Input
              type="number"
              value={form.qtd_leitos_bloqueados ?? 0}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, qtd_leitos_bloqueados: parseInt(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Bloqueio</label>
            <Input
              type="date"
              value={form.data_bloqueio ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, data_bloqueio: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Leitos Disponíveis</label>
            <Input
              type="number"
              value={form.qtd_leitos_disponiveis ?? 0}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, qtd_leitos_disponiveis: parseInt(e.target.value) || 0 }))
              }
            />
          </div>
          <div className="col-span-full space-y-2">
            <label className="text-sm font-medium">Endereço</label>
            <Input
              value={form.hotel_endereco ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, hotel_endereco: e.target.value }))}
              placeholder="Endereço completo do hotel"
            />
          </div>
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
            {editandoId ? "Atualizar" : "Adicionar"}
          </Button>
          {editandoId && (
            <Button type="button" variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
          )}
        </div>
      </form>

      {hospedagens.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Hotel</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Diária</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hospedagens.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.hotel_nome}</TableCell>
                  <TableCell>{h.tipo_apto}</TableCell>
                  <TableCell>{h.data_checkin}</TableCell>
                  <TableCell>
                    {h.valor_diaria ? `R$ ${h.valor_diaria.toFixed(2)}` : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleEditar(h)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => removerMutation.mutate(h.id!)}
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

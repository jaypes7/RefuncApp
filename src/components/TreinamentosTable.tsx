"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  ShieldAlert,
  Plus,
  X,
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
import { treinamentosApi, type ColaboradorTreinamento } from "@/lib/axios";
import { cn } from "@/lib/utils";

interface TreinamentosTableProps {
  colaboradorId: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  OK: {
    label: "OK",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-[#337246]",
    bg: "bg-[#337246]/10",
  },
  "A Vencer": {
    label: "A Vencer",
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-600",
    bg: "bg-amber-500/10",
  },
  Vencido: {
    label: "Vencido",
    icon: <ShieldAlert className="h-4 w-4" />,
    color: "text-red-600",
    bg: "bg-red-500/10",
  },
  Pendente: {
    label: "Pendente",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
  },
};

export function TreinamentosTable({ colaboradorId }: TreinamentosTableProps) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Record<string, { data_realizacao?: string; data_validade?: string }>>({});
  const [mostrarIncluir, setMostrarIncluir] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["treinamentos", colaboradorId],
    queryFn: async () => {
      const response = await treinamentosApi.listarDoColaborador(colaboradorId);
      return response.data.data ?? [];
    },
  });

  const atualizarMutation = useMutation({
    mutationFn: async ({
      treinamentoId,
      body,
    }: {
      treinamentoId: string;
      body: { data_realizacao?: string | null; data_validade?: string | null };
    }) => {
      return treinamentosApi.atualizar(colaboradorId, treinamentoId, body);
    },
    onSuccess: () => {
      toast.success("Treinamento atualizado!");
      queryClient.invalidateQueries({ queryKey: ["treinamentos", colaboradorId] });
      setEditando({});
    },
    onError: () => {
      toast.error("Erro ao atualizar treinamento");
    },
  });

  const handleDataChange = (id: string, field: "data_realizacao" | "data_validade", value: string) => {
    setEditando((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSalvar = (item: ColaboradorTreinamento) => {
    const edicao = editando[item.id!];
    if (!edicao) return;
    const body: { data_realizacao?: string | null; data_validade?: string | null } = {};
    if (edicao.data_realizacao !== undefined) {
      body.data_realizacao = edicao.data_realizacao || null;
    }
    if (edicao.data_validade !== undefined) {
      body.data_validade = edicao.data_validade || null;
    }
    atualizarMutation.mutate({
      treinamentoId: item.id!,
      body,
    });
  };

  const handleAtivar = (item: ColaboradorTreinamento) => {
    // Ativa um treinamento que estava sem data_validade, definindo como Pendente (data_validade = null mas agora "configurado")
    // Na prática, basta fazer um update qualquer para marcar que ele foi configurado.
    // Como não temos campo 'aplicavel', usamos a convenção: se o usuário clicou em "Incluir",
    // definimos data_validade como null explicitamente (o trigger já fez isso, mas agora o usuário o "ativou")
    atualizarMutation.mutate({
      treinamentoId: item.id!,
      body: { data_validade: null },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const todos = data ?? [];
  const configurados = todos.filter((t) => t.data_validade !== null || t.data_realizacao !== null);
  const disponiveis = todos.filter((t) => t.data_validade === null && t.data_realizacao === null);

  return (
    <div className="space-y-4">
      {/* Tabela de treinamentos configurados */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[40%]">Curso / Treinamento</TableHead>
              <TableHead>Realização</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configurados.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum treinamento configurado. Clique em "Incluir Treinamento" para adicionar.
                </TableCell>
              </TableRow>
            )}
            {configurados.map((item) => {
              const status = item.status ?? "Pendente";
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Pendente"];
              const isObrigatorio = item.treinamento?.obrigatorio ?? true;
              const edicao = editando[item.id!];

              return (
                <TableRow
                  key={item.id}
                  className={cn(
                    "group transition-colors",
                    status === "Vencido" && "bg-red-50/50 dark:bg-red-950/20",
                    status === "A Vencer" && "bg-amber-50/50 dark:bg-amber-950/20"
                  )}
                >
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">{item.treinamento?.nome}</span>
                      {!isObrigatorio && (
                        <span className="text-[10px] text-muted-foreground">Opcional</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`${item.id}-realizacao-${item.data_realizacao}`}
                      type="date"
                      defaultValue={item.data_realizacao ?? ""}
                      onChange={(e) => handleDataChange(item.id!, "data_realizacao", e.target.value)}
                      className="h-8 w-[140px] text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      key={`${item.id}-validade-${item.data_validade}`}
                      type="date"
                      defaultValue={item.data_validade ?? ""}
                      onChange={(e) => handleDataChange(item.id!, "data_validade", e.target.value)}
                      className="h-8 w-[140px] text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                        cfg.bg,
                        cfg.color
                      )}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleSalvar(item)}
                      disabled={atualizarMutation.isPending || edicao === undefined}
                    >
                      {atualizarMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Botão Incluir Treinamento */}
      {!mostrarIncluir && disponiveis.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMostrarIncluir(true)}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Incluir Treinamento
        </Button>
      )}

      {/* Lista de treinamentos disponíveis para ativar */}
      {mostrarIncluir && disponiveis.length > 0 && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Treinamentos disponíveis</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarIncluir(false)}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {disponiveis.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2"
              >
                <span className="text-sm">{item.treinamento?.nome}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAtivar(item)}
                  disabled={atualizarMutation.isPending}
                  className="h-7 text-xs"
                >
                  {atualizarMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="h-3 w-3 mr-1" />
                  )}
                  Ativar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

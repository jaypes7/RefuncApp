"use client";

import { forwardRef, useCallback, useImperativeHandle, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldAlert,
  Plus,
  X,
  PenLine,
  Trash2,
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

export interface TreinamentosTableHandle {
  /** Persiste no banco todas as datas editadas inline ainda não salvas. */
  flushPendingDates: () => Promise<void>;
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

export const TreinamentosTable = forwardRef<TreinamentosTableHandle, TreinamentosTableProps>(
  function TreinamentosTable({ colaboradorId }, ref) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState<Record<string, { data_realizacao?: string; data_validade?: string }>>({});
  const [mostrarIncluir, setMostrarIncluir] = useState(false);
  const [nomeOutros, setNomeOutros] = useState("");
  const [mostrarOutros, setMostrarOutros] = useState(false);

  // Treinamentos vinculados ao colaborador
  const { data: doColaborador, isLoading } = useQuery({
    queryKey: ["treinamentos", colaboradorId],
    queryFn: async () => {
      const response = await treinamentosApi.listarDoColaborador(colaboradorId);
      return response.data.data ?? [];
    },
  });

  // Catálogo completo (para o seletor "Incluir Treinamento")
  const { data: catalogo } = useQuery({
    queryKey: ["treinamentos-catalogo"],
    queryFn: async () => {
      const response = await treinamentosApi.listarCatalogo();
      return response.data.data ?? [];
    },
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["treinamentos", colaboradorId] });
    queryClient.invalidateQueries({ queryKey: ["treinamentos-catalogo"] });
  };

  // Persiste todas as datas editadas inline. Não há botão de salvar próprio:
  // é chamado pelo "Salvar alterações" da página de edição (via ref).
  const flushPendingDates = useCallback(async () => {
    const entries = Object.entries(editando);
    if (entries.length === 0) return;
    await Promise.all(
      entries.map(([itemId, edicao]) => {
        const body: { data_realizacao?: string | null; data_validade?: string | null } = {};
        if (edicao.data_realizacao !== undefined) body.data_realizacao = edicao.data_realizacao || null;
        if (edicao.data_validade !== undefined) body.data_validade = edicao.data_validade || null;
        return treinamentosApi.atualizar(colaboradorId, itemId, body);
      }),
    );
    await queryClient.invalidateQueries({ queryKey: ["treinamentos", colaboradorId] });
    setEditando({});
  }, [editando, colaboradorId, queryClient]);

  useImperativeHandle(ref, () => ({ flushPendingDates }), [flushPendingDates]);

  // Inclui (vincula) um treinamento do catálogo ao colaborador
  const incluirMutation = useMutation({
    mutationFn: async (treinamentoId: string) => {
      return treinamentosApi.adicionarAoColaborador(colaboradorId, treinamentoId);
    },
    onSuccess: () => {
      toast.success("Treinamento incluído!");
      invalidar();
    },
    onError: () => toast.error("Erro ao incluir treinamento."),
  });

  // Remove o vínculo do treinamento com o colaborador
  const removerMutation = useMutation({
    mutationFn: async (item: ColaboradorTreinamento) => {
      return treinamentosApi.removerDoColaborador(colaboradorId, item.id!);
    },
    onSuccess: () => {
      toast.success("Treinamento removido do colaborador.");
      invalidar();
    },
    onError: () => toast.error("Erro ao remover treinamento."),
  });

  // Cria um treinamento personalizado e o inclui no colaborador
  const outrosMutation = useMutation({
    mutationFn: async (nome: string) => {
      const criado = await treinamentosApi.criar(nome);
      const novo = criado.data.data;
      await treinamentosApi.adicionarAoColaborador(colaboradorId, novo.id!);
      return novo;
    },
    onSuccess: (novo) => {
      toast.success(`"${novo.nome}" adicionado ao colaborador.`);
      invalidar();
      setNomeOutros("");
      setMostrarOutros(false);
    },
    onError: () => toast.error("Erro ao adicionar treinamento."),
  });

  const handleDataChange = (id: string, field: "data_realizacao" | "data_validade", value: string) => {
    setEditando((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleAdicionarOutros = () => {
    const nome = nomeOutros.trim();
    if (!nome) return;
    outrosMutation.mutate(nome);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const vinculados = doColaborador ?? [];

  // Incluídos = aplicáveis a este colaborador (independe de datas)
  const incluidos = [...vinculados]
    .filter((t) => t.aplicavel)
    .sort((a, b) => (a.treinamento?.nome ?? "").localeCompare(b.treinamento?.nome ?? ""));

  // Disponíveis para incluir = catálogo que ainda não está incluído
  const idsIncluidos = new Set(incluidos.map((t) => t.treinamento_id));
  const disponiveis = [...(catalogo ?? [])]
    .filter((t) => !idsIncluidos.has(t.id!))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="space-y-4">
      {/* Tabela de treinamentos incluídos */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[38%]">Curso / Treinamento</TableHead>
              <TableHead>Realização</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[90px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incluidos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                  Nenhum treinamento incluído. Clique em &quot;Incluir Treinamento&quot; para adicionar.
                </TableCell>
              </TableRow>
            )}
            {incluidos.map((item) => {
              const status = item.status ?? "Pendente";
              const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["Pendente"];
              const isObrigatorio = item.treinamento?.obrigatorio ?? true;

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
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Remover do colaborador"
                        onClick={() => removerMutation.mutate(item)}
                        disabled={removerMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Ações: Incluir Treinamento + Outros */}
      <div className="flex flex-wrap gap-2">
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
        {!mostrarOutros && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarOutros(true)}
            className="gap-2"
          >
            <PenLine className="h-4 w-4" />
            Outros treinamentos
          </Button>
        )}
      </div>

      {/* Lista de treinamentos disponíveis para incluir */}
      {mostrarIncluir && (
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
          {disponiveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os treinamentos do catálogo já foram incluídos.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {disponiveis.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-sm">{t.nome}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => incluirMutation.mutate(t.id!)}
                    disabled={incluirMutation.isPending}
                    className="h-7 text-xs"
                  >
                    {incluirMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    Incluir
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Outros — adicionar treinamento personalizado */}
      {mostrarOutros && (
        <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Outros treinamentos</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setMostrarOutros(false); setNomeOutros(""); }}
              className="h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Digite o nome do treinamento. Ele será criado no catálogo e incluído neste colaborador. Depois informe as datas na tabela acima.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Nome do treinamento..."
              value={nomeOutros}
              onChange={(e) => setNomeOutros(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdicionarOutros()}
              className="h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAdicionarOutros}
              disabled={!nomeOutros.trim() || outrosMutation.isPending}
              className="shrink-0 gap-1"
            >
              {outrosMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

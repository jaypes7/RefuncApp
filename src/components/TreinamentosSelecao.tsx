"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, GraduationCap, Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { treinamentosApi, type Treinamento } from "@/lib/axios";

export interface TreinamentoSelecionado {
  /** Ausente em treinamentos personalizados ("Outros") ainda não criados no catálogo. */
  treinamento_id?: string;
  /** Nome do treinamento personalizado (usado quando não há treinamento_id). */
  nome?: string;
  data_realizacao?: string;
  data_validade?: string;
}

interface TreinamentosSelecaoProps {
  onChange: (selecionados: TreinamentoSelecionado[]) => void;
}

export function TreinamentosSelecao({ onChange }: TreinamentosSelecaoProps) {
  const [selecionados, setSelecionados] = useState<Record<string, TreinamentoSelecionado>>({});
  const [nomeOutros, setNomeOutros] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["treinamentos-catalogo"],
    queryFn: async () => {
      const response = await treinamentosApi.listarCatalogo();
      return response.data.data ?? [];
    },
  });

  const catalogo = data ?? [];

  // Propaga as seleções para o pai sempre que mudarem (evita setState do pai
  // durante o render de outro componente — anti-padrão do React).
  useEffect(() => {
    onChange(Object.values(selecionados));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionados]);

  const toggleTreinamento = (treinamento: Treinamento, checked: boolean) => {
    setSelecionados((prev) => {
      const next = { ...prev };
      if (checked) {
        next[treinamento.id!] = {
          treinamento_id: treinamento.id!,
        };
      } else {
        delete next[treinamento.id!];
      }
      return next;
    });
  };

  // Adiciona um treinamento personalizado apenas localmente. Ele só é criado no
  // catálogo e vinculado ao colaborador no momento de salvar (evita treinamentos
  // órfãos no catálogo caso o formulário seja abandonado).
  const handleAdicionarOutros = () => {
    const nome = nomeOutros.trim();
    if (!nome) return;
    const key = `outros:${crypto.randomUUID()}`;
    setSelecionados((prev) => ({ ...prev, [key]: { nome } }));
    setNomeOutros("");
  };

  const removerOutros = (key: string) => {
    setSelecionados((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateData = (treinamentoId: string, field: "data_realizacao" | "data_validade", value: string) => {
    setSelecionados((prev) => {
      const item = prev[treinamentoId];
      if (!item) return prev;
      return {
        ...prev,
        [treinamentoId]: { ...item, [field]: value || undefined },
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Treinamentos personalizados ("Outros") ainda sem treinamento_id no catálogo.
  const personalizados = Object.entries(selecionados).filter(([, v]) => !v.treinamento_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <GraduationCap className="h-4 w-4" />
        <span>Marque os treinamentos necessários para este colaborador e informe as datas.</span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {catalogo.map((t) => {
          const selecionado = selecionados[t.id!];
          return (
            <div
              key={t.id}
              className="rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`treinamento-${t.id}`}
                  checked={!!selecionado}
                  onCheckedChange={(checked) => toggleTreinamento(t, checked === true)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={`treinamento-${t.id}`}
                    className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t.nome}
                    {t.obrigatorio && (
                      <span className="ml-2 text-[10px] text-muted-foreground">Obrigatório</span>
                    )}
                  </label>
                  {t.descricao && (
                    <p className="text-xs text-muted-foreground">{t.descricao}</p>
                  )}
                </div>
              </div>

              {selecionado && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 pl-7">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de Realização
                    </label>
                    <Input
                      type="date"
                      value={selecionado.data_realizacao ?? ""}
                      onChange={(e) => updateData(t.id!, "data_realizacao", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de Validade
                    </label>
                    <Input
                      type="date"
                      value={selecionado.data_validade ?? ""}
                      onChange={(e) => updateData(t.id!, "data_validade", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Seção Outros */}
      <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
        <p className="text-sm font-medium">Outros treinamentos</p>
        <p className="text-xs text-muted-foreground">
          Adicione um treinamento que não consta na lista acima. Ele será criado no catálogo e vinculado a este colaborador quando você salvar.
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
            disabled={!nomeOutros.trim()}
            className="shrink-0 gap-1"
          >
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>

        {/* Personalizados adicionados (ainda não criados no catálogo) */}
        {personalizados.length > 0 && (
          <div className="space-y-3 pt-1">
            {personalizados.map(([key, item]) => (
              <div key={key} className="rounded-lg border border-border p-3 bg-muted/20">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{item.nome}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removerOutros(key)}
                    className="h-7 w-7 shrink-0 p-0"
                    title="Remover"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de Realização
                    </label>
                    <Input
                      type="date"
                      value={item.data_realizacao ?? ""}
                      onChange={(e) => updateData(key, "data_realizacao", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Data de Validade
                    </label>
                    <Input
                      type="date"
                      value={item.data_validade ?? ""}
                      onChange={(e) => updateData(key, "data_validade", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

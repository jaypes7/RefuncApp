"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, GraduationCap } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { treinamentosApi, type Treinamento } from "@/lib/axios";

export interface TreinamentoSelecionado {
  treinamento_id: string;
  data_realizacao?: string;
  data_validade?: string;
}

interface TreinamentosSelecaoProps {
  onChange: (selecionados: TreinamentoSelecionado[]) => void;
}

export function TreinamentosSelecao({ onChange }: TreinamentosSelecaoProps) {
  const [selecionados, setSelecionados] = useState<Record<string, TreinamentoSelecionado>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["treinamentos-catalogo"],
    queryFn: async () => {
      const response = await treinamentosApi.listarCatalogo();
      return response.data.data ?? [];
    },
  });

  const catalogo = data ?? [];

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
      onChange(Object.values(next));
      return next;
    });
  };

  const updateData = (treinamentoId: string, field: "data_realizacao" | "data_validade", value: string) => {
    setSelecionados((prev) => {
      const item = prev[treinamentoId];
      if (!item) return prev;
      const next = {
        ...prev,
        [treinamentoId]: { ...item, [field]: value || undefined },
      };
      onChange(Object.values(next));
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
    </div>
  );
}

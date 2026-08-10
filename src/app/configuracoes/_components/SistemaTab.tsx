"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjetos } from "./shared";

export function SistemaTab() {
  const queryClient = useQueryClient();
  const { data: projetosData } = useProjetos();

  // Reset de projeto (centro de custo alvo)
  const [resetCentroCusto, setResetCentroCusto] = useState("");

  const resetProjetoMutation = useMutation({
    mutationFn: async (targetCc: string) => {
      const res = await fetch("/api/config/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centro_custo: targetCc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Falha ao resetar projeto");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"], type: "all" });
      queryClient.invalidateQueries({ queryKey: ["dashboard-principal"], type: "all" });
      toast.success("Projeto resetado com sucesso! Recarregando página...");
      setTimeout(() => window.location.reload(), 2000);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        Resetar Projeto
      </h3>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100">
              ⚠️ Esta ação é irreversível
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Resetar o projeto limpará os dados operacionais <strong>apenas do centro de custo selecionado</strong>{" "}
              (colaboradores, logística, segurança e suprimentos). As seguintes informações serão mantidas:
            </p>
            <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc list-inside space-y-1 ml-2">
              <li>Centros de custo e configurações do projeto</li>
              <li>Cadastro de hotéis e clínicas</li>
              <li>Etapas do cronograma</li>
              <li>Usuários permitidos (acessos)</li>
              <li>Logs de auditoria (histórico de ações)</li>
            </ul>
          </div>

          <div className="space-y-2 max-w-md">
            <label className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Centro de custo a resetar
            </label>
            <Select
              value={resetCentroCusto}
              onValueChange={(v) => setResetCentroCusto(v)}
            >
              <SelectTrigger className="w-full bg-white dark:bg-background">
                <SelectValue placeholder="Selecione um centro de custo" />
              </SelectTrigger>
              <SelectContent>
                {(projetosData || []).map((p) => (
                  <SelectItem key={p.centro_custo} value={p.centro_custo}>
                    {p.centro_custo}
                    {p.nome_cliente ? ` — ${p.nome_cliente}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => {
              if (!resetCentroCusto) return;
              if (
                confirm(
                  `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL e limpará todos os dados operacionais do centro de custo ${resetCentroCusto}.\n\n` +
                  "Tem certeza que deseja continuar?\n\n" +
                  "Digite 'CONFIRMAR' para prosseguir.",
                )
              ) {
                resetProjetoMutation.mutate(resetCentroCusto);
              }
            }}
            disabled={!resetCentroCusto || resetProjetoMutation.isPending}
            variant="destructive"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="w-4 h-4" />
            {resetProjetoMutation.isPending ? "Resetando..." : "Resetar Projeto"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

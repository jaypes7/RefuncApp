"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Settings } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useFilter } from "@/contexts/FilterContext";

type LogEntry = {
  id: string;
  usuario: string;
  acao: string;
  detalhes: string;
  timestamp: string;
};

const getAcaoBadgeVariant = (acao: string) => {
  const upperAcao = acao.toUpperCase();
  if (upperAcao.includes("ADICIONAR") || upperAcao.includes("CRIAR"))
    return "default";
  if (upperAcao.includes("EDITAR") || upperAcao.includes("ATUALIZAR"))
    return "secondary";
  if (
    upperAcao.includes("REMOVER") ||
    upperAcao.includes("EXCLUIR") ||
    upperAcao.includes("DELETAR")
  )
    return "destructive";
  if (upperAcao.includes("IMPORTAR")) return "outline";
  if (upperAcao.includes("LOGIN")) return "default";
  return "secondary";
};

export function LogsTab() {
  const { isReady: filterReady } = useFilter();

  const { data: logsResponse } = useQuery<{ data: LogEntry[] }>({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Falha ao carregar logs");
      return res.json();
    },
    enabled: filterReady,
  });

  const logs = logsResponse?.data ?? [];

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Logs do Sistema
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualize o histórico de ações realizadas no sistema
        </p>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p>Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-125 overflow-y-auto">
            {logs.map((log, index) => (
              <div
                key={log.id || index}
                className="flex items-center gap-4 p-3 bg-card/50 rounded-lg border border-border/50"
              >
                <div className="text-xs text-muted-foreground w-32 shrink-0">
                  {new Date(log.timestamp).toLocaleString("pt-BR")}
                </div>

                <Badge
                  variant={getAcaoBadgeVariant(log.acao)}
                  className="w-24 shrink-0 justify-center"
                >
                  {log.acao}
                </Badge>

                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground">
                    {log.usuario}
                  </span>
                  <span className="text-sm text-muted-foreground truncate block">
                    {" "}
                    — {log.detalhes}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

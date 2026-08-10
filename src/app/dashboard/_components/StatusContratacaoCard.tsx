"use client";

import { memo, useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { DashboardPrincipalData } from "@/lib/axios";
import { MANSERV_CHART, MANSERV_STATUS } from "@/lib/chart-colors";

const chartConfigStatus = {
  ativo: {
    label: "Ativo",
    color: MANSERV_CHART.primary,
  },
  desistente: {
    label: "Desistente",
    color: MANSERV_CHART.gray,
  },
  pendente: {
    label: "Pendente",
    color: MANSERV_STATUS.warning,
  },
  desligado: {
    label: "Desligado",
    color: MANSERV_STATUS.danger,
  },
  restricaoCliente: {
    label: "Restrição Cliente",
    color: "#8B5CF6",
  },
};

export const StatusContratacaoCard = memo(function StatusContratacaoCard({
  statusCount,
}: {
  statusCount: DashboardPrincipalData["graficos"]["statusCount"] | undefined;
}) {
  // Dados para gráfico de rosca (Status) — inclui Desligado
  const dadosStatus = useMemo(() => {
    if (!statusCount) return [];

    const { Ativo, Desistente, Pendente, Desligado } = statusCount;
    const restricaoCliente = statusCount["Restrição Cliente"];

    return [
      { name: "Ativo", value: Ativo || 0, color: "#ff460a" },
      { name: "Desistente", value: Desistente || 0, color: "#e2e2e2" },
      { name: "Pendente", value: Pendente || 0, color: "#E5CF61" },
      { name: "Desligado", value: Desligado || 0, color: "#DA291B" },
      { name: "Restrição Cliente", value: restricaoCliente || 0, color: "#8B5CF6" },
    ];
  }, [statusCount]);

  return (
    <Card data-cardtv-id="geral-status-contratacao" className="glass-card">
      <CardHeader>
        <CardTitle>Status Contratação</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfigStatus} className="h-[260px] 2xl:h-[340px] w-full">
          <PieChart>
            <Pie
              data={dadosStatus}
              cx="50%"
              cy="50%"
              innerRadius="30%"
              outerRadius="65%"
              paddingAngle={5}
              dataKey="value"
            >
              {dadosStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
        {/* Números absolutos por status */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dadosStatus.map((s) => (
            <div
              key={s.name}
              className="flex flex-col items-center rounded-lg border border-white/5 bg-white/5 px-3 py-3"
            >
              <span
                className="big-number text-[40px]"
                style={{ color: s.color }}
              >
                {s.value}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">
                {s.name}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

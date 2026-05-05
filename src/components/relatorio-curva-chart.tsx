"use client";

/**
 * RelatorioCurvaChart
 * ─────────────────────────────────────────────────────────────────────────────
 * Gráfico da Curva S (planejado vs realizado) para inclusão no relatório
 * executivo. Versão simplificada e auto-contida do gráfico do dashboard.
 *
 * Renderiza um AreaChart com Recharts usando os dados da API
 * /api/dashboard/principal.
 */

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceDot,
} from "recharts";

export type CurvaSData = {
  labels: string[];
  planejado: (number | null)[];
  realizado: (number | null)[];
};

interface RelatorioCurvaChartProps {
  data: CurvaSData;
  valoresHoje?: { planejado: number; realizado: number } | null;
  className?: string;
}

export function RelatorioCurvaChart({ data, valoresHoje, className }: RelatorioCurvaChartProps) {
  const chartData = useMemo(() => {
    const { labels, planejado, realizado } = data;
    const d = labels.map((mes, index) => ({
      mes,
      previsto: planejado[index] ?? undefined,
      realizado: realizado?.[index] ?? undefined,
    }));

    // Forward-fill previsto
    let lastPrevisto: number | undefined;
    for (const point of d) {
      if (point.previsto != null) {
        lastPrevisto = point.previsto;
      } else if (lastPrevisto != null) {
        point.previsto = lastPrevisto;
      }
    }

    return d;
  }, [data]);

  const xAxisTicks = useMemo(() => {
    if (chartData.length === 0) return [];
    const step = Math.max(1, Math.floor(chartData.length / 8));
    const lastIdx = chartData.length - 1;
    const ticks: string[] = [chartData[0].mes];
    for (let i = step; i <= lastIdx - step; i += step) {
      ticks.push(chartData[i].mes);
    }
    ticks.push(chartData[lastIdx].mes);
    return [...new Set(ticks)];
  }, [chartData]);

  const hasRealizado = useMemo(
    () => chartData.some((d) => d.realizado != null && d.realizado > 0),
    [chartData]
  );

  // Último ponto com dados reais para o ReferenceDot
  const ultimoPontoReal = useMemo(() => {
    if (!hasRealizado) return null;
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i].realizado != null) {
        return { index: i, x: chartData[i].mes, y: chartData[i].realizado as number };
      }
    }
    return null;
  }, [chartData, hasRealizado]);

  if (chartData.length === 0) {
    return (
      <div className={`flex h-[300px] items-center justify-center text-sm text-gray-500 ${className ?? ""}`}>
        Dados da curva de avanço não disponíveis.
      </div>
    );
  }

  return (
    <div className={`w-full ${className ?? ""}`}>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="gradPlanejado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradRealizado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DA291B" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#DA291B" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

          <XAxis
            dataKey="mes"
            tick={{ fill: "#374151", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            ticks={xAxisTicks}
            interval={0}
          />
          <YAxis
            tick={{ fill: "#374151", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            label={{
              value: "Progresso (%)",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fill: "#374151", fontSize: 11 },
            }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === "previsto" ? "Planejado" : "Realizado",
            ]}
          />

          <Legend
            formatter={(value: string) =>
              value === "previsto" ? "Planejado" : "Realizado"
            }
            wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
          />

          <Area
            type="monotone"
            dataKey="previsto"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="6 3"
            fill="url(#gradPlanejado)"
            dot={false}
            activeDot={{ r: 4, fill: "#9ca3af" }}
          />

          {hasRealizado && (
            <Area
              type="monotone"
              dataKey="realizado"
              stroke="#DA291B"
              strokeWidth={2.5}
              fill="url(#gradRealizado)"
              dot={false}
              activeDot={{ r: 5, fill: "#DA291B", stroke: "#fff", strokeWidth: 2 }}
            />
          )}

          {/* Destaque do último ponto real (dia atual) */}
          {ultimoPontoReal && (
            <ReferenceDot
              x={ultimoPontoReal.x}
              y={ultimoPontoReal.y}
              r={6}
              fill="#DA291B"
              stroke="#fff"
              strokeWidth={2}
              label={{
                value: `${ultimoPontoReal.y.toFixed(1)}%`,
                position: "top",
                fill: "#1f2937",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

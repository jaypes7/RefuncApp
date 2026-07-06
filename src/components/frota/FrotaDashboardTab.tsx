"use client";

import { useQuery } from "@tanstack/react-query";
import { Car, Wrench, CreditCard, Tag as TagIcon, CalendarClock, CircleCheck, CircleOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { frotaApi } from "@/lib/axios";
import { formatDate } from "@/components/frota/frota-utils";

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="glass-card flex items-start gap-3 rounded-md px-4 py-3.5">
      <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accent ?? "bg-primary/10 text-primary")}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold leading-tight text-foreground">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function DistribuicaoCard({ title, items }: { title: string; items: Array<{ nome: string; total: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.total));
  return (
    <div className="glass-card rounded-md px-4 py-3.5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item) => (
            <div key={item.nome} className="flex items-center gap-2">
              <span className="w-40 shrink-0 truncate text-xs text-foreground/80" title={item.nome}>{item.nome}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(item.total / max) * 100}%` }} />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold">{item.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FrotaDashboardTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["frota-dashboard"],
    queryFn: async () => {
      const res = await frotaApi.dashboard();
      return res.data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-md" />
        ))}
      </div>
    );
  }

  const status = Object.fromEntries(data.veiculos.porStatus.map((s) => [s.nome, s.total]));

  return (
    <div className="flex flex-col gap-4">
      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={Car} label="Total de veículos" value={data.veiculos.total} />
        <KpiCard
          icon={CircleCheck}
          label="Ativos"
          value={status["ATIVO"] ?? 0}
          accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
        />
        <KpiCard
          icon={Wrench}
          label="Em manutenção"
          value={status["MANUTENÇÃO"] ?? 0}
          accent="bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
        />
        <KpiCard
          icon={CircleOff}
          label="Inativos"
          value={status["INATIVO"] ?? 0}
          accent="bg-muted text-muted-foreground"
        />
        <KpiCard icon={CreditCard} label="Cartões combustível" value={data.cartoes.total} hint={`${data.cartoes.estoque} em estoque • ${data.cartoes.ativos} ativos`} />
        <KpiCard icon={TagIcon} label="Tags de pedágio" value={data.tags.total} hint={`${data.tags.vinculadas} vinculadas a veículos`} />
        <KpiCard
          icon={CalendarClock}
          label="Revisões em 30 dias"
          value={data.revisoesProximas.length}
          hint={`${data.revisoesProximas.filter((r) => r.vencida).length} vencidas`}
          accent={data.revisoesProximas.some((r) => r.vencida)
            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
            : undefined}
        />
      </div>

      {/* Distribuições */}
      <div className="grid gap-4 xl:grid-cols-2">
        <DistribuicaoCard title="Veículos ativos por tipo" items={data.veiculos.porTipo} />
        <DistribuicaoCard title="Veículos ativos por locadora" items={data.veiculos.porPropriedade} />
      </div>

      {/* Revisões próximas */}
      <div className="glass-card w-full overflow-hidden rounded-md">
        <div className="border-b px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Revisões previstas (veículos ativos, próximos 30 dias)
          </p>
        </div>
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-transparent">
              <TableHead className="pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Placa</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Previsão</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KM previsto</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Último serviço</TableHead>
              <TableHead className="pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.revisoesProximas.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma revisão prevista para os próximos 30 dias.
                </TableCell>
              </TableRow>
            ) : (
              data.revisoesProximas.map((r) => (
                <TableRow key={r.placa} className="transition-colors hover:bg-muted/50">
                  <TableCell className="py-2.5 pl-4">
                    <span className="font-mono font-medium">{r.placa}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-sm">{formatDate(r.previsao)}</span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <span className="text-sm text-muted-foreground">
                      {r.km_proxima_revisao != null ? `${r.km_proxima_revisao.toLocaleString("pt-BR")} km` : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 max-w-72">
                    <span className="block truncate text-sm text-muted-foreground" title={r.descricao ?? undefined}>
                      {r.descricao || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 pr-4">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      r.vencida
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                    )}>
                      {r.vencida ? "VENCIDA" : "PRÓXIMA"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

"use client";

import { Fragment, useMemo } from "react";
import { ChevronDown, FolderOpen, AlertTriangle, Clock, TrendingUp } from "lucide-react";
import type { DashboardPrincipalData, ConfigData, GrupoEtapa } from "@/lib/axios";

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDayNum(iso: string): string {
  return String(new Date(iso + "T00:00:00Z").getUTCDate());
}

function fmtMonthYear(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function isEtapaAtrasada(
  etapa: DashboardPrincipalData["etapas"][number],
  hoje: string
): boolean {
  if (etapa.dataFim && hoje > etapa.dataFim && etapa.percentualConcluido < 100)
    return true;
  if (etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0) {
    let lastIdx = -1;
    for (let i = 0; i < etapa.evolucaoDiaria.length; i++) {
      if (etapa.evolucaoDiaria[i].data <= hoje) lastIdx = i;
      else break;
    }
    if (lastIdx !== -1) {
      return (
        etapa.evolucaoDiaria[lastIdx].realizado <
        etapa.evolucaoDiaria[lastIdx].previsto
      );
    }
  }
  return false;
}

// ── sticky column layout ──────────────────────────────────────────────────────
//
// IMPORTANT: position:sticky on <td>/<th> requires the table to use
// border-separate (NOT border-collapse), otherwise browsers ignore sticky.
// All sticky cells must also have an opaque background so scrolled content
// does not bleed through.
//
const W_NUM    = 36;
const W_ETAPA  = 180;
const W_RESP   = 80;
const W_STATUS = 56;
const W_LABEL  = 28;
const W_DAY    = 32;

const LEFT_NUM    = 0;
const LEFT_ETAPA  = LEFT_NUM    + W_NUM;
const LEFT_RESP   = LEFT_ETAPA  + W_ETAPA;
const LEFT_STATUS = LEFT_RESP   + W_RESP;
const LEFT_LABEL  = LEFT_STATUS + W_STATUS;
const TOTAL_FIXED = LEFT_LABEL  + W_LABEL;

// Opaque backgrounds for sticky cells (CSS custom properties resolve in browser)
const BG_BASE   = "hsl(var(--background))";
const BG_MUTED  = "hsl(var(--muted))";
// P-row tinted: mix background with blue
const BG_P_TINT = "color-mix(in srgb, hsl(var(--background)) 88%, #3b82f6 12%)";

// ── types ─────────────────────────────────────────────────────────────────────

type EvolEntry = { data: string; previsto: number; realizado: number };

type Props = {
  etapas: DashboardPrincipalData["etapas"];
  etapasPorGrupo: {
    grupos: GrupoEtapa[];
    byGrupo: Map<number | null, DashboardPrincipalData["etapas"]>;
  } | null;
  configData: ConfigData | undefined;
  collapsedGrupos: Set<number>;
  onToggleGrupo: (id: number) => void;
};

// ── component ─────────────────────────────────────────────────────────────────

export function GanttCronograma({
  etapas,
  etapasPorGrupo,
  configData,
  collapsedGrupos,
  onToggleGrupo,
}: Props) {
  const hoje = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Collect every planned day plus manually selected delay days across all etapas.
  const allDays = useMemo<string[]>(() => {
    const s = new Set<string>();
    for (const e of etapas) {
      for (const d of e.evolucaoDiaria ?? []) s.add(d.data);
      for (const d of e.datasAdiantamento ?? []) s.add(d);
      for (const d of e.datasAtraso ?? []) s.add(d);
    }
    return [...s].sort();
  }, [etapas]);

  // Group days by month for the 2-row header
  const monthGroups = useMemo(() => {
    const groups: { label: string; days: string[] }[] = [];
    for (const day of allDays) {
      const label = fmtMonthYear(day);
      const last = groups[groups.length - 1];
      if (!last || last.label !== label) groups.push({ label, days: [day] });
      else last.days.push(day);
    }
    return groups;
  }, [allDays]);

  const TOTAL_COLS = 5 + allDays.length;

  // etapa id → responsavel
  const respMap = useMemo(() => {
    const m = new Map<number, string | null | undefined>();
    for (const e of configData?.ETAPAS_PROJETO ?? []) m.set(e.id, e.responsavel);
    return m;
  }, [configData]);

  // Today's P/R for the STATUS column
  const calcTodayPR = (etapa: DashboardPrincipalData["etapas"][number]) => {
    let previsto = 0, realizado = 0;
    if (etapa.evolucaoDiaria && etapa.evolucaoDiaria.length > 0) {
      let idx = -1;
      for (let i = 0; i < etapa.evolucaoDiaria.length; i++) {
        if (etapa.evolucaoDiaria[i].data <= hoje) idx = i;
        else break;
      }
      if (idx !== -1) {
        previsto  = etapa.evolucaoDiaria[idx].previsto;
        realizado = etapa.evolucaoDiaria[idx].realizado;
      }
    } else if (
      (etapa.dataFim && hoje >= etapa.dataFim) ||
      etapa.concluida ||
      etapa.percentualConcluido >= 100
    ) {
      previsto  = etapa.percentualConcluido ?? 0;
      realizado = etapa.percentualConcluido ?? 0;
    }
    return { previsto: Math.round(previsto), realizado: Math.round(realizado) };
  };

  // Render 2 rows (P + R) for one etapa
  const renderEtapaRows = (
    etapa: DashboardPrincipalData["etapas"][number],
    idx: number
  ) => {
    const evolMap = new Map<string, EvolEntry>(
      (etapa.evolucaoDiaria ?? []).map((d) => [d.data, d])
    );
    const adiantamentoDaysSet = new Set(etapa.datasAdiantamento ?? []);
    const atrasoDaysSet = new Set(etapa.datasAtraso ?? []);
    const { previsto: pToday, realizado: rToday } = calcTodayPR(etapa);
    const resp     = respMap.get(etapa.id) ?? "—";
    const atrasada = isEtapaAtrasada(etapa, hoje);

    // Shared style for sticky cells — MUST be opaque
    const stickyStyle = (left: number, width: number, bg = BG_BASE): React.CSSProperties => ({
      position: "sticky",
      left,
      width,
      minWidth: width,
      background: bg,
      zIndex: 10,
    });

    const borderB = "border-b border-border";

    return (
      <Fragment key={etapa.id}>
        {/* ── P row ── */}
        <tr>
          {/* Nº — rowSpan 2 */}
          <td
            className={`${borderB} text-xs text-muted-foreground font-mono text-center align-middle`}
            style={stickyStyle(LEFT_NUM, W_NUM)}
            rowSpan={2}
          >
            {idx + 1}
          </td>
          {/* Etapa name — rowSpan 2 */}
          <td
            className={`${borderB} px-2 align-middle`}
            style={stickyStyle(LEFT_ETAPA, W_ETAPA)}
            rowSpan={2}
          >
            <div className="flex items-start gap-1">
              {atrasada && (
                <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium leading-tight line-clamp-2">
                  {etapa.nome}
                </span>
                {etapa.diasExtras != null && etapa.diasExtras > 0 && (
                  <span
                    title={etapa.motivoAtraso ?? undefined}
                    className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-1 py-0.5 leading-none w-fit cursor-default"
                  >
                    <Clock className="w-2 h-2 shrink-0" />
                    +{etapa.diasExtras}d atraso
                  </span>
                )}
                {etapa.diasAdiantados != null && etapa.diasAdiantados > 0 && (
                  <span
                    title={etapa.motivoAdiantamento ?? undefined}
                    className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#337246] bg-[#337246]/10 border border-[#337246]/30 rounded px-1 py-0.5 leading-none w-fit cursor-default"
                  >
                    <TrendingUp className="w-2 h-2 shrink-0" />
                    +{etapa.diasAdiantados}d adiant.
                  </span>
                )}
              </div>
            </div>
          </td>
          {/* Resp — rowSpan 2 */}
          <td
            className={`${borderB} px-2 align-middle text-[10px] text-muted-foreground`}
            style={stickyStyle(LEFT_RESP, W_RESP)}
            rowSpan={2}
          >
            <span className="line-clamp-2">{resp}</span>
          </td>
          {/* STATUS — P value */}
          <td
            className={`${borderB} text-center align-middle`}
            style={stickyStyle(LEFT_STATUS, W_STATUS, BG_P_TINT)}
          >
            <span className="text-[10px] font-mono font-semibold text-blue-700 dark:text-blue-300">
              {pToday}%
            </span>
          </td>
          {/* P/R label — P */}
          <td
            className={`${borderB} text-center align-middle`}
            style={stickyStyle(LEFT_LABEL, W_LABEL, BG_P_TINT)}
          >
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">P</span>
          </td>
          {/* Day cells — P */}
          {allDays.map((day) => {
            const entry   = evolMap.get(day);
            const isToday = day === hoje;
            if (!entry) {
              return (
                <td
                  key={day}
                  className={`border-b border-l border-border/60 ${isToday ? "ring-inset ring-1 ring-primary/50 bg-primary/5" : ""}`}
                  style={{ width: W_DAY, minWidth: W_DAY, height: 26, padding: 0 }}
                />
              );
            }
            const pVal = Math.round(entry.previsto);
            return (
              <td
                key={day}
                className={`border-b border-l border-border/60 text-center ${isToday ? "ring-inset ring-1 ring-primary/50" : ""}`}
                style={{
                  width: W_DAY,
                  minWidth: W_DAY,
                  height: 26,
                  padding: 0,
                  backgroundColor: `rgba(59,130,246,${0.15 + (entry.previsto / 100) * 0.65})`,
                }}
              >
                <span className="text-[11px] font-mono leading-none text-black-100 dark:text-white select-none">
                  {pVal}%
                </span>
              </td>
            );
          })}
        </tr>

        {/* ── R row ── */}
        <tr>
          {/* STATUS — R value */}
          <td
            className="border-b border-border text-center align-middle"
            style={stickyStyle(LEFT_STATUS, W_STATUS)}
          >
            <span className="text-[10px] font-mono font-semibold text-[#DA291B]">
              {rToday}%
            </span>
          </td>
          {/* P/R label — R */}
          <td
            className="border-b border-border text-center align-middle"
            style={stickyStyle(LEFT_LABEL, W_LABEL)}
          >
            <span className="text-[10px] font-bold text-[#DA291B]">R</span>
          </td>
          {/* Day cells — R */}
          {allDays.map((day) => {
            const entry    = evolMap.get(day);
            const isToday  = day === hoje;
            const isFuture = day > hoje;
            const isEarlyDay = adiantamentoDaysSet.has(day);
            const isDelayDay = atrasoDaysSet.has(day);
            if (!entry || isFuture) {
              return (
                <td
                  key={day}
                  className={`border-b border-l ${
                    isEarlyDay
                      ? "border-[#337246]/40"
                      : isDelayDay
                      ? "border-amber-500/40"
                      : "border-border"
                  } ${isToday && !isDelayDay && !isEarlyDay ? "ring-inset ring-1 ring-primary/50 bg-primary/5" : ""}`}
                  style={{
                    width: W_DAY,
                    minWidth: W_DAY,
                    height: 26,
                    padding: 0,
                    backgroundColor: isEarlyDay
                      ? "rgba(51,114,70,0.24)"
                      : isDelayDay
                      ? "rgba(245,158,11,0.24)"
                      : undefined,
                  }}
                  title={isEarlyDay ? "Dia de adiantamento" : isDelayDay ? "Dia extra de atraso" : undefined}
                />
              );
            }
            const rVal        = Math.round(entry.realizado);
            const hasProgress = entry.realizado > 0;
            return (
              <td
                key={day}
                className={`border-b border-l border-border text-center ${isToday ? "ring-inset ring-1 ring-primary/50" : ""}`}
                style={{
                  width: W_DAY,
                  minWidth: W_DAY,
                  height: 26,
                  padding: 0,
                  backgroundColor: isEarlyDay
                    ? "rgba(51,114,70,0.24)"
                    : isDelayDay
                    ? "rgba(245,158,11,0.24)"
                    : hasProgress
                    ? `rgba(218,41,27,${0.15 + (entry.realizado / 100) * 0.65})`
                    : "rgba(0,0,0,0.03)",
                }}
                title={isEarlyDay ? "Dia de adiantamento" : isDelayDay ? "Dia extra de atraso" : undefined}
              >
                <span
                  className="text-[11px] font-mono leading-none select-none text-black-100 dark:text-white-100"
                >
                  {rVal}%
                </span>
              </td>
            );
          })}
        </tr>
      </Fragment>
    );
  };

  if (allDays.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground text-center">
        Nenhum dado de evolução diária disponível.
      </div>
    );
  }

  const renderGroupHeader = (
    nome: string,
    count: number,
    collapsed: boolean,
    onToggle: () => void
  ) => (
    <tr
      className="cursor-pointer select-none hover:brightness-95 transition-all"
      style={{ background: "#FFC000" }}
      onClick={onToggle}
    >
      {/*
        Split into two cells so sticky works reliably:
        - First cell (colSpan=5) is sticky and holds the title.
        - Second cell fills the day columns with the same orange bg.
        A single <td colSpan={TOTAL_COLS}> with sticky does not anchor
        reliably across browsers when the colspan is very wide.
      */}
      <td
        colSpan={5}
        style={{
          position: "sticky",
          left: 0,
          zIndex: 15,
          background: "#FFC000",
          width: TOTAL_FIXED,
          minWidth: TOTAL_FIXED,
          padding: "6px 12px",
        }}
      >
        <div className="flex items-center gap-2 text-white">
          <ChevronDown
            className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
          />
          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">{nome}</span>
          <span className="text-[11px] font-normal opacity-80 shrink-0 pr-1">
            {count} etapa{count !== 1 ? "s" : ""}
          </span>
        </div>
      </td>
      {/* Fills the day-columns area with the same orange */}
      <td
        colSpan={allDays.length}
        style={{ background: "#FFC000", padding: 0 }}
      />
    </tr>
  );

  return (
    <div className="overflow-x-auto rounded-b-xl">
      {/*
        CRITICAL: borderCollapse must be "separate" (not "collapse") for
        position:sticky to work on <td>/<th> in Chrome, Safari and Firefox.
        borderSpacing:0 restores the "collapsed" visual appearance.
      */}
      <table
        style={{
          minWidth: TOTAL_FIXED + allDays.length * W_DAY,
          borderCollapse: "separate",
          borderSpacing: 0,
        }}
      >
        {/* ── Header (sticky top) ── */}
        <thead style={{ position: "sticky", top: 0, zIndex: 20 }}>
          {/* Month row */}
          <tr style={{ background: BG_MUTED }}>
            <th
              className="border-b border-border text-left px-2 py-1.5"
              colSpan={5}
              style={{
                position: "sticky",
                left: 0,
                zIndex: 21,
                width: TOTAL_FIXED,
                minWidth: TOTAL_FIXED,
                background: BG_MUTED,
              }}
            >
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Etapa
              </span>
            </th>
            {monthGroups.map((mg) => (
              <th
                key={mg.label}
                colSpan={mg.days.length}
                className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide border-b border-l border-border px-1 py-1.5"
                style={{ minWidth: mg.days.length * W_DAY }}
              >
                {mg.label}
              </th>
            ))}
          </tr>
          {/* Day row */}
          <tr style={{ background: BG_MUTED }}>
            {/* Nº */}
            <th
              className="border-b border-border text-center py-1"
              style={{ position: "sticky", left: LEFT_NUM, width: W_NUM, minWidth: W_NUM, zIndex: 21, background: BG_MUTED }}
            >
              <span className="text-[9px] font-semibold text-muted-foreground">Nº</span>
            </th>
            {/* Etapa */}
            <th
              className="border-b border-border text-left px-2 py-1"
              style={{ position: "sticky", left: LEFT_ETAPA, width: W_ETAPA, minWidth: W_ETAPA, zIndex: 21, background: BG_MUTED }}
            >
              <span className="text-[9px] font-semibold text-muted-foreground">Etapa</span>
            </th>
            {/* Resp */}
            <th
              className="border-b border-border text-left px-2 py-1"
              style={{ position: "sticky", left: LEFT_RESP, width: W_RESP, minWidth: W_RESP, zIndex: 21, background: BG_MUTED }}
            >
              <span className="text-[9px] font-semibold text-muted-foreground">Resp.</span>
            </th>
            {/* STATUS */}
            <th
              className="border-b border-border text-center py-1"
              style={{ position: "sticky", left: LEFT_STATUS, width: W_STATUS, minWidth: W_STATUS, zIndex: 21, background: BG_MUTED }}
            >
              <span className="text-[9px] font-semibold text-muted-foreground">STATUS</span>
            </th>
            {/* P/R */}
            <th
              className="border-b border-border text-center py-1"
              style={{ position: "sticky", left: LEFT_LABEL, width: W_LABEL, minWidth: W_LABEL, zIndex: 21, background: BG_MUTED }}
            >
              <span className="text-[9px] font-semibold text-muted-foreground">P/R</span>
            </th>
            {/* Day headers */}
            {allDays.map((day) => {
              const isToday = day === hoje;
              return (
                <th
                  key={day}
                  className={`border-b border-l border-border/50 text-center py-0.5 ${
                    isToday ? "text-primary font-bold" : "text-muted-foreground"
                  }`}
                  style={{
                    width: W_DAY,
                    minWidth: W_DAY,
                    background: isToday ? "color-mix(in srgb, hsl(var(--primary)) 20%, hsl(var(--muted)) 80%)" : BG_MUTED,
                  }}
                >
                  <span className="text-[11px] font-mono leading-none block">
                    {fmtDayNum(day)}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {etapasPorGrupo ? (
            <>
              {etapasPorGrupo.grupos.map((grupo) => {
                const etapasDoGrupo = etapasPorGrupo.byGrupo.get(grupo.id) ?? [];
                if (etapasDoGrupo.length === 0) return null;
                const collapsed = collapsedGrupos.has(grupo.id);
                return (
                  <Fragment key={grupo.id}>
                    {renderGroupHeader(grupo.nome, etapasDoGrupo.length, collapsed, () =>
                      onToggleGrupo(grupo.id)
                    )}
                    {!collapsed && etapasDoGrupo.map((etapa, idx) => renderEtapaRows(etapa, idx))}
                  </Fragment>
                );
              })}
              {(() => {
                const semGrupo = etapasPorGrupo.byGrupo.get(null) ?? [];
                if (semGrupo.length === 0) return null;
                return (
                  <Fragment>
                    <tr style={{ background: BG_MUTED }}>
                      <td
                        colSpan={5}
                        className="py-1 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 11,
                          background: BG_MUTED,
                          width: TOTAL_FIXED,
                          minWidth: TOTAL_FIXED,
                        }}
                      >
                        Sem grupo
                      </td>
                      <td colSpan={allDays.length} style={{ background: BG_MUTED, padding: 0 }} />
                    </tr>
                    {semGrupo.map((etapa, idx) => renderEtapaRows(etapa, idx))}
                  </Fragment>
                );
              })()}
            </>
          ) : (
            etapas.map((etapa, idx) => renderEtapaRows(etapa, idx))
          )}
        </tbody>
      </table>
    </div>
  );
}

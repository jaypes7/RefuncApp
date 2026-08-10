"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Minus,
  Pencil,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getDaysInRange,
  legacyAdiantamentoDates,
  legacyAtrasoDates,
  formatDatePtBr,
  sortUniqueDates,
  type AdiantamentoEntry,
  type AtrasoEntry,
  type EtapaCronograma,
  type EtapaDateError,
} from "./helpers";

type Props = {
  etapa: EtapaCronograma;
  globalIndex: number;
  isFirst: boolean;
  isLast: boolean;
  dateError: EtapaDateError | undefined;
  peso: { inicio: number; fim: number } | undefined;
  datas: { calendarDays: number; workingDays: number } | undefined;
  selected: boolean;
  isSaving: boolean;
  /** false quando o projeto ainda não tem datas de início/fim configuradas */
  projetoDatasDefinidas: boolean;
  isEditingNome: boolean;
  editingNome: string;
  atraso: AtrasoEntry | undefined;
  adiantamento: AdiantamentoEntry | undefined;
  expanded: boolean;
  diasTrabalhados: string[] | undefined;
  progresso: Record<string, number | null>;
  isExcluindoAtraso: boolean;
  isExcluindoAdiantamento: boolean;
  onToggleSelect: () => void;
  onIniciarEdicaoNome: () => void;
  onEditingNomeChange: (nome: string) => void;
  onSalvarNome: () => void;
  onCancelarNome: () => void;
  onToggleConcluida: (concluida: boolean) => void;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
  onChangeDataInicio: (data: string) => void;
  onChangeDataFim: (data: string) => void;
  onChangeResponsavel: (responsavel: string) => void;
  onAbrirAtraso: () => void;
  onAbrirAdiantamento: () => void;
  onExcluirAtraso: () => void;
  onExcluirAdiantamento: () => void;
  onToggleExpanded: () => void;
  onProgressoDiarioChange: (data: string, percentual: number | null) => void;
};

export function EtapaCard({
  etapa,
  globalIndex,
  isFirst,
  isLast,
  dateError,
  peso,
  datas,
  selected,
  isSaving,
  projetoDatasDefinidas,
  isEditingNome,
  editingNome,
  atraso,
  adiantamento,
  expanded,
  diasTrabalhados,
  progresso,
  isExcluindoAtraso,
  isExcluindoAdiantamento,
  onToggleSelect,
  onIniciarEdicaoNome,
  onEditingNomeChange,
  onSalvarNome,
  onCancelarNome,
  onToggleConcluida,
  onMove,
  onRemove,
  onChangeDataInicio,
  onChangeDataFim,
  onChangeResponsavel,
  onAbrirAtraso,
  onAbrirAdiantamento,
  onExcluirAtraso,
  onExcluirAdiantamento,
  onToggleExpanded,
  onProgressoDiarioChange,
}: Props) {
  return (
    <div
      className={`space-y-3 p-4 rounded-lg border transition-colors ${
        etapa.concluida
          ? "bg-[#337246]/10 border-[#337246]/30"
          : "bg-card/50 border-border/50"
      }`}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-border accent-primary shrink-0 cursor-pointer"
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
            etapa.concluida
              ? "bg-[#337246]/20 text-[#337246]"
              : "bg-primary/10 text-primary"
          }`}
        >
          {globalIndex + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate flex items-center gap-2">
            {isEditingNome ? (
              <>
                <Input
                  value={editingNome}
                  onChange={(e) => onEditingNomeChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSalvarNome();
                    if (e.key === "Escape") onCancelarNome();
                  }}
                  onBlur={onSalvarNome}
                  autoFocus
                  className="glass-input min-w-0 flex-1 h-8 text-sm"
                  placeholder="Nome da etapa"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={onSalvarNome}
                  title="Salvar nome"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-muted-foreground"
                  onClick={onCancelarNome}
                  title="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <>
                <span className="truncate">{etapa.nome}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  onClick={onIniciarEdicaoNome}
                  title="Editar nome"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
            {etapa.concluida && (
              <Badge
                variant="outline"
                className="shrink-0 h-4 px-1.5 text-[10px] border-[#337246]/40 text-[#337246] bg-[#337246]/10"
              >
                Concluído
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {peso ? `${peso.inicio}% – ${peso.fim}% do cronograma` : ""}
          </div>
          {datas && (
            <div className="text-xs text-muted-foreground/70 mt-0.5 tabular-nums">
              Corridos: {datas.calendarDays}&nbsp;|&nbsp;Úteis: {datas.workingDays}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <Switch
              checked={etapa.concluida ?? false}
              onCheckedChange={onToggleConcluida}
              disabled={isSaving || etapa.id < 0}
            />
            <span className="text-[10px] text-muted-foreground">
              Concluída
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => onMove("up")}
              disabled={isFirst || isSaving}
              title="Mover para cima"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-primary"
              onClick={() => onMove("down")}
              disabled={isLast || isSaving}
              title="Mover para baixo"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={isSaving}
            title="Remover etapa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-4 ml-12 pt-2 border-t border-border/30">
        <div className="flex-1 flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Data de Início
            </label>
            <Input
              type="date"
              value={etapa.data_inicio || ""}
              onChange={(e) => onChangeDataInicio(e.target.value)}
              disabled={etapa.id < 0 || !projetoDatasDefinidas}
              title={etapa.id < 0 ? "Salve o cronograma para definir datas" : undefined}
              className={`glass-input ${
                dateError?.dataInicio || dateError?.dataStartGreaterThanEnd
                  ? "border-red-500/50 bg-red-500/5"
                  : ""
              }`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">
              Data de Fim
            </label>
            <Input
              type="date"
              value={etapa.data_fim || ""}
              onChange={(e) => onChangeDataFim(e.target.value)}
              disabled={etapa.id < 0 || !projetoDatasDefinidas}
              title={etapa.id < 0 ? "Salve o cronograma para definir datas" : undefined}
              className={`glass-input ${
                dateError?.dataFim || dateError?.dataStartGreaterThanEnd
                  ? "border-red-500/50 bg-red-500/5"
                  : ""
              }`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" />
              Responsável
            </label>
            <Input
              type="text"
              value={etapa.responsavel || ""}
              onChange={(e) => onChangeResponsavel(e.target.value)}
              placeholder="Nome do responsável"
              className="glass-input"
            />
          </div>
        </div>
        {dateError && (dateError.dataInicio || dateError.dataFim || dateError.dataStartGreaterThanEnd) && (
          <div className="flex items-center gap-1.5 text-xs text-red-400 pb-0.5">
            <X className="w-3.5 h-3.5" />
            <span>
              {dateError.dataStartGreaterThanEnd
                ? "Início > Fim"
                : dateError.dataInicio
                ? "Início fora do intervalo"
                : "Fim fora do intervalo"}
            </span>
          </div>
        )}
        {dateError && !(dateError.dataInicio || dateError.dataFim || dateError.dataStartGreaterThanEnd) && etapa.data_inicio && etapa.data_fim && (
          <div className="flex items-center gap-1.5 text-xs text-[#337246] pb-0.5">
            <Check className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      {/* Bloco de adiantamento */}
      {etapa.id > 0 && etapa.data_inicio && (
        <div className="ml-12 pt-2 border-t border-border/30">
          {adiantamento ? (() => {
            const datasAdiantamento = sortUniqueDates(
              adiantamento.datas_adiantamento?.length
                ? adiantamento.datas_adiantamento
                : legacyAdiantamentoDates(adiantamento.data_inicio_adiantamento, adiantamento.dias_adiantados),
            );
            const totalAdiantamento = datasAdiantamento.length || adiantamento.dias_adiantados;
            const datasResumo = datasAdiantamento.slice(0, 3).map(formatDatePtBr).join(", ");
            const datasTooltip = datasAdiantamento.map(formatDatePtBr).join(", ");

            return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[#337246]">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                +{totalAdiantamento} dias de adiantamento
                {datasAdiantamento[0] && (
                  <span className="text-muted-foreground font-normal" title={datasTooltip}>
                    em {datasResumo}{datasAdiantamento.length > 3 ? ` +${datasAdiantamento.length - 3}` : ""}
                  </span>
                )}
              </span>
              {adiantamento.motivo && (
                <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                  - {adiantamento.motivo}
                </span>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={onAbrirAdiantamento}
                title="Editar adiantamento"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onExcluirAdiantamento}
                disabled={isExcluindoAdiantamento}
                title="Remover adiantamento"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            );
          })() : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-[#337246] text-xs h-7 px-2"
              onClick={onAbrirAdiantamento}
            >
              <TrendingUp className="w-3 h-3" />
              Registrar Adiantamento
            </Button>
          )}
        </div>
      )}

      {/* Bloco de atraso */}
      {etapa.id > 0 && etapa.data_fim && (
        <div className="ml-12 pt-2 border-t border-border/30">
          {atraso ? (() => {
            const datasAtraso = sortUniqueDates(
              atraso.datas_atraso?.length
                ? atraso.datas_atraso
                : legacyAtrasoDates(atraso.data_inicio_atraso, atraso.dias_extras),
            );
            const totalAtraso = datasAtraso.length || atraso.dias_extras;
            const datasResumo = datasAtraso.slice(0, 3).map(formatDatePtBr).join(", ");
            const datasTooltip = datasAtraso.map(formatDatePtBr).join(", ");

            return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                +{totalAtraso} dias em atraso
                {datasAtraso[0] && (
                  <span className="text-muted-foreground font-normal" title={datasTooltip}>
                    em {datasResumo}{datasAtraso.length > 3 ? ` +${datasAtraso.length - 3}` : ""}
                  </span>
                )}
              </span>
              {atraso.motivo && (
                <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">
                  — {atraso.motivo}
                </span>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={onAbrirAtraso}
                title="Editar atraso"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={onExcluirAtraso}
                disabled={isExcluindoAtraso}
                title="Remover atraso"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            );
          })() : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-amber-500 text-xs h-7 px-2"
              onClick={onAbrirAtraso}
            >
              <Clock className="w-3 h-3" />
              Registrar Atraso
            </Button>
          )}
        </div>
      )}

      {/* Botão Avanço por dia */}
      {etapa.id > 0 && etapa.data_inicio && etapa.data_fim && (
        <div className="ml-12 pt-1">
          <button
            type="button"
            onClick={onToggleExpanded}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
            />
            Avanço por dia
          </button>
        </div>
      )}
      {etapa.id < 0 && (
        <div className="ml-12 pt-1 text-xs text-yellow-400">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3" />
            Salve o cronograma para habilitar o avanço por dia
          </span>
        </div>
      )}

      {/* Painel de avanço diário */}
      {etapa.data_inicio && etapa.data_fim && expanded && (() => {
        const diasTrabalhadosSet = new Set(diasTrabalhados ?? []);
        const diasPlanejados = getDaysInRange(etapa.data_inicio!, etapa.data_fim!).filter(
          (dia) => diasTrabalhadosSet.has(dia),
        );
        const diasPlanejadosSet = new Set(diasPlanejados);
        const diasAtraso = sortUniqueDates(atraso?.datas_atraso ?? []).filter(
          (dia) => !diasPlanejadosSet.has(dia),
        );
        const diasAtrasoSet = new Set(diasAtraso);
        const diasAdiantamento = sortUniqueDates(adiantamento?.datas_adiantamento ?? []).filter(
          (dia) => !diasPlanejadosSet.has(dia) && !diasAtrasoSet.has(dia),
        );
        const dias = [
          ...diasPlanejados.map((dia) => ({ data: dia, tipo: "planejado" as const })),
          ...diasAdiantamento.map((dia) => ({ data: dia, tipo: "adiantamento" as const })),
          ...diasAtraso.map((dia) => ({ data: dia, tipo: "atraso" as const })),
        ].sort((a, b) => a.data.localeCompare(b.data));
        const totalDiasPlanejados = diasPlanejados.length || 1;
        let acumulado = 0;
        return (
          <div className="ml-12 mt-2 border border-border/40 rounded-lg overflow-hidden">
            <div className="grid grid-cols-5 text-[11px] font-medium text-muted-foreground bg-muted/30 px-3 py-2 border-b border-border/30">
              <span>Data</span>
              <span className="text-center">Planejado</span>
              <span className="text-center">% do dia</span>
              <span className="text-center">Acumulado</span>
              <span className="text-center">Delta</span>
            </div>
            {dias.map(({ data: dia, tipo }) => {
              const isAtraso = tipo === "atraso";
              const isAdiantamento = tipo === "adiantamento";
              const plannedIndex = diasPlanejados.indexOf(dia);
              const planejado = tipo !== "planejado" || plannedIndex === -1
                ? null
                : Math.round(((plannedIndex + 1) / totalDiasPlanejados) * 100);
              const incremento = progresso[dia];
              if (incremento != null) acumulado += incremento;
              const realizadoCumulativo = incremento != null ? Math.min(100, acumulado) : undefined;
              const delta = realizadoCumulativo != null && planejado != null
                ? realizadoCumulativo - planejado
                : undefined;
              const diaSemana = new Date(dia + "T00:00:00").toLocaleDateString("pt-BR", {
                weekday: "short",
                timeZone: "UTC",
              });
              const diaMes = new Date(dia + "T00:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                timeZone: "UTC",
              });
              return (
                <div
                  key={dia}
                  className={`grid grid-cols-5 items-center px-3 py-1.5 text-xs border-b border-border/20 last:border-b-0 transition-colors ${
                    isAdiantamento
                      ? "bg-[#337246]/5 hover:bg-[#337246]/10"
                      : isAtraso
                      ? "bg-amber-500/5 hover:bg-amber-500/10"
                      : "hover:bg-muted/20"
                  }`}
                >
                  <span className="text-muted-foreground tabular-nums">
                    {diaMes}{" "}
                    <span className="text-muted-foreground/60 capitalize">{diaSemana}</span>
                    {isAdiantamento && (
                      <span className="ml-2 rounded border border-[#337246]/30 bg-[#337246]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#337246]">
                        Adiantamento
                      </span>
                    )}
                    {isAtraso && (
                      <span className="ml-2 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        Atraso
                      </span>
                    )}
                  </span>
                  <span className="text-center tabular-nums text-muted-foreground">
                    {planejado != null ? `${planejado}%` : <span className="text-muted-foreground/40">—</span>}
                  </span>
                  <div className="flex justify-center">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="—"
                      defaultValue={incremento !== undefined && incremento !== null ? incremento : ""}
                      key={`${dia}-${incremento}`}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        if (raw === "") {
                          onProgressoDiarioChange(dia, null);
                        } else {
                          const val = parseInt(raw);
                          if (!isNaN(val)) {
                            onProgressoDiarioChange(dia, val);
                          }
                        }
                      }}
                      className="w-16 h-6 glass-input text-center text-xs px-1"
                    />
                  </div>
                  <span className="text-center tabular-nums font-medium">
                    {realizadoCumulativo !== undefined
                      ? `${realizadoCumulativo}%`
                      : <span className="text-muted-foreground/40">—</span>}
                  </span>
                  <div className="flex justify-center">
                    {delta !== undefined ? (
                      <span
                        className={`flex items-center gap-0.5 font-medium tabular-nums ${
                          delta > 0
                            ? "text-[#337246]"
                            : delta < 0
                            ? "text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {delta > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : delta < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {delta > 0 ? "+" : ""}{delta}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

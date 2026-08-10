"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, Save, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DIAS_SEMANA, MESES, formatDatePtBr } from "./helpers";

// Modal genérico de calendário para registrar atraso (dias após o fim da etapa)
// ou adiantamento (dias antes do início da etapa). Os dois fluxos são idênticos
// exceto por textos, cores e direção da restrição de datas.

const VARIANTES = {
  atraso: {
    titulo: "Registrar Atraso",
    Icon: Clock,
    iconClass: "h-5 w-5 text-amber-500",
    descricaoFallback: "Registre os dias em atraso desta etapa.",
    labelMotivo: "Motivo do Atraso",
    placeholderMotivo: "Ex: Pendência de ASO, atraso no fornecedor...",
    labelDias: "Dias extras em atraso",
    helperDias: "Selecione os dias especificos em que a etapa ficou parada.",
    contadorClass: "text-sm font-semibold text-amber-500 tabular-nums",
    hoverClass: "cursor-pointer hover:scale-105 hover:bg-amber-500/10",
    selectedClass: "bg-amber-500 text-white shadow-sm",
    resumoClass: "rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400",
    tituloDisabled: "Disponivel apenas apos a data de fim da etapa",
    marcarTitulo: "Clique para marcar atraso",
    resumoVazio: "Nenhum dia selecionado. Marque pelo menos uma data para salvar o atraso.",
  },
  adiantamento: {
    titulo: "Registrar Adiantamento",
    Icon: TrendingUp,
    iconClass: "h-5 w-5 text-[#337246]",
    descricaoFallback: "Registre os dias de adiantamento desta etapa.",
    labelMotivo: "Motivo do Adiantamento",
    placeholderMotivo: "Ex: Execucao antecipada, equipe liberada antes...",
    labelDias: "Dias de adiantamento",
    helperDias: "Selecione os dias especificos antes do inicio planejado da etapa.",
    contadorClass: "text-sm font-semibold text-[#337246] tabular-nums",
    hoverClass: "cursor-pointer hover:scale-105 hover:bg-[#337246]/10",
    selectedClass: "bg-[#337246] text-white shadow-sm",
    resumoClass: "rounded-lg border border-[#337246]/20 bg-[#337246]/10 px-3 py-2 text-xs text-[#337246]",
    tituloDisabled: "Disponivel apenas antes da data de inicio da etapa",
    marcarTitulo: "Clique para marcar adiantamento",
    resumoVazio: "Nenhum dia selecionado. Marque pelo menos uma data para salvar o adiantamento.",
  },
} as const;

type Props = {
  variant: keyof typeof VARIANTES;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaNome: string | null;
  motivo: string;
  onMotivoChange: (motivo: string) => void;
  /** Datas já ordenadas/deduplicadas */
  datas: string[];
  onToggleDate: (date: string) => void;
  calendarYear: number;
  calendarMonth: number;
  onNavigateMonth: (direction: -1 | 1) => void;
  /** atraso: dias antes de minDate ficam desabilitados */
  minDate?: string | null;
  /** adiantamento: dias depois de maxDate ficam desabilitados */
  maxDate?: string | null;
  onSave: () => void;
  isSaving: boolean;
};

export function DelayCalendarDialog({
  variant,
  open,
  onOpenChange,
  etapaNome,
  motivo,
  onMotivoChange,
  datas,
  onToggleDate,
  calendarYear,
  calendarMonth,
  onNavigateMonth,
  minDate,
  maxDate,
  onSave,
  isSaving,
}: Props) {
  const v = VARIANTES[variant];

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(calendarYear, calendarMonth, 1));
    const lastDayOfMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0));
    const startWeekday = firstDayOfMonth.getUTCDay();
    const days: Array<{
      date: string;
      dayOfMonth: number;
      isWeekend: boolean;
      isOutsideMonth: boolean;
      isDisabled: boolean;
    }> = [];

    for (let i = 0; i < startWeekday; i++) {
      days.push({
        date: "",
        dayOfMonth: 0,
        isWeekend: false,
        isOutsideMonth: true,
        isDisabled: true,
      });
    }

    for (let day = 1; day <= lastDayOfMonth.getUTCDate(); day++) {
      const date = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(date + "T00:00:00Z");
      days.push({
        date,
        dayOfMonth: day,
        isWeekend: dateObj.getUTCDay() === 0 || dateObj.getUTCDay() === 6,
        isOutsideMonth: false,
        isDisabled: (!!minDate && date < minDate) || (!!maxDate && date > maxDate),
      });
    }

    return days;
  }, [calendarMonth, calendarYear, minDate, maxDate]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <v.Icon className={v.iconClass} />
            {v.titulo}
          </DialogTitle>
          <DialogDescription>
            {etapaNome ? `Etapa: ${etapaNome}` : v.descricaoFallback}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">{v.labelMotivo}</label>
            <Input
              type="text"
              placeholder={v.placeholderMotivo}
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
              className="glass-input"
            />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium">{v.labelDias}</label>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{v.helperDias}</p>
              </div>
              <div className={v.contadorClass}>
                {datas.length} selecionado(s)
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-card/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNavigateMonth(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="min-w-[150px] text-center text-sm font-semibold">
                  {MESES[calendarMonth]} {calendarYear}
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNavigateMonth(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1">
                {DIAS_SEMANA.map((dia) => (
                  <div
                    key={dia}
                    className="py-1 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {dia}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((dayInfo, index) => {
                  if (dayInfo.isOutsideMonth) {
                    return <div key={`${variant}-empty-${index}`} className="h-10" />;
                  }

                  const isSelected = datas.includes(dayInfo.date);
                  const isToday = dayInfo.date === new Date().toISOString().split("T")[0];

                  return (
                    <button
                      key={dayInfo.date}
                      type="button"
                      disabled={dayInfo.isDisabled}
                      onClick={() => onToggleDate(dayInfo.date)}
                      className={`h-10 rounded-md text-sm font-medium transition-all ${
                        dayInfo.isDisabled
                          ? "cursor-not-allowed opacity-30"
                          : v.hoverClass
                      } ${
                        isSelected
                          ? v.selectedClass
                          : dayInfo.isWeekend
                          ? "bg-accent/50 text-foreground"
                          : "bg-transparent text-foreground"
                      } ${isToday && !isSelected ? "border-2 border-primary/50" : ""}`}
                      title={
                        dayInfo.isDisabled
                          ? v.tituloDisabled
                          : isSelected
                          ? "Clique para remover"
                          : v.marcarTitulo
                      }
                    >
                      {dayInfo.dayOfMonth}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={v.resumoClass}>
              {datas.length > 0 ? (
                <span>Datas selecionadas: {datas.map(formatDatePtBr).join(", ")}</span>
              ) : (
                <span>{v.resumoVazio}</span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || datas.length === 0}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

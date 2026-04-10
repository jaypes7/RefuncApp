// src/components/WorkingDaysCalendar.tsx
"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkingDaysCalendarProps {
  year: number;
  month: number; // 0-11
  workingDays: string[]; // ['2024-01-15', '2024-01-16', ...]
  holidays: string[];
  onToggle: (date: string) => void;
  onToggleHoliday: (date: string) => void;
  editMode: "working" | "holiday";
  onChangeEditMode: (mode: "working" | "holiday") => void;
  minDate?: string; // data_inicio do projeto (YYYY-MM-DD)
  maxDate?: string; // data_fim do projeto (YYYY-MM-DD)
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  nationalHolidays?: string[]; // feriados nacionais (não-editáveis)
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function WorkingDaysCalendar({
  year,
  month,
  workingDays,
  holidays,
  onToggle,
  onToggleHoliday,
  editMode,
  onChangeEditMode,
  minDate,
  maxDate,
  onPrevMonth,
  onNextMonth,
  nationalHolidays = [],
}: WorkingDaysCalendarProps) {
  const workingDaysSet = useMemo(() => new Set(workingDays), [workingDays]);
  const holidaysSet = useMemo(() => new Set(holidays), [holidays]);
  const nationalHolidaysSet = useMemo(() => new Set(nationalHolidays), [nationalHolidays]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startWeekday = firstDayOfMonth.getDay(); // 0 = Domingo

    const days: Array<{
      date: string;
      dayOfMonth: number;
      isWeekend: boolean;
      isOutsideMonth: boolean;
      isDisabled: boolean;
    }> = [];

    // Dias do mês anterior (para preencher o início)
    for (let i = 0; i < startWeekday; i++) {
      days.push({
        date: "",
        dayOfMonth: 0,
        isWeekend: false,
        isOutsideMonth: true,
        isDisabled: true,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dateObj = new Date(year, month, day);
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

      // Apenas verifica se está fora do período do projeto
      let isDisabled = false;
      if (minDate && date < minDate) isDisabled = true;
      if (maxDate && date > maxDate) isDisabled = true;
      // Fins de semana são clicáveis também (trabalhamos alguns fins de semana)

      days.push({
        date,
        dayOfMonth: day,
        isWeekend,
        isOutsideMonth: false,
        isDisabled,
      });
    }

    return days;
  }, [year, month, minDate, maxDate]);

  const stats = useMemo(() => {
    const totalWorkingDays = workingDays.length;
    const currentMonthDays = workingDays.filter((d) => {
      const date = new Date(d);
      return date.getFullYear() === year && date.getMonth() === month;
    }).length;

    const totalHolidays = holidays.length;
    const currentMonthHolidays = holidays.filter((d) => {
      const date = new Date(d);
      return date.getFullYear() === year && date.getMonth() === month;
    }).length;

    const workedHolidays = holidays.filter((d) => workingDaysSet.has(d)).length;

    return { totalWorkingDays, currentMonthDays, totalHolidays, currentMonthHolidays, workedHolidays };
  }, [workingDays, holidays, workingDaysSet, year, month]);

  return (
    <div className="space-y-4">
      {/* Toggle de modo */}
      <div className="flex items-center gap-2">
        <Button
          variant={editMode === "working" ? "default" : "outline"}
          size="sm"
          onClick={() => onChangeEditMode("working")}
          className="gap-2"
        >
          <span className="w-3 h-3 rounded-sm bg-primary" />
          Dias trabalhados
        </Button>
        <Button
          variant={editMode === "holiday" ? "default" : "outline"}
          size="sm"
          onClick={() => onChangeEditMode("holiday")}
          className="gap-2"
        >
          <span className="w-3 h-3 rounded-sm bg-red-500" />
          Feriados
        </Button>
      </div>

      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold min-w-[140px] text-center">
            {MONTH_NAMES[month]} {year}
          </h3>
          <Button
            variant="outline"
            size="icon"
            onClick={onNextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{stats.totalWorkingDays}</span> dias trabalhados no total
          {stats.currentMonthDays > 0 && (
            <span className="ml-2">
              (<span className="font-medium text-foreground">{stats.currentMonthDays}</span> neste mês)
            </span>
          )}
          <span className="ml-3">
            <span className="font-medium text-foreground">{stats.totalHolidays}</span> feriados
            {stats.currentMonthHolidays > 0 && (
              <span className="ml-1">
                (<span className="font-medium text-foreground">{stats.currentMonthHolidays}</span> neste mês)
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Calendário */}
      <div className="border rounded-lg p-4 bg-card/50">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className={cn(
                "text-center text-xs font-medium py-2",
                day === "Dom" || day === "Sáb"
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dayInfo, index) => {
            if (dayInfo.isOutsideMonth) {
              return <div key={`empty-${index}`} className="h-10" />;
            }

            const isWorking = workingDaysSet.has(dayInfo.date);
            const isHoliday = holidaysSet.has(dayInfo.date);
            const isNationalHoliday = nationalHolidaysSet.has(dayInfo.date);
            const isToday = dayInfo.date === new Date().toISOString().split("T")[0];

            const handleClick = () => {
              if (dayInfo.isDisabled) return;
              if (editMode === "holiday") {
                if (isNationalHoliday) return; // não permite editar feriado nacional
                onToggleHoliday(dayInfo.date);
              } else {
                onToggle(dayInfo.date);
              }
            };

            return (
              <button
                key={dayInfo.date}
                onClick={handleClick}
                disabled={dayInfo.isDisabled}
                className={cn(
                  "h-10 rounded-md text-sm font-medium transition-all relative",
                  "flex items-center justify-center",
                  dayInfo.isDisabled && "opacity-30 cursor-not-allowed",
                  !dayInfo.isDisabled && "cursor-pointer hover:scale-105",
                  isWorking && !isHoliday && !isNationalHoliday && "bg-primary text-primary-foreground shadow-sm",
                  !isWorking && isHoliday && !isNationalHoliday && "bg-red-500/20 text-red-700",
                  !isWorking && isNationalHoliday && "bg-red-400/20 text-red-800 border border-dashed border-red-400",
                  isWorking && isHoliday && !isNationalHoliday && "bg-primary text-primary-foreground shadow-sm ring-2 ring-red-500/50",
                  isWorking && isNationalHoliday && "bg-primary text-primary-foreground shadow-sm ring-2 ring-red-400/60",
                  !isWorking && !isHoliday && !isNationalHoliday && dayInfo.isWeekend && "bg-accent/50 text-foreground hover:bg-accent",
                  !isWorking && !isHoliday && !isNationalHoliday && !dayInfo.isWeekend && "bg-transparent text-foreground hover:bg-accent",
                  isToday && !isWorking && !isHoliday && !isNationalHoliday && "border-2 border-primary/50",
                  isToday && (isWorking || isHoliday || isNationalHoliday) && "ring-2 ring-primary-foreground"
                )}
                title={
                  dayInfo.isDisabled
                    ? "Fora do período do projeto"
                    : isNationalHoliday && isWorking
                    ? "Feriado Nacional trabalhado - Clique para editar dia trabalhado"
                    : isNationalHoliday
                    ? "Feriado Nacional (automático)"
                    : isWorking && isHoliday
                    ? "Feriado trabalhado - Clique para editar"
                    : isWorking
                    ? "Dia trabalhado - Clique para remover"
                    : isHoliday
                    ? "Feriado regional - Clique para remover"
                    : dayInfo.isWeekend
                    ? "Fim de semana - Clique para marcar"
                    : "Clique para marcar"
                }
              >
                {dayInfo.dayOfMonth}
                {isHoliday && isWorking && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Dia trabalhado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/30" />
          <span>Feriado regional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-red-400/20 border border-dashed border-red-400" />
          <span>Feriado Nacional</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary ring-2 ring-red-500/50 relative">
            <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <span>Feriado trabalhado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border-2 border-primary/50" />
          <span>Hoje</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-accent/50" />
          <span>Fim de semana</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded opacity-30" />
          <span>Fora do período</span>
        </div>
      </div>
    </div>
  );
}

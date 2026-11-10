import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getCycleByAnchor, isDateInCycle } from '../../domain/cycles';
import {
  formatMinutes,
  formatMonthYearEs,
  getTodayIsoLocal,
  parseIsoDateLocal,
  toIsoDateLocal,
} from '../../domain/formatters';
import {
  CATEGORY_COLOR_HEX,
  type CategoryColor,
  type ShiftRecord,
} from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';
import { DayShiftsPanel } from './DayShiftsPanel';

interface CalendarViewProps {
  onAddShiftOnDate: (dateStr: string) => void;
  onEditShift: (shift: ShiftRecord) => void;
  onRepeatShift: (shift: ShiftRecord) => void;
}

const WEEKDAYS_HEADER = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  onAddShiftOnDate,
  onEditShift,
  onRepeatShift,
}) => {
  const shifts = useShiftStore((s) => s.shifts);
  const activeCycleAnchor = useShiftStore((s) => s.activeCycleAnchor);
  const cycleStartDay = useShiftStore((s) => s.settings.cycleStartDay);

  const todayIso = getTodayIsoLocal();
  const activeCycle = useMemo(
    () =>
      getCycleByAnchor(
        activeCycleAnchor.year,
        activeCycleAnchor.month,
        cycleStartDay
      ),
    [activeCycleAnchor.year, activeCycleAnchor.month, cycleStartDay]
  );

  const initialTargetDate = isDateInCycle(todayIso, activeCycle)
    ? todayIso
    : activeCycle.startDate;
  const initialDateObj = parseIsoDateLocal(initialTargetDate);

  const [calYear, setCalYear] = useState(initialDateObj.getFullYear());
  const [calMonth, setCalMonth] = useState(initialDateObj.getMonth());
  const [selectedDate, setSelectedDate] = useState(initialTargetDate);

  useEffect(() => {
    const target = isDateInCycle(todayIso, activeCycle)
      ? todayIso
      : activeCycle.startDate;
    const dObj = parseIsoDateLocal(target);
    setCalYear(dObj.getFullYear());
    setCalMonth(dObj.getMonth());
    setSelectedDate(target);
  }, [activeCycle, todayIso]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        shifts: ShiftRecord[];
        totalMinutes: number;
        colors: CategoryColor[];
      }
    >();

    for (const s of shifts) {
      const existing = map.get(s.date);
      if (existing) {
        existing.shifts.push(s);
        existing.totalMinutes += s.computed.billableMinutes;
        if (!existing.colors.includes(s.snapshot.eventColorSnap)) {
          existing.colors.push(s.snapshot.eventColorSnap);
        }
      } else {
        map.set(s.date, {
          shifts: [s],
          totalMinutes: s.computed.billableMinutes,
          colors: [s.snapshot.eventColorSnap],
        });
      }
    }
    return map;
  }, [shifts]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1, 12, 0, 0, 0);
    const totalDays = new Date(calYear, calMonth + 1, 0, 12, 0, 0, 0).getDate();
    // Monday-first offset (0 = Lun ... 6 = Dom)
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: ({ dateStr: string; dayNum: number } | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(calYear, calMonth, d, 12, 0, 0, 0);
      cells.push({
        dateStr: toIsoDateLocal(dateObj),
        dayNum: d,
      });
    }
    return cells;
  }, [calYear, calMonth]);

  const handleNavigateMonth = (offset: number) => {
    const next = new Date(calYear, calMonth + offset, 1, 12, 0, 0, 0);
    setCalYear(next.getFullYear());
    setCalMonth(next.getMonth());
  };

  const getIntensityClass = (totalMinutes: number, isSelected: boolean): string => {
    if (isSelected) {
      return 'border-action bg-selected text-text ring-1 ring-focus';
    }
    if (totalMinutes === 0) {
      return 'border-border bg-surface text-text-secondary hover:bg-surface-muted';
    }
    const hours = totalMinutes / 60;
    if (hours < 4) {
      return 'border-border-strong bg-surface-muted text-text';
    }
    if (hours <= 8) {
      return 'border-success-line bg-success-quiet/60 text-text';
    }
    return 'border-emerald-500 bg-success-quiet text-text';
  };

  const selectedDayShifts = shiftsByDate.get(selectedDate)?.shifts ?? [];

  return (
    <div className="scroll-container flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-10">
        <section
          aria-label="Calendario mensual de turnos"
          className="rounded-lg border border-border bg-surface p-4"
        >
          {/* Cabecera del mes */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleNavigateMonth(-1)}
              aria-label="Mes anterior en calendario"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>

            <h1 className="text-base font-semibold tracking-tight text-text">
              {formatMonthYearEs(calYear, calMonth)}
            </h1>

            <button
              type="button"
              onClick={() => handleNavigateMonth(1)}
              aria-label="Mes siguiente en calendario"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          {/* Cabecera Lunes a Domingo */}
          <div className="mt-3 grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-text-secondary">
            {WEEKDAYS_HEADER.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          {/* Cuadrícula de días */}
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`blank-${idx}`} className="min-h-[52px]" />;
              }
              const dayInfo = shiftsByDate.get(cell.dateStr);
              const totalMinutes = dayInfo?.totalMinutes ?? 0;
              const colors = dayInfo?.colors ?? [];
              const isSelected = cell.dateStr === selectedDate;
              const isToday = cell.dateStr === todayIso;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  aria-label={`Día ${cell.dayNum}, ${formatMinutes(totalMinutes)} trabajados`}
                  aria-pressed={isSelected}
                  className={`flex min-h-[52px] min-w-[44px] flex-col items-center justify-between rounded-sm border p-1.5 transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${getIntensityClass(
                    totalMinutes,
                    isSelected
                  )}`}
                >
                  <span
                    className={`font-mono tabular-nums text-xs ${
                      isToday
                        ? 'font-bold underline underline-offset-2 text-text'
                        : 'font-medium'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {totalMinutes > 0 && (
                    <span className="font-mono tabular-nums text-xs leading-tight text-emerald-500">
                      {formatMinutes(totalMinutes)}
                    </span>
                  )}

                  {/* Puntos de color de las categorías del día */}
                  <div className="flex items-center justify-center gap-1">
                    {colors.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="h-1.5 w-1.5 rounded-sm"
                        style={{ backgroundColor: CATEGORY_COLOR_HEX[c] }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Leyenda de intensidad horaria */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-text-secondary">
            <span>Intensidad por horas trabajadas:</span>
            <div className="font-mono tabular-nums flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-border-strong bg-surface-muted" />
                <span>&lt;4h</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-success-line bg-success-quiet/60" />
                <span>4-8h</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm border border-emerald-500 bg-success-quiet" />
                <span>&gt;8h</span>
              </span>
            </div>
          </div>
        </section>

        {/* Detalle del día seleccionado */}
        <DayShiftsPanel
          selectedDate={selectedDate}
          dayShifts={selectedDayShifts}
          onAddShiftOnDate={onAddShiftOnDate}
          onEditShift={onEditShift}
          onRepeatShift={onRepeatShift}
        />
      </div>
    </div>
  );
};

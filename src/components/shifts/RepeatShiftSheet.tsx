import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  formatCurrency,
  formatMonthYearEs,
  parseIsoDateLocal,
  toIsoDateLocal,
} from '../../domain/formatters';
import type { ShiftRecord } from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';
import { BottomSheet } from '../ui/BottomSheet';

interface RepeatShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceShift: ShiftRecord | null;
}

const WEEKDAYS_HEADER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export const RepeatShiftSheet: React.FC<RepeatShiftSheetProps> = ({
  open,
  onOpenChange,
  sourceShift,
}) => {
  const repeatShiftOnDates = useShiftStore((s) => s.repeatShiftOnDates);
  const showToast = useShiftStore((s) => s.showToast);

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(0);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !sourceShift) return;
    const d = parseIsoDateLocal(sourceShift.date);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDates([]);
  }, [open, sourceShift]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1, 12, 0, 0, 0);
    const totalDays = new Date(viewYear, viewMonth + 1, 0, 12, 0, 0, 0).getDate();
    // Monday-based index (0 = Monday ... 6 = Sunday)
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: ({ dateStr: string; dayNum: number } | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push(null);
    }
    for (let day = 1; day <= totalDays; day++) {
      const dateObj = new Date(viewYear, viewMonth, day, 12, 0, 0, 0);
      cells.push({
        dateStr: toIsoDateLocal(dateObj),
        dayNum: day,
      });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const handleChangeMonth = (offset: number) => {
    const next = new Date(viewYear, viewMonth + offset, 1, 12, 0, 0, 0);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const handleConfirmRepeat = () => {
    if (!sourceShift || selectedDates.length === 0) return;
    const created = repeatShiftOnDates(sourceShift.id, selectedDates);
    showToast(`Turno repetido en ${created.length} fechas`);
    onOpenChange(false);
  };

  if (!sourceShift) return null;

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Repetir o duplicar turno en el mes"
      description="Selecciona uno o varios días del calendario para clonar este turno en bloque."
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedDates.length === 0}
            onClick={handleConfirmRepeat}
            className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1.5 rounded-md bg-action px-4 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Check className="h-4 w-4" strokeWidth={2} />
            <span>
              Repetir en{' '}
              <span className="font-mono tabular-nums">{selectedDates.length}</span>{' '}
              {selectedDates.length === 1 ? 'día' : 'días'}
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Resumen del turno origen */}
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-muted px-3.5 py-2.5">
          <div>
            <div className="text-sm font-semibold text-text">
              {sourceShift.snapshot.eventNameSnap}
            </div>
            <div className="font-mono tabular-nums text-xs text-text-secondary">
              {sourceShift.startTime} - {sourceShift.endTime}
            </div>
          </div>
          <div className="font-mono tabular-nums text-sm font-semibold text-emerald-500">
            {formatCurrency(sourceShift.computed.totalNetAmount)} / turno
          </div>
        </div>

        {/* Navegador de mes */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleChangeMonth(-1)}
            aria-label="Mes anterior"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <span className="text-sm font-semibold text-text">
            {formatMonthYearEs(viewYear, viewMonth)}
          </span>
          <button
            type="button"
            onClick={() => handleChangeMonth(1)}
            aria-label="Mes siguiente"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Cuadrícula de selección multi-día */}
        <div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-secondary">
            {WEEKDAYS_HEADER.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="min-h-[44px]" />;
              }
              const isSelected = selectedDates.includes(cell.dateStr);
              const isSourceDate = cell.dateStr === sourceShift.date;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => toggleDate(cell.dateStr)}
                  aria-label={`Seleccionar fecha ${cell.dateStr}`}
                  aria-pressed={isSelected}
                  className={`font-mono tabular-nums flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-sm border text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    isSelected
                      ? 'border-action bg-action text-action-ink font-semibold'
                      : isSourceDate
                        ? 'border-border-strong bg-selected text-text'
                        : 'border-border bg-surface-muted text-text hover:border-border-strong'
                  }`}
                >
                  <span>{cell.dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};

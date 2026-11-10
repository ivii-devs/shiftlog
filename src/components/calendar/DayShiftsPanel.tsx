import React from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import {
  formatCurrency,
  formatFullDateEs,
  formatMinutes,
  round2,
} from '../../domain/formatters';
import type { ShiftRecord } from '../../domain/types';
import { ShiftRow } from '../shifts/ShiftRow';
import { EmptyState } from '../ui/EmptyState';

interface DayShiftsPanelProps {
  selectedDate: string;
  dayShifts: ShiftRecord[];
  onAddShiftOnDate: (dateStr: string) => void;
  onEditShift: (shift: ShiftRecord) => void;
  onRepeatShift: (shift: ShiftRecord) => void;
}

export const DayShiftsPanel: React.FC<DayShiftsPanelProps> = ({
  selectedDate,
  dayShifts,
  onAddShiftOnDate,
  onEditShift,
  onRepeatShift,
}) => {
  const totalMinutes = dayShifts.reduce(
    (acc, s) => acc + s.computed.billableMinutes,
    0
  );
  const totalNet = round2(
    dayShifts.reduce((acc, s) => acc + s.computed.totalNetAmount, 0)
  );

  return (
    <section
      aria-label={`Turnos del día ${selectedDate}`}
      className="rounded-lg border border-border bg-surface"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-muted px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-text">
            {formatFullDateEs(selectedDate)}
          </h2>
          <div className="font-mono tabular-nums mt-0.5 text-xs text-text-secondary">
            {dayShifts.length === 0 ? (
              <span>Sin actividad registrada</span>
            ) : (
              <span>
                {dayShifts.length} {dayShifts.length === 1 ? 'turno' : 'turnos'} ·{' '}
                <strong className="text-text">{formatMinutes(totalMinutes)}</strong> ·{' '}
                <strong className="text-emerald-500">
                  {formatCurrency(totalNet)}
                </strong>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddShiftOnDate(selectedDate)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md bg-action px-3 text-xs font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          <span>Añadir turno en este día</span>
        </button>
      </div>

      {dayShifts.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={CalendarIcon}
            title="Día sin turnos registrados"
            description="Puedes añadir un turno para esta fecha pulsando el botón superior."
            actionLabel="Añadir turno en este día"
            onAction={() => onAddShiftOnDate(selectedDate)}
          />
        </div>
      ) : (
        <div className="divide-y divide-border">
          {dayShifts.map((shift) => (
            <ShiftRow
              key={shift.id}
              shift={shift}
              onEdit={onEditShift}
              onRepeat={onRepeatShift}
            />
          ))}
        </div>
      )}
    </section>
  );
};

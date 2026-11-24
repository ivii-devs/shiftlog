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

export interface CalendarWorkedDayGroup {
  date: string;
  shifts: ShiftRecord[];
  totalMinutes: number;
  totalNet: number;
}

interface DayShiftsPanelProps {
  monthLabel: string;
  selectedDate: string;
  selectedDayShifts: ShiftRecord[];
  workedDays: CalendarWorkedDayGroup[];
  monthTotalMinutes: number;
  monthTotalNet: number;
  onAddShiftOnDate: (dateStr: string) => void;
  onEditShift: (shift: ShiftRecord) => void;
  onRepeatShift: (shift: ShiftRecord) => void;
}

export const DayShiftsPanel: React.FC<DayShiftsPanelProps> = ({
  monthLabel,
  selectedDate,
  selectedDayShifts,
  workedDays,
  monthTotalMinutes,
  monthTotalNet,
  onAddShiftOnDate,
  onEditShift,
  onRepeatShift,
}) => {
  const selectedDayMinutes = selectedDayShifts.reduce(
    (acc, s) => acc + s.computed.billableMinutes,
    0
  );
  const selectedDayNet = round2(
    selectedDayShifts.reduce((acc, s) => acc + s.computed.totalNetAmount, 0)
  );

  return (
    <div className="space-y-4">
      {/* Barra rápida del día seleccionado */}
      <section
        aria-label={`Día seleccionado ${selectedDate}`}
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-strong bg-surface p-3.5"
      >
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-text-secondary">
            Día seleccionado
          </div>
          <h2 className="mt-0.5 text-sm font-semibold text-text">
            {formatFullDateEs(selectedDate)}
          </h2>
          <div className="font-mono tabular-nums mt-0.5 text-xs text-text-secondary">
            {selectedDayShifts.length === 0 ? (
              <span>Sin actividad registrada</span>
            ) : (
              <span>
                {selectedDayShifts.length}{' '}
                {selectedDayShifts.length === 1 ? 'turno' : 'turnos'} ·{' '}
                <strong className="text-text">
                  {formatMinutes(selectedDayMinutes)}
                </strong>{' '}
                ·{' '}
                <strong className="text-emerald-500">
                  {formatCurrency(selectedDayNet)}
                </strong>
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onAddShiftOnDate(selectedDate)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md bg-action px-3.5 text-xs font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          <span>Añadir turno en este día</span>
        </button>
      </section>

      {/* Listado completo de días trabajados del mes visible en orden descendente */}
      <section
        aria-label={`Días trabajados en ${monthLabel}`}
        className="space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <h3 className="text-sm font-semibold tracking-tight text-text">
            Días trabajados en {monthLabel}
          </h3>
          <div className="font-mono tabular-nums text-xs text-text-secondary">
            {workedDays.length}{' '}
            {workedDays.length === 1 ? 'día' : 'días'} ·{' '}
            <strong className="text-text">
              {formatMinutes(monthTotalMinutes)}
            </strong>{' '}
            ·{' '}
            <strong className="text-emerald-500">
              {formatCurrency(monthTotalNet)}
            </strong>
          </div>
        </div>

        {workedDays.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title={`Sin turnos en ${monthLabel}`}
            description="Pulsa cualquier día en la cuadrícula y añade tu primer turno del mes."
            actionLabel="Añadir turno en este día"
            onAction={() => onAddShiftOnDate(selectedDate)}
          />
        ) : (
          <div className="space-y-3">
            {workedDays.map((day) => {
              const isSelected = day.date === selectedDate;
              return (
                <article
                  key={day.date}
                  data-calendar-day={day.date}
                  data-selected={isSelected ? 'true' : 'false'}
                  className={`overflow-hidden rounded-lg border bg-surface ${
                    isSelected
                      ? 'border-action ring-1 ring-focus'
                      : 'border-border'
                  }`}
                >
                  <div
                    className={`flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 ${
                      isSelected ? 'bg-selected' : 'bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text">
                        {formatFullDateEs(day.date)}
                      </span>
                      {isSelected && (
                        <span className="rounded-sm border border-border-strong bg-surface px-1.5 py-0.5 text-xs font-medium text-text">
                          Seleccionado
                        </span>
                      )}
                    </div>
                    <span className="font-mono tabular-nums text-xs text-text-secondary">
                      {formatMinutes(day.totalMinutes)} ·{' '}
                      <strong className="text-emerald-500">
                        {formatCurrency(day.totalNet)}
                      </strong>
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    {day.shifts.map((shift) => (
                      <ShiftRow
                        key={shift.id}
                        shift={shift}
                        onEdit={onEditShift}
                        onRepeat={onRepeatShift}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

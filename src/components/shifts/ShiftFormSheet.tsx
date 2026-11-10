import React, { useEffect, useMemo, useState } from 'react';
import { Moon } from 'lucide-react';
import {
  calculateShiftTotals,
  createHistoricalSnapshot,
} from '../../domain/calculations';
import {
  formatCurrency,
  formatHourlyRate,
  formatMinutes,
  formatMultiplier,
  getTodayIsoLocal,
} from '../../domain/formatters';
import {
  ROUNDING_MODE_LABELS,
  SHIFT_RATE_LABELS,
  type PaymentStatus,
  type ShiftRateType,
  type ShiftRecord,
} from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';
import { BottomSheet } from '../ui/BottomSheet';

interface ShiftFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingShift?: ShiftRecord | null;
  initialDate?: string;
}

export const ShiftFormSheet: React.FC<ShiftFormSheetProps> = ({
  open,
  onOpenChange,
  editingShift = null,
  initialDate,
}) => {
  const events = useShiftStore((s) => s.events);
  const addShift = useShiftStore((s) => s.addShift);
  const updateShift = useShiftStore((s) => s.updateShift);
  const setCycleForDate = useShiftStore((s) => s.setCycleForDate);
  const showToast = useShiftStore((s) => s.showToast);

  const selectableEvents = useMemo(() => {
    return events.filter(
      (ev) => !ev.archived || (editingShift && ev.id === editingShift.eventId)
    );
  }, [events, editingShift]);

  const [eventId, setEventId] = useState('');
  const [date, setDate] = useState(getTodayIsoLocal());
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [rateType, setRateType] = useState<ShiftRateType>('normal');
  const [fixedBonus, setFixedBonus] = useState('0');
  const [expenseAdjustment, setExpenseAdjustment] = useState('0');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [note, setNote] = useState('');
  const [refreshRatesFromEvent, setRefreshRatesFromEvent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRefreshRatesFromEvent(false);

    if (editingShift) {
      setEventId(editingShift.eventId);
      setDate(editingShift.date);
      setStartTime(editingShift.startTime);
      setEndTime(editingShift.endTime);
      setBreakMinutes(String(editingShift.breakMinutes));
      setRateType(editingShift.rateType);
      setFixedBonus(String(editingShift.fixedBonus));
      setExpenseAdjustment(String(editingShift.expenseAdjustment));
      setPaymentStatus(editingShift.paymentStatus);
      setNote(editingShift.note);
    } else {
      const firstActive = selectableEvents[0];
      setEventId(firstActive?.id ?? '');
      setDate(initialDate ?? getTodayIsoLocal());
      setStartTime('08:00');
      setEndTime('16:00');
      setBreakMinutes(
        firstActive && firstActive.hasUnpaidBreak
          ? String(firstActive.defaultBreakMinutes)
          : '0'
      );
      setRateType('normal');
      setFixedBonus('0');
      setExpenseAdjustment('0');
      setPaymentStatus('pending');
      setNote('');
    }
  }, [open, editingShift, initialDate, selectableEvents]);

  const selectedEvent = events.find((e) => e.id === eventId);

  const handleEventChange = (nextEventId: string) => {
    setEventId(nextEventId);
    const nextEv = events.find((e) => e.id === nextEventId);
    if (nextEv) {
      // AC4: Automatically preload defaultBreakMinutes when event has unpaid break enabled
      setBreakMinutes(
        nextEv.hasUnpaidBreak ? String(nextEv.defaultBreakMinutes) : '0'
      );
    }
  };

  const liveSnapshot = useMemo(() => {
    if (
      editingShift &&
      editingShift.eventId === eventId &&
      !refreshRatesFromEvent
    ) {
      const mult =
        rateType !== editingShift.rateType
          ? selectedEvent?.multipliers?.[rateType] ?? editingShift.snapshot.multiplierSnap
          : editingShift.snapshot.multiplierSnap;
      return {
        ...editingShift.snapshot,
        multiplierSnap: mult,
      };
    }
    if (selectedEvent) {
      return createHistoricalSnapshot(selectedEvent, rateType);
    }
    return {
      eventNameSnap: '',
      eventColorSnap: 'emerald' as const,
      netRateSnap: 0,
      grossRateSnap: 0,
      multiplierSnap: 1,
      roundingModeSnap: 'none' as const,
      minGuaranteedHoursSnap: 0,
    };
  }, [editingShift, eventId, refreshRatesFromEvent, rateType, selectedEvent]);

  const liveComputed = useMemo(() => {
    return calculateShiftTotals({
      startTime,
      endTime,
      breakMinutes: Math.max(0, Math.round(Number(breakMinutes) || 0)),
      fixedBonus: Number(fixedBonus.replace(',', '.')) || 0,
      expenseAdjustment: Number(expenseAdjustment.replace(',', '.')) || 0,
      snapshot: liveSnapshot,
    });
  }, [startTime, endTime, breakMinutes, fixedBonus, expenseAdjustment, liveSnapshot]);

  const hasHistoricalRateDifference = Boolean(
    editingShift &&
      selectedEvent &&
      editingShift.eventId === selectedEvent.id &&
      (editingShift.snapshot.netRateSnap !== selectedEvent.netRate ||
        editingShift.snapshot.grossRateSnap !==
          (selectedEvent.grossRate && selectedEvent.grossRate > 0
            ? selectedEvent.grossRate
            : selectedEvent.netRate) ||
        editingShift.snapshot.roundingModeSnap !== selectedEvent.roundingMode ||
        editingShift.snapshot.minGuaranteedHoursSnap !==
          (selectedEvent.minGuaranteedHours || 0) ||
        editingShift.snapshot.multiplierSnap !==
          (selectedEvent.multipliers?.[rateType] ?? 1.0))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    const parsedBreak = Math.max(0, Math.round(Number(breakMinutes) || 0));
    const parsedBonus = Number(fixedBonus.replace(',', '.')) || 0;
    const parsedExpense = Number(expenseAdjustment.replace(',', '.')) || 0;

    if (editingShift) {
      updateShift(editingShift.id, {
        eventId,
        date,
        startTime,
        endTime,
        breakMinutes: parsedBreak,
        rateType,
        fixedBonus: parsedBonus,
        expenseAdjustment: parsedExpense,
        note,
        paymentStatus,
        refreshRatesFromEvent,
      });
      showToast('Turno actualizado');
    } else {
      addShift({
        eventId,
        date,
        startTime,
        endTime,
        breakMinutes: parsedBreak,
        rateType,
        fixedBonus: parsedBonus,
        expenseAdjustment: parsedExpense,
        note,
        paymentStatus,
      });
      setCycleForDate(date);
      showToast('Turno registrado');
    }
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editingShift ? 'Editar turno' : 'Registrar turno'}
      description="Introduce el horario y verifica el cálculo neto instantáneo antes de guardar."
      footer={
        <div className="space-y-3">
          {/* Previsualización instantánea en vivo (AC3, AC8) */}
          <div className="flex items-center justify-between rounded-md border border-border bg-surface-muted px-3.5 py-2.5">
            <div>
              <div className="text-xs text-text-secondary">
                Tiempo computable:{' '}
                <strong className="font-mono tabular-nums text-text">
                  {formatMinutes(liveComputed.billableMinutes)}
                </strong>
              </div>
              <div className="font-mono tabular-nums text-xs text-text-muted">
                {formatHourlyRate(liveSnapshot.netRateSnap)} ·{' '}
                {formatMultiplier(liveSnapshot.multiplierSnap)}
                {liveSnapshot.roundingModeSnap !== 'none'
                  ? ` · ${ROUNDING_MODE_LABELS[liveSnapshot.roundingModeSnap]}`
                  : ''}
                {liveSnapshot.minGuaranteedHoursSnap > 0
                  ? ` · Mín. ${liveSnapshot.minGuaranteedHoursSnap}h`
                  : ''}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono tabular-nums text-lg font-semibold text-emerald-500">
                {formatCurrency(liveComputed.totalNetAmount)}
              </div>
              <div className="font-mono tabular-nums text-xs text-blue-500">
                Bruto: {formatCurrency(liveComputed.totalGrossAmount)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="shift-form"
              disabled={!eventId}
              className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md bg-action px-5 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {editingShift ? 'Guardar cambios' : 'Guardar turno'}
            </button>
          </div>
        </div>
      }
    >
      <form id="shift-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Evento y Fecha */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="shift-event"
              className="block text-sm font-medium text-text-secondary"
            >
              Evento o categoría
            </label>
            <select
              id="shift-event"
              value={eventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {selectableEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({formatHourlyRate(ev.netRate)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="shift-date"
              className="block text-sm font-medium text-text-secondary"
            >
              Fecha de inicio
            </label>
            <input
              id="shift-date"
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>

        {/* Rango Horario de Entrada y Salida */}
        <div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="shift-start"
                className="block text-sm font-medium text-text-secondary"
              >
                Hora de entrada
              </label>
              <input
                id="shift-start"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>

            <div>
              <label
                htmlFor="shift-end"
                className="block text-sm font-medium text-text-secondary"
              >
                Hora de salida
              </label>
              <input
                id="shift-end"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
          </div>

          {liveComputed.crossesMidnight && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-info-line bg-info-quiet px-3 py-2 text-xs text-blue-500">
              <Moon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>
                Cruza la medianoche (+1 día): duración bruta de{' '}
                <strong className="font-mono tabular-nums">
                  {formatMinutes(liveComputed.rawDurationMinutes)}
                </strong>{' '}
                asignada al día de inicio.
              </span>
            </div>
          )}
        </div>

        {/* Descanso y Tipo de Jornada */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="shift-break"
              className="block text-sm font-medium text-text-secondary"
            >
              Descanso no remunerado (min)
            </label>
            <input
              id="shift-break"
              type="number"
              min="0"
              step="5"
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div>
            <label
              htmlFor="shift-rate-type"
              className="block text-sm font-medium text-text-secondary"
            >
              Tipo de jornada
            </label>
            <select
              id="shift-rate-type"
              value={rateType}
              onChange={(e) => setRateType(e.target.value as ShiftRateType)}
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {(Object.keys(SHIFT_RATE_LABELS) as ShiftRateType[]).map((rt) => {
                const mult = selectedEvent?.multipliers?.[rt] ?? 1;
                return (
                  <option key={rt} value={rt}>
                    {SHIFT_RATE_LABELS[rt]} ({formatMultiplier(mult)})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Pluses fijos y Gastos/Suplidos */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="shift-bonus"
              className="block text-sm font-medium text-text-secondary"
            >
              Plus fijo de jornada (€)
            </label>
            <input
              id="shift-bonus"
              type="number"
              step="0.50"
              value={fixedBonus}
              onChange={(e) => setFixedBonus(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div>
            <label
              htmlFor="shift-expense"
              className="block text-sm font-medium text-text-secondary"
            >
              Suplido (+€) o gasto (-€)
            </label>
            <input
              id="shift-expense"
              type="number"
              step="0.50"
              placeholder="Ej. -3.50 o 10"
              value={expenseAdjustment}
              onChange={(e) => setExpenseAdjustment(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>

        {/* Estado de cobro y Nota */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="shift-payment"
              className="block text-sm font-medium text-text-secondary"
            >
              Estado de cobro
            </label>
            <select
              id="shift-payment"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="pending">Pendiente de cobro</option>
              <option value="paid">Cobrado</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="shift-note"
              className="block text-sm font-medium text-text-secondary"
            >
              Nota de la sesión (opcional)
            </label>
            <input
              id="shift-note"
              type="text"
              placeholder="Ej. Sala principal, refuerzo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>

        {/* Aviso de inmutabilidad de tarifa histórica (AC9) */}
        {hasHistoricalRateDifference && editingShift && selectedEvent && (
          <div className="rounded-md border border-border bg-surface-muted p-3 text-xs text-text-secondary">
            <div>
              Este turno conserva su tarifa histórica original de{' '}
              <strong className="font-mono tabular-nums text-text">
                {formatHourlyRate(editingShift.snapshot.netRateSnap)}
              </strong>{' '}
              (la tarifa actual del evento es{' '}
              <span className="font-mono tabular-nums">
                {formatHourlyRate(selectedEvent.netRate)}
              </span>
              ).
            </div>
            <label className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-text">
              <input
                type="checkbox"
                checked={refreshRatesFromEvent}
                onChange={(e) => setRefreshRatesFromEvent(e.target.checked)}
                className="h-4 w-4 rounded-sm border-border"
              />
              <span>Actualizar este turno a la tarifa actual del evento</span>
            </label>
          </div>
        )}
      </form>
    </BottomSheet>
  );
};

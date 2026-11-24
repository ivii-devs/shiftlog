import React, { useEffect, useState } from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import { formatCurrency } from '../../domain/formatters';
import { useShiftStore } from '../../store/useShiftStore';
import { BottomSheet } from '../ui/BottomSheet';

interface CycleGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analytics: CycleAnalytics;
}

function parseOptionalPositiveNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export const CycleGoalSheet: React.FC<CycleGoalSheetProps> = ({
  open,
  onOpenChange,
  analytics,
}) => {
  const settings = useShiftStore((s) => s.settings);
  const setCycleGoalOverride = useShiftStore((s) => s.setCycleGoalOverride);
  const clearCycleGoalOverride = useShiftStore((s) => s.clearCycleGoalOverride);
  const showToast = useShiftStore((s) => s.showToast);

  const [eurosInput, setEurosInput] = useState('');
  const [hoursInput, setHoursInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setEurosInput(
      analytics.goalEurosTarget !== null ? String(analytics.goalEurosTarget) : ''
    );
    setHoursInput(
      analytics.goalHoursTarget !== null ? String(analytics.goalHoursTarget) : ''
    );
  }, [open, analytics.goalKey, analytics.goalEurosTarget, analytics.goalHoursTarget]);

  const hasBaseGoal =
    (settings.monthlyGoalNetEuros !== null && settings.monthlyGoalNetEuros > 0) ||
    (settings.monthlyGoalHours !== null && settings.monthlyGoalHours > 0);

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const netEuros = parseOptionalPositiveNumber(eurosInput);
    const hours = parseOptionalPositiveNumber(hoursInput);
    setCycleGoalOverride(analytics.goalKey, { netEuros, hours });
    showToast(`Meta guardada para ${analytics.cycle.label}`);
    onOpenChange(false);
  };

  const handleDisableForMonth = () => {
    setCycleGoalOverride(analytics.goalKey, { netEuros: null, hours: null });
    showToast(`Meta desactivada en ${analytics.cycle.label}`, 'info');
    onOpenChange(false);
  };

  const handleResetToBase = () => {
    clearCycleGoalOverride(analytics.goalKey);
    showToast(`Meta de ${analytics.cycle.label} restablecida a la meta base`, 'info');
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Meta de ${analytics.cycle.label}`}
      description="Personaliza el objetivo solo para este mes sin modificar la meta base ni los demás meses."
      footer={
        <div className="space-y-2">
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
              form="cycle-goal-form"
              className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md bg-action px-4 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Guardar meta de este mes
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(analytics.goalEurosTarget !== null ||
              analytics.goalHoursTarget !== null ||
              hasBaseGoal) && (
              <button
                type="button"
                onClick={handleDisableForMonth}
                className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md border border-border bg-surface-muted px-3 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                Dejar este mes sin meta
              </button>
            )}

            {analytics.isCustomGoalOverride && (
              <button
                type="button"
                onClick={handleResetToBase}
                className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md border border-border-strong bg-surface-muted px-3 text-xs font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                Restablecer a meta base
              </button>
            )}
          </div>
        </div>
      }
    >
      <form id="cycle-goal-form" onSubmit={handleSaveCustom} className="space-y-4">
        <div className="rounded-md border border-border bg-surface-muted px-3.5 py-2.5 text-xs text-text-secondary">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Origen actual:</span>
            <span className="font-medium text-text">
              {analytics.isCustomGoalOverride
                ? 'Personalizada para este mes'
                : 'Heredada de la meta base'}
            </span>
          </div>
          <div className="font-mono tabular-nums mt-1 text-text-muted">
            Meta base por defecto:{' '}
            {hasBaseGoal
              ? `${
                  settings.monthlyGoalNetEuros !== null
                    ? formatCurrency(settings.monthlyGoalNetEuros)
                    : 'Sin euros'
                } · ${
                  settings.monthlyGoalHours !== null
                    ? `${settings.monthlyGoalHours}h`
                    : 'Sin horas'
                }`
              : 'Sin meta base definida'}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="cycle-goal-euros"
              className="block text-sm font-medium text-text-secondary"
            >
              Meta neta del mes (€)
            </label>
            <input
              id="cycle-goal-euros"
              type="number"
              min="0"
              step="any"
              placeholder="Sin meta en euros"
              value={eurosInput}
              onChange={(e) => setEurosInput(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div>
            <label
              htmlFor="cycle-goal-hours"
              className="block text-sm font-medium text-text-secondary"
            >
              Meta de horas del mes (h)
            </label>
            <input
              id="cycle-goal-hours"
              type="number"
              min="0"
              step="any"
              placeholder="Sin meta en horas"
              value={hoursInput}
              onChange={(e) => setHoursInput(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>
      </form>
    </BottomSheet>
  );
};

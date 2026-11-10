import React from 'react';
import { CheckCircle2, Clock, Plus } from 'lucide-react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatHourlyRate,
  formatMinutes,
  formatPercentage,
} from '../../domain/formatters';
import { useShiftStore } from '../../store/useShiftStore';

interface CycleSummaryHeroProps {
  analytics: CycleAnalytics;
  onOpenNewShift: () => void;
}

export const CycleSummaryHero: React.FC<CycleSummaryHeroProps> = ({
  analytics,
  onOpenNewShift,
}) => {
  const setCyclePaymentStatus = useShiftStore((s) => s.setCyclePaymentStatus);
  const showToast = useShiftStore((s) => s.showToast);

  const handleToggleCyclePaid = () => {
    if (analytics.totalShifts === 0) return;
    const nextStatus = analytics.allPaid ? 'pending' : 'paid';
    const count = setCyclePaymentStatus(analytics.cycle, nextStatus);
    showToast(
      nextStatus === 'paid'
        ? `${count} turnos marcados como cobrados`
        : `${count} turnos marcados como pendientes`
    );
  };

  return (
    <section
      aria-label="Resumen del ciclo actual"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-text-secondary">
            Ingresos netos estimados ({analytics.cycle.label})
          </div>
          <div className="font-mono tabular-nums mt-1 text-3xl font-semibold tracking-tight text-emerald-500">
            {formatCurrency(analytics.totalNetEarned)}
          </div>
          <div className="font-mono tabular-nums mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span>
              Tiempo: <strong className="text-text">{formatMinutes(analytics.totalBillableMinutes)}</strong>
            </span>
            <span>·</span>
            <span>
              Turnos: <strong className="text-text">{analytics.totalShifts}</strong>
            </span>
            <span>·</span>
            <span>
              Bruto: <strong className="text-blue-500">{formatCurrency(analytics.totalGrossEarned)}</strong>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenNewShift}
          className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md bg-action px-4 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          <span>Registrar turno</span>
        </button>
      </div>

      {/* Desglose Cobrado vs Pendiente y acción masiva del ciclo (AC11) */}
      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-border pt-3.5 sm:flex-row sm:items-center">
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="rounded-md border border-success-line bg-success-quiet px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Cobrado ({analytics.paidShiftsCount})</span>
            </div>
            <div className="font-mono tabular-nums mt-0.5 text-sm font-semibold text-text">
              {formatCurrency(analytics.paidNetAmount)}
            </div>
          </div>

          <div className="rounded-md border border-warning-line bg-warning-quiet px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Pendiente ({analytics.pendingShiftsCount})</span>
            </div>
            <div className="font-mono tabular-nums mt-0.5 text-sm font-semibold text-text">
              {formatCurrency(analytics.pendingNetAmount)}
            </div>
          </div>
        </div>

        {analytics.totalShifts > 0 && (
          <button
            type="button"
            onClick={handleToggleCyclePaid}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border-strong bg-surface-muted px-3.5 text-xs font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {analytics.allPaid
              ? 'Marcar ciclo como pendiente'
              : 'Marcar todo el ciclo como cobrado'}
          </button>
        )}
      </div>

      {/* Barra de progreso de meta mensual y ritmo actual (AC12) */}
      {(analytics.goalEurosTarget !== null || analytics.goalHoursTarget !== null) && (
        <div className="mt-4 space-y-3 border-t border-border pt-3.5">
          {analytics.goalEurosTarget !== null && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-secondary">
                  Meta mensual neta
                </span>
                <span className="font-mono tabular-nums text-text">
                  {formatCurrency(analytics.totalNetEarned)} /{' '}
                  {formatCurrency(analytics.goalEurosTarget)} (
                  {formatPercentage(analytics.goalEurosProgressPct, 0)})
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150"
                  style={{ width: `${analytics.goalEurosProgressPct}%` }}
                />
              </div>
              <div className="font-mono tabular-nums mt-1.5 text-xs text-text-secondary">
                {analytics.remainingEuros <= 0 ? (
                  <span className="text-emerald-500">
                    Objetivo mensual en euros superado
                  </span>
                ) : analytics.effectiveHourlyNetRate > 0 ? (
                  <span>
                    Faltan{' '}
                    <strong className="text-text">
                      {formatCurrency(analytics.remainingEuros)}
                    </strong>{' '}
                    ({' '}
                    <strong className="text-text">
                      {formatMinutes(analytics.remainingMinutesAtCurrentPace)}
                    </strong>{' '}
                    al ritmo medio de{' '}
                    {formatHourlyRate(analytics.effectiveHourlyNetRate)})
                  </span>
                ) : (
                  <span>
                    Faltan {formatCurrency(analytics.remainingEuros)} para completar la meta
                  </span>
                )}
              </div>
            </div>
          )}

          {analytics.goalHoursTarget !== null && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-text-secondary">
                  Meta mensual de horas
                </span>
                <span className="font-mono tabular-nums text-text">
                  {formatMinutes(analytics.totalBillableMinutes)} /{' '}
                  {analytics.goalHoursTarget}h (
                  {formatPercentage(analytics.goalHoursProgressPct, 0)})
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${analytics.goalHoursProgressPct}%` }}
                />
              </div>
              <div className="font-mono tabular-nums mt-1 text-xs text-text-secondary">
                {analytics.remainingGoalMinutes <= 0 ? (
                  <span className="text-emerald-500">
                    Objetivo de horas del ciclo alcanzado
                  </span>
                ) : (
                  <span>
                    Restan{' '}
                    <strong className="text-text">
                      {formatMinutes(analytics.remainingGoalMinutes)}
                    </strong>{' '}
                    para cumplir el objetivo de horas
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

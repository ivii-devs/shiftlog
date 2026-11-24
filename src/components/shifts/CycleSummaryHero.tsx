import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatHourlyRate,
  formatMinutes,
  formatPercentage,
} from '../../domain/formatters';

interface CycleSummaryHeroProps {
  analytics: CycleAnalytics;
  onEditGoal: () => void;
}

export const CycleSummaryHero: React.FC<CycleSummaryHeroProps> = ({
  analytics,
  onEditGoal,
}) => {
  const hasAnyGoal =
    analytics.goalEurosTarget !== null || analytics.goalHoursTarget !== null;

  return (
    <section
      aria-label="Resumen del ciclo actual"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div>
        <div className="text-xs font-medium text-text-secondary">
          Ingresos netos estimados ({analytics.cycle.label})
        </div>
        <div className="font-mono tabular-nums mt-1 text-3xl font-semibold tracking-tight text-emerald-500">
          {formatCurrency(analytics.totalNetEarned)}
        </div>
        <div className="font-mono tabular-nums mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
          <span>
            Tiempo:{' '}
            <strong className="text-text">
              {formatMinutes(analytics.totalBillableMinutes)}
            </strong>
          </span>
          <span>·</span>
          <span>
            Turnos: <strong className="text-text">{analytics.totalShifts}</strong>
          </span>
          <span>·</span>
          <span>
            Bruto:{' '}
            <strong className="text-blue-500">
              {formatCurrency(analytics.totalGrossEarned)}
            </strong>
          </span>
        </div>
      </div>

      {/* Bloque de metas mensuales con acceso directo de edición rápida */}
      <div className="mt-4 space-y-3 border-t border-border pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text">Metas del ciclo</span>
            <span
              className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${
                analytics.isCustomGoalOverride
                  ? 'border-info-line bg-info-quiet text-blue-500'
                  : 'border-border bg-surface-muted text-text-secondary'
              }`}
            >
              {analytics.isCustomGoalOverride ? 'Personalizada' : 'Meta base'}
            </span>
          </div>

          <button
            type="button"
            onClick={onEditGoal}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 text-xs font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{hasAnyGoal ? 'Editar meta' : 'Configurar meta del mes'}</span>
          </button>
        </div>

        {!hasAnyGoal ? (
          <p className="text-xs text-text-secondary">
            Sin meta activa para {analytics.cycle.label}. Puedes definir un objetivo propio para este mes cuando quieras.
          </p>
        ) : (
          <>
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
                      (
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
          </>
        )}
      </div>
    </section>
  );
};

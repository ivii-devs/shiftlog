import React from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatHourlyRate,
  formatMinutes,
  formatPercentage,
} from '../../domain/formatters';

interface CycleSummaryHeroProps {
  analytics: CycleAnalytics;
}

export const CycleSummaryHero: React.FC<CycleSummaryHeroProps> = ({ analytics }) => {
  const hasAnyGoal =
    analytics.goalEurosTarget !== null || analytics.goalHoursTarget !== null;

  return (
    <section
      aria-label="Resumen del ciclo actual"
      className="rounded-lg border border-border bg-surface p-3.5"
    >
      <div>
        <div className="text-xs font-medium text-text-secondary">
          Ingresos netos estimados ({analytics.cycle.label})
        </div>
        <div className="font-mono tabular-nums mt-0.5 text-3xl font-semibold tracking-tight text-emerald-500">
          {formatCurrency(analytics.totalNetEarned)}
        </div>
        <div className="font-mono tabular-nums mt-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-text-secondary">
          <strong className="text-text">
            {formatMinutes(analytics.totalBillableMinutes)}
          </strong>
          <span>·</span>
          <span>
            <strong className="text-text">{analytics.totalShifts}</strong>{' '}
            {analytics.totalShifts === 1 ? 'turno' : 'turnos'}
          </span>
          <span>·</span>
          <span className="truncate">
            Bruto{' '}
            <strong className="text-blue-500">
              {formatCurrency(analytics.totalGrossEarned)}
            </strong>
          </span>
        </div>
      </div>

      {/* Bloque compacto de metas del ciclo (edición centralizada en Ajustes > Ciclo y metas) */}
      {hasAnyGoal && (
        <div className="mt-3 space-y-2.5 border-t border-border pt-3">
          <div className="flex items-center justify-between gap-2">
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

          {analytics.goalEurosTarget !== null && (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="shrink-0 font-medium text-text-secondary">
                  Meta neta
                </span>
                <span className="font-mono tabular-nums truncate text-text">
                  {formatCurrency(analytics.totalNetEarned)} /{' '}
                  {formatCurrency(analytics.goalEurosTarget)} (
                  {formatPercentage(analytics.goalEurosProgressPct, 0)})
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-full bg-emerald-500 transition-all duration-150"
                  style={{ width: `${analytics.goalEurosProgressPct}%` }}
                />
              </div>
              <div className="font-mono tabular-nums mt-1 truncate text-xs text-text-secondary">
                {analytics.remainingEuros <= 0 ? (
                  <span className="text-emerald-500">Meta neta superada</span>
                ) : analytics.effectiveHourlyNetRate > 0 ? (
                  <span>
                    Faltan{' '}
                    <strong className="text-text">
                      {formatCurrency(analytics.remainingEuros)}
                    </strong>{' '}
                    (~
                    <strong className="text-text">
                      {formatMinutes(analytics.remainingMinutesAtCurrentPace)}
                    </strong>{' '}
                    a {formatHourlyRate(analytics.effectiveHourlyNetRate)})
                  </span>
                ) : (
                  <span>
                    Faltan{' '}
                    <strong className="text-text">
                      {formatCurrency(analytics.remainingEuros)}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {analytics.goalHoursTarget !== null && (
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="shrink-0 font-medium text-text-secondary">
                  Meta de horas
                </span>
                <span className="font-mono tabular-nums truncate text-text">
                  {formatMinutes(analytics.totalBillableMinutes)} /{' '}
                  {analytics.goalHoursTarget}h (
                  {formatPercentage(analytics.goalHoursProgressPct, 0)})
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${analytics.goalHoursProgressPct}%` }}
                />
              </div>
              <div className="font-mono tabular-nums mt-1 truncate text-xs text-text-secondary">
                {analytics.remainingGoalMinutes <= 0 ? (
                  <span className="text-emerald-500">Meta de horas alcanzada</span>
                ) : (
                  <span>
                    Faltan{' '}
                    <strong className="text-text">
                      {formatMinutes(analytics.remainingGoalMinutes)}
                    </strong>{' '}
                    para la meta
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

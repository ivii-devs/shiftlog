import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatMinutes,
  formatPercentage,
} from '../../domain/formatters';

interface SixCyclesChartProps {
  analytics: CycleAnalytics;
}

export const SixCyclesChart: React.FC<SixCyclesChartProps> = ({ analytics }) => {
  const maxNet = Math.max(
    1,
    ...analytics.sixCyclesSeries.map((item) => item.totalNetEarned)
  );

  const renderVariationBadge = (label: string, pct: number | null) => {
    if (pct === null) {
      return (
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-text-secondary">
          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
          <span>{label}: sin datos en el ciclo anterior</span>
        </div>
      );
    }

    const isPositive = pct > 0;
    const isZero = pct === 0;
    const Icon = isPositive ? TrendingUp : isZero ? Minus : TrendingDown;
    const toneClass = isPositive
      ? 'border-success-line bg-success-quiet text-emerald-500'
      : isZero
        ? 'border-border bg-surface-muted text-text-secondary'
        : 'border-danger-line bg-danger-quiet text-red-500';

    return (
      <div
        className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium ${toneClass}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span>
          <strong className="font-mono tabular-nums">
            {formatPercentage(pct, 1, true)}
          </strong>{' '}
          de {label} respecto al ciclo anterior
        </span>
      </div>
    );
  };

  return (
    <section
      aria-label="Evolución de los últimos 6 ciclos"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold tracking-tight text-text">
        Evolución intermensual (últimos 6 ciclos)
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        Comparativa de ingresos netos y horas computables frente a los cierres anteriores.
      </p>

      {/* Indicadores de variación porcentual respecto al ciclo inmediato anterior (AC14) */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {renderVariationBadge('ingresos netos', analytics.netVariationPct)}
        {renderVariationBadge('horas trabajadas', analytics.hoursVariationPct)}
      </div>

      {/* Gráfico de barras de los últimos 6 ciclos */}
      <div className="mt-5 grid grid-cols-6 items-end gap-2 pt-4">
        {analytics.sixCyclesSeries.map((bar) => {
          const heightPct =
            bar.totalNetEarned > 0
              ? Math.max(8, Math.round((bar.totalNetEarned / maxNet) * 100))
              : 4;

          return (
            <div
              key={bar.cycle.id}
              className="flex flex-col items-center text-center"
            >
              <div className="font-mono tabular-nums mb-1.5 text-xs font-medium text-text">
                {bar.totalNetEarned > 0
                  ? formatCurrency(bar.totalNetEarned).replace(',00 €', ' €')
                  : '0 €'}
              </div>

              <div className="flex h-32 w-full items-end justify-center rounded-sm bg-surface-muted p-1">
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full rounded-sm transition-all duration-150 ${
                    bar.isCurrent
                      ? 'bg-emerald-500'
                      : bar.totalNetEarned > 0
                        ? 'bg-border-strong'
                        : 'bg-border'
                  }`}
                />
              </div>

              <div
                className={`font-mono tabular-nums mt-2 text-xs ${
                  bar.isCurrent
                    ? 'font-semibold text-text'
                    : 'text-text-secondary'
                }`}
              >
                {bar.cycle.shortLabel}
              </div>
              <div className="font-mono tabular-nums text-xs text-text-muted">
                {formatMinutes(bar.totalBillableMinutes)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

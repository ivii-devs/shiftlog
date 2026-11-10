import React from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatMinutes,
  formatPercentage,
} from '../../domain/formatters';
import { CATEGORY_COLOR_HEX } from '../../domain/types';

interface CategoryBreakdownProps {
  analytics: CycleAnalytics;
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({
  analytics,
}) => {
  return (
    <section
      aria-label="Desglose de ingresos por categoría"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold tracking-tight text-text">
        Desglose por evento y categoría
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        Proporción de ingresos netos y tiempo dedicado a cada trabajo en este ciclo.
      </p>

      {analytics.categoryBreakdown.length === 0 ? (
        <p className="mt-4 text-sm text-text-secondary">
          Aún no hay turnos registrados en este ciclo para calcular el desglose por categoría.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {analytics.categoryBreakdown.map((cat) => (
            <div key={cat.eventId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLOR_HEX[cat.color] }}
                  />
                  <span className="truncate text-sm font-semibold text-text">
                    {cat.eventName}
                  </span>
                  <span className="font-mono tabular-nums text-xs text-text-secondary">
                    ({cat.shiftsCount} {cat.shiftsCount === 1 ? 'turno' : 'turnos'} ·{' '}
                    {formatMinutes(cat.billableMinutes)})
                  </span>
                </div>

                <div className="shrink-0 text-right">
                  <span className="font-mono tabular-nums text-sm font-semibold text-emerald-500">
                    {formatCurrency(cat.netAmount)}
                  </span>
                  <span className="font-mono tabular-nums ml-2 text-xs text-text-secondary">
                    {formatPercentage(cat.percentageOfCycleNet, 1)}
                  </span>
                </div>
              </div>

              <div className="mt-2 h-2 w-full overflow-hidden rounded-sm bg-surface-muted">
                <div
                  className="h-full transition-all duration-150"
                  style={{
                    width: `${Math.min(100, Math.max(2, cat.percentageOfCycleNet))}%`,
                    backgroundColor: CATEGORY_COLOR_HEX[cat.color],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

import React from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import { formatCurrency, formatPercentage } from '../../domain/formatters';

interface GrossVsNetCardProps {
  analytics: CycleAnalytics;
}

export const GrossVsNetCard: React.FC<GrossVsNetCardProps> = ({ analytics }) => {
  return (
    <section
      aria-label="Comparativa Bruto frente a Neto"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold tracking-tight text-text">
        Comparativa Bruto vs. Neto
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        Relación entre el total facturado bruto y el importe limpio neto según las tarifas registradas.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs text-text-secondary">Total bruto</div>
          <div className="font-mono tabular-nums mt-1 text-base font-semibold text-blue-500">
            {formatCurrency(analytics.totalGrossEarned)}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs text-text-secondary">Total neto limpio</div>
          <div className="font-mono tabular-nums mt-1 text-base font-semibold text-emerald-500">
            {formatCurrency(analytics.totalNetEarned)}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs text-text-secondary">Diferencia (€)</div>
          <div className="font-mono tabular-nums mt-1 text-base font-semibold text-text">
            {formatCurrency(analytics.grossNetDifference)}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs text-text-secondary">Descuento estimado</div>
          <div className="font-mono tabular-nums mt-1 text-base font-semibold text-amber-500">
            {formatPercentage(analytics.estimatedWithholdingPct, 1)}
          </div>
        </div>
      </div>
    </section>
  );
};

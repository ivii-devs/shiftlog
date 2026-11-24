import React from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatHourlyRate,
  formatMinutes,
} from '../../domain/formatters';

interface MonthActivityCardProps {
  analytics: CycleAnalytics;
}

export const MonthActivityCard: React.FC<MonthActivityCardProps> = ({ analytics }) => {
  return (
    <section
      aria-label="Actividad y ritmos del mes actual"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold tracking-tight text-text">
        Actividad del ciclo ({analytics.cycle.label})
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        Días activos frente a libres y promedios reales del periodo seleccionado.
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs font-medium text-text-secondary">
            Días trabajados / libres
          </div>
          <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-text">
            <span className="text-emerald-500">{analytics.workedDaysCount}</span>
            <span className="text-text-muted"> / </span>
            <span>{analytics.freeDaysCount}</span>
          </div>
          <div className="font-mono tabular-nums mt-0.5 text-xs text-text-muted">
            de {analytics.cycleDaysTotal} días del ciclo
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs font-medium text-text-secondary">
            Media por día trabajado
          </div>
          <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-text">
            {formatMinutes(analytics.avgMinutesPerWorkedDay)}
          </div>
          <div className="font-mono tabular-nums mt-0.5 text-xs text-text-secondary">
            {formatCurrency(analytics.avgNetPerWorkedDay)} / día
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs font-medium text-text-secondary">
            Neto medio por turno
          </div>
          <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-emerald-500">
            {formatCurrency(analytics.avgNetPerShift)}
          </div>
          <div className="font-mono tabular-nums mt-0.5 text-xs text-text-secondary">
            {formatMinutes(analytics.avgMinutesPerShift)} por turno
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface-muted p-3">
          <div className="text-xs font-medium text-text-secondary">
            Tarifa media neta real
          </div>
          <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-text">
            {formatHourlyRate(analytics.actualHourlyNetRate)}
          </div>
          <div className="font-mono tabular-nums mt-0.5 text-xs text-text-muted">
            {analytics.totalShifts}{' '}
            {analytics.totalShifts === 1 ? 'turno' : 'turnos'} registrados
          </div>
        </div>
      </div>
    </section>
  );
};

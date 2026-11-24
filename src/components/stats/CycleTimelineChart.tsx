import React, { useEffect, useMemo, useState } from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import { formatCurrency, formatMinutes } from '../../domain/formatters';

interface CycleTimelineChartProps {
  analytics: CycleAnalytics;
}

type TimelineGrouping = 'days' | 'weeks';
type TimelineMetric = 'hours' | 'net';

function formatCompactEuro(amount: number): string {
  if (amount === 0) return '0 €';
  return formatCurrency(amount).replace(',00 €', ' €');
}

export const CycleTimelineChart: React.FC<CycleTimelineChartProps> = ({
  analytics,
}) => {
  const [grouping, setGrouping] = useState<TimelineGrouping>('weeks');
  const [metric, setMetric] = useState<TimelineMetric>('net');
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  useEffect(() => {
    const defaultDay =
      analytics.dailySeries.find((d) => d.isToday) ??
      [...analytics.dailySeries].reverse().find((d) => d.shiftsCount > 0) ??
      analytics.dailySeries[0] ??
      null;
    setSelectedDayDate(defaultDay?.date ?? null);
  }, [analytics.cycle.id, analytics.dailySeries]);

  const maxWeeklyValue = useMemo(() => {
    return Math.max(
      1,
      ...analytics.weeklySeries.map((w) =>
        metric === 'net' ? w.totalNetEarned : w.totalMinutes
      )
    );
  }, [analytics.weeklySeries, metric]);

  const maxDailyValue = useMemo(() => {
    return Math.max(
      1,
      ...analytics.dailySeries.map((d) =>
        metric === 'net' ? d.totalNetEarned : d.totalMinutes
      )
    );
  }, [analytics.dailySeries, metric]);

  const selectedDayPoint = useMemo(() => {
    if (!selectedDayDate) return null;
    return analytics.dailySeries.find((d) => d.date === selectedDayDate) ?? null;
  }, [analytics.dailySeries, selectedDayDate]);

  const barToneClass = metric === 'net' ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <section
      aria-label="Distribución del ciclo por días y semanas"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-text">
            Ritmo del ciclo
          </h2>
          <p className="mt-0.5 text-xs text-text-secondary">
            Alterna entre agrupación diaria o semanal y entre horas computables o ingresos netos.
          </p>
        </div>

        {/* Selectores segmentados compactos (>= 44px) */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div
            role="group"
            aria-label="Agrupación temporal del gráfico"
            className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-muted p-1"
          >
            <button
              type="button"
              aria-pressed={grouping === 'days'}
              onClick={() => setGrouping('days')}
              className={`min-h-[44px] min-w-[44px] rounded-sm px-2 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                grouping === 'days'
                  ? 'bg-selected font-semibold text-text'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Por días
            </button>
            <button
              type="button"
              aria-pressed={grouping === 'weeks'}
              onClick={() => setGrouping('weeks')}
              className={`min-h-[44px] min-w-[44px] rounded-sm px-2 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                grouping === 'weeks'
                  ? 'bg-selected font-semibold text-text'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Por semanas
            </button>
          </div>

          <div
            role="group"
            aria-label="Magnitud del gráfico"
            className="grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-muted p-1"
          >
            <button
              type="button"
              aria-pressed={metric === 'hours'}
              onClick={() => setMetric('hours')}
              className={`min-h-[44px] min-w-[44px] rounded-sm px-2 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                metric === 'hours'
                  ? 'bg-selected font-semibold text-text'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Horas
            </button>
            <button
              type="button"
              aria-pressed={metric === 'net'}
              onClick={() => setMetric('net')}
              className={`min-h-[44px] min-w-[44px] rounded-sm px-2 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                metric === 'net'
                  ? 'bg-selected font-semibold text-text'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              Neto (€)
            </button>
          </div>
        </div>
      </div>

      {/* Vista Por semanas */}
      {grouping === 'weeks' ? (
        <div className="scroll-x-container mt-5 overflow-x-auto pb-1">
          <div
            className="grid min-w-full items-end gap-2 pt-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, analytics.weeklySeries.length)}, minmax(56px, 1fr))`,
            }}
          >
            {analytics.weeklySeries.map((week) => {
              const value =
                metric === 'net' ? week.totalNetEarned : week.totalMinutes;
              const heightPct =
                value > 0
                  ? Math.max(8, Math.round((value / maxWeeklyValue) * 100))
                  : 4;

              return (
                <div
                  key={week.weekIndex}
                  className="flex flex-col items-center text-center"
                >
                  <div className="font-mono tabular-nums mb-1.5 whitespace-nowrap text-xs font-medium text-text">
                    {metric === 'net'
                      ? formatCompactEuro(week.totalNetEarned)
                      : formatMinutes(week.totalMinutes)}
                  </div>

                  <div className="flex h-32 w-full items-end justify-center rounded-sm bg-surface-muted p-1">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-sm transition-all duration-150 ${
                        value > 0 ? barToneClass : 'bg-border'
                      }`}
                    />
                  </div>

                  <div className="font-mono tabular-nums mt-2 whitespace-nowrap text-xs font-semibold text-text">
                    {week.label}
                  </div>
                  <div className="font-mono tabular-nums whitespace-nowrap text-xs text-text-muted">
                    {week.rangeLabel}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Vista Por días */
        <div className="mt-4 space-y-3">
          {selectedDayPoint && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-xs">
              <span className="font-mono tabular-nums font-semibold text-text">
                Día {selectedDayPoint.dayLabel}
                {selectedDayPoint.isToday ? ' (Hoy)' : ''}
              </span>
              <span className="font-mono tabular-nums text-text-secondary">
                {selectedDayPoint.shiftsCount === 0 ? (
                  'Sin turnos registrados'
                ) : (
                  <>
                    <strong className="text-text">
                      {formatMinutes(selectedDayPoint.totalMinutes)}
                    </strong>{' '}
                    ·{' '}
                    <strong className="text-emerald-500">
                      {formatCurrency(selectedDayPoint.totalNetEarned)}
                    </strong>{' '}
                    · {selectedDayPoint.shiftsCount}{' '}
                    {selectedDayPoint.shiftsCount === 1 ? 'turno' : 'turnos'}
                  </>
                )}
              </span>
            </div>
          )}

          <div className="scroll-x-container overflow-x-auto pb-2">
            <div className="flex min-w-max items-end gap-1.5 pt-2">
              {analytics.dailySeries.map((day) => {
                const value =
                  metric === 'net' ? day.totalNetEarned : day.totalMinutes;
                const heightPct =
                  value > 0
                    ? Math.max(8, Math.round((value / maxDailyValue) * 100))
                    : 4;
                const isSelected = day.date === selectedDayDate;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDayDate(day.date)}
                    aria-label={`Día ${day.dayLabel}: ${formatMinutes(day.totalMinutes)}, ${formatCurrency(day.totalNetEarned)}`}
                    aria-pressed={isSelected}
                    className={`flex min-h-[44px] min-w-[44px] w-11 shrink-0 flex-col items-center rounded-sm p-1 transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                      isSelected ? 'bg-selected' : 'hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex h-28 w-full items-end justify-center rounded-sm bg-surface-muted p-0.5">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-sm transition-all duration-150 ${
                          value > 0 ? barToneClass : 'bg-border'
                        }`}
                      />
                    </div>
                    <span
                      className={`font-mono tabular-nums mt-1.5 text-xs ${
                        day.isToday
                          ? 'font-bold text-text underline underline-offset-2'
                          : isSelected
                            ? 'font-semibold text-text'
                            : 'text-text-secondary'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

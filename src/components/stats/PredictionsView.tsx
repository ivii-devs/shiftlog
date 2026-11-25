import React, { useEffect, useMemo, useState } from 'react';
import {
  simulateExtraWork,
  type CycleAnalytics,
} from '../../domain/analytics';
import { timeToMinutes } from '../../domain/calculations';
import {
  formatCurrency,
  formatHourlyRate,
  formatMinutes,
  formatMultiplier,
  formatPercentage,
  round2,
} from '../../domain/formatters';
import {
  SHIFT_RATE_LABELS,
  type ShiftRateType,
  type WorkEvent,
} from '../../domain/types';

interface PredictionsViewProps {
  analytics: CycleAnalytics;
  events: WorkEvent[];
}

function getDefaultShiftHoursForEvent(event: WorkEvent | undefined, fallbackHours: number): number {
  const firstTpl = event?.quickTemplates?.[0];
  if (!firstTpl) return fallbackHours;
  const start = timeToMinutes(firstTpl.startTime);
  const end = timeToMinutes(firstTpl.endTime);
  const raw = end > start ? end - start : 1440 - start + end;
  const breakMins = event.hasUnpaidBreak
    ? firstTpl.breakMinutes ?? event.defaultBreakMinutes
    : 0;
  const netMins = Math.max(0, raw - breakMins);
  return netMins > 0 ? round2(netMins / 60) : fallbackHours;
}

export const PredictionsView: React.FC<PredictionsViewProps> = ({
  analytics,
  events,
}) => {
  const { predictions } = analytics;
  const activeEvents = useMemo(
    () => events.filter((ev) => !ev.archived),
    [events]
  );

  const defaultShiftHours = useMemo(() => {
    if (analytics.avgMinutesPerShift > 0) {
      return round2(analytics.avgMinutesPerShift / 60);
    }
    return 6;
  }, [analytics.avgMinutesPerShift]);

  const [simMode, setSimMode] = useState<'hours' | 'shifts'>('hours');
  const [quantityInput, setQuantityInput] = useState('8');
  const [hoursPerShiftInput, setHoursPerShiftInput] = useState(
    String(defaultShiftHours)
  );
  const [hasCustomShiftHours, setHasCustomShiftHours] = useState(false);
  const [rateSource, setRateSource] = useState<string>('average');
  const [rateType, setRateType] = useState<ShiftRateType>('normal');

  const selectedEvent = useMemo(
    () => activeEvents.find((ev) => ev.id === rateSource),
    [activeEvents, rateSource]
  );

  useEffect(() => {
    setHasCustomShiftHours(false);
  }, [analytics.cycle.id]);

  useEffect(() => {
    if (hasCustomShiftHours) return;
    if (rateSource === 'average' || !selectedEvent) {
      setHoursPerShiftInput(String(defaultShiftHours));
    } else {
      setHoursPerShiftInput(
        String(getDefaultShiftHoursForEvent(selectedEvent, defaultShiftHours))
      );
    }
  }, [defaultShiftHours, rateSource, selectedEvent, hasCustomShiftHours, analytics.cycle.id]);

  const handleRateSourceChange = (nextSource: string) => {
    setRateSource(nextSource);
    if (!hasCustomShiftHours) {
      if (nextSource === 'average') {
        setHoursPerShiftInput(String(defaultShiftHours));
      } else {
        const ev = activeEvents.find((item) => item.id === nextSource);
        setHoursPerShiftInput(
          String(getDefaultShiftHoursForEvent(ev, defaultShiftHours))
        );
      }
    }
  };

  const handleModeChange = (nextMode: 'hours' | 'shifts') => {
    setSimMode(nextMode);
    if (nextMode === 'shifts' && Number(quantityInput) >= 6) {
      setQuantityInput('2');
    } else if (nextMode === 'hours' && Number(quantityInput) <= 3) {
      setQuantityInput('8');
    }
  };

  const effectiveSimRate = useMemo(() => {
    if (rateSource === 'average' || !selectedEvent) {
      return analytics.effectiveHourlyNetRate;
    }
    const mult = selectedEvent.multipliers[rateType] ?? 1;
    return round2(selectedEvent.netRate * mult);
  }, [rateSource, selectedEvent, rateType, analytics.effectiveHourlyNetRate]);

  const parsedQuantity = Math.max(
    0,
    Number(quantityInput.replace(',', '.')) || 0
  );
  const parsedHoursPerShift = Math.max(
    0.5,
    Number(hoursPerShiftInput.replace(',', '.')) || defaultShiftHours
  );

  const simulation = useMemo(
    () =>
      simulateExtraWork({
        analytics,
        mode: simMode,
        quantity: parsedQuantity,
        hourlyNetRate: effectiveSimRate,
        hoursPerShift: parsedHoursPerShift,
      }),
    [analytics, simMode, parsedQuantity, effectiveSimRate, parsedHoursPerShift]
  );

  const phaseMeta =
    predictions.cyclePhase === 'current'
      ? {
          label: 'Ciclo en curso',
          badgeClass: 'border-info-line bg-info-quiet text-blue-500',
        }
      : predictions.cyclePhase === 'past'
        ? {
            label: 'Ciclo cerrado',
            badgeClass: 'border-border bg-surface-muted text-text-secondary',
          }
        : {
            label: 'Ciclo próximo',
            badgeClass: 'border-warning-line bg-warning-quiet text-amber-500',
          };

  const elapsedPct =
    analytics.cycleDaysTotal > 0
      ? Math.min(
          100,
          Math.round((predictions.elapsedDays / analytics.cycleDaysTotal) * 100)
        )
      : 0;

  const referenceShiftMinutes =
    analytics.avgMinutesPerShift > 0 ? analytics.avgMinutesPerShift : 360;

  const hasAnyGoal =
    analytics.goalEurosTarget !== null || analytics.goalHoursTarget !== null;

  return (
    <div className="space-y-4">
      {/* 1. Proyección al cierre del ciclo */}
      <section
        aria-label="Proyección al cierre del ciclo"
        className="rounded-lg border border-border bg-surface p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-text">
              Proyección al cierre ({analytics.cycle.label})
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Estimación basada en tu ritmo diario real y los turnos ya agendados.
            </p>
          </div>
          <span
            className={`rounded-sm border px-2 py-0.5 text-xs font-medium ${phaseMeta.badgeClass}`}
          >
            {phaseMeta.label}
          </span>
        </div>

        {/* Progreso temporal del ciclo */}
        <div className="mt-3.5">
          <div className="font-mono tabular-nums flex items-center justify-between text-xs text-text-secondary">
            <span>
              {predictions.elapsedDays} de {analytics.cycleDaysTotal} días transcurridos
            </span>
            <span className="text-text">
              {predictions.remainingDays}{' '}
              {predictions.remainingDays === 1 ? 'día restante' : 'días restantes'}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-sm bg-surface-muted">
            <div
              className="h-full bg-blue-500 transition-all duration-150"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </div>

        {/* Devengado vs Agendado vs Cierre estimado */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-surface-muted p-3">
            <div className="text-xs font-medium text-text-secondary">
              Devengado hasta hoy
            </div>
            <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-text">
              {formatCurrency(predictions.earnedToDateNet)}
            </div>
            <div className="font-mono tabular-nums mt-0.5 text-xs text-text-muted">
              {formatMinutes(predictions.workedToDateMinutes)}
            </div>
          </div>

          <div className="rounded-md border border-border bg-surface-muted p-3">
            <div className="text-xs font-medium text-text-secondary">
              Turnos ya agendados ({predictions.scheduledFutureShiftsCount})
            </div>
            <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-blue-500">
              {formatCurrency(predictions.scheduledFutureNet)}
            </div>
            <div className="font-mono tabular-nums mt-0.5 text-xs text-text-muted">
              {formatMinutes(predictions.scheduledFutureMinutes)}
            </div>
          </div>

          <div className="rounded-md border border-success-line bg-success-quiet p-3">
            <div className="text-xs font-medium text-emerald-500">
              Cierre estimado del ciclo
            </div>
            <div className="font-mono tabular-nums mt-1 text-lg font-semibold text-text">
              {formatCurrency(predictions.projectedTotalNet)}
            </div>
            <div className="font-mono tabular-nums mt-0.5 text-xs text-emerald-500">
              {formatMinutes(predictions.projectedTotalMinutes)}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Ritmo necesario para alcanzar las metas */}
      <section
        aria-label="Ritmo necesario para cumplir metas"
        className="rounded-lg border border-border bg-surface p-4"
      >
        <h2 className="text-base font-semibold tracking-tight text-text">
          Ritmo necesario para tus metas
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Carga de trabajo necesaria en los días que quedan del ciclo para alcanzar tus objetivos.
        </p>

        {!hasAnyGoal ? (
          <div className="mt-3 rounded-md border border-border bg-surface-muted p-3 text-xs text-text-secondary">
            No hay ninguna meta activa para {analytics.cycle.label}. Puedes configurarla en Ajustes &gt; Ciclo y metas.
          </div>
        ) : (
          <div className="mt-3.5 space-y-3">
            {analytics.goalEurosTarget !== null && (
              <div className="rounded-md border border-border bg-surface-muted p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-text">
                    Meta mensual neta ({formatCurrency(analytics.goalEurosTarget)})
                  </span>
                  <span className="font-mono tabular-nums text-text-secondary">
                    {analytics.remainingEuros <= 0 ? (
                      <span className="text-emerald-500">Meta alcanzada</span>
                    ) : (
                      `Faltan ${formatCurrency(analytics.remainingEuros)}`
                    )}
                  </span>
                </div>

                {analytics.remainingEuros > 0 && predictions.remainingDays > 0 ? (
                  <div className="font-mono tabular-nums mt-2.5 grid grid-cols-3 gap-2 border-t border-border pt-2.5 text-xs">
                    <div>
                      <div className="font-sans text-text-muted">Por día</div>
                      <div className="mt-0.5 font-semibold text-text">
                        {formatCurrency(predictions.requiredNetPerRemainingDay)}
                      </div>
                    </div>
                    <div>
                      <div className="font-sans text-text-muted">Por semana</div>
                      <div className="mt-0.5 font-semibold text-text">
                        {formatCurrency(predictions.requiredNetPerRemainingWeek)}
                      </div>
                    </div>
                    <div>
                      <div className="font-sans text-text-muted">Turnos aprox.</div>
                      <div className="mt-0.5 font-semibold text-emerald-500">
                        {predictions.estimatedShiftsNeededForNetGoal !== null
                          ? `${predictions.estimatedShiftsNeededForNetGoal} ${
                              predictions.estimatedShiftsNeededForNetGoal === 1
                                ? 'turno'
                                : 'turnos'
                            }`
                          : 'N/D'}
                      </div>
                    </div>
                  </div>
                ) : analytics.remainingEuros > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    {predictions.cyclePhase === 'current' ? (
                      <>
                        Hoy es el último día del ciclo. Faltan{' '}
                        <span className="font-mono tabular-nums text-text">
                          {formatCurrency(analytics.remainingEuros)}
                        </span>{' '}
                        para alcanzar la meta.
                      </>
                    ) : (
                      <>
                        Este ciclo ya ha finalizado. Quedaron por cubrir{' '}
                        <span className="font-mono tabular-nums text-text">
                          {formatCurrency(analytics.remainingEuros)}
                        </span>
                        .
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            )}

            {analytics.goalHoursTarget !== null && (
              <div className="rounded-md border border-border bg-surface-muted p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-text">
                    Meta mensual de horas ({analytics.goalHoursTarget}h)
                  </span>
                  <span className="font-mono tabular-nums text-text-secondary">
                    {analytics.remainingGoalMinutes <= 0 ? (
                      <span className="text-emerald-500">Meta alcanzada</span>
                    ) : (
                      `Restan ${formatMinutes(analytics.remainingGoalMinutes)}`
                    )}
                  </span>
                </div>

                {analytics.remainingGoalMinutes > 0 && predictions.remainingDays > 0 ? (
                  <div className="font-mono tabular-nums mt-2.5 grid grid-cols-3 gap-2 border-t border-border pt-2.5 text-xs">
                    <div>
                      <div className="font-sans text-text-muted">Por día</div>
                      <div className="mt-0.5 font-semibold text-text">
                        {formatMinutes(predictions.requiredMinutesPerRemainingDay)}
                      </div>
                    </div>
                    <div>
                      <div className="font-sans text-text-muted">Por semana</div>
                      <div className="mt-0.5 font-semibold text-text">
                        {formatMinutes(predictions.requiredMinutesPerRemainingWeek)}
                      </div>
                    </div>
                    <div>
                      <div className="font-sans text-text-muted">Turnos aprox.</div>
                      <div className="mt-0.5 font-semibold text-blue-500">
                        {predictions.estimatedShiftsNeededForHoursGoal !== null
                          ? `${predictions.estimatedShiftsNeededForHoursGoal} ${
                              predictions.estimatedShiftsNeededForHoursGoal === 1
                                ? 'turno'
                                : 'turnos'
                            }`
                          : 'N/D'}
                      </div>
                    </div>
                  </div>
                ) : analytics.remainingGoalMinutes > 0 ? (
                  <p className="mt-2 text-xs text-text-secondary">
                    {predictions.cyclePhase === 'current' ? (
                      <>
                        Hoy es el último día del ciclo. Restan{' '}
                        <span className="font-mono tabular-nums text-text">
                          {formatMinutes(analytics.remainingGoalMinutes)}
                        </span>{' '}
                        para cumplir el objetivo.
                      </>
                    ) : (
                      <>
                        Este ciclo ya ha finalizado. Faltaron{' '}
                        <span className="font-mono tabular-nums text-text">
                          {formatMinutes(analytics.remainingGoalMinutes)}
                        </span>
                        .
                      </>
                    )}
                  </p>
                ) : null}
              </div>
            )}

            <p className="font-mono tabular-nums text-xs text-text-muted">
              Referencia de turno equivalente: {formatMinutes(referenceShiftMinutes)}.
            </p>
          </div>
        )}
      </section>

      {/* 3. Simulador interactivo rápido */}
      <section
        aria-label="Simulador rápido de horas o turnos extra"
        className="rounded-lg border border-border bg-surface p-4"
      >
        <h2 className="text-base font-semibold tracking-tight text-text">
          Simulador rápido
        </h2>
        <p className="mt-0.5 text-xs text-text-secondary">
          Prueba cuánto sumarías al mes haciendo horas o turnos extra sin modificar tus registros reales.
        </p>

        {/* Selector Horas extra / Turnos extra */}
        <div
          role="group"
          aria-label="Modo del simulador"
          className="mt-3.5 grid grid-cols-2 gap-1 rounded-md border border-border bg-surface-muted p-1"
        >
          <button
            type="button"
            aria-pressed={simMode === 'hours'}
            onClick={() => handleModeChange('hours')}
            className={`min-h-[44px] min-w-[44px] rounded-sm px-3 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              simMode === 'hours'
                ? 'bg-selected font-semibold text-text'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Horas extra
          </button>
          <button
            type="button"
            aria-pressed={simMode === 'shifts'}
            onClick={() => handleModeChange('shifts')}
            className={`min-h-[44px] min-w-[44px] rounded-sm px-3 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              simMode === 'shifts'
                ? 'bg-selected font-semibold text-text'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Turnos extra
          </button>
        </div>

        {/* Controles del simulador */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="sim-quantity"
              className="block text-sm font-medium text-text-secondary"
            >
              {simMode === 'hours' ? 'Horas adicionales (h)' : 'Número de turnos extra'}
            </label>
            <input
              id="sim-quantity"
              type="number"
              min="0"
              step={simMode === 'hours' ? '0.5' : '1'}
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          {simMode === 'shifts' && (
            <div>
              <label
                htmlFor="sim-hours-per-shift"
                className="block text-sm font-medium text-text-secondary"
              >
                Horas por turno (h)
              </label>
              <input
                id="sim-hours-per-shift"
                type="number"
                min="0.5"
                step="0.5"
                value={hoursPerShiftInput}
                onChange={(e) => {
                  setHasCustomShiftHours(true);
                  setHoursPerShiftInput(e.target.value);
                }}
                className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="sim-rate-source"
              className="block text-sm font-medium text-text-secondary"
            >
              Tarifa de referencia
            </label>
            <select
              id="sim-rate-source"
              value={rateSource}
              onChange={(e) => handleRateSourceChange(e.target.value)}
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <option value="average">
                Tarifa media actual ({formatHourlyRate(analytics.effectiveHourlyNetRate)})
              </option>
              {activeEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({formatHourlyRate(ev.netRate)})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div>
              <label
                htmlFor="sim-rate-type"
                className="block text-sm font-medium text-text-secondary"
              >
                Tipo de jornada
              </label>
              <select
                id="sim-rate-type"
                value={rateType}
                onChange={(e) => setRateType(e.target.value as ShiftRateType)}
                className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {(Object.keys(SHIFT_RATE_LABELS) as ShiftRateType[]).map((rt) => (
                  <option key={rt} value={rt}>
                    {SHIFT_RATE_LABELS[rt]} (
                    {formatMultiplier(selectedEvent.multipliers[rt] ?? 1)})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Resultado en vivo de la simulación */}
        <div className="mt-4 rounded-md border border-border-strong bg-surface-muted p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
            <span>Impacto simulado ({formatHourlyRate(effectiveSimRate)})</span>
            <span className="font-mono tabular-nums font-semibold text-emerald-500">
              +{formatCurrency(simulation.addedNet)} · +{formatMinutes(simulation.addedMinutes)}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-3 border-t border-border pt-2.5">
            <div>
              <div className="text-xs text-text-secondary">Nuevo total neto</div>
              <div className="font-mono tabular-nums mt-0.5 text-lg font-semibold text-text">
                {formatCurrency(simulation.totalNet)}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-secondary">Nuevas horas totales</div>
              <div className="font-mono tabular-nums mt-0.5 text-lg font-semibold text-text">
                {formatMinutes(simulation.totalMinutes)}
              </div>
            </div>
          </div>

          {(simulation.netGoalPct !== null || simulation.hoursGoalPct !== null) && (
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {simulation.netGoalPct !== null && analytics.goalEurosTarget !== null && (
                <div>
                  <div className="font-mono tabular-nums flex items-center justify-between text-xs">
                    <span className="font-sans text-text-secondary">
                      Progreso meta neta
                    </span>
                    <span className="text-text">
                      {formatPercentage(simulation.netGoalPct, 0)} de{' '}
                      {formatCurrency(analytics.goalEurosTarget)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-surface">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{ width: `${simulation.netGoalPct}%` }}
                    />
                  </div>
                </div>
              )}

              {simulation.hoursGoalPct !== null && analytics.goalHoursTarget !== null && (
                <div>
                  <div className="font-mono tabular-nums flex items-center justify-between text-xs">
                    <span className="font-sans text-text-secondary">
                      Progreso meta de horas
                    </span>
                    <span className="text-text">
                      {formatPercentage(simulation.hoursGoalPct, 0)} de{' '}
                      {analytics.goalHoursTarget}h
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-surface">
                    <div
                      className="h-full bg-blue-500 transition-all duration-150"
                      style={{ width: `${simulation.hoursGoalPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

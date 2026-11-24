import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatYearMonthKey,
  parseYearMonthKey,
  resolveCycleGoals,
} from '../../domain/cycles';
import { formatCurrency, formatMonthYearEs } from '../../domain/formatters';
import type { ShiftRecord, WorkEvent } from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';
import { ExportReportsCard } from '../stats/ExportReportsCard';
import { BackupRestoreSection } from './BackupRestoreSection';
import { EventsManagerSection } from './EventsManagerSection';

interface SettingsViewProps {
  exportAnalytics: CycleAnalytics;
  exportShifts: ShiftRecord[];
  events: WorkEvent[];
  selectedEventId: string;
  onChangeEventId: (eventId: string) => void;
}

type SettingsSubTab = 'events' | 'cycle-goals' | 'reports-data';

const SETTINGS_TABS: readonly { id: SettingsSubTab; label: string }[] = [
  { id: 'events', label: 'Eventos' },
  { id: 'cycle-goals', label: 'Ciclo y metas' },
  { id: 'reports-data', label: 'Informes y datos' },
];

function parseOptionalPositive(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  exportAnalytics,
  exportShifts,
  events,
  selectedEventId,
  onChangeEventId,
}) => {
  const settings = useShiftStore((s) => s.settings);
  const activeCycleAnchor = useShiftStore((s) => s.activeCycleAnchor);
  const updateSettings = useShiftStore((s) => s.updateSettings);
  const setCycleGoalOverride = useShiftStore((s) => s.setCycleGoalOverride);
  const clearCycleGoalOverride = useShiftStore((s) => s.clearCycleGoalOverride);
  const showToast = useShiftStore((s) => s.showToast);

  const [subTab, setSubTab] = useState<SettingsSubTab>('events');

  // Formulario de meta base por defecto
  const [goalEurosInput, setGoalEurosInput] = useState(
    settings.monthlyGoalNetEuros !== null ? String(settings.monthlyGoalNetEuros) : ''
  );
  const [goalHoursInput, setGoalHoursInput] = useState(
    settings.monthlyGoalHours !== null ? String(settings.monthlyGoalHours) : ''
  );

  useEffect(() => {
    setGoalEurosInput(
      settings.monthlyGoalNetEuros !== null ? String(settings.monthlyGoalNetEuros) : ''
    );
    setGoalHoursInput(
      settings.monthlyGoalHours !== null ? String(settings.monthlyGoalHours) : ''
    );
  }, [settings.monthlyGoalNetEuros, settings.monthlyGoalHours]);

  // Gestor de metas personalizadas por mes
  const [selectedGoalMonth, setSelectedGoalMonth] = useState({
    year: activeCycleAnchor.year,
    month: activeCycleAnchor.month,
  });

  useEffect(() => {
    setSelectedGoalMonth({
      year: activeCycleAnchor.year,
      month: activeCycleAnchor.month,
    });
  }, [activeCycleAnchor.year, activeCycleAnchor.month]);

  const selectedMonthKey = formatYearMonthKey(
    selectedGoalMonth.year,
    selectedGoalMonth.month
  );
  const selectedMonthLabel = formatMonthYearEs(
    selectedGoalMonth.year,
    selectedGoalMonth.month
  );

  const resolvedSelectedMonth = useMemo(
    () =>
      resolveCycleGoals(settings, {
        anchorYear: selectedGoalMonth.year,
        anchorMonth: selectedGoalMonth.month,
      }),
    [settings, selectedGoalMonth.year, selectedGoalMonth.month]
  );

  const [monthEurosInput, setMonthEurosInput] = useState('');
  const [monthHoursInput, setMonthHoursInput] = useState('');

  useEffect(() => {
    setMonthEurosInput(
      resolvedSelectedMonth.netEuros !== null
        ? String(resolvedSelectedMonth.netEuros)
        : ''
    );
    setMonthHoursInput(
      resolvedSelectedMonth.hours !== null ? String(resolvedSelectedMonth.hours) : ''
    );
  }, [
    selectedMonthKey,
    resolvedSelectedMonth.netEuros,
    resolvedSelectedMonth.hours,
    resolvedSelectedMonth.isCustomOverride,
  ]);

  const customOverridesList = useMemo(() => {
    const entries = Object.entries(settings.monthlyGoalOverrides ?? {});
    return entries
      .map(([key, config]) => {
        const parsed = parseYearMonthKey(key);
        return {
          key,
          year: parsed?.year ?? 0,
          month: parsed?.month ?? 0,
          label: parsed ? formatMonthYearEs(parsed.year, parsed.month) : key,
          config,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [settings.monthlyGoalOverrides]);

  const handleCycleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = Number(e.target.value);
    updateSettings({ cycleStartDay: day });
    showToast(`Inicio de ciclo actualizado al día ${day}`);
  };

  const handleSaveBaseGoals = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      monthlyGoalNetEuros: parseOptionalPositive(goalEurosInput),
      monthlyGoalHours: parseOptionalPositive(goalHoursInput),
    });
    showToast('Meta base por defecto guardada');
  };

  const handleShiftGoalMonth = (offset: number) => {
    const next = new Date(
      selectedGoalMonth.year,
      selectedGoalMonth.month + offset,
      1,
      12,
      0,
      0,
      0
    );
    setSelectedGoalMonth({
      year: next.getFullYear(),
      month: next.getMonth(),
    });
  };

  const handleSaveMonthGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setCycleGoalOverride(selectedMonthKey, {
      netEuros: parseOptionalPositive(monthEurosInput),
      hours: parseOptionalPositive(monthHoursInput),
    });
    showToast(`Meta personalizada guardada para ${selectedMonthLabel}`);
  };

  const handleDisableMonthGoal = () => {
    setCycleGoalOverride(selectedMonthKey, { netEuros: null, hours: null });
    showToast(`Meta desactivada para ${selectedMonthLabel}`, 'info');
  };

  const handleResetMonthGoal = (key: string, label: string) => {
    clearCycleGoalOverride(key);
    showToast(`Meta de ${label} restablecida a la meta base`, 'info');
  };

  return (
    <div className="scroll-container flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-10">
        {/* Selector segmentado de 3 sub-vistas */}
        <div
          role="tablist"
          aria-label="Secciones de ajustes"
          className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {SETTINGS_TABS.map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(tab.id)}
                className={`min-h-[44px] min-w-[44px] rounded-md px-2 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  active
                    ? 'bg-selected font-semibold text-text'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sub-vista 1: Eventos */}
        {subTab === 'events' && (
          <div role="tabpanel" aria-label="Eventos">
            <EventsManagerSection />
          </div>
        )}

        {/* Sub-vista 2: Ciclo y metas */}
        {subTab === 'cycle-goals' && (
          <div role="tabpanel" aria-label="Ciclo y metas" className="space-y-4">
            {/* Ciclo laboral y meta base por defecto */}
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="text-base font-semibold tracking-tight text-text">
                Ciclo laboral y meta base por defecto
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Define qué día del mes comienza tu ciclo y la meta general que heredarán los meses sin configuración propia.
              </p>

              <div className="mt-4">
                <label
                  htmlFor="cycle-start-day"
                  className="block text-sm font-medium text-text-secondary"
                >
                  Día de inicio del ciclo mensual
                </label>
                <select
                  id="cycle-start-day"
                  value={settings.cycleStartDay}
                  onChange={handleCycleDayChange}
                  className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d === 1
                        ? 'Día 1 (mes natural del 1 al 30/31)'
                        : `Día ${d} (del ${d} al ${d - 1} del mes siguiente)`}
                    </option>
                  ))}
                </select>
              </div>

              <form
                onSubmit={handleSaveBaseGoals}
                className="mt-4 space-y-3 border-t border-border pt-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="goal-euros"
                      className="block text-sm font-medium text-text-secondary"
                    >
                      Meta mensual neta (€)
                    </label>
                    <input
                      id="goal-euros"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Sin meta en euros"
                      value={goalEurosInput}
                      onChange={(e) => setGoalEurosInput(e.target.value)}
                      className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="goal-hours"
                      className="block text-sm font-medium text-text-secondary"
                    >
                      Meta mensual en horas (h)
                    </label>
                    <input
                      id="goal-hours"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Sin meta en horas"
                      value={goalHoursInput}
                      onChange={(e) => setGoalHoursInput(e.target.value)}
                      className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border-strong bg-surface-muted px-4 text-sm font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  Guardar meta base
                </button>
              </form>
            </section>

            {/* Gestor de metas personalizadas por mes */}
            <section
              aria-label="Metas personalizadas por mes"
              className="rounded-lg border border-border bg-surface p-4"
            >
              <h2 className="text-base font-semibold tracking-tight text-text">
                Metas personalizadas por mes
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Ajusta un objetivo distinto o desactiva la meta en meses concretos sin cambiar la meta base.
              </p>

              {/* Selector de mes */}
              <div className="mt-4 flex items-center justify-between gap-2 rounded-md border border-border bg-surface-muted p-1.5">
                <button
                  type="button"
                  onClick={() => handleShiftGoalMonth(-1)}
                  aria-label="Mes anterior para configurar meta"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-secondary transition-transform duration-150 hover:bg-selected hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2} />
                </button>

                <div className="flex flex-col items-center text-center">
                  <span className="text-sm font-semibold text-text">
                    {selectedMonthLabel}
                  </span>
                  <span
                    className={`mt-0.5 text-xs ${
                      resolvedSelectedMonth.isCustomOverride
                        ? 'text-blue-500'
                        : 'text-text-secondary'
                    }`}
                  >
                    {resolvedSelectedMonth.isCustomOverride
                      ? 'Personalizada'
                      : 'Heredada de meta base'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleShiftGoalMonth(1)}
                  aria-label="Mes siguiente para configurar meta"
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-secondary transition-transform duration-150 hover:bg-selected hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <ChevronRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              <form onSubmit={handleSaveMonthGoal} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="month-goal-euros"
                      className="block text-sm font-medium text-text-secondary"
                    >
                      Meta neta de {selectedMonthLabel} (€)
                    </label>
                    <input
                      id="month-goal-euros"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Sin meta en euros"
                      value={monthEurosInput}
                      onChange={(e) => setMonthEurosInput(e.target.value)}
                      className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="month-goal-hours"
                      className="block text-sm font-medium text-text-secondary"
                    >
                      Meta de horas de {selectedMonthLabel} (h)
                    </label>
                    <input
                      id="month-goal-hours"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Sin meta en horas"
                      value={monthHoursInput}
                      onChange={(e) => setMonthHoursInput(e.target.value)}
                      className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-action px-4 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Guardar meta del mes
                  </button>

                  <button
                    type="button"
                    onClick={handleDisableMonthGoal}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted px-3.5 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    Dejar sin meta
                  </button>

                  {resolvedSelectedMonth.isCustomOverride && (
                    <button
                      type="button"
                      onClick={() =>
                        handleResetMonthGoal(selectedMonthKey, selectedMonthLabel)
                      }
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border-strong bg-surface-muted px-3.5 text-xs font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      Usar meta base
                    </button>
                  )}
                </div>
              </form>

              {/* Resumen de meses personalizados */}
              {customOverridesList.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="text-xs font-semibold text-text-secondary">
                    Meses con meta personalizada ({customOverridesList.length})
                  </h3>
                  <div className="mt-2 divide-y divide-border rounded-md border border-border bg-surface-muted">
                    {customOverridesList.map((item) => {
                      const hasNet = item.config.netEuros !== null;
                      const hasHours = item.config.hours !== null;
                      return (
                        <div
                          key={item.key}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium text-text">
                              {item.label}
                            </div>
                            <div className="font-mono tabular-nums text-xs text-text-secondary">
                              {!hasNet && !hasHours
                                ? 'Sin meta activa'
                                : [
                                    hasNet && item.config.netEuros !== null
                                      ? formatCurrency(item.config.netEuros)
                                      : null,
                                    hasHours && item.config.hours !== null
                                      ? `${item.config.hours}h`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedGoalMonth({
                                  year: item.year,
                                  month: item.month,
                                })
                              }
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleResetMonthGoal(item.key, item.label)
                              }
                              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-red-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              Restablecer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Sub-vista 3: Informes y datos */}
        {subTab === 'reports-data' && (
          <div role="tabpanel" aria-label="Informes y datos" className="space-y-4">
            <ExportReportsCard
              analytics={exportAnalytics}
              cycleShifts={exportShifts}
              events={events}
              selectedEventId={selectedEventId}
              onChangeEventId={onChangeEventId}
            />
            <BackupRestoreSection />
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useShiftStore } from '../../store/useShiftStore';
import { BackupRestoreSection } from './BackupRestoreSection';
import { EventsManagerSection } from './EventsManagerSection';

export const SettingsView: React.FC = () => {
  const settings = useShiftStore((s) => s.settings);
  const updateSettings = useShiftStore((s) => s.updateSettings);
  const showToast = useShiftStore((s) => s.showToast);

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

  const handleCycleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const day = Number(e.target.value);
    updateSettings({ cycleStartDay: day });
    showToast(`Inicio de ciclo actualizado al día ${day}`);
  };

  const handleSaveGoals = (e: React.FormEvent) => {
    e.preventDefault();
    const eurosVal = goalEurosInput.trim()
      ? Number(goalEurosInput.replace(',', '.'))
      : null;
    const hoursVal = goalHoursInput.trim()
      ? Number(goalHoursInput.replace(',', '.'))
      : null;

    updateSettings({
      monthlyGoalNetEuros:
        eurosVal !== null && Number.isFinite(eurosVal) && eurosVal > 0 ? eurosVal : null,
      monthlyGoalHours:
        hoursVal !== null && Number.isFinite(hoursVal) && hoursVal > 0 ? hoursVal : null,
    });
    showToast('Objetivos mensuales guardados');
  };

  return (
    <div className="scroll-container flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-5 pb-10">
        {/* Sección 1: Gestión de Eventos y Categorías (T-09) */}
        <EventsManagerSection />

        {/* Sección 2: Cierre de Ciclo Laboral y Metas Mensuales (T-15) */}
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-base font-semibold tracking-tight text-text">
            Ciclo de facturación y metas mensuales
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Define qué día del mes comienza tu ciclo laboral y tus objetivos de ingresos u horas.
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

          <form onSubmit={handleSaveGoals} className="mt-4 space-y-3 border-t border-border pt-4">
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
                  step="10"
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
                  step="1"
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
              Guardar objetivos del ciclo
            </button>
          </form>
        </section>

        {/* Sección 3: Backup & Restore JSON */}
        <BackupRestoreSection />
      </div>
    </div>
  );
};

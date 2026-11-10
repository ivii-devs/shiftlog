import React from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Plus } from 'lucide-react';
import { getCycleByAnchor, getCycleForDate } from '../../domain/cycles';
import { formatNumericDateEs, getTodayIsoLocal } from '../../domain/formatters';
import { useShiftStore } from '../../store/useShiftStore';
import { BottomNav, type AppTab } from './BottomNav';

interface AppShellProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenNewShift: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewShift,
  children,
}) => {
  const activeCycleAnchor = useShiftStore((s) => s.activeCycleAnchor);
  const cycleStartDay = useShiftStore((s) => s.settings.cycleStartDay);
  const navigateCycle = useShiftStore((s) => s.navigateCycle);
  const goToCurrentCycle = useShiftStore((s) => s.goToCurrentCycle);

  const activeCycle = getCycleByAnchor(
    activeCycleAnchor.year,
    activeCycleAnchor.month,
    cycleStartDay
  );
  const todayCycle = getCycleForDate(getTodayIsoLocal(), cycleStartDay);
  const isCurrentCycle = activeCycle.id === todayCycle.id;

  return (
    <div className="no-print flex h-full w-full flex-col overflow-hidden bg-background text-text">
      {/* Cabecera superior con selector de ciclo laboral y áreas seguras */}
      <header className="shrink-0 border-b border-border bg-surface pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-text">
              Shift Log
            </span>
            {!isCurrentCycle && (
              <button
                type="button"
                onClick={goToCurrentCycle}
                aria-label="Volver al ciclo actual"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                <span>Hoy</span>
              </button>
            )}
          </div>

          {/* Selector de ciclo laboral */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigateCycle(-1)}
              aria-label="Ciclo anterior"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>

            <div className="min-w-[140px] px-2 text-center">
              <div className="text-sm font-semibold tracking-tight text-text">
                {activeCycle.label}
              </div>
              <div className="font-mono tabular-nums text-xs text-text-secondary">
                {formatNumericDateEs(activeCycle.startDate).slice(0, 5)} -{' '}
                {formatNumericDateEs(activeCycle.endDate).slice(0, 5)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigateCycle(1)}
              aria-label="Ciclo siguiente"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenNewShift}
            aria-label="Registrar turno"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md bg-action px-3 text-sm font-medium text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Registrar turno</span>
          </button>
        </div>
      </header>

      {/* Contenedor principal con restricción de scroll vertical WebKit */}
      <main className="relative flex flex-1 min-h-0 flex-col overflow-hidden">
        {children}
      </main>

      {/* Navegación inferior de 4 pestañas en la Thumb-Zone */}
      <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
    </div>
  );
};

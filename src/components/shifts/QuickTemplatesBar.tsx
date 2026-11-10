import React from 'react';
import { Zap } from 'lucide-react';
import { CATEGORY_COLOR_HEX } from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';

export const QuickTemplatesBar: React.FC = () => {
  const events = useShiftStore((s) => s.events);
  const addShiftFromTemplate = useShiftStore((s) => s.addShiftFromTemplate);
  const goToCurrentCycle = useShiftStore((s) => s.goToCurrentCycle);
  const showToast = useShiftStore((s) => s.showToast);

  const activeEventsWithTemplates = events.filter(
    (ev) => !ev.archived && ev.quickTemplates.length > 0
  );

  if (activeEventsWithTemplates.length === 0) {
    return null;
  }

  const handleQuickAdd = (eventId: string, templateId: string) => {
    const created = addShiftFromTemplate(eventId, templateId);
    if (created) {
      goToCurrentCycle();
      showToast(
        `Turno registrado hoy: ${created.snapshot.eventNameSnap} (${created.startTime} - ${created.endTime})`
      );
    }
  };

  return (
    <section
      aria-label="Plantillas de registro rápido en un toque"
      className="rounded-lg border border-border bg-surface p-3.5"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
        <Zap className="h-3.5 w-3.5 text-text" strokeWidth={1.75} />
        <span>Registro rápido en hoy (1 toque)</span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {activeEventsWithTemplates.map((ev) =>
          ev.quickTemplates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleQuickAdd(ev.id, tpl.id)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-1.5 text-left transition-transform duration-150 hover:border-border-strong hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CATEGORY_COLOR_HEX[ev.color] }}
              />
              <div>
                <div className="text-xs font-semibold text-text">
                  {ev.name} · {tpl.label}
                </div>
                <div className="font-mono tabular-nums text-xs text-text-secondary">
                  {tpl.startTime} - {tpl.endTime}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
};

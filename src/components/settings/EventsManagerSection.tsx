import React, { useState } from 'react';
import { Plus, Archive, ArchiveRestore, Pencil, Briefcase } from 'lucide-react';
import { formatHourlyRate, formatMultiplier } from '../../domain/formatters';
import {
  CATEGORY_COLOR_HEX,
  ROUNDING_MODE_LABELS,
  type WorkEvent,
} from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';
import { EmptyState } from '../ui/EmptyState';
import { EventFormSheet } from './EventFormSheet';

export const EventsManagerSection: React.FC = () => {
  const events = useShiftStore((s) => s.events);
  const toggleArchiveEvent = useShiftStore((s) => s.toggleArchiveEvent);
  const showToast = useShiftStore((s) => s.showToast);

  const [eventFilter, setEventFilter] = useState<'active' | 'archived'>('active');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkEvent | null>(null);

  const visibleEvents = events.filter((ev) =>
    eventFilter === 'active' ? !ev.archived : ev.archived
  );

  const handleOpenCreateEvent = () => {
    setEditingEvent(null);
    setSheetOpen(true);
  };

  const handleOpenEditEvent = (ev: WorkEvent) => {
    setEditingEvent(ev);
    setSheetOpen(true);
  };

  return (
    <>
      <section className="rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-text">
              Eventos y categorías de trabajo
            </h1>
            <p className="text-xs text-text-secondary">
              Configura tarifas netas/brutas, descansos, redondeo y plantillas rápidas.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateEvent}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md bg-action px-3.5 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span>Añadir evento</span>
          </button>
        </div>

        {/* Selector Activos / Archivados */}
        <div className="flex border-b border-border bg-surface-muted p-1.5">
          <button
            type="button"
            onClick={() => setEventFilter('active')}
            className={`min-h-[44px] flex-1 rounded-md text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              eventFilter === 'active'
                ? 'bg-selected text-text'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Activos ({events.filter((e) => !e.archived).length})
          </button>
          <button
            type="button"
            onClick={() => setEventFilter('archived')}
            className={`min-h-[44px] flex-1 rounded-md text-sm font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
              eventFilter === 'archived'
                ? 'bg-selected text-text'
                : 'text-text-secondary hover:text-text'
            }`}
          >
            Archivados ({events.filter((e) => e.archived).length})
          </button>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Briefcase}
              title={
                eventFilter === 'active'
                  ? 'No tienes eventos activos'
                  : 'No hay eventos archivados'
              }
              description={
                eventFilter === 'active'
                  ? 'Crea tu primer evento o categoría para empezar a registrar turnos.'
                  : 'Los eventos que archives aparecerán aquí conservando su historial.'
              }
              actionLabel={
                eventFilter === 'active' ? 'Crear primer evento' : undefined
              }
              onAction={eventFilter === 'active' ? handleOpenCreateEvent : undefined}
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: CATEGORY_COLOR_HEX[ev.color] }}
                    />
                    <span className="truncate text-base font-semibold text-text">
                      {ev.name}
                    </span>
                  </div>

                  <div className="font-mono tabular-nums mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                    <span className="text-emerald-500">
                      Neto: {formatHourlyRate(ev.netRate)}
                    </span>
                    {ev.grossRate && ev.grossRate > 0 && (
                      <span className="text-blue-500">
                        Bruto: {formatHourlyRate(ev.grossRate)}
                      </span>
                    )}
                    {ev.hasUnpaidBreak && (
                      <span>Descanso: {ev.defaultBreakMinutes}m</span>
                    )}
                    {ev.minGuaranteedHours > 0 && (
                      <span>Mínimo: {ev.minGuaranteedHours}h</span>
                    )}
                    {ev.roundingMode !== 'none' && (
                      <span>{ROUNDING_MODE_LABELS[ev.roundingMode]}</span>
                    )}
                  </div>

                  <div className="font-mono tabular-nums mt-1 text-xs text-text-muted">
                    Festivo {formatMultiplier(ev.multipliers.holiday)} · Nocturno{' '}
                    {formatMultiplier(ev.multipliers.night)} · Extra{' '}
                    {formatMultiplier(ev.multipliers.overtime)} ·{' '}
                    {ev.quickTemplates.length} plantillas
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenEditEvent(ev)}
                    aria-label={`Editar ${ev.name}`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 text-xs font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleArchiveEvent(ev.id);
                      showToast(
                        ev.archived
                          ? `Evento "${ev.name}" restaurado`
                          : `Evento "${ev.name}" archivado`
                      );
                    }}
                    aria-label={
                      ev.archived ? `Restaurar ${ev.name}` : `Archivar ${ev.name}`
                    }
                    className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-md border border-border bg-surface-muted px-3 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {ev.archived ? (
                      <>
                        <ArchiveRestore className="h-3.5 w-3.5" strokeWidth={1.75} />
                        <span>Restaurar</span>
                      </>
                    ) : (
                      <>
                        <Archive className="h-3.5 w-3.5" strokeWidth={1.75} />
                        <span>Archivar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <EventFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editingEvent={editingEvent}
      />
    </>
  );
};

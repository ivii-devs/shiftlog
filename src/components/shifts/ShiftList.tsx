import React, { useMemo, useState } from 'react';
import { Search, CalendarClock } from 'lucide-react';
import {
  formatCurrency,
  formatMinutes,
  formatShortDateEs,
  round2,
} from '../../domain/formatters';
import type { PaymentStatus, ShiftRecord, WorkEvent } from '../../domain/types';
import { EmptyState } from '../ui/EmptyState';
import { ShiftListSkeleton } from '../ui/Skeletons';
import { ShiftRow } from './ShiftRow';

interface ShiftListProps {
  cycleShifts: ShiftRecord[];
  events: WorkEvent[];
  isLoading?: boolean;
  onOpenNewShift: () => void;
  onEditShift: (shift: ShiftRecord) => void;
  onRepeatShift: (shift: ShiftRecord) => void;
}

export const ShiftList: React.FC<ShiftListProps> = ({
  cycleShifts,
  events,
  isLoading = false,
  onOpenNewShift,
  onEditShift,
  onRepeatShift,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all');

  const filteredShifts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cycleShifts.filter((s) => {
      if (selectedEventId !== 'all' && s.eventId !== selectedEventId) {
        return false;
      }
      if (paymentFilter !== 'all' && s.paymentStatus !== paymentFilter) {
        return false;
      }
      if (q) {
        const matchesNote = s.note.toLowerCase().includes(q);
        const matchesEvent = s.snapshot.eventNameSnap.toLowerCase().includes(q);
        return matchesNote || matchesEvent;
      }
      return true;
    });
  }, [cycleShifts, searchQuery, selectedEventId, paymentFilter]);

  const groupedByDate = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        shifts: ShiftRecord[];
        totalMinutes: number;
        totalNet: number;
      }
    >();

    for (const s of filteredShifts) {
      const existing = map.get(s.date);
      if (existing) {
        existing.shifts.push(s);
        existing.totalMinutes += s.computed.billableMinutes;
        existing.totalNet = round2(existing.totalNet + s.computed.totalNetAmount);
      } else {
        map.set(s.date, {
          date: s.date,
          shifts: [s],
          totalMinutes: s.computed.billableMinutes,
          totalNet: s.computed.totalNetAmount,
        });
      }
    }
    return Array.from(map.values());
  }, [filteredShifts]);

  return (
    <section aria-label="Listado de turnos del ciclo" className="space-y-3">
      {/* Buscador por nota y filtros por categoría y estado de cobro (AC15) */}
      <div className="rounded-lg border border-border bg-surface p-3.5">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-text-muted"
              strokeWidth={1.75}
            />
            <input
              type="search"
              placeholder="Buscar por nota o evento..."
              aria-label="Buscar turnos por nota"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[44px] w-full rounded-md border border-border bg-surface-muted pr-3 pl-9 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <select
            aria-label="Filtrar por categoría o evento"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="all">Todas las categorías</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} {ev.archived ? '(Archivado)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro segmentado de estado de cobro */}
        <div className="mt-2.5 grid grid-cols-3 gap-1 rounded-md bg-surface-muted p-1">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendientes' },
              { id: 'paid', label: 'Cobrados' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPaymentFilter(tab.id)}
              className={`min-h-[44px] rounded-sm text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                paymentFilter === tab.id
                  ? 'bg-selected text-text font-semibold'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de turnos agrupados por fecha */}
      {isLoading ? (
        <ShiftListSkeleton />
      ) : groupedByDate.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={
            cycleShifts.length === 0
              ? 'Aún no hay turnos en este ciclo'
              : 'Sin resultados para este filtro'
          }
          description={
            cycleShifts.length === 0
              ? 'Registra tu primera jornada con el botón superior o toca una plantilla rápida.'
              : 'Prueba a limpiar el texto de búsqueda o cambiar el estado de cobro.'
          }
          actionLabel={cycleShifts.length === 0 ? 'Registrar primer turno' : undefined}
          onAction={cycleShifts.length === 0 ? onOpenNewShift : undefined}
        />
      ) : (
        <div className="space-y-3">
          {groupedByDate.map((group) => (
            <div
              key={group.date}
              className="overflow-hidden rounded-lg border border-border bg-surface"
            >
              <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-2">
                <span className="text-xs font-semibold text-text">
                  {formatShortDateEs(group.date)}
                </span>
                <span className="font-mono tabular-nums text-xs text-text-secondary">
                  {formatMinutes(group.totalMinutes)} ·{' '}
                  <strong className="text-text">
                    {formatCurrency(group.totalNet)}
                  </strong>
                </span>
              </div>

              <div className="divide-y divide-border">
                {group.shifts.map((shift) => (
                  <ShiftRow
                    key={shift.id}
                    shift={shift}
                    onEdit={onEditShift}
                    onRepeat={onRepeatShift}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

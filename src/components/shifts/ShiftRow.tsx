import React from 'react';
import {
  CheckCircle2,
  Clock,
  Copy,
  Files,
  CalendarPlus,
  Pencil,
  Trash2,
  Moon,
} from 'lucide-react';
import {
  formatCurrency,
  formatMinutes,
  formatMultiplier,
  formatSignedCurrency,
} from '../../domain/formatters';
import {
  CATEGORY_COLOR_HEX,
  SHIFT_RATE_LABELS,
  type ShiftRecord,
} from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';

interface ShiftRowProps {
  shift: ShiftRecord;
  onEdit: (shift: ShiftRecord) => void;
  onRepeat: (shift: ShiftRecord) => void;
}

export const ShiftRow: React.FC<ShiftRowProps> = ({ shift, onEdit, onRepeat }) => {
  const toggleShiftPaymentStatus = useShiftStore((s) => s.toggleShiftPaymentStatus);
  const cloneShiftToToday = useShiftStore((s) => s.cloneShiftToToday);
  const duplicateShiftToDate = useShiftStore((s) => s.duplicateShiftToDate);
  const deleteShift = useShiftStore((s) => s.deleteShift);
  const goToCurrentCycle = useShiftStore((s) => s.goToCurrentCycle);
  const showToast = useShiftStore((s) => s.showToast);

  const isPaid = shift.paymentStatus === 'paid';

  const handleCloneToday = () => {
    const cloned = cloneShiftToToday(shift.id);
    if (cloned) {
      goToCurrentCycle();
      showToast(`Turno clonado en hoy (${cloned.snapshot.eventNameSnap})`);
    }
  };

  const handleDuplicate = () => {
    const duplicated = duplicateShiftToDate(shift.id, shift.date);
    if (duplicated) {
      showToast(`Turno duplicado (${duplicated.snapshot.eventNameSnap})`);
    }
  };

  const handleDelete = () => {
    deleteShift(shift.id);
    showToast('Turno eliminado', 'info');
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{
                backgroundColor: CATEGORY_COLOR_HEX[shift.snapshot.eventColorSnap],
              }}
            />
            <span className="truncate text-base font-semibold text-text">
              {shift.snapshot.eventNameSnap}
            </span>

            {shift.rateType !== 'normal' && (
              <span className="font-mono tabular-nums inline-flex items-center rounded-sm border border-info-line bg-info-quiet px-2 py-0.5 text-xs font-medium text-blue-500">
                {SHIFT_RATE_LABELS[shift.rateType]}{' '}
                {formatMultiplier(shift.snapshot.multiplierSnap)}
              </span>
            )}

            {shift.computed.crossesMidnight && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface-muted px-2 py-0.5 text-xs text-text-secondary">
                <Moon className="h-3 w-3" strokeWidth={1.75} />
                <span>+1d</span>
              </span>
            )}
          </div>

          {/* Rango horario y duración computable en números tabulares */}
          <div className="font-mono tabular-nums mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-text-secondary">
            <span>
              {shift.startTime} - {shift.endTime}
            </span>
            <span>·</span>
            <span className="font-medium text-text">
              {formatMinutes(shift.computed.billableMinutes)}
            </span>
            {shift.breakMinutes > 0 && (
              <span className="text-xs text-amber-500">
                (-{shift.breakMinutes}m pausa)
              </span>
            )}
            {shift.fixedBonus !== 0 && (
              <span className="text-xs text-emerald-500">
                Plus {formatSignedCurrency(shift.fixedBonus)}
              </span>
            )}
            {shift.expenseAdjustment !== 0 && (
              <span
                className={`text-xs ${
                  shift.expenseAdjustment > 0 ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                Ajuste {formatSignedCurrency(shift.expenseAdjustment)}
              </span>
            )}
          </div>

          {shift.note && (
            <p className="mt-1.5 text-xs text-text-secondary">{shift.note}</p>
          )}
        </div>

        {/* Importes Neto y Bruto */}
        <div className="shrink-0 text-right">
          <div className="font-mono tabular-nums text-lg font-semibold text-emerald-500">
            {formatCurrency(shift.computed.totalNetAmount)}
          </div>
          <div className="font-mono tabular-nums text-xs text-text-secondary">
            Bruto: {formatCurrency(shift.computed.totalGrossAmount)}
          </div>
        </div>
      </div>

      {/* Barra de acciones táctiles de fila (>= 44x44px) */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5">
        <button
          type="button"
          onClick={() => toggleShiftPaymentStatus(shift.id)}
          className={`inline-flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded-sm border px-3 text-xs font-semibold transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
            isPaid
              ? 'border-success-line bg-success-quiet text-emerald-500'
              : 'border-warning-line bg-warning-quiet text-amber-500'
          }`}
        >
          {isPaid ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Cobrado</span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Pendiente</span>
            </>
          )}
        </button>

        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={handleCloneToday}
            aria-label="Clonar turno en hoy"
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Clonar hoy</span>
          </button>

          <button
            type="button"
            onClick={handleDuplicate}
            aria-label="Duplicar turno"
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Files className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Duplicar</span>
          </button>

          <button
            type="button"
            onClick={() => onRepeat(shift)}
            aria-label="Repetir o duplicar en varios días"
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 text-xs font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Repetir</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(shift)}
            aria-label="Editar turno"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Pencil className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            aria-label="Eliminar turno"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-red-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};

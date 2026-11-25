import React from 'react';
import { CalendarPlus, Pencil, Trash2, Moon } from 'lucide-react';
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
  const deleteShift = useShiftStore((s) => s.deleteShift);
  const showToast = useShiftStore((s) => s.showToast);

  const handleDelete = () => {
    deleteShift(shift.id);
    showToast('Turno eliminado', 'info');
  };

  return (
    <div className="px-3.5 py-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{
                backgroundColor: CATEGORY_COLOR_HEX[shift.snapshot.eventColorSnap],
              }}
            />
            <span className="truncate text-sm font-semibold text-text">
              {shift.snapshot.eventNameSnap}
            </span>

            {shift.rateType !== 'normal' && (
              <span className="font-mono tabular-nums inline-flex items-center rounded-sm border border-info-line bg-info-quiet px-1.5 py-0.5 text-xs font-medium text-blue-500">
                {SHIFT_RATE_LABELS[shift.rateType]}{' '}
                {formatMultiplier(shift.snapshot.multiplierSnap)}
              </span>
            )}

            {shift.computed.crossesMidnight && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-border bg-surface-muted px-1.5 py-0.5 text-xs text-text-secondary">
                <Moon className="h-3 w-3" strokeWidth={1.75} />
                <span>+1d</span>
              </span>
            )}
          </div>

          {/* Rango horario y duración computable en números tabulares */}
          <div className="font-mono tabular-nums mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary">
            <span>
              {shift.startTime} - {shift.endTime}
            </span>
            <span>·</span>
            <span className="font-medium text-text">
              {formatMinutes(shift.computed.billableMinutes)}
            </span>
            {shift.breakMinutes > 0 && (
              <span className="text-amber-500">(-{shift.breakMinutes}m)</span>
            )}
            {shift.fixedBonus !== 0 && (
              <span className="text-emerald-500">
                Plus {formatSignedCurrency(shift.fixedBonus)}
              </span>
            )}
            {shift.expenseAdjustment !== 0 && (
              <span
                className={
                  shift.expenseAdjustment > 0 ? 'text-emerald-500' : 'text-red-500'
                }
              >
                Ajuste {formatSignedCurrency(shift.expenseAdjustment)}
              </span>
            )}
          </div>

          {shift.note && (
            <p className="mt-1 text-xs text-text-secondary">{shift.note}</p>
          )}
        </div>

        {/* Importes Neto y Bruto */}
        <div className="shrink-0 text-right">
          <div className="font-mono tabular-nums text-base font-semibold text-emerald-500">
            {formatCurrency(shift.computed.totalNetAmount)}
          </div>
          <div className="font-mono tabular-nums text-xs text-text-secondary">
            Bruto {formatCurrency(shift.computed.totalGrossAmount)}
          </div>
        </div>
      </div>

      {/* Barra compacta de 3 acciones de solo icono en una única línea (>= 44x44px) */}
      <div className="mt-2 flex flex-nowrap items-center justify-end gap-1.5 border-t border-border pt-2">
        <button
          type="button"
          onClick={() => onRepeat(shift)}
          aria-label="Repetir turno"
          title="Repetir en otros días"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={() => onEdit(shift)}
          aria-label="Editar turno"
          title="Editar turno"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <button
          type="button"
          onClick={handleDelete}
          aria-label="Eliminar turno"
          title="Eliminar turno"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface-muted text-text-secondary transition-transform duration-150 hover:text-red-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};

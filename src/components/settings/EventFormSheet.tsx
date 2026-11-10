import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Check } from 'lucide-react';
import {
  CATEGORY_COLORS,
  ROUNDING_MODE_LABELS,
  SHIFT_RATE_LABELS,
  type CategoryColor,
  type QuickTemplate,
  type RoundingMode,
  type ShiftRateType,
  type WorkEvent,
} from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';
import { BottomSheet } from '../ui/BottomSheet';

interface EventFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: WorkEvent | null;
}

export const EventFormSheet: React.FC<EventFormSheetProps> = ({
  open,
  onOpenChange,
  editingEvent,
}) => {
  const addEvent = useShiftStore((s) => s.addEvent);
  const updateEvent = useShiftStore((s) => s.updateEvent);
  const showToast = useShiftStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [color, setColor] = useState<CategoryColor>('emerald');
  const [netRate, setNetRate] = useState('12.50');
  const [grossRate, setGrossRate] = useState('');
  const [hasUnpaidBreak, setHasUnpaidBreak] = useState(false);
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState('30');
  const [minGuaranteedHours, setMinGuaranteedHours] = useState('0');
  const [roundingMode, setRoundingMode] = useState<RoundingMode>('none');
  const [holidayMult, setHolidayMult] = useState('1.5');
  const [nightMult, setNightMult] = useState('1.25');
  const [overtimeMult, setOvertimeMult] = useState('1.5');
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);

  const [tplLabel, setTplLabel] = useState('');
  const [tplStart, setTplStart] = useState('08:00');
  const [tplEnd, setTplEnd] = useState('16:00');
  const [tplRateType, setTplRateType] = useState<ShiftRateType>('normal');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrorMsg(null);
    if (editingEvent) {
      setName(editingEvent.name);
      setColor(editingEvent.color);
      setNetRate(String(editingEvent.netRate));
      setGrossRate(
        editingEvent.grossRate !== undefined && editingEvent.grossRate > 0
          ? String(editingEvent.grossRate)
          : ''
      );
      setHasUnpaidBreak(editingEvent.hasUnpaidBreak);
      setDefaultBreakMinutes(String(editingEvent.defaultBreakMinutes));
      setMinGuaranteedHours(String(editingEvent.minGuaranteedHours));
      setRoundingMode(editingEvent.roundingMode);
      setHolidayMult(String(editingEvent.multipliers.holiday));
      setNightMult(String(editingEvent.multipliers.night));
      setOvertimeMult(String(editingEvent.multipliers.overtime));
      setTemplates(editingEvent.quickTemplates);
    } else {
      setName('');
      setColor('emerald');
      setNetRate('12.50');
      setGrossRate('');
      setHasUnpaidBreak(false);
      setDefaultBreakMinutes('30');
      setMinGuaranteedHours('0');
      setRoundingMode('none');
      setHolidayMult('1.5');
      setNightMult('1.25');
      setOvertimeMult('1.5');
      setTemplates([]);
    }
    setTplLabel('');
    setTplStart('08:00');
    setTplEnd('16:00');
    setTplRateType('normal');
  }, [open, editingEvent]);

  const handleAddTemplate = () => {
    const cleanLabel = tplLabel.trim() || `${tplStart} - ${tplEnd}`;
    const newTpl: QuickTemplate = {
      id: `tpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      label: cleanLabel,
      startTime: tplStart,
      endTime: tplEnd,
      rateType: tplRateType,
    };
    setTemplates((prev) => [...prev, newTpl]);
    setTplLabel('');
  };

  const handleRemoveTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setErrorMsg('Indica un nombre para el evento o categoría.');
      return;
    }

    const parsedNet = Number(netRate.replace(',', '.'));
    if (!Number.isFinite(parsedNet) || parsedNet <= 0) {
      setErrorMsg('La tarifa neta por hora debe ser mayor que 0 €.');
      return;
    }

    const parsedGrossRaw = grossRate.trim()
      ? Number(grossRate.replace(',', '.'))
      : undefined;
    const parsedGross =
      parsedGrossRaw !== undefined && Number.isFinite(parsedGrossRaw) && parsedGrossRaw > 0
        ? parsedGrossRaw
        : undefined;

    const payload = {
      name: cleanName,
      color,
      netRate: parsedNet,
      grossRate: parsedGross,
      hasUnpaidBreak,
      defaultBreakMinutes: Math.max(0, Math.round(Number(defaultBreakMinutes) || 0)),
      minGuaranteedHours: Math.max(
        0,
        Number(minGuaranteedHours.replace(',', '.')) || 0
      ),
      roundingMode,
      multipliers: {
        normal: 1.0,
        holiday: Math.max(0.1, Number(holidayMult.replace(',', '.')) || 1.5),
        night: Math.max(0.1, Number(nightMult.replace(',', '.')) || 1.25),
        overtime: Math.max(0.1, Number(overtimeMult.replace(',', '.')) || 1.5),
      },
      quickTemplates: templates,
    };

    if (editingEvent) {
      updateEvent(editingEvent.id, payload);
      showToast('Evento actualizado correctamente');
    } else {
      addEvent(payload);
      showToast('Evento creado correctamente');
    }
    onOpenChange(false);
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={editingEvent ? 'Editar evento' : 'Nuevo evento o categoría'}
      description="Los cambios de tarifa solo aplican a los turnos futuros y no alteran el historial."
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="event-form"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-md bg-action px-5 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            {editingEvent ? 'Guardar cambios' : 'Crear evento'}
          </button>
        </div>
      }
    >
      <form id="event-form" onSubmit={handleSave} className="space-y-5">
        {errorMsg && (
          <div
            role="alert"
            className="rounded-md border border-danger-line bg-danger-quiet px-3.5 py-2.5 text-sm text-red-500"
          >
            {errorMsg}
          </div>
        )}

        {/* Nombre del evento */}
        <div>
          <label
            htmlFor="ev-name"
            className="block text-sm font-medium text-text-secondary"
          >
            Nombre del evento o trabajo
          </label>
          <input
            id="ev-name"
            type="text"
            required
            placeholder="Ej. Catering hotel, Guardia hospital..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          />
        </div>

        {/* Color identificativo */}
        <div>
          <span className="block text-sm font-medium text-text-secondary">
            Color identificativo
          </span>
          <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-8">
            {CATEGORY_COLORS.map((c) => {
              const selected = color === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  aria-label={`Color ${c.label}`}
                  aria-pressed={selected}
                  className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md border px-2 transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                    selected
                      ? 'border-border-strong bg-selected text-text'
                      : 'border-border bg-surface-muted text-text-secondary'
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-sm"
                    style={{ backgroundColor: c.hex }}
                  />
                  {selected && <Check className="h-3.5 w-3.5 text-text" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tarifas Neta y Bruta */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ev-net-rate"
              className="block text-sm font-medium text-text-secondary"
            >
              Tarifa neta (€/h, obligatoria)
            </label>
            <input
              id="ev-net-rate"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={netRate}
              onChange={(e) => setNetRate(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <div>
            <label
              htmlFor="ev-gross-rate"
              className="block text-sm font-medium text-text-secondary"
            >
              Tarifa bruta (€/h, opcional)
            </label>
            <input
              id="ev-gross-rate"
              type="number"
              step="0.01"
              min="0"
              placeholder="Igual a tarifa neta"
              value={grossRate}
              onChange={(e) => setGrossRate(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>

        {/* Descanso no remunerado */}
        <div className="rounded-md border border-border bg-surface-muted p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-text">
                Descanso no remunerado
              </div>
              <div className="text-xs text-text-secondary">
                Descuenta automáticamente la pausa al registrar un turno
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hasUnpaidBreak}
              aria-label="Activar descanso no remunerado"
              onClick={() => setHasUnpaidBreak((v) => !v)}
              className={`inline-flex min-h-[44px] min-w-[64px] items-center justify-center rounded-md border px-3 text-xs font-semibold transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                hasUnpaidBreak
                  ? 'border-success-line bg-success-quiet text-emerald-500'
                  : 'border-border bg-surface text-text-secondary'
              }`}
            >
              {hasUnpaidBreak ? 'Activo' : 'No'}
            </button>
          </div>

          {hasUnpaidBreak && (
            <div className="mt-3 border-t border-border pt-3">
              <label
                htmlFor="ev-default-break"
                className="block text-xs font-medium text-text-secondary"
              >
                Minutos de descanso por defecto
              </label>
              <input
                id="ev-default-break"
                type="number"
                min="0"
                step="5"
                value={defaultBreakMinutes}
                onChange={(e) => setDefaultBreakMinutes(e.target.value)}
                className="font-mono tabular-nums mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
          )}
        </div>

        {/* Redondeo y mínimo garantizado */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="ev-rounding"
              className="block text-sm font-medium text-text-secondary"
            >
              Redondeo de bloques
            </label>
            <select
              id="ev-rounding"
              value={roundingMode}
              onChange={(e) => setRoundingMode(e.target.value as RoundingMode)}
              className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              {(Object.keys(ROUNDING_MODE_LABELS) as RoundingMode[]).map((m) => (
                <option key={m} value={m}>
                  {ROUNDING_MODE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="ev-min-hours"
              className="block text-sm font-medium text-text-secondary"
            >
              Mínimo garantizado (horas)
            </label>
            <input
              id="ev-min-hours"
              type="number"
              min="0"
              step="0.5"
              value={minGuaranteedHours}
              onChange={(e) => setMinGuaranteedHours(e.target.value)}
              className="font-mono tabular-nums mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>
        </div>

        {/* Multiplicadores especiales */}
        <div>
          <span className="block text-sm font-medium text-text-secondary">
            Multiplicadores por tipo de jornada
          </span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <div>
              <label
                htmlFor="mult-holiday"
                className="block text-xs text-text-secondary"
              >
                Festivo (x)
              </label>
              <input
                id="mult-holiday"
                type="number"
                step="0.05"
                min="0.1"
                value={holidayMult}
                onChange={(e) => setHolidayMult(e.target.value)}
                className="font-mono tabular-nums mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-2.5 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
            <div>
              <label
                htmlFor="mult-night"
                className="block text-xs text-text-secondary"
              >
                Nocturno (x)
              </label>
              <input
                id="mult-night"
                type="number"
                step="0.05"
                min="0.1"
                value={nightMult}
                onChange={(e) => setNightMult(e.target.value)}
                className="font-mono tabular-nums mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-2.5 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
            <div>
              <label
                htmlFor="mult-overtime"
                className="block text-xs text-text-secondary"
              >
                Hora extra (x)
              </label>
              <input
                id="mult-overtime"
                type="number"
                step="0.05"
                min="0.1"
                value={overtimeMult}
                onChange={(e) => setOvertimeMult(e.target.value)}
                className="font-mono tabular-nums mt-1 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-2.5 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
            </div>
          </div>
        </div>

        {/* Plantillas de turnos rápidos (1 toque) */}
        <div className="border-t border-border pt-4">
          <div className="text-sm font-medium text-text">
            Plantillas de acceso rápido (1 toque)
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            Permiten registrar un turno frecuente desde la pantalla principal con una sola pulsación.
          </p>

          {templates.length > 0 && (
            <div className="mt-3 divide-y divide-border rounded-md border border-border bg-surface-muted">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div>
                    <div className="text-sm font-medium text-text">{tpl.label}</div>
                    <div className="font-mono tabular-nums text-xs text-text-secondary">
                      {tpl.startTime} - {tpl.endTime} ·{' '}
                      {SHIFT_RATE_LABELS[tpl.rateType ?? 'normal']}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTemplate(tpl.id)}
                    aria-label={`Eliminar plantilla ${tpl.label}`}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-text-secondary transition-transform duration-150 hover:text-red-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 space-y-2 rounded-md border border-border bg-surface-muted p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Etiqueta (ej. Mañana)"
                aria-label="Etiqueta de la plantilla"
                value={tplLabel}
                onChange={(e) => setTplLabel(e.target.value)}
                className="min-h-[44px] rounded-md border border-border bg-surface px-3 text-base text-text placeholder:text-text-muted focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              />
              <select
                aria-label="Tipo de jornada de la plantilla"
                value={tplRateType}
                onChange={(e) => setTplRateType(e.target.value as ShiftRateType)}
                className="min-h-[44px] rounded-md border border-border bg-surface px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                {(Object.keys(SHIFT_RATE_LABELS) as ShiftRateType[]).map((rt) => (
                  <option key={rt} value={rt}>
                    {SHIFT_RATE_LABELS[rt]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-text-secondary">Entrada</label>
                <input
                  type="time"
                  aria-label="Hora de entrada de la plantilla"
                  value={tplStart}
                  onChange={(e) => setTplStart(e.target.value)}
                  className="font-mono tabular-nums mt-0.5 min-h-[44px] w-full rounded-md border border-border bg-surface px-2.5 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary">Salida</label>
                <input
                  type="time"
                  aria-label="Hora de salida de la plantilla"
                  value={tplEnd}
                  onChange={(e) => setTplEnd(e.target.value)}
                  className="font-mono tabular-nums mt-0.5 min-h-[44px] w-full rounded-md border border-border bg-surface px-2.5 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddTemplate}
              className="inline-flex min-h-[44px] min-w-[44px] w-full items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              <span>Añadir plantilla rápida</span>
            </button>
          </div>
        </div>
      </form>
    </BottomSheet>
  );
};

import { isValidTimeFormat } from './calculations';
import { clampCycleStartDay } from './cycles';
import type {
  AppSettings,
  CategoryColor,
  PaymentStatus,
  RoundingMode,
  ShiftLogDatabase,
  ShiftRateType,
  ShiftRecord,
  WorkEvent,
} from './types';

const VALID_COLORS: Set<CategoryColor> = new Set([
  'emerald',
  'blue',
  'indigo',
  'violet',
  'amber',
  'rose',
  'cyan',
  'lime',
]);

const VALID_ROUNDING: Set<RoundingMode> = new Set(['none', '15m', '30m']);
const VALID_RATE_TYPES: Set<ShiftRateType> = new Set([
  'normal',
  'holiday',
  'night',
  'overtime',
]);
const VALID_PAYMENT_STATUS: Set<PaymentStatus> = new Set(['pending', 'paid']);
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!ISO_DATE_REGEX.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isFiniteNumber(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val);
}

function validateQuickTemplate(raw: unknown, eventName: string, idx: number): string | null {
  if (!isRecord(raw)) {
    return `La plantilla ${idx + 1} del evento "${eventName}" no es un objeto válido.`;
  }
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    return `La plantilla ${idx + 1} del evento "${eventName}" no tiene un identificador válido.`;
  }
  if (typeof raw.label !== 'string' || raw.label.trim() === '') {
    return `La plantilla "${raw.id}" del evento "${eventName}" no tiene una etiqueta válida.`;
  }
  if (typeof raw.startTime !== 'string' || !isValidTimeFormat(raw.startTime)) {
    return `La plantilla "${raw.label}" del evento "${eventName}" tiene una hora de entrada inválida.`;
  }
  if (typeof raw.endTime !== 'string' || !isValidTimeFormat(raw.endTime)) {
    return `La plantilla "${raw.label}" del evento "${eventName}" tiene una hora de salida inválida.`;
  }
  if (
    raw.breakMinutes !== undefined &&
    (!isFiniteNumber(raw.breakMinutes) || raw.breakMinutes < 0)
  ) {
    return `La plantilla "${raw.label}" del evento "${eventName}" tiene minutos de descanso inválidos.`;
  }
  if (
    raw.rateType !== undefined &&
    !VALID_RATE_TYPES.has(raw.rateType as ShiftRateType)
  ) {
    return `La plantilla "${raw.label}" del evento "${eventName}" tiene un tipo de jornada inválido.`;
  }
  return null;
}

function validateEvent(raw: unknown, index: number): string | null {
  if (!isRecord(raw)) {
    return `El evento en la posición ${index + 1} no es un objeto válido.`;
  }
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    return `El evento en la posición ${index + 1} no tiene un identificador válido.`;
  }
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    return `El evento "${raw.id}" no tiene un nombre válido.`;
  }
  if (!VALID_COLORS.has(raw.color as CategoryColor)) {
    return `El evento "${raw.name}" tiene un color no reconocido.`;
  }
  if (!isFiniteNumber(raw.netRate) || raw.netRate < 0) {
    return `El evento "${raw.name}" tiene una tarifa neta inválida.`;
  }
  if (
    raw.grossRate !== undefined &&
    raw.grossRate !== null &&
    (!isFiniteNumber(raw.grossRate) || raw.grossRate < 0)
  ) {
    return `El evento "${raw.name}" tiene una tarifa bruta inválida.`;
  }
  if (typeof raw.hasUnpaidBreak !== 'boolean') {
    return `El evento "${raw.name}" no define correctamente el descanso no remunerado.`;
  }
  if (!isFiniteNumber(raw.defaultBreakMinutes) || raw.defaultBreakMinutes < 0) {
    return `El evento "${raw.name}" tiene minutos de descanso por defecto inválidos.`;
  }
  if (!isFiniteNumber(raw.minGuaranteedHours) || raw.minGuaranteedHours < 0) {
    return `El evento "${raw.name}" tiene un mínimo de horas garantizadas inválido.`;
  }
  if (!VALID_ROUNDING.has(raw.roundingMode as RoundingMode)) {
    return `El evento "${raw.name}" tiene un modo de redondeo inválido.`;
  }
  if (!isRecord(raw.multipliers)) {
    return `El evento "${raw.name}" no incluye multiplicadores válidos.`;
  }
  if (
    !isFiniteNumber(raw.multipliers.normal) ||
    !isFiniteNumber(raw.multipliers.holiday) ||
    !isFiniteNumber(raw.multipliers.night) ||
    !isFiniteNumber(raw.multipliers.overtime)
  ) {
    return `Los multiplicadores del evento "${raw.name}" deben ser numéricos.`;
  }
  if (!Array.isArray(raw.quickTemplates)) {
    return `Las plantillas rápidas del evento "${raw.name}" no son una lista válida.`;
  }
  for (let i = 0; i < raw.quickTemplates.length; i++) {
    const tplErr = validateQuickTemplate(raw.quickTemplates[i], raw.name, i);
    if (tplErr) return tplErr;
  }
  if (typeof raw.archived !== 'boolean') {
    return `El estado archivado del evento "${raw.name}" no es válido.`;
  }
  return null;
}

function validateShift(raw: unknown, index: number): string | null {
  if (!isRecord(raw)) {
    return `El turno en la posición ${index + 1} no es un objeto válido.`;
  }
  if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    return `El turno en la posición ${index + 1} no tiene un identificador válido.`;
  }
  if (typeof raw.eventId !== 'string' || raw.eventId.trim() === '') {
    return `El turno "${raw.id}" no tiene un evento asociado válido.`;
  }
  if (typeof raw.date !== 'string' || !isValidCalendarDate(raw.date)) {
    return `El turno "${raw.id}" tiene una fecha inválida (formato esperado YYYY-MM-DD).`;
  }
  if (typeof raw.startTime !== 'string' || !isValidTimeFormat(raw.startTime)) {
    return `El turno "${raw.id}" tiene una hora de entrada inválida (HH:MM).`;
  }
  if (typeof raw.endTime !== 'string' || !isValidTimeFormat(raw.endTime)) {
    return `El turno "${raw.id}" tiene una hora de salida inválida (HH:MM).`;
  }
  if (!isFiniteNumber(raw.breakMinutes) || raw.breakMinutes < 0) {
    return `El turno "${raw.id}" tiene minutos de descanso inválidos.`;
  }
  if (!VALID_RATE_TYPES.has(raw.rateType as ShiftRateType)) {
    return `El turno "${raw.id}" tiene un tipo de tarifa inválido.`;
  }
  if (!isFiniteNumber(raw.fixedBonus) || !isFiniteNumber(raw.expenseAdjustment)) {
    return `El turno "${raw.id}" tiene importes de plus o gasto inválidos.`;
  }
  if (typeof raw.note !== 'string') {
    return `El turno "${raw.id}" tiene un campo de nota inválido.`;
  }
  if (!VALID_PAYMENT_STATUS.has(raw.paymentStatus as PaymentStatus)) {
    return `El turno "${raw.id}" tiene un estado de cobro inválido.`;
  }
  if (!isRecord(raw.snapshot)) {
    return `El turno "${raw.id}" carece de instantánea histórica (snapshot).`;
  }
  if (
    typeof raw.snapshot.eventNameSnap !== 'string' ||
    !VALID_COLORS.has(raw.snapshot.eventColorSnap as CategoryColor) ||
    !isFiniteNumber(raw.snapshot.netRateSnap) ||
    raw.snapshot.netRateSnap < 0 ||
    !isFiniteNumber(raw.snapshot.grossRateSnap) ||
    raw.snapshot.grossRateSnap < 0 ||
    !isFiniteNumber(raw.snapshot.multiplierSnap) ||
    raw.snapshot.multiplierSnap <= 0 ||
    !VALID_ROUNDING.has(raw.snapshot.roundingModeSnap as RoundingMode) ||
    !isFiniteNumber(raw.snapshot.minGuaranteedHoursSnap) ||
    raw.snapshot.minGuaranteedHoursSnap < 0
  ) {
    return `La instantánea histórica del turno "${raw.id}" está incompleta o dañada.`;
  }
  if (!isRecord(raw.computed)) {
    return `El turno "${raw.id}" carece de totales calculados (computed).`;
  }
  if (
    typeof raw.computed.crossesMidnight !== 'boolean' ||
    !isFiniteNumber(raw.computed.rawDurationMinutes) ||
    !isFiniteNumber(raw.computed.netWorkedMinutes) ||
    !isFiniteNumber(raw.computed.roundedMinutes) ||
    !isFiniteNumber(raw.computed.billableMinutes) ||
    !isFiniteNumber(raw.computed.totalNetAmount) ||
    !isFiniteNumber(raw.computed.totalGrossAmount)
  ) {
    return `Los totales calculados del turno "${raw.id}" son inválidos.`;
  }
  return null;
}

export type BackupValidationResult =
  | { ok: true; data: ShiftLogDatabase }
  | { ok: false; error: string };

export function validateBackupJson(rawText: string): BackupValidationResult {
  if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
    return { ok: false, error: 'El archivo está vacío.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return {
      ok: false,
      error: 'El archivo seleccionado no contiene un formato JSON válido.',
    };
  }

  if (!isRecord(parsed)) {
    return {
      ok: false,
      error: 'La estructura raíz del archivo de copia de seguridad no es válida.',
    };
  }

  if (parsed.version !== 1) {
    return {
      ok: false,
      error: 'Versión de copia de seguridad no compatible (se requiere version: 1).',
    };
  }

  if (!Array.isArray(parsed.events) || !Array.isArray(parsed.shifts)) {
    return {
      ok: false,
      error: 'El archivo debe incluir las listas "events" y "shifts".',
    };
  }

  if (!isRecord(parsed.settings)) {
    return {
      ok: false,
      error: 'El archivo no incluye el bloque "settings" de configuración.',
    };
  }

  const rawSettings = parsed.settings;
  if (
    !isFiniteNumber(rawSettings.cycleStartDay) ||
    rawSettings.cycleStartDay < 1 ||
    rawSettings.cycleStartDay > 28
  ) {
    return {
      ok: false,
      error: 'El día de inicio de ciclo en "settings" debe estar entre 1 y 28.',
    };
  }

  for (let i = 0; i < parsed.events.length; i++) {
    const err = validateEvent(parsed.events[i], i);
    if (err) {
      return { ok: false, error: err };
    }
  }

  for (let i = 0; i < parsed.shifts.length; i++) {
    const err = validateShift(parsed.shifts[i], i);
    if (err) {
      return { ok: false, error: err };
    }
  }

  const sanitizedSettings: AppSettings = {
    cycleStartDay: clampCycleStartDay(rawSettings.cycleStartDay),
    monthlyGoalNetEuros:
      isFiniteNumber(rawSettings.monthlyGoalNetEuros) &&
      rawSettings.monthlyGoalNetEuros > 0
        ? rawSettings.monthlyGoalNetEuros
        : null,
    monthlyGoalHours:
      isFiniteNumber(rawSettings.monthlyGoalHours) && rawSettings.monthlyGoalHours > 0
        ? rawSettings.monthlyGoalHours
        : null,
  };

  return {
    ok: true,
    data: {
      version: 1,
      exportedAt:
        typeof parsed.exportedAt === 'string'
          ? parsed.exportedAt
          : new Date().toISOString(),
      events: parsed.events as WorkEvent[],
      shifts: parsed.shifts as ShiftRecord[],
      settings: sanitizedSettings,
    },
  };
}

export function mergeDatabases(
  current: { events: WorkEvent[]; shifts: ShiftRecord[]; settings: AppSettings },
  incoming: ShiftLogDatabase
): { events: WorkEvent[]; shifts: ShiftRecord[]; settings: AppSettings } {
  const eventsMap = new Map<string, WorkEvent>();
  for (const ev of current.events) {
    eventsMap.set(ev.id, ev);
  }
  for (const ev of incoming.events) {
    eventsMap.set(ev.id, ev);
  }

  const shiftsMap = new Map<string, ShiftRecord>();
  for (const sh of current.shifts) {
    shiftsMap.set(sh.id, sh);
  }
  for (const sh of incoming.shifts) {
    shiftsMap.set(sh.id, sh);
  }

  return {
    events: Array.from(eventsMap.values()),
    shifts: Array.from(shiftsMap.values()).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    }),
    settings: {
      cycleStartDay: current.settings.cycleStartDay || incoming.settings.cycleStartDay,
      monthlyGoalNetEuros:
        current.settings.monthlyGoalNetEuros ?? incoming.settings.monthlyGoalNetEuros,
      monthlyGoalHours:
        current.settings.monthlyGoalHours ?? incoming.settings.monthlyGoalHours,
    },
  };
}

export function buildBackupDatabase(state: {
  events: WorkEvent[];
  shifts: ShiftRecord[];
  settings: AppSettings;
}): ShiftLogDatabase {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    events: state.events,
    shifts: state.shifts,
    settings: state.settings,
  };
}

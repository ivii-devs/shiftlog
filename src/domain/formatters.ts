const MONTH_NAMES_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

const MONTH_NAMES_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const WEEKDAY_NAMES_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const WEEKDAY_NAMES_LONG = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

export function round2(value: number): number {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatDecimalEs(value: number, decimals = 2): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const fixed = Math.abs(safeValue).toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = safeValue < 0 ? '-' : '';
  return decimals > 0 ? `${sign}${withThousands},${decPart}` : `${sign}${withThousands}`;
}

export function formatCurrency(amount: number): string {
  const normalized = round2(amount);
  return `${formatDecimalEs(normalized, 2)} €`;
}

export function formatSignedCurrency(amount: number): string {
  const normalized = round2(amount);
  if (normalized > 0) {
    return `+${formatDecimalEs(normalized, 2)} €`;
  }
  if (normalized < 0) {
    return `-${formatDecimalEs(Math.abs(normalized), 2)} €`;
  }
  return '0,00 €';
}

export function formatHourlyRate(rate: number): string {
  return `${formatDecimalEs(round2(rate), 2)} €/h`;
}

export function formatMultiplier(multiplier: number): string {
  const clean = Number(multiplier.toFixed(2));
  const formatted = String(clean).replace('.', ',');
  return `x${formatted}`;
}

export function formatPercentage(value: number, decimals = 1, signed = false): string {
  const safe = Number.isFinite(value) ? value : 0;
  const factor = Math.pow(10, decimals);
  const normalized = Math.round((safe + Number.EPSILON) * factor) / factor;
  const clean = Object.is(normalized, -0) ? 0 : normalized;
  const prefix = signed && clean > 0 ? '+' : '';
  return `${prefix}${formatDecimalEs(clean, decimals)} %`;
}

export function formatMinutes(totalMinutes: number): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours === 0 && minutes === 0) {
    return '0h';
  }
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function parseIsoDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function toIsoDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayIsoLocal(): string {
  return toIsoDateLocal(new Date());
}

export function formatShortDateEs(dateStr: string): string {
  const date = parseIsoDateLocal(dateStr);
  const weekday = WEEKDAY_NAMES_SHORT[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_SHORT[date.getMonth()];
  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capWeekday}, ${day} ${month}`;
}

export function formatFullDateEs(dateStr: string): string {
  const date = parseIsoDateLocal(dateStr);
  const weekday = WEEKDAY_NAMES_LONG[date.getDay()];
  const day = date.getDate();
  const month = MONTH_NAMES_LONG[date.getMonth()];
  return `${weekday}, ${day} de ${month}`;
}

export function formatNumericDateEs(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

export function formatMonthYearEs(year: number, monthIndex0: number): string {
  const month = MONTH_NAMES_LONG[monthIndex0] ?? '';
  const capMonth = month.charAt(0).toUpperCase() + month.slice(1);
  return `${capMonth} ${year}`;
}

export function formatCycleRangeEs(startDate: string, endDate: string): string {
  const start = parseIsoDateLocal(startDate);
  const end = parseIsoDateLocal(endDate);
  const sDay = String(start.getDate()).padStart(2, '0');
  const sMonth = MONTH_NAMES_SHORT[start.getMonth()];
  const eDay = String(end.getDate()).padStart(2, '0');
  const eMonth = MONTH_NAMES_SHORT[end.getMonth()];
  const eYear = end.getFullYear();

  if (start.getFullYear() !== end.getFullYear()) {
    return `${sDay} ${sMonth} ${start.getFullYear()} - ${eDay} ${eMonth} ${eYear}`;
  }
  return `${sDay} ${sMonth} - ${eDay} ${eMonth} ${eYear}`;
}

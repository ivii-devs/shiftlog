import {
  formatCycleRangeEs,
  formatMonthYearEs,
  parseIsoDateLocal,
  toIsoDateLocal,
} from './formatters';
import type { AppSettings, CycleWindow, ShiftRecord } from './types';

export interface ResolvedCycleGoals {
  key: string;
  netEuros: number | null;
  hours: number | null;
  isCustomOverride: boolean;
}

const YEAR_MONTH_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function sanitizePositiveGoal(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

export function formatYearMonthKey(year: number, monthIndexZeroBased: number): string {
  const normalized = new Date(year, monthIndexZeroBased, 1, 12, 0, 0, 0);
  const y = normalized.getFullYear();
  const m = normalized.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function parseYearMonthKey(key: string): { year: number; month: number } | null {
  if (!YEAR_MONTH_KEY_REGEX.test(key)) return null;
  const [yStr, mStr] = key.split('-');
  const year = Number(yStr);
  const month = Number(mStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return { year, month };
}

export function getCycleGoalKey(
  cycle: Pick<CycleWindow, 'anchorYear' | 'anchorMonth'>
): string {
  return formatYearMonthKey(cycle.anchorYear, cycle.anchorMonth);
}

export function resolveCycleGoals(
  settings: AppSettings,
  cycle: Pick<CycleWindow, 'anchorYear' | 'anchorMonth'>
): ResolvedCycleGoals {
  const key = getCycleGoalKey(cycle);
  const overrides = settings.monthlyGoalOverrides;

  if (overrides && Object.prototype.hasOwnProperty.call(overrides, key)) {
    const custom = overrides[key];
    return {
      key,
      netEuros: sanitizePositiveGoal(custom?.netEuros),
      hours: sanitizePositiveGoal(custom?.hours),
      isCustomOverride: true,
    };
  }

  return {
    key,
    netEuros: sanitizePositiveGoal(settings.monthlyGoalNetEuros),
    hours: sanitizePositiveGoal(settings.monthlyGoalHours),
    isCustomOverride: false,
  };
}

export function diffCalendarDays(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1);
  const endUtc = Date.UTC(ey, (em || 1) - 1, ed || 1);
  return Math.round((endUtc - startUtc) / 86_400_000);
}

export function enumerateCycleDates(
  cycle: Pick<CycleWindow, 'startDate' | 'endDate'>
): string[] {
  const totalDays = diffCalendarDays(cycle.startDate, cycle.endDate) + 1;
  if (totalDays <= 0) return [];
  const start = parseIsoDateLocal(cycle.startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const startDay = start.getDate();

  const dates: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    dates.push(toIsoDateLocal(new Date(startYear, startMonth, startDay + i, 12, 0, 0, 0)));
  }
  return dates;
}

const SHORT_MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function clampCycleStartDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.max(1, Math.min(28, Math.round(day)));
}

export function getCycleByAnchor(
  anchorYear: number,
  anchorMonth: number,
  rawCycleStartDay: number
): CycleWindow {
  const cycleStartDay = clampCycleStartDay(rawCycleStartDay);
  const normalizedAnchor = new Date(anchorYear, anchorMonth, 1, 12, 0, 0, 0);
  const year = normalizedAnchor.getFullYear();
  const month = normalizedAnchor.getMonth();

  if (cycleStartDay === 1) {
    const start = new Date(year, month, 1, 12, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 12, 0, 0, 0);
    const startDate = toIsoDateLocal(start);
    const endDate = toIsoDateLocal(end);
    return {
      id: `${year}-${String(month + 1).padStart(2, '0')}-d1`,
      startDate,
      endDate,
      label: formatMonthYearEs(year, month),
      shortLabel: `${SHORT_MONTHS[month]} ${String(year).slice(-2)}`,
      anchorYear: year,
      anchorMonth: month,
    };
  }

  const start = new Date(year, month, cycleStartDay, 12, 0, 0, 0);
  const end = new Date(year, month + 1, cycleStartDay - 1, 12, 0, 0, 0);
  const startDate = toIsoDateLocal(start);
  const endDate = toIsoDateLocal(end);
  const endMonth = end.getMonth();

  return {
    id: `${year}-${String(month + 1).padStart(2, '0')}-d${cycleStartDay}`,
    startDate,
    endDate,
    label: formatCycleRangeEs(startDate, endDate),
    shortLabel: `${SHORT_MONTHS[month]}/${SHORT_MONTHS[endMonth]}`,
    anchorYear: year,
    anchorMonth: month,
  };
}

export function getCycleForDate(dateStr: string, rawCycleStartDay: number): CycleWindow {
  const cycleStartDay = clampCycleStartDay(rawCycleStartDay);
  const date = parseIsoDateLocal(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (cycleStartDay === 1 || day >= cycleStartDay) {
    return getCycleByAnchor(year, month, cycleStartDay);
  }
  return getCycleByAnchor(year, month - 1, cycleStartDay);
}

export function getAdjacentCycle(
  cycle: CycleWindow,
  offsetMonths: number,
  rawCycleStartDay: number
): CycleWindow {
  return getCycleByAnchor(
    cycle.anchorYear,
    cycle.anchorMonth + offsetMonths,
    rawCycleStartDay
  );
}

export function getLastSixCycles(
  activeCycle: CycleWindow,
  rawCycleStartDay: number
): CycleWindow[] {
  const cycles: CycleWindow[] = [];
  for (let i = 5; i >= 0; i--) {
    cycles.push(getAdjacentCycle(activeCycle, -i, rawCycleStartDay));
  }
  return cycles;
}

export function isDateInCycle(dateStr: string, cycle: CycleWindow): boolean {
  return dateStr >= cycle.startDate && dateStr <= cycle.endDate;
}

export function filterShiftsByCycle(
  shifts: ShiftRecord[],
  cycle: CycleWindow
): ShiftRecord[] {
  return shifts
    .filter((s) => isDateInCycle(s.date, cycle))
    .sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.startTime.localeCompare(a.startTime);
    });
}

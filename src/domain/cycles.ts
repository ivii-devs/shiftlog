import {
  formatCycleRangeEs,
  formatMonthYearEs,
  parseIsoDateLocal,
  toIsoDateLocal,
} from './formatters';
import type { CycleWindow, ShiftRecord } from './types';

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

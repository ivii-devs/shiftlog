import { round2 } from './formatters';
import type {
  RoundingMode,
  ShiftComputedTotals,
  ShiftHistoricalSnapshot,
  ShiftRateType,
  WorkEvent,
} from './types';

export function timeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return 0;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return 0;
  const clampedHours = Math.max(0, Math.min(23, hours));
  const clampedMinutes = Math.max(0, Math.min(59, minutes));
  return clampedHours * 60 + clampedMinutes;
}

export function isValidTimeFormat(timeStr: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim());
}

export function applyRounding(minutes: number, mode: RoundingMode): number {
  const safe = Math.max(0, Math.round(minutes));
  if (mode === '15m') {
    return Math.round(safe / 15) * 15;
  }
  if (mode === '30m') {
    return Math.round(safe / 30) * 30;
  }
  return safe;
}

export function createHistoricalSnapshot(
  event: WorkEvent,
  rateType: ShiftRateType
): ShiftHistoricalSnapshot {
  const netRateSnap = round2(Math.max(0, event.netRate));
  const grossRateSnap =
    typeof event.grossRate === 'number' && event.grossRate > 0
      ? round2(event.grossRate)
      : netRateSnap;

  const multiplierSnap = event.multipliers?.[rateType] ?? 1.0;

  return {
    eventNameSnap: event.name,
    eventColorSnap: event.color,
    netRateSnap,
    grossRateSnap,
    multiplierSnap,
    roundingModeSnap: event.roundingMode,
    minGuaranteedHoursSnap: Math.max(0, event.minGuaranteedHours || 0),
  };
}

export interface CalculateShiftInput {
  startTime: string;
  endTime: string;
  breakMinutes: number;
  fixedBonus: number;
  expenseAdjustment: number;
  snapshot: ShiftHistoricalSnapshot;
}

export function calculateShiftTotals(input: CalculateShiftInput): ShiftComputedTotals {
  const startMinutes = timeToMinutes(input.startTime);
  const endMinutes = timeToMinutes(input.endTime);

  const crossesMidnight = endMinutes <= startMinutes;
  const rawDurationMinutes = crossesMidnight
    ? 1440 - startMinutes + endMinutes
    : endMinutes - startMinutes;

  const safeBreak = Math.max(0, Math.round(input.breakMinutes || 0));
  const netWorkedMinutes = Math.max(0, rawDurationMinutes - safeBreak);

  const roundedMinutes = applyRounding(netWorkedMinutes, input.snapshot.roundingModeSnap);

  const minGuaranteedMinutes = Math.round(
    Math.max(0, input.snapshot.minGuaranteedHoursSnap || 0) * 60
  );

  const billableMinutes =
    rawDurationMinutes > 0 ? Math.max(roundedMinutes, minGuaranteedMinutes) : 0;

  const billableHours = billableMinutes / 60;
  const baseNet = billableHours * input.snapshot.netRateSnap * input.snapshot.multiplierSnap;
  const baseGross =
    billableHours * input.snapshot.grossRateSnap * input.snapshot.multiplierSnap;

  const bonus = Number.isFinite(input.fixedBonus) ? input.fixedBonus : 0;
  const expense = Number.isFinite(input.expenseAdjustment) ? input.expenseAdjustment : 0;

  const totalNetAmount = round2(baseNet + bonus + expense);
  const totalGrossAmount = round2(baseGross + bonus + expense);

  return {
    crossesMidnight,
    rawDurationMinutes,
    netWorkedMinutes,
    roundedMinutes,
    billableMinutes,
    totalNetAmount,
    totalGrossAmount,
  };
}

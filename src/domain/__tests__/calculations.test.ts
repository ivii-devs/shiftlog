import { describe, expect, it } from 'vitest';
import { calculateShiftTotals, createHistoricalSnapshot } from '../calculations';
import { formatCurrency, formatMinutes, formatSignedCurrency } from '../formatters';
import type { WorkEvent } from '../types';

const baseEvent: WorkEvent = {
  id: 'ev-1',
  name: 'Catering Hotel',
  color: 'emerald',
  netRate: 12.5,
  grossRate: 15.0,
  hasUnpaidBreak: true,
  defaultBreakMinutes: 30,
  minGuaranteedHours: 0,
  roundingMode: 'none',
  multipliers: {
    normal: 1.0,
    holiday: 1.5,
    night: 1.25,
    overtime: 1.5,
  },
  quickTemplates: [],
  archived: false,
  createdAt: '2026-05-01T10:00:00.000Z',
};

describe('calculations & formatters (T-03, T-04)', () => {
  it('formats Spanish currency and durations accurately (AC19)', () => {
    expect(formatCurrency(1240.5)).toBe('1.240,50 €');
    expect(formatCurrency(0)).toBe('0,00 €');
    expect(formatSignedCurrency(-3.5)).toBe('-3,50 €');
    expect(formatSignedCurrency(10)).toBe('+10,00 €');
    expect(formatMinutes(510)).toBe('8h 30m');
    expect(formatMinutes(480)).toBe('8h');
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(0)).toBe('0h');
  });

  it('calculates a standard daytime shift with unpaid break subtraction (AC3, AC4, AC8)', () => {
    const snapshot = createHistoricalSnapshot(baseEvent, 'normal');
    const computed = calculateShiftTotals({
      startTime: '08:00',
      endTime: '16:30',
      breakMinutes: 30,
      fixedBonus: 0,
      expenseAdjustment: 0,
      snapshot,
    });

    expect(computed.crossesMidnight).toBe(false);
    expect(computed.rawDurationMinutes).toBe(510); // 8h 30m
    expect(computed.netWorkedMinutes).toBe(480); // 8h
    expect(computed.billableMinutes).toBe(480);
    expect(computed.totalNetAmount).toBe(100.0); // 8 * 12.5
    expect(computed.totalGrossAmount).toBe(120.0); // 8 * 15.0
  });

  it('calculates overnight shifts crossing midnight and assigns full duration (AC3)', () => {
    const snapshot = createHistoricalSnapshot(baseEvent, 'night');
    const computed = calculateShiftTotals({
      startTime: '22:00',
      endTime: '04:00',
      breakMinutes: 0,
      fixedBonus: 0,
      expenseAdjustment: 0,
      snapshot,
    });

    expect(computed.crossesMidnight).toBe(true);
    expect(computed.rawDurationMinutes).toBe(360); // 6 hours
    expect(computed.billableMinutes).toBe(360);
    // 6h * 12.50 €/h * 1.25 (night) = 93.75 €
    expect(computed.totalNetAmount).toBe(93.75);
    // 6h * 15.00 €/h * 1.25 = 112.50 €
    expect(computed.totalGrossAmount).toBe(112.5);
  });

  it('handles 24h shift when startTime equals endTime (AC3 edge case)', () => {
    const snapshot = createHistoricalSnapshot(baseEvent, 'normal');
    const computed = calculateShiftTotals({
      startTime: '08:00',
      endTime: '08:00',
      breakMinutes: 0,
      fixedBonus: 0,
      expenseAdjustment: 0,
      snapshot,
    });

    expect(computed.crossesMidnight).toBe(true);
    expect(computed.rawDurationMinutes).toBe(1440);
  });

  it('clamps netWorkedMinutes to 0 if breakMinutes exceeds rawDurationMinutes', () => {
    const snapshot = createHistoricalSnapshot(baseEvent, 'normal');
    const computed = calculateShiftTotals({
      startTime: '10:00',
      endTime: '10:30',
      breakMinutes: 60,
      fixedBonus: 0,
      expenseAdjustment: 0,
      snapshot,
    });

    expect(computed.rawDurationMinutes).toBe(30);
    expect(computed.netWorkedMinutes).toBe(0);
    expect(computed.billableMinutes).toBe(0);
    expect(computed.totalNetAmount).toBe(0);
  });

  it('applies exact calculation sequence: break -> rounding -> minGuaranteed -> multiplier -> bonus/expense (AC8)', () => {
    const customEvent: WorkEvent = {
      ...baseEvent,
      netRate: 10,
      grossRate: undefined, // Should fallback to netRate (10)
      roundingMode: '30m',
      minGuaranteedHours: 4, // 240 min guaranteed
    };

    const snapshot = createHistoricalSnapshot(customEvent, 'holiday'); // x1.5
    expect(snapshot.grossRateSnap).toBe(10);

    // Worked 10:00 to 12:20 (140 min) - 15 min break = 125 min
    // Rounded to 30m: 125 / 30 = 4.166 -> 4 * 30 = 120 min (2h)
    // Elevated to minGuaranteedHours: 4h (240 min)
    // Base net: 4h * 10 €/h * 1.5 = 60 €
    // Plus fixedBonus (+10 €) and expenseAdjustment (-3.50 €) = 66.50 €
    const computed = calculateShiftTotals({
      startTime: '10:00',
      endTime: '12:20',
      breakMinutes: 15,
      fixedBonus: 10,
      expenseAdjustment: -3.5,
      snapshot,
    });

    expect(computed.rawDurationMinutes).toBe(140);
    expect(computed.netWorkedMinutes).toBe(125);
    expect(computed.roundedMinutes).toBe(120);
    expect(computed.billableMinutes).toBe(240);
    expect(computed.totalNetAmount).toBe(66.5);
    expect(computed.totalGrossAmount).toBe(66.5);
  });

  it('preserves historical snapshot immutability when event rates change later (AC9)', () => {
    const oldSnapshot = createHistoricalSnapshot(baseEvent, 'normal');
    const oldComputed = calculateShiftTotals({
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
      fixedBonus: 0,
      expenseAdjustment: 0,
      snapshot: oldSnapshot,
    });

    // Mutate event rate in the future
    const updatedEvent: WorkEvent = {
      ...baseEvent,
      netRate: 20.0,
      grossRate: 25.0,
    };
    const newSnapshot = createHistoricalSnapshot(updatedEvent, 'normal');

    // Re-evaluating with oldSnapshot keeps 100.00 €, unaffected by updatedEvent
    const recheckedOld = calculateShiftTotals({
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
      fixedBonus: 0,
      expenseAdjustment: 0,
      snapshot: oldSnapshot,
    });

    expect(oldComputed.totalNetAmount).toBe(100.0);
    expect(recheckedOld.totalNetAmount).toBe(100.0);
    expect(newSnapshot.netRateSnap).toBe(20.0);
  });
});

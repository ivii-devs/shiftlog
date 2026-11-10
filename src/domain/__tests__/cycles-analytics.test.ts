import { describe, expect, it } from 'vitest';
import { computeCycleAnalytics } from '../analytics';
import { calculateShiftTotals, createHistoricalSnapshot } from '../calculations';
import { getCycleForDate, getLastSixCycles } from '../cycles';
import type { AppSettings, ShiftRecord, WorkEvent } from '../types';

const eventA: WorkEvent = {
  id: 'ev-a',
  name: 'Sonido Eventos',
  color: 'blue',
  netRate: 15,
  grossRate: 20,
  hasUnpaidBreak: false,
  defaultBreakMinutes: 0,
  minGuaranteedHours: 0,
  roundingMode: 'none',
  multipliers: { normal: 1, holiday: 1.5, night: 1.25, overtime: 1.5 },
  quickTemplates: [],
  archived: false,
  createdAt: '2026-01-01T00:00:00Z',
};

const eventB: WorkEvent = {
  ...eventA,
  id: 'ev-b',
  name: 'Logística Nocturna',
  color: 'emerald',
  netRate: 12,
  grossRate: 15,
};

function makeShift(
  id: string,
  event: WorkEvent,
  date: string,
  startTime: string,
  endTime: string,
  paymentStatus: 'pending' | 'paid' = 'pending'
): ShiftRecord {
  const snapshot = createHistoricalSnapshot(event, 'normal');
  const computed = calculateShiftTotals({
    startTime,
    endTime,
    breakMinutes: 0,
    fixedBonus: 0,
    expenseAdjustment: 0,
    snapshot,
  });
  return {
    id,
    eventId: event.id,
    date,
    startTime,
    endTime,
    breakMinutes: 0,
    rateType: 'normal',
    fixedBonus: 0,
    expenseAdjustment: 0,
    note: '',
    paymentStatus,
    snapshot,
    computed,
    createdAt: '2026-05-01T00:00:00Z',
  };
}

describe('cycles & analytics (T-05)', () => {
  it('computes natural month cycle when cycleStartDay === 1 (AC10)', () => {
    const cycle = getCycleForDate('2026-05-15', 1);
    expect(cycle.startDate).toBe('2026-05-01');
    expect(cycle.endDate).toBe('2026-05-31');
    expect(cycle.label).toBe('Mayo 2026');
  });

  it('computes custom billing cycle from day 25 to 24 of next month (AC10)', () => {
    // On May 10, the active cycle started on April 25 and ends on May 24
    const cycleBefore25 = getCycleForDate('2026-05-10', 25);
    expect(cycleBefore25.startDate).toBe('2026-04-25');
    expect(cycleBefore25.endDate).toBe('2026-05-24');

    // On May 25, the active cycle starts on May 25 and ends on June 24
    const cycleOn25 = getCycleForDate('2026-05-25', 25);
    expect(cycleOn25.startDate).toBe('2026-05-25');
    expect(cycleOn25.endDate).toBe('2026-06-24');

    const sixCycles = getLastSixCycles(cycleOn25, 25);
    expect(sixCycles).toHaveLength(6);
    expect(sixCycles[5].id).toBe(cycleOn25.id);
    expect(sixCycles[4].startDate).toBe('2026-04-25');
  });

  it('computes cycle totals, gross vs net withholding, goal pace and variations (AC11, AC12, AC14)', () => {
    const settings: AppSettings = {
      cycleStartDay: 25,
      monthlyGoalNetEuros: 500,
      monthlyGoalHours: 40,
    };

    const currentCycle = getCycleForDate('2026-05-02', 25); // 2026-04-25 to 2026-05-24
    const shifts: ShiftRecord[] = [
      // Previous cycle shift (2026-04-10): 8h * 15€ = 120€ net
      makeShift('s-prev', eventA, '2026-04-10', '08:00', '16:00', 'paid'),
      // Current cycle shift 1 (2026-04-26): 8h * 15€ = 120€ net, 160€ gross (paid)
      makeShift('s-cur-1', eventA, '2026-04-26', '08:00', '16:00', 'paid'),
      // Current cycle shift 2 (2026-05-02): 10h * 12€ = 120€ net, 150€ gross (pending)
      makeShift('s-cur-2', eventB, '2026-05-02', '08:00', '18:00', 'pending'),
    ];

    const analytics = computeCycleAnalytics({
      cycle: currentCycle,
      allShifts: shifts,
      events: [eventA, eventB],
      settings,
    });

    // Totals in current cycle: 240€ net, 310€ gross, 18h (1080 min)
    expect(analytics.totalShifts).toBe(2);
    expect(analytics.totalNetEarned).toBe(240);
    expect(analytics.totalGrossEarned).toBe(310);
    expect(analytics.totalBillableMinutes).toBe(1080);
    expect(analytics.paidNetAmount).toBe(120);
    expect(analytics.pendingNetAmount).toBe(120);
    expect(analytics.allPaid).toBe(false);

    // Gross vs Net: 310 - 240 = 70€ difference, (70 / 310) * 100 = 22.58%
    expect(analytics.grossNetDifference).toBe(70);
    expect(analytics.estimatedWithholdingPct).toBe(22.58);

    // Effective hourly net rate: 240€ / 18h = 13.33 €/h
    expect(analytics.effectiveHourlyNetRate).toBe(13.33);
    // Goal Euros: 240 / 500 = 48%, remaining 260€ / 13.33 €/h = 19.5h
    expect(analytics.goalEurosProgressPct).toBe(48);
    expect(analytics.remainingEuros).toBe(260);
    expect(analytics.remainingHoursAtCurrentPace).toBe(19.5);

    // Variation vs previous cycle (240 vs 120 = +100%)
    expect(analytics.previousNetEarned).toBe(120);
    expect(analytics.netVariationPct).toBe(100);

    // Category breakdown
    expect(analytics.categoryBreakdown).toHaveLength(2);
    expect(analytics.categoryBreakdown[0].percentageOfCycleNet).toBe(50);
    expect(analytics.categoryBreakdown[1].percentageOfCycleNet).toBe(50);
  });
});

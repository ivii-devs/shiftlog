import { describe, expect, it } from 'vitest';
import { computeCycleAnalytics, simulateExtraWork } from '../analytics';
import { calculateShiftTotals, createHistoricalSnapshot } from '../calculations';
import { getCycleForDate, getLastSixCycles, resolveCycleGoals } from '../cycles';
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
  endTime: string
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
    snapshot,
    computed,
    createdAt: '2026-05-01T00:00:00Z',
  };
}

describe('cycles, per-month goals, analytics, predictions & simulator (T-02)', () => {
  it('computes natural month cycle when cycleStartDay === 1', () => {
    const cycle = getCycleForDate('2026-05-15', 1);
    expect(cycle.startDate).toBe('2026-05-01');
    expect(cycle.endDate).toBe('2026-05-31');
    expect(cycle.label).toBe('Mayo 2026');
  });

  it('computes custom billing cycle from day 25 to 24 of next month', () => {
    const cycleBefore25 = getCycleForDate('2026-05-10', 25);
    expect(cycleBefore25.startDate).toBe('2026-04-25');
    expect(cycleBefore25.endDate).toBe('2026-05-24');

    const cycleOn25 = getCycleForDate('2026-05-25', 25);
    expect(cycleOn25.startDate).toBe('2026-05-25');
    expect(cycleOn25.endDate).toBe('2026-06-24');

    const sixCycles = getLastSixCycles(cycleOn25, 25);
    expect(sixCycles).toHaveLength(6);
    expect(sixCycles[5].id).toBe(cycleOn25.id);
    expect(sixCycles[4].startDate).toBe('2026-04-25');
  });

  it('resolves per-month custom goals, explicit null deactivation, and base inheritance (AC01, AC02)', () => {
    const settings: AppSettings = {
      cycleStartDay: 1,
      monthlyGoalNetEuros: 600,
      monthlyGoalHours: 45,
      monthlyGoalOverrides: {
        '2026-11': { netEuros: 350, hours: 25 },
        '2026-12': { netEuros: null, hours: null },
      },
    };

    const nov = getCycleForDate('2026-11-10', 1);
    const dec = getCycleForDate('2026-12-10', 1);
    const jan = getCycleForDate('2027-01-10', 1);

    expect(resolveCycleGoals(settings, nov)).toEqual({
      key: '2026-11',
      netEuros: 350,
      hours: 25,
      isCustomOverride: true,
    });
    expect(resolveCycleGoals(settings, dec)).toEqual({
      key: '2026-12',
      netEuros: null,
      hours: null,
      isCustomOverride: true,
    });
    expect(resolveCycleGoals(settings, jan)).toEqual({
      key: '2027-01',
      netEuros: 600,
      hours: 45,
      isCustomOverride: false,
    });
  });

  it('computes cycle totals, activity metrics, daily/weekly series, gross vs net and variations (AC04, AC08)', () => {
    const settings: AppSettings = {
      cycleStartDay: 25,
      monthlyGoalNetEuros: 500,
      monthlyGoalHours: 40,
      monthlyGoalOverrides: {},
    };

    const currentCycle = getCycleForDate('2026-05-02', 25); // 2026-04-25 to 2026-05-24 (30 days)
    const shifts: ShiftRecord[] = [
      makeShift('s-prev', eventA, '2026-04-10', '08:00', '16:00'),
      makeShift('s-cur-1', eventA, '2026-04-26', '08:00', '16:00'), // 8h = 120€ net, 160€ gross
      makeShift('s-cur-2', eventB, '2026-05-02', '08:00', '18:00'), // 10h = 120€ net, 150€ gross
    ];

    const analytics = computeCycleAnalytics({
      cycle: currentCycle,
      allShifts: shifts,
      events: [eventA, eventB],
      settings,
      referenceDate: '2026-05-04',
    });

    expect(analytics.totalShifts).toBe(2);
    expect(analytics.totalNetEarned).toBe(240);
    expect(analytics.totalGrossEarned).toBe(310);
    expect(analytics.totalBillableMinutes).toBe(1080);

    // Activity metrics
    expect(analytics.cycleDaysTotal).toBe(30);
    expect(analytics.workedDaysCount).toBe(2);
    expect(analytics.freeDaysCount).toBe(28);
    expect(analytics.avgMinutesPerWorkedDay).toBe(540); // 9h
    expect(analytics.avgNetPerWorkedDay).toBe(120);
    expect(analytics.avgNetPerShift).toBe(120);
    expect(analytics.avgMinutesPerShift).toBe(540);

    // Daily and weekly series cover every day and preserve total
    expect(analytics.dailySeries).toHaveLength(30);
    expect(analytics.dailySeries.find((d) => d.date === '2026-05-04')?.isToday).toBe(true);
    const sumWeeklyMinutes = analytics.weeklySeries.reduce(
      (acc, w) => acc + w.totalMinutes,
      0
    );
    const sumWeeklyNet = analytics.weeklySeries.reduce(
      (acc, w) => acc + w.totalNetEarned,
      0
    );
    expect(sumWeeklyMinutes).toBe(1080);
    expect(sumWeeklyNet).toBe(240);
    expect(analytics.weeklySeries.length).toBeGreaterThanOrEqual(4);

    // Gross vs Net
    expect(analytics.grossNetDifference).toBe(70);
    expect(analytics.estimatedWithholdingPct).toBe(22.58);
    expect(analytics.effectiveHourlyNetRate).toBe(13.33);
    expect(analytics.goalEurosProgressPct).toBe(48);
    expect(analytics.remainingEuros).toBe(260);
    expect(analytics.remainingHoursAtCurrentPace).toBe(19.5);
    expect(analytics.previousNetEarned).toBe(120);
    expect(analytics.netVariationPct).toBe(100);
    expect(analytics.categoryBreakdown).toHaveLength(2);
  });

  it('computes deterministic predictions for current, past, and future cycles including scheduled future shifts (AC09)', () => {
    const settings: AppSettings = {
      cycleStartDay: 1,
      monthlyGoalNetEuros: 1000,
      monthlyGoalHours: 50,
      monthlyGoalOverrides: {},
    };
    const novCycle = getCycleForDate('2026-11-10', 1); // 30 days: 2026-11-01 to 2026-11-30

    const shifts: ShiftRecord[] = [
      // Past/today shifts: 2 shifts = 16h, 240€ net
      makeShift('s1', eventA, '2026-11-02', '08:00', '16:00'),
      makeShift('s2', eventA, '2026-11-08', '08:00', '16:00'),
      // Already scheduled future shift in the same cycle: 8h, 120€ net
      makeShift('s3', eventA, '2026-11-20', '08:00', '16:00'),
    ];

    // Current cycle on day 10 (10 elapsed, 20 remaining)
    // Pace to date: 240€ / 10d = 24€/d -> 24 * 20 = 480€ > 120€ scheduled -> projected = 240 + 480 = 720€
    const currentAnalytics = computeCycleAnalytics({
      cycle: novCycle,
      allShifts: shifts,
      events: [eventA],
      settings,
      referenceDate: '2026-11-10',
    });

    expect(currentAnalytics.predictions.cyclePhase).toBe('current');
    expect(currentAnalytics.predictions.elapsedDays).toBe(10);
    expect(currentAnalytics.predictions.remainingDays).toBe(20);
    expect(currentAnalytics.predictions.earnedToDateNet).toBe(240);
    expect(currentAnalytics.predictions.scheduledFutureNet).toBe(120);
    expect(currentAnalytics.predictions.scheduledFutureShiftsCount).toBe(1);
    expect(currentAnalytics.predictions.projectedTotalNet).toBe(720);
    // Remaining euros for goal: 1000 - 360 = 640€ across 20 days -> 32€/day
    expect(currentAnalytics.predictions.requiredNetPerRemainingDay).toBe(32);
    // Avg shift is 120€ -> ceil(640 / 120) = 6 shifts
    expect(currentAnalytics.predictions.estimatedShiftsNeededForNetGoal).toBe(6);

    // If scheduled future shifts exceed daily pace, scheduled total drives projection
    const heavyFutureAnalytics = computeCycleAnalytics({
      cycle: novCycle,
      allShifts: [
        makeShift('s1', eventA, '2026-11-02', '08:00', '10:00'), // 30€ in 10d = 3€/d -> 60€ pace
        makeShift('s2', eventA, '2026-11-20', '08:00', '18:00'), // 150€ scheduled
        makeShift('s3', eventA, '2026-11-22', '08:00', '18:00'), // 150€ scheduled (total 300€ > 60€)
      ],
      events: [eventA],
      settings,
      referenceDate: '2026-11-10',
    });
    expect(heavyFutureAnalytics.predictions.projectedTotalNet).toBe(330);

    // Past cycle
    const pastAnalytics = computeCycleAnalytics({
      cycle: novCycle,
      allShifts: shifts,
      events: [eventA],
      settings,
      referenceDate: '2026-12-05',
    });
    expect(pastAnalytics.predictions.cyclePhase).toBe('past');
    expect(pastAnalytics.predictions.remainingDays).toBe(0);
    expect(pastAnalytics.predictions.projectedTotalNet).toBe(360);

    // Future cycle
    const futureAnalytics = computeCycleAnalytics({
      cycle: novCycle,
      allShifts: shifts,
      events: [eventA],
      settings,
      referenceDate: '2026-10-15',
    });
    expect(futureAnalytics.predictions.cyclePhase).toBe('future');
    expect(futureAnalytics.predictions.elapsedDays).toBe(0);
    expect(futureAnalytics.predictions.remainingDays).toBe(30);
    expect(futureAnalytics.predictions.scheduledFutureShiftsCount).toBe(3);

    // Last day of an active cycle remains in 'current' phase with 0 remaining days
    const lastDayAnalytics = computeCycleAnalytics({
      cycle: novCycle,
      allShifts: shifts,
      events: [eventA],
      settings,
      referenceDate: '2026-11-30',
    });
    expect(lastDayAnalytics.predictions.cyclePhase).toBe('current');
    expect(lastDayAnalytics.predictions.elapsedDays).toBe(30);
    expect(lastDayAnalytics.predictions.remainingDays).toBe(0);
  });

  it('reports 0 actualHourlyNetRate when a cycle has no shifts while preserving effectiveHourlyNetRate fallback', () => {
    const settings: AppSettings = {
      cycleStartDay: 1,
      monthlyGoalNetEuros: 600,
      monthlyGoalHours: 40,
      monthlyGoalOverrides: {},
    };
    const emptyAnalytics = computeCycleAnalytics({
      cycle: getCycleForDate('2026-11-10', 1),
      allShifts: [],
      events: [eventA],
      settings,
      referenceDate: '2026-11-10',
    });
    expect(emptyAnalytics.actualHourlyNetRate).toBe(0);
    expect(emptyAnalytics.effectiveHourlyNetRate).toBe(15);
  });

  it('simulates extra hours and extra shifts accurately without mutating data (AC10)', () => {
    const baseAnalytics = {
      totalNetEarned: 400,
      totalBillableMinutes: 1800, // 30h
      goalEurosTarget: 800,
      goalHoursTarget: 50,
    };

    // Simulate +10 extra hours at 15 €/h -> +150€ (total 550€, 68.75%), +600m (total 40h, 80%)
    const simHours = simulateExtraWork({
      analytics: baseAnalytics,
      mode: 'hours',
      quantity: 10,
      hourlyNetRate: 15,
    });
    expect(simHours.addedMinutes).toBe(600);
    expect(simHours.addedNet).toBe(150);
    expect(simHours.totalNet).toBe(550);
    expect(simHours.totalMinutes).toBe(2400);
    expect(simHours.netGoalPct).toBe(68.75);
    expect(simHours.hoursGoalPct).toBe(80);

    // Simulate +4 extra shifts of 6h at 20 €/h -> +24h (1440m), +480€ -> capped at 100%
    const simShifts = simulateExtraWork({
      analytics: baseAnalytics,
      mode: 'shifts',
      quantity: 4,
      hourlyNetRate: 20,
      hoursPerShift: 6,
    });
    expect(simShifts.addedMinutes).toBe(1440);
    expect(simShifts.addedNet).toBe(480);
    expect(simShifts.totalNet).toBe(880);
    expect(simShifts.netGoalPct).toBe(100);
    expect(simShifts.hoursGoalPct).toBe(100);
  });
});

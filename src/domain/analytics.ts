import { filterShiftsByCycle, getAdjacentCycle, getLastSixCycles } from './cycles';
import { round2 } from './formatters';
import type {
  AppSettings,
  CategoryColor,
  CycleWindow,
  ShiftRecord,
  WorkEvent,
} from './types';

export interface CategoryBreakdownItem {
  eventId: string;
  eventName: string;
  color: CategoryColor;
  shiftsCount: number;
  billableMinutes: number;
  netAmount: number;
  grossAmount: number;
  percentageOfCycleNet: number;
}

export interface SixCycleBarItem {
  cycle: CycleWindow;
  totalNetEarned: number;
  totalGrossEarned: number;
  totalBillableMinutes: number;
  shiftsCount: number;
  isCurrent: boolean;
}

export interface CycleAnalytics {
  cycle: CycleWindow;
  totalShifts: number;
  totalNetEarned: number;
  totalGrossEarned: number;
  totalBillableMinutes: number;
  totalBillableHours: number;
  paidNetAmount: number;
  pendingNetAmount: number;
  paidShiftsCount: number;
  pendingShiftsCount: number;
  allPaid: boolean;
  grossNetDifference: number;
  estimatedWithholdingPct: number;
  effectiveHourlyNetRate: number;
  goalEurosTarget: number | null;
  goalEurosProgressPct: number;
  remainingEuros: number;
  remainingHoursAtCurrentPace: number;
  remainingMinutesAtCurrentPace: number;
  goalHoursTarget: number | null;
  goalHoursProgressPct: number;
  remainingGoalMinutes: number;
  previousCycle: CycleWindow;
  previousNetEarned: number;
  previousBillableMinutes: number;
  netVariationPct: number | null;
  hoursVariationPct: number | null;
  categoryBreakdown: CategoryBreakdownItem[];
  sixCyclesSeries: SixCycleBarItem[];
}

export function computeCycleAnalytics(params: {
  cycle: CycleWindow;
  allShifts: ShiftRecord[];
  events: WorkEvent[];
  settings: AppSettings;
}): CycleAnalytics {
  const { cycle, allShifts, events, settings } = params;
  const cycleShifts = filterShiftsByCycle(allShifts, cycle);

  let totalNet = 0;
  let totalGross = 0;
  let totalBillableMinutes = 0;
  let paidNet = 0;
  let pendingNet = 0;
  let paidShiftsCount = 0;
  let pendingShiftsCount = 0;

  const byCategory = new Map<
    string,
    {
      eventId: string;
      eventName: string;
      color: CategoryColor;
      shiftsCount: number;
      billableMinutes: number;
      netAmount: number;
      grossAmount: number;
    }
  >();

  for (const shift of cycleShifts) {
    const net = shift.computed.totalNetAmount;
    const gross = shift.computed.totalGrossAmount;
    const mins = shift.computed.billableMinutes;

    totalNet += net;
    totalGross += gross;
    totalBillableMinutes += mins;

    if (shift.paymentStatus === 'paid') {
      paidNet += net;
      paidShiftsCount += 1;
    } else {
      pendingNet += net;
      pendingShiftsCount += 1;
    }

    const existing = byCategory.get(shift.eventId);
    if (existing) {
      existing.shiftsCount += 1;
      existing.billableMinutes += mins;
      existing.netAmount = round2(existing.netAmount + net);
      existing.grossAmount = round2(existing.grossAmount + gross);
    } else {
      byCategory.set(shift.eventId, {
        eventId: shift.eventId,
        eventName: shift.snapshot.eventNameSnap,
        color: shift.snapshot.eventColorSnap,
        shiftsCount: 1,
        billableMinutes: mins,
        netAmount: round2(net),
        grossAmount: round2(gross),
      });
    }
  }

  const totalNetEarned = round2(totalNet);
  const totalGrossEarned = round2(totalGross);
  const paidNetAmount = round2(paidNet);
  const pendingNetAmount = round2(pendingNet);
  const totalBillableHours = round2(totalBillableMinutes / 60);

  const grossNetDifference = round2(Math.max(0, totalGrossEarned - totalNetEarned));
  const estimatedWithholdingPct =
    totalGrossEarned > 0
      ? round2(Math.max(0, ((totalGrossEarned - totalNetEarned) / totalGrossEarned) * 100))
      : 0;

  // Effective hourly net rate (real pace of current cycle, or fallback to active event rate)
  let effectiveHourlyNetRate = 0;
  if (totalBillableMinutes > 0 && totalNetEarned > 0) {
    effectiveHourlyNetRate = round2(totalNetEarned / (totalBillableMinutes / 60));
  } else {
    const activeEvent = events.find((e) => !e.archived && e.netRate > 0);
    effectiveHourlyNetRate = activeEvent ? round2(activeEvent.netRate) : 0;
  }

  // Monthly goal in Euros
  const goalEurosTarget =
    settings.monthlyGoalNetEuros && settings.monthlyGoalNetEuros > 0
      ? settings.monthlyGoalNetEuros
      : null;

  const goalEurosProgressPct =
    goalEurosTarget && goalEurosTarget > 0
      ? Math.min(100, Math.max(0, round2((totalNetEarned / goalEurosTarget) * 100)))
      : 0;

  const remainingEuros =
    goalEurosTarget && goalEurosTarget > 0
      ? round2(Math.max(0, goalEurosTarget - totalNetEarned))
      : 0;

  const rawRemainingHours =
    remainingEuros > 0 && effectiveHourlyNetRate > 0
      ? remainingEuros / effectiveHourlyNetRate
      : 0;

  const remainingHoursAtCurrentPace = round2(rawRemainingHours);
  const remainingMinutesAtCurrentPace = Math.round(rawRemainingHours * 60);

  // Monthly goal in Hours
  const goalHoursTarget =
    settings.monthlyGoalHours && settings.monthlyGoalHours > 0
      ? settings.monthlyGoalHours
      : null;

  const goalHoursProgressPct =
    goalHoursTarget && goalHoursTarget > 0
      ? Math.min(
          100,
          Math.max(0, round2(((totalBillableMinutes / 60) / goalHoursTarget) * 100))
        )
      : 0;

  const remainingGoalMinutes =
    goalHoursTarget && goalHoursTarget > 0
      ? Math.max(0, Math.round(goalHoursTarget * 60) - totalBillableMinutes)
      : 0;

  // Previous cycle variation
  const previousCycle = getAdjacentCycle(cycle, -1, settings.cycleStartDay);
  const prevShifts = filterShiftsByCycle(allShifts, previousCycle);
  const previousNetEarned = round2(
    prevShifts.reduce((acc, s) => acc + s.computed.totalNetAmount, 0)
  );
  const previousBillableMinutes = prevShifts.reduce(
    (acc, s) => acc + s.computed.billableMinutes,
    0
  );

  const netVariationPct =
    previousNetEarned > 0
      ? round2(((totalNetEarned - previousNetEarned) / previousNetEarned) * 100)
      : null;

  const hoursVariationPct =
    previousBillableMinutes > 0
      ? round2(
          ((totalBillableMinutes - previousBillableMinutes) / previousBillableMinutes) * 100
        )
      : null;

  // Category breakdown sorted descending by netAmount
  const categoryBreakdown: CategoryBreakdownItem[] = Array.from(byCategory.values())
    .map((item) => ({
      ...item,
      percentageOfCycleNet:
        totalNetEarned > 0
          ? Math.max(0, round2((item.netAmount / totalNetEarned) * 100))
          : 0,
    }))
    .sort((a, b) => b.netAmount - a.netAmount);

  // Last 6 cycles series
  const lastSix = getLastSixCycles(cycle, settings.cycleStartDay);
  const sixCyclesSeries: SixCycleBarItem[] = lastSix.map((c) => {
    const cShifts = filterShiftsByCycle(allShifts, c);
    return {
      cycle: c,
      totalNetEarned: round2(
        cShifts.reduce((acc, s) => acc + s.computed.totalNetAmount, 0)
      ),
      totalGrossEarned: round2(
        cShifts.reduce((acc, s) => acc + s.computed.totalGrossAmount, 0)
      ),
      totalBillableMinutes: cShifts.reduce(
        (acc, s) => acc + s.computed.billableMinutes,
        0
      ),
      shiftsCount: cShifts.length,
      isCurrent: c.id === cycle.id,
    };
  });

  return {
    cycle,
    totalShifts: cycleShifts.length,
    totalNetEarned,
    totalGrossEarned,
    totalBillableMinutes,
    totalBillableHours,
    paidNetAmount,
    pendingNetAmount,
    paidShiftsCount,
    pendingShiftsCount,
    allPaid: cycleShifts.length > 0 && pendingShiftsCount === 0,
    grossNetDifference,
    estimatedWithholdingPct,
    effectiveHourlyNetRate,
    goalEurosTarget,
    goalEurosProgressPct,
    remainingEuros,
    remainingHoursAtCurrentPace,
    remainingMinutesAtCurrentPace,
    goalHoursTarget,
    goalHoursProgressPct,
    remainingGoalMinutes,
    previousCycle,
    previousNetEarned,
    previousBillableMinutes,
    netVariationPct,
    hoursVariationPct,
    categoryBreakdown,
    sixCyclesSeries,
  };
}

import {
  diffCalendarDays,
  enumerateCycleDates,
  filterShiftsByCycle,
  getAdjacentCycle,
  getLastSixCycles,
  resolveCycleGoals,
} from './cycles';
import { getTodayIsoLocal, parseIsoDateLocal, round2 } from './formatters';
import type {
  AppSettings,
  CategoryColor,
  CycleWindow,
  ShiftRecord,
  WorkEvent,
} from './types';

const SHORT_MONTHS_LOWER = [
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

export interface DailyCyclePoint {
  date: string;
  dayLabel: string;
  dayNumber: number;
  totalMinutes: number;
  totalNetEarned: number;
  shiftsCount: number;
  isToday: boolean;
}

export interface WeeklyCycleBarItem {
  weekIndex: number;
  label: string;
  rangeLabel: string;
  startDate: string;
  endDate: string;
  totalMinutes: number;
  totalNetEarned: number;
  shiftsCount: number;
}

export type CyclePhase = 'past' | 'current' | 'future';

export interface CyclePredictions {
  cyclePhase: CyclePhase;
  elapsedDays: number;
  remainingDays: number;
  earnedToDateNet: number;
  workedToDateMinutes: number;
  scheduledFutureNet: number;
  scheduledFutureMinutes: number;
  scheduledFutureShiftsCount: number;
  projectedTotalNet: number;
  projectedTotalMinutes: number;
  requiredNetPerRemainingDay: number;
  requiredNetPerRemainingWeek: number;
  requiredMinutesPerRemainingDay: number;
  requiredMinutesPerRemainingWeek: number;
  estimatedShiftsNeededForNetGoal: number | null;
  estimatedShiftsNeededForHoursGoal: number | null;
}

export interface CycleAnalytics {
  cycle: CycleWindow;
  goalKey: string;
  isCustomGoalOverride: boolean;
  totalShifts: number;
  totalNetEarned: number;
  totalGrossEarned: number;
  totalBillableMinutes: number;
  totalBillableHours: number;
  grossNetDifference: number;
  estimatedWithholdingPct: number;
  actualHourlyNetRate: number;
  effectiveHourlyNetRate: number;
  cycleDaysTotal: number;
  workedDaysCount: number;
  freeDaysCount: number;
  avgMinutesPerWorkedDay: number;
  avgNetPerWorkedDay: number;
  avgNetPerShift: number;
  avgMinutesPerShift: number;
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
  dailySeries: DailyCyclePoint[];
  weeklySeries: WeeklyCycleBarItem[];
  predictions: CyclePredictions;
}

export interface SimulateExtraWorkParams {
  analytics: Pick<
    CycleAnalytics,
    'totalNetEarned' | 'totalBillableMinutes' | 'goalEurosTarget' | 'goalHoursTarget'
  >;
  mode: 'hours' | 'shifts';
  quantity: number;
  hourlyNetRate: number;
  hoursPerShift?: number;
}

export interface SimulateExtraWorkResult {
  addedMinutes: number;
  addedNet: number;
  totalNet: number;
  totalMinutes: number;
  netGoalPct: number | null;
  hoursGoalPct: number | null;
}

function formatWeekRangeLabel(startDate: string, endDate: string): string {
  const s = parseIsoDateLocal(startDate);
  const e = parseIsoDateLocal(endDate);
  const sDay = String(s.getDate()).padStart(2, '0');
  const eDay = String(e.getDate()).padStart(2, '0');
  const sMonth = SHORT_MONTHS_LOWER[s.getMonth()];
  const eMonth = SHORT_MONTHS_LOWER[e.getMonth()];

  if (startDate === endDate) {
    return `${sDay} ${sMonth}`;
  }
  if (s.getMonth() === e.getMonth()) {
    return `${sDay}-${eDay} ${sMonth}`;
  }
  return `${sDay} ${sMonth}-${eDay} ${eMonth}`;
}

export function simulateExtraWork(
  params: SimulateExtraWorkParams
): SimulateExtraWorkResult {
  const { analytics, mode, quantity, hourlyNetRate, hoursPerShift = 6 } = params;
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const safeRate = Number.isFinite(hourlyNetRate) && hourlyNetRate > 0 ? hourlyNetRate : 0;
  const safeHoursPerShift =
    Number.isFinite(hoursPerShift) && hoursPerShift > 0 ? hoursPerShift : 6;

  const addedHours = mode === 'hours' ? safeQuantity : safeQuantity * safeHoursPerShift;
  const addedMinutes = Math.round(addedHours * 60);
  const addedNet = round2((addedMinutes / 60) * safeRate);

  const totalNet = round2(analytics.totalNetEarned + addedNet);
  const totalMinutes = analytics.totalBillableMinutes + addedMinutes;

  const netGoalPct =
    analytics.goalEurosTarget && analytics.goalEurosTarget > 0
      ? Math.min(100, Math.max(0, round2((totalNet / analytics.goalEurosTarget) * 100)))
      : null;

  const hoursGoalPct =
    analytics.goalHoursTarget && analytics.goalHoursTarget > 0
      ? Math.min(
          100,
          Math.max(0, round2(((totalMinutes / 60) / analytics.goalHoursTarget) * 100))
        )
      : null;

  return {
    addedMinutes,
    addedNet,
    totalNet,
    totalMinutes,
    netGoalPct,
    hoursGoalPct,
  };
}

export function computeCycleAnalytics(params: {
  cycle: CycleWindow;
  allShifts: ShiftRecord[];
  events: WorkEvent[];
  settings: AppSettings;
  referenceDate?: string;
}): CycleAnalytics {
  const { cycle, allShifts, events, settings } = params;
  const todayIso = params.referenceDate ?? getTodayIsoLocal();
  const cycleShifts = filterShiftsByCycle(allShifts, cycle);

  let totalNet = 0;
  let totalGross = 0;
  let totalBillableMinutes = 0;

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

  const byDate = new Map<
    string,
    { totalMinutes: number; totalNetEarned: number; shiftsCount: number }
  >();

  let earnedToDateNetRaw = 0;
  let workedToDateMinutes = 0;
  let scheduledFutureNetRaw = 0;
  let scheduledFutureMinutes = 0;
  let scheduledFutureShiftsCount = 0;

  for (const shift of cycleShifts) {
    const net = shift.computed.totalNetAmount;
    const gross = shift.computed.totalGrossAmount;
    const mins = shift.computed.billableMinutes;

    totalNet += net;
    totalGross += gross;
    totalBillableMinutes += mins;

    if (shift.date <= todayIso) {
      earnedToDateNetRaw += net;
      workedToDateMinutes += mins;
    } else {
      scheduledFutureNetRaw += net;
      scheduledFutureMinutes += mins;
      scheduledFutureShiftsCount += 1;
    }

    const dayAgg = byDate.get(shift.date);
    if (dayAgg) {
      dayAgg.totalMinutes += mins;
      dayAgg.totalNetEarned = round2(dayAgg.totalNetEarned + net);
      dayAgg.shiftsCount += 1;
    } else {
      byDate.set(shift.date, {
        totalMinutes: mins,
        totalNetEarned: round2(net),
        shiftsCount: 1,
      });
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
  const totalBillableHours = round2(totalBillableMinutes / 60);

  const grossNetDifference = round2(Math.max(0, totalGrossEarned - totalNetEarned));
  const estimatedWithholdingPct =
    totalGrossEarned > 0
      ? round2(Math.max(0, ((totalGrossEarned - totalNetEarned) / totalGrossEarned) * 100))
      : 0;

  // Real hourly net rate of shifts logged in this cycle (0 when no shifts worked)
  const actualHourlyNetRate =
    totalBillableMinutes > 0
      ? round2(totalNetEarned / (totalBillableMinutes / 60))
      : 0;

  // Effective hourly net rate (real pace of current cycle, or fallback to active event rate when empty)
  let effectiveHourlyNetRate = 0;
  if (totalBillableMinutes > 0) {
    effectiveHourlyNetRate = Math.max(0, actualHourlyNetRate);
  } else {
    const activeEvent = events.find((e) => !e.archived && e.netRate > 0);
    effectiveHourlyNetRate = activeEvent ? round2(activeEvent.netRate) : 0;
  }

  // Activity metrics and daily/weekly series
  const cycleDates = enumerateCycleDates(cycle);
  const cycleDaysTotal = cycleDates.length;
  const workedDaysCount = byDate.size;
  const freeDaysCount = Math.max(0, cycleDaysTotal - workedDaysCount);
  const avgMinutesPerWorkedDay =
    workedDaysCount > 0 ? Math.round(totalBillableMinutes / workedDaysCount) : 0;
  const avgNetPerWorkedDay =
    workedDaysCount > 0 ? round2(totalNetEarned / workedDaysCount) : 0;
  const avgNetPerShift =
    cycleShifts.length > 0 ? round2(totalNetEarned / cycleShifts.length) : 0;
  const avgMinutesPerShift =
    cycleShifts.length > 0 ? Math.round(totalBillableMinutes / cycleShifts.length) : 0;

  const dailySeries: DailyCyclePoint[] = cycleDates.map((dateStr) => {
    const dt = parseIsoDateLocal(dateStr);
    const dayNumber = dt.getDate();
    const monthNumber = dt.getMonth() + 1;
    const agg = byDate.get(dateStr);
    return {
      date: dateStr,
      dayLabel: `${String(dayNumber).padStart(2, '0')}/${String(monthNumber).padStart(2, '0')}`,
      dayNumber,
      totalMinutes: agg?.totalMinutes ?? 0,
      totalNetEarned: agg?.totalNetEarned ?? 0,
      shiftsCount: agg?.shiftsCount ?? 0,
      isToday: dateStr === todayIso,
    };
  });

  // Weekly series respecting Monday-to-Sunday cuts within [cycle.startDate, cycle.endDate]
  const weeklySeries: WeeklyCycleBarItem[] = [];
  if (dailySeries.length > 0) {
    let weekIndex = 1;
    let bucketStart = dailySeries[0].date;
    let bucketEnd = dailySeries[0].date;
    let bucketMinutes = 0;
    let bucketNet = 0;
    let bucketShifts = 0;

    for (let i = 0; i < dailySeries.length; i++) {
      const point = dailySeries[i];
      const weekday = parseIsoDateLocal(point.date).getDay(); // 1 = Monday

      if (i > 0 && weekday === 1) {
        weeklySeries.push({
          weekIndex,
          label: `Sem ${weekIndex}`,
          rangeLabel: formatWeekRangeLabel(bucketStart, bucketEnd),
          startDate: bucketStart,
          endDate: bucketEnd,
          totalMinutes: bucketMinutes,
          totalNetEarned: round2(bucketNet),
          shiftsCount: bucketShifts,
        });
        weekIndex += 1;
        bucketStart = point.date;
        bucketMinutes = 0;
        bucketNet = 0;
        bucketShifts = 0;
      }

      bucketEnd = point.date;
      bucketMinutes += point.totalMinutes;
      bucketNet += point.totalNetEarned;
      bucketShifts += point.shiftsCount;
    }

    weeklySeries.push({
      weekIndex,
      label: `Sem ${weekIndex}`,
      rangeLabel: formatWeekRangeLabel(bucketStart, bucketEnd),
      startDate: bucketStart,
      endDate: bucketEnd,
      totalMinutes: bucketMinutes,
      totalNetEarned: round2(bucketNet),
      shiftsCount: bucketShifts,
    });
  }

  // Monthly goals resolved by cycle key YYYY-MM with base fallback (RN1)
  const resolvedGoals = resolveCycleGoals(settings, cycle);
  const goalEurosTarget = resolvedGoals.netEuros;
  const goalHoursTarget = resolvedGoals.hours;

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

  // Predictions & required pace (RN5)
  let cyclePhase: CyclePhase = 'current';
  let elapsedDays = 0;
  let remainingDays = 0;

  if (cycle.endDate < todayIso) {
    cyclePhase = 'past';
    elapsedDays = cycleDaysTotal;
    remainingDays = 0;
  } else if (cycle.startDate > todayIso) {
    cyclePhase = 'future';
    elapsedDays = 0;
    remainingDays = cycleDaysTotal;
  } else {
    cyclePhase = 'current';
    elapsedDays = Math.max(1, diffCalendarDays(cycle.startDate, todayIso) + 1);
    remainingDays = Math.max(0, cycleDaysTotal - elapsedDays);
  }

  const earnedToDateNet = round2(earnedToDateNetRaw);
  const scheduledFutureNet = round2(scheduledFutureNetRaw);

  let projectedTotalNet = totalNetEarned;
  let projectedTotalMinutes = totalBillableMinutes;

  if (cyclePhase === 'current') {
    const dailyNetPace = elapsedDays > 0 ? earnedToDateNet / elapsedDays : 0;
    const dailyMinutesPace = elapsedDays > 0 ? workedToDateMinutes / elapsedDays : 0;
    const projectedRemainingNet = Math.max(
      dailyNetPace * remainingDays,
      scheduledFutureNet
    );
    const projectedRemainingMinutes = Math.max(
      dailyMinutesPace * remainingDays,
      scheduledFutureMinutes
    );
    projectedTotalNet = round2(earnedToDateNet + projectedRemainingNet);
    projectedTotalMinutes = Math.round(workedToDateMinutes + projectedRemainingMinutes);
  } else if (cyclePhase === 'future') {
    projectedTotalNet = scheduledFutureNet;
    projectedTotalMinutes = scheduledFutureMinutes;
  }

  const remainingWeeksDivisor = Math.max(1, remainingDays / 7);
  const requiredNetPerRemainingDay =
    remainingDays > 0 && remainingEuros > 0 ? round2(remainingEuros / remainingDays) : 0;
  const requiredNetPerRemainingWeek =
    remainingDays > 0 && remainingEuros > 0
      ? round2(remainingEuros / remainingWeeksDivisor)
      : 0;
  const requiredMinutesPerRemainingDay =
    remainingDays > 0 && remainingGoalMinutes > 0
      ? Math.round(remainingGoalMinutes / remainingDays)
      : 0;
  const requiredMinutesPerRemainingWeek =
    remainingDays > 0 && remainingGoalMinutes > 0
      ? Math.round(remainingGoalMinutes / remainingWeeksDivisor)
      : 0;

  const referenceShiftMinutes = avgMinutesPerShift > 0 ? avgMinutesPerShift : 360;
  const referenceShiftNet =
    avgNetPerShift > 0
      ? avgNetPerShift
      : effectiveHourlyNetRate > 0
        ? round2((referenceShiftMinutes / 60) * effectiveHourlyNetRate)
        : 0;

  const estimatedShiftsNeededForNetGoal =
    goalEurosTarget === null
      ? null
      : remainingEuros <= 0
        ? 0
        : referenceShiftNet > 0
          ? Math.ceil(remainingEuros / referenceShiftNet)
          : null;

  const estimatedShiftsNeededForHoursGoal =
    goalHoursTarget === null
      ? null
      : remainingGoalMinutes <= 0
        ? 0
        : Math.ceil(remainingGoalMinutes / referenceShiftMinutes);

  const predictions: CyclePredictions = {
    cyclePhase,
    elapsedDays,
    remainingDays,
    earnedToDateNet,
    workedToDateMinutes,
    scheduledFutureNet,
    scheduledFutureMinutes,
    scheduledFutureShiftsCount,
    projectedTotalNet,
    projectedTotalMinutes,
    requiredNetPerRemainingDay,
    requiredNetPerRemainingWeek,
    requiredMinutesPerRemainingDay,
    requiredMinutesPerRemainingWeek,
    estimatedShiftsNeededForNetGoal,
    estimatedShiftsNeededForHoursGoal,
  };

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
          ((totalBillableMinutes - previousBillableMinutes) / previousBillableMinutes) *
            100
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
    goalKey: resolvedGoals.key,
    isCustomGoalOverride: resolvedGoals.isCustomOverride,
    totalShifts: cycleShifts.length,
    totalNetEarned,
    totalGrossEarned,
    totalBillableMinutes,
    totalBillableHours,
    grossNetDifference,
    estimatedWithholdingPct,
    actualHourlyNetRate,
    effectiveHourlyNetRate,
    cycleDaysTotal,
    workedDaysCount,
    freeDaysCount,
    avgMinutesPerWorkedDay,
    avgNetPerWorkedDay,
    avgNetPerShift,
    avgMinutesPerShift,
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
    dailySeries,
    weeklySeries,
    predictions,
  };
}

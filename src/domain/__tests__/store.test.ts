import { beforeEach, describe, expect, it } from 'vitest';
import { getTodayIsoLocal } from '../formatters';
import type { WorkEvent } from '../types';
import {
  DEFAULT_EVENTS,
  hydratePersistedShiftState,
  useShiftStore,
} from '../../store/useShiftStore';

const TEST_EVENTS: WorkEvent[] = [
  {
    id: 'ev-test-1',
    name: 'Eventos y catering',
    color: 'emerald',
    netRate: 12.5,
    grossRate: 15.0,
    hasUnpaidBreak: true,
    defaultBreakMinutes: 30,
    minGuaranteedHours: 4,
    roundingMode: 'none',
    multipliers: {
      normal: 1.0,
      holiday: 1.5,
      night: 1.25,
      overtime: 1.5,
    },
    quickTemplates: [
      {
        id: 'tpl-test-1',
        label: 'Mañana',
        startTime: '08:00',
        endTime: '16:30',
        rateType: 'normal',
      },
    ],
    archived: false,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'ev-test-2',
    name: 'Logística y montaje',
    color: 'blue',
    netRate: 14.0,
    grossRate: 17.5,
    hasUnpaidBreak: false,
    defaultBreakMinutes: 0,
    minGuaranteedHours: 0,
    roundingMode: '15m',
    multipliers: {
      normal: 1.0,
      holiday: 1.5,
      night: 1.25,
      overtime: 1.5,
    },
    quickTemplates: [],
    archived: false,
    createdAt: '2026-01-01T08:05:00.000Z',
  },
];

describe('useShiftStore state, actions, monthly goals & migration', () => {
  beforeEach(() => {
    useShiftStore.getState().resetStoreForTests({ events: TEST_EVENTS });
  });

  it('starts fresh installations with zero default mock events and allows deleting events', () => {
    expect(DEFAULT_EVENTS).toEqual([]);
    useShiftStore.getState().resetStoreForTests();
    expect(useShiftStore.getState().events).toEqual([]);

    useShiftStore.getState().resetStoreForTests({ events: TEST_EVENTS });
    useShiftStore.getState().deleteEvent('ev-test-2');
    expect(useShiftStore.getState().events.map((e) => e.id)).toEqual(['ev-test-1']);
  });

  it('creates shift via 1-touch quick template with event default break and respects break updates', () => {
    const store = useShiftStore.getState();
    const created = store.addShiftFromTemplate(
      'ev-test-1',
      'tpl-test-1',
      '2026-05-10'
    );
    expect(created).not.toBeNull();
    expect(created?.breakMinutes).toBe(30);
    expect(created?.computed.billableMinutes).toBe(480);
    expect(created?.computed.totalNetAmount).toBe(100);
    expect('paymentStatus' in (created ?? {})).toBe(false);

    useShiftStore.getState().updateEvent('ev-test-1', { defaultBreakMinutes: 15 });
    const with15mBreak = useShiftStore
      .getState()
      .addShiftFromTemplate('ev-test-1', 'tpl-test-1', '2026-05-11');
    expect(with15mBreak?.breakMinutes).toBe(15);
    expect(with15mBreak?.computed.billableMinutes).toBe(495);

    useShiftStore.getState().updateEvent('ev-test-1', { hasUnpaidBreak: false });
    const withNoBreak = useShiftStore
      .getState()
      .addShiftFromTemplate('ev-test-1', 'tpl-test-1', '2026-05-12');
    expect(withNoBreak?.breakMinutes).toBe(0);
    expect(withNoBreak?.computed.billableMinutes).toBe(510);
  });

  it('clones shift to today, duplicates to specific date, and repeats across multiple dates', () => {
    const store = useShiftStore.getState();
    const base = store.addShift({
      eventId: 'ev-test-1',
      date: '2026-05-01',
      startTime: '09:00',
      endTime: '14:00',
      breakMinutes: 0,
    });
    expect(base).not.toBeNull();
    if (!base) return;

    const clonedToday = useShiftStore.getState().cloneShiftToToday(base.id);
    expect(clonedToday?.date).toBe(getTodayIsoLocal());

    const duplicated = useShiftStore
      .getState()
      .duplicateShiftToDate(base.id, '2026-05-03');
    expect(duplicated?.date).toBe('2026-05-03');

    const repeated = useShiftStore
      .getState()
      .repeatShiftOnDates(base.id, ['2026-05-05', '2026-05-06', '2026-05-07']);
    expect(repeated).toHaveLength(3);
    expect(useShiftStore.getState().shifts).toHaveLength(1 + 1 + 1 + 3);
  });

  it('keeps past shift amounts immutable when event rate is updated later', () => {
    const store = useShiftStore.getState();
    const shift = store.addShift({
      eventId: 'ev-test-1',
      date: '2026-05-01',
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
    });
    expect(shift?.computed.totalNetAmount).toBe(100);

    useShiftStore.getState().updateEvent('ev-test-1', { netRate: 25, grossRate: 30 });

    const savedShift = useShiftStore.getState().shifts.find((s) => s.id === shift?.id);
    expect(savedShift?.computed.totalNetAmount).toBe(100);
    expect(savedShift?.snapshot.netRateSnap).toBe(12.5);

    if (savedShift) {
      useShiftStore.getState().updateShift(savedShift.id, {
        eventId: savedShift.eventId,
        date: savedShift.date,
        startTime: savedShift.startTime,
        endTime: savedShift.endTime,
        breakMinutes: savedShift.breakMinutes,
        rateType: savedShift.rateType,
        fixedBonus: savedShift.fixedBonus,
        expenseAdjustment: savedShift.expenseAdjustment,
        note: 'Nota editada',
      });
    }
    const afterNoteEdit = useShiftStore.getState().shifts.find((s) => s.id === shift?.id);
    expect(afterNoteEdit?.computed.totalNetAmount).toBe(100);
    expect(afterNoteEdit?.note).toBe('Nota editada');
  });

  it('sets, disables, and clears per-month goal overrides without resetting activeCycleAnchor', () => {
    useShiftStore.getState().setCycleForDate('2026-12-10');
    const anchorBefore = useShiftStore.getState().activeCycleAnchor;
    expect(anchorBefore).toEqual({ year: 2026, month: 11 });

    useShiftStore.getState().updateSettings({
      monthlyGoalNetEuros: 750,
      monthlyGoalHours: 50,
    });
    expect(useShiftStore.getState().activeCycleAnchor).toEqual({ year: 2026, month: 11 });

    useShiftStore.getState().setCycleGoalOverride('2026-11', {
      netEuros: 400,
      hours: 30,
    });
    useShiftStore.getState().setCycleGoalOverride('2027-01', {
      netEuros: null,
      hours: 0,
    });
    expect(useShiftStore.getState().activeCycleAnchor).toEqual({ year: 2026, month: 11 });
    expect(useShiftStore.getState().settings.monthlyGoalOverrides).toEqual({
      '2026-11': { netEuros: 400, hours: 30 },
      '2027-01': { netEuros: null, hours: null },
    });

    useShiftStore.getState().clearCycleGoalOverride('2026-11');
    expect(useShiftStore.getState().settings.monthlyGoalOverrides).toEqual({
      '2027-01': { netEuros: null, hours: null },
    });

    useShiftStore.getState().setCycleGoalOverride('2026-99', {
      netEuros: 500,
      hours: 30,
    });
    expect(useShiftStore.getState().settings.monthlyGoalOverrides).toEqual({
      '2027-01': { netEuros: null, hours: null },
    });
  });

  it('silently migrates persisted localStorage data stripping legacy paymentStatus without losing records', () => {
    const store = useShiftStore.getState();
    const sample = store.addShift({
      eventId: 'ev-test-1',
      date: '2026-11-05',
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
    });
    expect(sample).not.toBeNull();
    if (!sample) return;

    const legacyPersisted = {
      events: store.events,
      shifts: [{ ...sample, paymentStatus: 'paid' }],
      settings: {
        cycleStartDay: 1,
        monthlyGoalNetEuros: 800,
        monthlyGoalHours: 50,
      },
    };

    const hydrated = hydratePersistedShiftState(
      legacyPersisted,
      useShiftStore.getState()
    );
    expect(hydrated.events).toHaveLength(store.events.length);
    expect(hydrated.shifts).toHaveLength(1);
    expect(hydrated.shifts[0].id).toBe(sample.id);
    expect('paymentStatus' in hydrated.shifts[0]).toBe(false);
    expect(hydrated.settings.monthlyGoalOverrides).toEqual({});

    const hydratedWithMalformedOverrides = hydratePersistedShiftState(
      {
        ...legacyPersisted,
        settings: {
          ...legacyPersisted.settings,
          monthlyGoalOverrides: {
            'bad-key': { netEuros: 500, hours: 30 },
            '2026-11': { netEuros: 725, hours: -10 },
          },
        },
      },
      useShiftStore.getState()
    );
    expect(hydratedWithMalformedOverrides.settings.monthlyGoalOverrides).toEqual({
      '2026-11': { netEuros: 725, hours: null },
    });
  });
});

import { beforeEach, describe, expect, it } from 'vitest';
import { getCycleForDate } from '../cycles';
import { getTodayIsoLocal } from '../formatters';
import { useShiftStore } from '../../store/useShiftStore';

describe('useShiftStore state & actions (T-07)', () => {
  beforeEach(() => {
    useShiftStore.getState().resetStoreForTests();
  });

  it('creates shift via 1-touch quick template with event default break and respects break updates (AC4, AC5)', () => {
    const store = useShiftStore.getState();
    const created = store.addShiftFromTemplate(
      'ev-default-1',
      'tpl-default-1',
      '2026-05-10'
    );
    expect(created).not.toBeNull();
    expect(created?.breakMinutes).toBe(30);
    expect(created?.computed.billableMinutes).toBe(480); // 08:00-16:30 (510) - 30 = 480 (8h)
    expect(created?.computed.totalNetAmount).toBe(100); // 8h * 12.50 €/h

    // Updating event defaultBreakMinutes to 15 updates subsequent quick template shifts
    useShiftStore.getState().updateEvent('ev-default-1', { defaultBreakMinutes: 15 });
    const with15mBreak = useShiftStore
      .getState()
      .addShiftFromTemplate('ev-default-1', 'tpl-default-1', '2026-05-11');
    expect(with15mBreak?.breakMinutes).toBe(15);
    expect(with15mBreak?.computed.billableMinutes).toBe(495);

    // Disabling hasUnpaidBreak sets breakMinutes to 0 for subsequent quick template shifts
    useShiftStore.getState().updateEvent('ev-default-1', { hasUnpaidBreak: false });
    const withNoBreak = useShiftStore
      .getState()
      .addShiftFromTemplate('ev-default-1', 'tpl-default-1', '2026-05-12');
    expect(withNoBreak?.breakMinutes).toBe(0);
    expect(withNoBreak?.computed.billableMinutes).toBe(510);
  });

  it('clones shift to today, duplicates to specific date, and repeats across multiple dates (AC7)', () => {
    const store = useShiftStore.getState();
    const base = store.addShift({
      eventId: 'ev-default-1',
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

  it('keeps past shift amounts immutable when event rate is updated later (AC9)', () => {
    const store = useShiftStore.getState();
    const shift = store.addShift({
      eventId: 'ev-default-1',
      date: '2026-05-01',
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
    });
    expect(shift?.computed.totalNetAmount).toBe(100); // 8h * 12.50 €/h

    // Update event rate to 25 €/h
    useShiftStore.getState().updateEvent('ev-default-1', { netRate: 25, grossRate: 30 });

    // Existing shift remains at 100 €
    const savedShift = useShiftStore.getState().shifts.find((s) => s.id === shift?.id);
    expect(savedShift?.computed.totalNetAmount).toBe(100);
    expect(savedShift?.snapshot.netRateSnap).toBe(12.5);

    // Editing note on existing shift without refreshing rates still preserves 12.50 €/h
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
        paymentStatus: savedShift.paymentStatus,
      });
    }
    const afterNoteEdit = useShiftStore.getState().shifts.find((s) => s.id === shift?.id);
    expect(afterNoteEdit?.computed.totalNetAmount).toBe(100);
    expect(afterNoteEdit?.note).toBe('Nota editada');
  });

  it('marks an entire cycle as paid or pending in bulk (AC11)', () => {
    const store = useShiftStore.getState();
    store.addShift({
      eventId: 'ev-default-1',
      date: '2026-05-05',
      startTime: '08:00',
      endTime: '16:00',
    });
    store.addShift({
      eventId: 'ev-default-1',
      date: '2026-05-12',
      startTime: '08:00',
      endTime: '16:00',
    });

    const cycle = getCycleForDate('2026-05-10', 1);
    const count = useShiftStore.getState().setCyclePaymentStatus(cycle, 'paid');
    expect(count).toBe(2);
    expect(
      useShiftStore.getState().shifts.every((s) => s.paymentStatus === 'paid')
    ).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { computeCycleAnalytics } from '../analytics';
import { buildBackupDatabase, mergeDatabases, validateBackupJson } from '../backup';
import { calculateShiftTotals, createHistoricalSnapshot } from '../calculations';
import { getCycleForDate } from '../cycles';
import { generateCycleCsv, generateCycleTxtReport } from '../exporters';
import type { AppSettings, ShiftRecord, WorkEvent } from '../types';

const sampleEvent: WorkEvent = {
  id: 'ev-1',
  name: 'Montaje Escenario',
  color: 'indigo',
  netRate: 14,
  grossRate: 18,
  hasUnpaidBreak: true,
  defaultBreakMinutes: 30,
  minGuaranteedHours: 4,
  roundingMode: '15m',
  multipliers: { normal: 1, holiday: 1.5, night: 1.25, overtime: 1.5 },
  quickTemplates: [],
  archived: false,
  createdAt: '2026-05-01T00:00:00Z',
};

const sampleSettings: AppSettings = {
  cycleStartDay: 1,
  monthlyGoalNetEuros: 600,
  monthlyGoalHours: 40,
};

function createSampleShift(id: string, date: string): ShiftRecord {
  const snapshot = createHistoricalSnapshot(sampleEvent, 'normal');
  const computed = calculateShiftTotals({
    startTime: '08:00',
    endTime: '16:30',
    breakMinutes: 30,
    fixedBonus: 0,
    expenseAdjustment: 0,
    snapshot,
  });
  return {
    id,
    eventId: sampleEvent.id,
    date,
    startTime: '08:00',
    endTime: '16:30',
    breakMinutes: 30,
    rateType: 'normal',
    fixedBonus: 0,
    expenseAdjustment: 0,
    note: 'Festival de verano',
    paymentStatus: 'paid',
    snapshot,
    computed,
    createdAt: '2026-05-10T00:00:00Z',
  };
}

describe('backup validation, merge & exporters (T-06)', () => {
  it('rejects malformed or structurally invalid JSON files with descriptive Spanish errors (AC16)', () => {
    expect(validateBackupJson('').ok).toBe(false);
    expect(validateBackupJson('{malformed').ok).toBe(false);
    expect(validateBackupJson(JSON.stringify({ version: 2 })).ok).toBe(false);
    expect(
      validateBackupJson(
        JSON.stringify({ version: 1, events: 'not-array', shifts: [], settings: {} })
      ).ok
    ).toBe(false);

    // Invalid shift date format
    const badShiftDb = buildBackupDatabase({
      events: [sampleEvent],
      shifts: [{ ...createSampleShift('s-1', '2026-05-10'), date: '10/05/2026' }],
      settings: sampleSettings,
    });
    const res = validateBackupJson(JSON.stringify(badShiftDb));
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('fecha inválida');
    }

    // Impossible calendar date (2026-02-30)
    const impossibleDateDb = buildBackupDatabase({
      events: [sampleEvent],
      shifts: [{ ...createSampleShift('s-1', '2026-05-10'), date: '2026-02-30' }],
      settings: sampleSettings,
    });
    expect(validateBackupJson(JSON.stringify(impossibleDateDb)).ok).toBe(false);

    // Non-string shift note
    const badNoteDb = buildBackupDatabase({
      events: [sampleEvent],
      shifts: [
        {
          ...createSampleShift('s-1', '2026-05-10'),
          note: null as unknown as string,
        },
      ],
      settings: sampleSettings,
    });
    expect(validateBackupJson(JSON.stringify(badNoteDb)).ok).toBe(false);

    // Invalid quickTemplate item in event
    const badTemplateDb = buildBackupDatabase({
      events: [
        {
          ...sampleEvent,
          quickTemplates: [
            { id: 't-1', label: 'Mañana', startTime: '99:99', endTime: '16:00' },
          ],
        },
      ],
      shifts: [],
      settings: sampleSettings,
    });
    expect(validateBackupJson(JSON.stringify(badTemplateDb)).ok).toBe(false);
  });

  it('validates a legitimate backup, merges records without duplicates, and preserves shift snapshots when event rates change (AC9, AC16, AC17)', () => {
    const s1 = createSampleShift('s-1', '2026-05-10'); // snapshot netRateSnap = 14
    const s2 = createSampleShift('s-2', '2026-05-12');
    const updatedEventInBackup: WorkEvent = {
      ...sampleEvent,
      netRate: 22,
      grossRate: 28,
    };
    const db = buildBackupDatabase({
      events: [updatedEventInBackup],
      shifts: [s2],
      settings: sampleSettings,
    });

    const validation = validateBackupJson(JSON.stringify(db));
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const merged = mergeDatabases(
      {
        events: [sampleEvent],
        shifts: [s1, s2], // s2 exists in both
        settings: sampleSettings,
      },
      validation.data
    );

    expect(merged.events).toHaveLength(1);
    expect(merged.events[0].netRate).toBe(22);
    expect(merged.shifts).toHaveLength(2);
    // Existing shifts keep their historical 14 €/h snapshot (112 € totalNetAmount)
    expect(merged.shifts.find((s) => s.id === 's-1')?.snapshot.netRateSnap).toBe(14);
    expect(merged.shifts.find((s) => s.id === 's-1')?.computed.totalNetAmount).toBe(112);
  });

  it('generates UTF-8 BOM CSV with Spanish decimal formatting and TXT summary (AC18)', () => {
    const s1 = createSampleShift('s-1', '2026-05-10');
    const cycle = getCycleForDate('2026-05-10', 1);
    const analytics = computeCycleAnalytics({
      cycle,
      allShifts: [s1],
      events: [sampleEvent],
      settings: sampleSettings,
    });

    const csv = generateCycleCsv(cycle, [s1], analytics);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Montaje Escenario');
    expect(csv).toContain('112,00'); // 8h * 14€/h = 112,00

    const txt = generateCycleTxtReport(cycle, [s1], analytics);
    expect(txt).toContain('INFORME DE TURNOS - SHIFT LOG');
    expect(txt).toContain('112,00 €');
    expect(txt).toContain('Festival de verano');
  });
});

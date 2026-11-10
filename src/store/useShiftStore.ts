import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

const memoryStorageMap = new Map<string, string>();
const fallbackMemoryStorage: StateStorage = {
  getItem: (name) => memoryStorageMap.get(name) ?? null,
  setItem: (name, value) => {
    memoryStorageMap.set(name, value);
  },
  removeItem: (name) => {
    memoryStorageMap.delete(name);
  },
};

function getSafeLocalStorage(): StateStorage {
  try {
    if (
      typeof window !== 'undefined' &&
      window.localStorage &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function'
    ) {
      return window.localStorage;
    }
  } catch {
    // Fallback to in-memory storage
  }
  return fallbackMemoryStorage;
}
import { mergeDatabases } from '../domain/backup';
import { calculateShiftTotals, createHistoricalSnapshot } from '../domain/calculations';
import {
  clampCycleStartDay,
  getAdjacentCycle,
  getCycleByAnchor,
  getCycleForDate,
  isDateInCycle,
} from '../domain/cycles';
import { getTodayIsoLocal } from '../domain/formatters';
import type {
  AppSettings,
  CycleWindow,
  PaymentStatus,
  ShiftLogDatabase,
  ShiftRateType,
  ShiftRecord,
  WorkEvent,
} from '../domain/types';

export interface ToastNotice {
  id: string;
  text: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}

export interface CreateShiftPayload {
  eventId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  rateType?: ShiftRateType;
  fixedBonus?: number;
  expenseAdjustment?: number;
  note?: string;
  paymentStatus?: PaymentStatus;
}

export interface UpdateShiftPayload {
  eventId: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  rateType: ShiftRateType;
  fixedBonus: number;
  expenseAdjustment: number;
  note: string;
  paymentStatus: PaymentStatus;
  refreshRatesFromEvent?: boolean;
}

export const DEFAULT_EVENTS: WorkEvent[] = [
  {
    id: 'ev-default-1',
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
        id: 'tpl-default-1',
        label: 'Mañana',
        startTime: '08:00',
        endTime: '16:30',
        rateType: 'normal',
      },
      {
        id: 'tpl-default-2',
        label: 'Tarde',
        startTime: '16:00',
        endTime: '00:00',
        rateType: 'normal',
      },
    ],
    archived: false,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'ev-default-2',
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
    quickTemplates: [
      {
        id: 'tpl-default-3',
        label: 'Noche',
        startTime: '22:00',
        endTime: '06:00',
        rateType: 'night',
      },
    ],
    archived: false,
    createdAt: '2026-01-01T08:05:00.000Z',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  cycleStartDay: 1,
  monthlyGoalNetEuros: 600,
  monthlyGoalHours: 45,
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

interface ShiftStoreState {
  events: WorkEvent[];
  shifts: ShiftRecord[];
  settings: AppSettings;
  activeCycleAnchor: { year: number; month: number };
  toast: ToastNotice | null;

  // Helpers
  getActiveCycle: () => CycleWindow;

  // Event actions
  addEvent: (input: Omit<WorkEvent, 'id' | 'createdAt' | 'archived'>) => WorkEvent;
  updateEvent: (
    id: string,
    updates: Partial<Omit<WorkEvent, 'id' | 'createdAt'>>
  ) => void;
  toggleArchiveEvent: (id: string) => void;
  deleteEvent: (id: string) => void;

  // Shift actions
  addShift: (payload: CreateShiftPayload) => ShiftRecord | null;
  addShiftFromTemplate: (
    eventId: string,
    templateId: string,
    date?: string
  ) => ShiftRecord | null;
  updateShift: (shiftId: string, payload: UpdateShiftPayload) => ShiftRecord | null;
  deleteShift: (shiftId: string) => void;
  cloneShiftToToday: (shiftId: string) => ShiftRecord | null;
  duplicateShiftToDate: (shiftId: string, targetDate: string) => ShiftRecord | null;
  repeatShiftOnDates: (shiftId: string, targetDates: string[]) => ShiftRecord[];

  // Payment actions
  toggleShiftPaymentStatus: (shiftId: string) => void;
  setCyclePaymentStatus: (cycle: CycleWindow, status: PaymentStatus) => number;

  // Cycle & Settings actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  navigateCycle: (offsetMonths: number) => void;
  goToCurrentCycle: () => void;
  setCycleForDate: (dateStr: string) => void;

  // Backup & Restore
  importDatabase: (db: ShiftLogDatabase, mode: 'replace' | 'merge') => void;
  resetStoreForTests: (customState?: {
    events?: WorkEvent[];
    shifts?: ShiftRecord[];
    settings?: AppSettings;
  }) => void;

  // Toast
  showToast: (text: string, tone?: ToastNotice['tone']) => void;
  clearToast: () => void;
}

function getInitialCycleAnchor(cycleStartDay: number): { year: number; month: number } {
  const c = getCycleForDate(getTodayIsoLocal(), cycleStartDay);
  return { year: c.anchorYear, month: c.anchorMonth };
}

export const useShiftStore = create<ShiftStoreState>()(
  persist(
    (set, get) => ({
      events: DEFAULT_EVENTS,
      shifts: [],
      settings: DEFAULT_SETTINGS,
      activeCycleAnchor: getInitialCycleAnchor(DEFAULT_SETTINGS.cycleStartDay),
      toast: null,

      getActiveCycle: () => {
        const { activeCycleAnchor, settings } = get();
        return getCycleByAnchor(
          activeCycleAnchor.year,
          activeCycleAnchor.month,
          settings.cycleStartDay
        );
      },

      addEvent: (input) => {
        const newEvent: WorkEvent = {
          ...input,
          id: generateId('ev'),
          archived: false,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          events: [...state.events, newEvent],
        }));
        return newEvent;
      },

      updateEvent: (id, updates) => {
        // AC9: Never modifies existing shifts or their historical snapshots
        set((state) => ({
          events: state.events.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)),
        }));
      },

      toggleArchiveEvent: (id) => {
        set((state) => ({
          events: state.events.map((ev) =>
            ev.id === id ? { ...ev, archived: !ev.archived } : ev
          ),
        }));
      },

      deleteEvent: (id) => {
        set((state) => ({
          events: state.events.filter((ev) => ev.id !== id),
        }));
      },

      addShift: (payload) => {
        const event = get().events.find((e) => e.id === payload.eventId);
        if (!event) return null;

        const rateType: ShiftRateType = payload.rateType ?? 'normal';
        const breakMinutes =
          payload.breakMinutes !== undefined
            ? Math.max(0, Math.round(payload.breakMinutes))
            : event.hasUnpaidBreak
              ? event.defaultBreakMinutes
              : 0;
        const fixedBonus = payload.fixedBonus ?? 0;
        const expenseAdjustment = payload.expenseAdjustment ?? 0;

        const snapshot = createHistoricalSnapshot(event, rateType);
        const computed = calculateShiftTotals({
          startTime: payload.startTime,
          endTime: payload.endTime,
          breakMinutes,
          fixedBonus,
          expenseAdjustment,
          snapshot,
        });

        const newShift: ShiftRecord = {
          id: generateId('sh'),
          eventId: event.id,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          breakMinutes,
          rateType,
          fixedBonus,
          expenseAdjustment,
          note: (payload.note ?? '').trim(),
          paymentStatus: payload.paymentStatus ?? 'pending',
          snapshot,
          computed,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          shifts: [newShift, ...state.shifts],
        }));

        return newShift;
      },

      addShiftFromTemplate: (eventId, templateId, date) => {
        const event = get().events.find((e) => e.id === eventId);
        if (!event) return null;
        const tpl = event.quickTemplates.find((t) => t.id === templateId);
        if (!tpl) return null;

        const targetDate = date ?? getTodayIsoLocal();
        const breakMinutes = event.hasUnpaidBreak
          ? tpl.breakMinutes !== undefined
            ? tpl.breakMinutes
            : event.defaultBreakMinutes
          : 0;

        return get().addShift({
          eventId: event.id,
          date: targetDate,
          startTime: tpl.startTime,
          endTime: tpl.endTime,
          breakMinutes,
          rateType: tpl.rateType ?? 'normal',
          fixedBonus: 0,
          expenseAdjustment: 0,
          note: tpl.label,
          paymentStatus: 'pending',
        });
      },

      updateShift: (shiftId, payload) => {
        const state = get();
        const existing = state.shifts.find((s) => s.id === shiftId);
        if (!existing) return null;

        const event = state.events.find((e) => e.id === payload.eventId);
        let snapshot = existing.snapshot;

        if (
          event &&
          (payload.eventId !== existing.eventId || payload.refreshRatesFromEvent)
        ) {
          snapshot = createHistoricalSnapshot(event, payload.rateType);
        } else if (payload.rateType !== existing.rateType) {
          const updatedMultiplier =
            event?.multipliers?.[payload.rateType] ??
            (payload.rateType === 'normal'
              ? 1.0
              : payload.rateType === 'night'
                ? 1.25
                : 1.5);
          snapshot = {
            ...existing.snapshot,
            multiplierSnap: updatedMultiplier,
          };
        }

        const computed = calculateShiftTotals({
          startTime: payload.startTime,
          endTime: payload.endTime,
          breakMinutes: payload.breakMinutes,
          fixedBonus: payload.fixedBonus,
          expenseAdjustment: payload.expenseAdjustment,
          snapshot,
        });

        const updated: ShiftRecord = {
          ...existing,
          eventId: payload.eventId,
          date: payload.date,
          startTime: payload.startTime,
          endTime: payload.endTime,
          breakMinutes: Math.max(0, Math.round(payload.breakMinutes)),
          rateType: payload.rateType,
          fixedBonus: payload.fixedBonus,
          expenseAdjustment: payload.expenseAdjustment,
          note: payload.note.trim(),
          paymentStatus: payload.paymentStatus,
          snapshot,
          computed,
        };

        set((s) => ({
          shifts: s.shifts.map((item) => (item.id === shiftId ? updated : item)),
        }));

        return updated;
      },

      deleteShift: (shiftId) => {
        set((state) => ({
          shifts: state.shifts.filter((s) => s.id !== shiftId),
        }));
      },

      cloneShiftToToday: (shiftId) => {
        return get().duplicateShiftToDate(shiftId, getTodayIsoLocal());
      },

      duplicateShiftToDate: (shiftId, targetDate) => {
        const source = get().shifts.find((s) => s.id === shiftId);
        if (!source) return null;

        const cloned: ShiftRecord = {
          ...source,
          id: generateId('sh'),
          date: targetDate,
          paymentStatus: 'pending',
          snapshot: { ...source.snapshot },
          computed: { ...source.computed },
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          shifts: [cloned, ...state.shifts],
        }));

        return cloned;
      },

      repeatShiftOnDates: (shiftId, targetDates) => {
        const source = get().shifts.find((s) => s.id === shiftId);
        if (!source || targetDates.length === 0) return [];

        const uniqueDates = Array.from(new Set(targetDates)).sort();
        const created: ShiftRecord[] = uniqueDates.map((dateStr) => ({
          ...source,
          id: generateId('sh'),
          date: dateStr,
          paymentStatus: 'pending',
          snapshot: { ...source.snapshot },
          computed: { ...source.computed },
          createdAt: new Date().toISOString(),
        }));

        set((state) => ({
          shifts: [...created, ...state.shifts],
        }));

        return created;
      },

      toggleShiftPaymentStatus: (shiftId) => {
        set((state) => ({
          shifts: state.shifts.map((s) =>
            s.id === shiftId
              ? {
                  ...s,
                  paymentStatus: s.paymentStatus === 'paid' ? 'pending' : 'paid',
                }
              : s
          ),
        }));
      },

      setCyclePaymentStatus: (cycle, status) => {
        let updatedCount = 0;
        set((state) => ({
          shifts: state.shifts.map((s) => {
            if (isDateInCycle(s.date, cycle) && s.paymentStatus !== status) {
              updatedCount += 1;
              return { ...s, paymentStatus: status };
            }
            return s;
          }),
        }));
        return updatedCount;
      },

      updateSettings: (partial) => {
        set((state) => {
          const nextCycleStartDay =
            partial.cycleStartDay !== undefined
              ? clampCycleStartDay(partial.cycleStartDay)
              : state.settings.cycleStartDay;

          const nextSettings: AppSettings = {
            ...state.settings,
            ...partial,
            cycleStartDay: nextCycleStartDay,
          };

          const currentCycle = getCycleForDate(getTodayIsoLocal(), nextCycleStartDay);
          return {
            settings: nextSettings,
            activeCycleAnchor: {
              year: currentCycle.anchorYear,
              month: currentCycle.anchorMonth,
            },
          };
        });
      },

      navigateCycle: (offsetMonths) => {
        set((state) => {
          const current = getCycleByAnchor(
            state.activeCycleAnchor.year,
            state.activeCycleAnchor.month,
            state.settings.cycleStartDay
          );
          const next = getAdjacentCycle(
            current,
            offsetMonths,
            state.settings.cycleStartDay
          );
          return {
            activeCycleAnchor: {
              year: next.anchorYear,
              month: next.anchorMonth,
            },
          };
        });
      },

      goToCurrentCycle: () => {
        set((state) => ({
          activeCycleAnchor: getInitialCycleAnchor(state.settings.cycleStartDay),
        }));
      },

      setCycleForDate: (dateStr) => {
        set((state) => {
          const c = getCycleForDate(dateStr, state.settings.cycleStartDay);
          return {
            activeCycleAnchor: {
              year: c.anchorYear,
              month: c.anchorMonth,
            },
          };
        });
      },

      importDatabase: (db, mode) => {
        set((state) => {
          if (mode === 'replace') {
            return {
              events: db.events,
              shifts: db.shifts,
              settings: db.settings,
              activeCycleAnchor: getInitialCycleAnchor(db.settings.cycleStartDay),
            };
          }
          const merged = mergeDatabases(
            {
              events: state.events,
              shifts: state.shifts,
              settings: state.settings,
            },
            db
          );
          return {
            events: merged.events,
            shifts: merged.shifts,
            settings: merged.settings,
          };
        });
      },

      resetStoreForTests: (customState) => {
        const settings = customState?.settings ?? DEFAULT_SETTINGS;
        set({
          events: customState?.events ?? DEFAULT_EVENTS,
          shifts: customState?.shifts ?? [],
          settings,
          activeCycleAnchor: getInitialCycleAnchor(settings.cycleStartDay),
          toast: null,
        });
      },

      showToast: (text, tone = 'success') => {
        set({
          toast: {
            id: generateId('toast'),
            text,
            tone,
          },
        });
      },

      clearToast: () => {
        set({ toast: null });
      },
    }),
    {
      name: 'shiftlog-db-v1',
      storage: createJSONStorage(() => getSafeLocalStorage()),
      partialize: (state) => ({
        events: state.events,
        shifts: state.shifts,
        settings: state.settings,
      }),
    }
  )
);

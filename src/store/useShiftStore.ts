import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { mergeDatabases, sanitizeShiftRecord } from '../domain/backup';
import { calculateShiftTotals, createHistoricalSnapshot } from '../domain/calculations';
import {
  clampCycleStartDay,
  getAdjacentCycle,
  getCycleByAnchor,
  getCycleForDate,
  parseYearMonthKey,
} from '../domain/cycles';
import { getTodayIsoLocal } from '../domain/formatters';
import type {
  AppSettings,
  CycleWindow,
  MonthlyGoalConfig,
  ShiftLogDatabase,
  ShiftRateType,
  ShiftRecord,
  WorkEvent,
} from '../domain/types';

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
  refreshRatesFromEvent?: boolean;
}

export const DEFAULT_EVENTS: WorkEvent[] = [];

export const DEFAULT_SETTINGS: AppSettings = {
  cycleStartDay: 1,
  monthlyGoalNetEuros: 600,
  monthlyGoalHours: 45,
  monthlyGoalOverrides: {},
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeGoalValue(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
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

  // Cycle & Settings actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  setCycleGoalOverride: (cycleKey: string, goal: MonthlyGoalConfig) => void;
  clearCycleGoalOverride: (cycleKey: string) => void;
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

export function hydratePersistedShiftState(
  persistedState: unknown,
  currentState: ShiftStoreState
): ShiftStoreState {
  if (!persistedState || typeof persistedState !== 'object') {
    return currentState;
  }

  const persisted = persistedState as Partial<ShiftStoreState>;

  const sanitizedShifts: ShiftRecord[] = Array.isArray(persisted.shifts)
    ? persisted.shifts
        .filter((raw): raw is ShiftRecord => Boolean(raw && typeof raw === 'object'))
        .map((raw) =>
          sanitizeShiftRecord(raw as ShiftRecord & { paymentStatus?: unknown })
        )
    : currentState.shifts;

  const persistedSettings = persisted.settings;
  const sanitizedOverrides: Record<string, MonthlyGoalConfig> = {};
  if (
    persistedSettings?.monthlyGoalOverrides &&
    typeof persistedSettings.monthlyGoalOverrides === 'object' &&
    !Array.isArray(persistedSettings.monthlyGoalOverrides)
  ) {
    for (const [key, entry] of Object.entries(persistedSettings.monthlyGoalOverrides)) {
      if (!parseYearMonthKey(key) || !entry || typeof entry !== 'object') continue;
      sanitizedOverrides[key] = {
        netEuros: sanitizeGoalValue(entry.netEuros),
        hours: sanitizeGoalValue(entry.hours),
      };
    }
  }

  const mergedSettings: AppSettings = {
    cycleStartDay: clampCycleStartDay(
      persistedSettings?.cycleStartDay ?? currentState.settings.cycleStartDay
    ),
    monthlyGoalNetEuros:
      persistedSettings?.monthlyGoalNetEuros !== undefined
        ? sanitizeGoalValue(persistedSettings.monthlyGoalNetEuros)
        : currentState.settings.monthlyGoalNetEuros,
    monthlyGoalHours:
      persistedSettings?.monthlyGoalHours !== undefined
        ? sanitizeGoalValue(persistedSettings.monthlyGoalHours)
        : currentState.settings.monthlyGoalHours,
    monthlyGoalOverrides: sanitizedOverrides,
  };

  return {
    ...currentState,
    events: Array.isArray(persisted.events) ? persisted.events : currentState.events,
    shifts: sanitizedShifts,
    settings: mergedSettings,
    activeCycleAnchor: getInitialCycleAnchor(mergedSettings.cycleStartDay),
  };
}

export const useShiftStore = create<ShiftStoreState>()(
  persist(
    (set, get) => ({
      events: DEFAULT_EVENTS,
      shifts: [],
      settings: { ...DEFAULT_SETTINGS, monthlyGoalOverrides: {} },
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
        // Never modifies existing shifts or their historical snapshots
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
          snapshot: { ...source.snapshot },
          computed: { ...source.computed },
          createdAt: new Date().toISOString(),
        }));

        set((state) => ({
          shifts: [...created, ...state.shifts],
        }));

        return created;
      },

      updateSettings: (partial) => {
        set((state) => {
          const nextCycleStartDay =
            partial.cycleStartDay !== undefined
              ? clampCycleStartDay(partial.cycleStartDay)
              : state.settings.cycleStartDay;

          const cycleStartDayChanged =
            partial.cycleStartDay !== undefined &&
            nextCycleStartDay !== state.settings.cycleStartDay;

          const nextSettings: AppSettings = {
            ...state.settings,
            ...partial,
            cycleStartDay: nextCycleStartDay,
            monthlyGoalOverrides:
              partial.monthlyGoalOverrides !== undefined
                ? { ...partial.monthlyGoalOverrides }
                : state.settings.monthlyGoalOverrides ?? {},
          };

          if (cycleStartDayChanged) {
            const currentCycle = getCycleForDate(getTodayIsoLocal(), nextCycleStartDay);
            return {
              settings: nextSettings,
              activeCycleAnchor: {
                year: currentCycle.anchorYear,
                month: currentCycle.anchorMonth,
              },
            };
          }

          return {
            settings: nextSettings,
          };
        });
      },

      setCycleGoalOverride: (cycleKey, goal) => {
        if (!parseYearMonthKey(cycleKey)) return;
        set((state) => ({
          settings: {
            ...state.settings,
            monthlyGoalOverrides: {
              ...(state.settings.monthlyGoalOverrides ?? {}),
              [cycleKey]: {
                netEuros: sanitizeGoalValue(goal.netEuros),
                hours: sanitizeGoalValue(goal.hours),
              },
            },
          },
        }));
      },

      clearCycleGoalOverride: (cycleKey) => {
        set((state) => {
          const nextOverrides = { ...(state.settings.monthlyGoalOverrides ?? {}) };
          delete nextOverrides[cycleKey];
          return {
            settings: {
              ...state.settings,
              monthlyGoalOverrides: nextOverrides,
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
              shifts: db.shifts.map((s) => sanitizeShiftRecord(s)),
              settings: {
                ...db.settings,
                monthlyGoalOverrides: { ...(db.settings.monthlyGoalOverrides ?? {}) },
              },
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
        const settings: AppSettings = customState?.settings
          ? {
              ...customState.settings,
              monthlyGoalOverrides: {
                ...(customState.settings.monthlyGoalOverrides ?? {}),
              },
            }
          : { ...DEFAULT_SETTINGS, monthlyGoalOverrides: {} };
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
      merge: (persistedState, currentState) =>
        hydratePersistedShiftState(persistedState, currentState),
    }
  )
);

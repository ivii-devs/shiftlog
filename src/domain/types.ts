export type CategoryColor =
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'lime';

export interface CategoryColorMeta {
  id: CategoryColor;
  label: string;
  hex: string;
}

export const CATEGORY_COLORS: readonly CategoryColorMeta[] = [
  { id: 'emerald', label: 'Esmeralda', hex: '#10B981' },
  { id: 'blue', label: 'Azul técnico', hex: '#3B82F6' },
  { id: 'indigo', label: 'Índigo', hex: '#6366F1' },
  { id: 'violet', label: 'Violeta', hex: '#8B5CF6' },
  { id: 'amber', label: 'Ámbar', hex: '#F59E0B' },
  { id: 'rose', label: 'Coral', hex: '#F43F5E' },
  { id: 'cyan', label: 'Cian', hex: '#06B6D4' },
  { id: 'lime', label: 'Lima', hex: '#84CC16' },
] as const;

export const CATEGORY_COLOR_HEX: Record<CategoryColor, string> = {
  emerald: '#10B981',
  blue: '#3B82F6',
  indigo: '#6366F1',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  rose: '#F43F5E',
  cyan: '#06B6D4',
  lime: '#84CC16',
};

export type RoundingMode = 'none' | '15m' | '30m';
export type ShiftRateType = 'normal' | 'holiday' | 'night' | 'overtime';
export type PaymentStatus = 'pending' | 'paid';

export const SHIFT_RATE_LABELS: Record<ShiftRateType, string> = {
  normal: 'Normal',
  holiday: 'Festivo',
  night: 'Nocturno',
  overtime: 'Hora extra',
};

export const ROUNDING_MODE_LABELS: Record<RoundingMode, string> = {
  none: 'Sin redondeo',
  '15m': 'Redondeo a 15 min',
  '30m': 'Redondeo a 30 min',
};

export interface QuickTemplate {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  rateType?: ShiftRateType;
}

export interface WorkEvent {
  id: string;
  name: string;
  color: CategoryColor;
  netRate: number;
  grossRate?: number;
  hasUnpaidBreak: boolean;
  defaultBreakMinutes: number;
  minGuaranteedHours: number;
  roundingMode: RoundingMode;
  multipliers: {
    normal: number;
    holiday: number;
    night: number;
    overtime: number;
  };
  quickTemplates: QuickTemplate[];
  archived: boolean;
  createdAt: string;
}

export interface ShiftHistoricalSnapshot {
  eventNameSnap: string;
  eventColorSnap: CategoryColor;
  netRateSnap: number;
  grossRateSnap: number;
  multiplierSnap: number;
  roundingModeSnap: RoundingMode;
  minGuaranteedHoursSnap: number;
}

export interface ShiftComputedTotals {
  crossesMidnight: boolean;
  rawDurationMinutes: number;
  netWorkedMinutes: number;
  roundedMinutes: number;
  billableMinutes: number;
  totalNetAmount: number;
  totalGrossAmount: number;
}

export interface ShiftRecord {
  id: string;
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
  snapshot: ShiftHistoricalSnapshot;
  computed: ShiftComputedTotals;
  createdAt: string;
}

export interface AppSettings {
  cycleStartDay: number;
  monthlyGoalNetEuros: number | null;
  monthlyGoalHours: number | null;
}

export interface ShiftLogDatabase {
  version: 1;
  exportedAt: string;
  events: WorkEvent[];
  shifts: ShiftRecord[];
  settings: AppSettings;
}

export interface CycleWindow {
  id: string;
  startDate: string;
  endDate: string;
  label: string;
  shortLabel: string;
  anchorYear: number;
  anchorMonth: number;
}

import React from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import type { PaymentStatus, ShiftRecord, WorkEvent } from '../../domain/types';
import { CategoryBreakdown } from './CategoryBreakdown';
import { ExportReportsCard } from './ExportReportsCard';
import { GrossVsNetCard } from './GrossVsNetCard';
import { SixCyclesChart } from './SixCyclesChart';

interface StatsViewProps {
  analytics: CycleAnalytics;
  exportAnalytics?: CycleAnalytics;
  cycleShifts: ShiftRecord[];
  events?: WorkEvent[];
  selectedEventId?: string;
  onChangeEventId?: (eventId: string) => void;
  paymentFilter?: 'all' | PaymentStatus;
  onChangePaymentFilter?: (status: 'all' | PaymentStatus) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({
  analytics,
  exportAnalytics,
  cycleShifts,
  events,
  selectedEventId,
  onChangeEventId,
  paymentFilter,
  onChangePaymentFilter,
}) => {
  return (
    <div className="scroll-container flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-10">
        <SixCyclesChart analytics={analytics} />
        <GrossVsNetCard analytics={analytics} />
        <CategoryBreakdown analytics={analytics} />
        <ExportReportsCard
          analytics={exportAnalytics ?? analytics}
          cycleShifts={cycleShifts}
          events={events}
          selectedEventId={selectedEventId}
          onChangeEventId={onChangeEventId}
          paymentFilter={paymentFilter}
          onChangePaymentFilter={onChangePaymentFilter}
        />
      </div>
    </div>
  );
};

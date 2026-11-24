import React, { useState } from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import type { WorkEvent } from '../../domain/types';
import { CategoryBreakdown } from './CategoryBreakdown';
import { CycleTimelineChart } from './CycleTimelineChart';
import { GrossVsNetCard } from './GrossVsNetCard';
import { MonthActivityCard } from './MonthActivityCard';
import { PredictionsView } from './PredictionsView';
import { SixCyclesChart } from './SixCyclesChart';

interface StatsViewProps {
  analytics: CycleAnalytics;
  events: WorkEvent[];
}

type StatsSubTab = 'current' | 'predictions' | 'history';

const STATS_TABS: readonly { id: StatsSubTab; label: string }[] = [
  { id: 'current', label: 'Mes actual' },
  { id: 'predictions', label: 'Predicciones' },
  { id: 'history', label: 'Historial' },
];

export const StatsView: React.FC<StatsViewProps> = ({ analytics, events }) => {
  const [subTab, setSubTab] = useState<StatsSubTab>('current');

  return (
    <div className="scroll-container flex-1 min-h-0 flex flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-10">
        {/* Selector segmentado de 3 sub-vistas */}
        <div
          role="tablist"
          aria-label="Subvistas de estadísticas"
          className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {STATS_TABS.map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSubTab(tab.id)}
                className={`min-h-[44px] min-w-[44px] rounded-md px-2 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  active
                    ? 'bg-selected font-semibold text-text'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {subTab === 'current' && (
          <div role="tabpanel" aria-label="Mes actual" className="space-y-4">
            <MonthActivityCard analytics={analytics} />
            <CycleTimelineChart analytics={analytics} />
            <CategoryBreakdown analytics={analytics} />
            <GrossVsNetCard analytics={analytics} />
          </div>
        )}

        {subTab === 'predictions' && (
          <div role="tabpanel" aria-label="Predicciones">
            <PredictionsView analytics={analytics} events={events} />
          </div>
        )}

        {subTab === 'history' && (
          <div role="tabpanel" aria-label="Historial">
            <SixCyclesChart analytics={analytics} />
          </div>
        )}
      </div>
    </div>
  );
};

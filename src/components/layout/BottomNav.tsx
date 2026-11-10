import React from 'react';
import { Clock, CalendarDays, BarChart3, SlidersHorizontal } from 'lucide-react';

export type AppTab = 'shifts' | 'calendar' | 'stats' | 'settings';

interface BottomNavProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
}

const NAV_ITEMS: { id: AppTab; label: string; icon: typeof Clock }[] = [
  { id: 'shifts', label: 'Turnos', icon: Clock },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
  { id: 'settings', label: 'Ajustes', icon: SlidersHorizontal },
];

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      aria-label="Navegación principal"
      className="no-print shrink-0 border-t border-border bg-surface pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[56px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                isActive
                  ? 'bg-selected text-text'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? 'text-text' : 'text-text-secondary'}`}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

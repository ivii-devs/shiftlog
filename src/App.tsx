import React, { useEffect, useMemo, useState } from 'react';
import { CalendarView } from './components/calendar/CalendarView';
import { AppShell } from './components/layout/AppShell';
import type { AppTab } from './components/layout/BottomNav';
import { SettingsView } from './components/settings/SettingsView';
import { CycleSummaryHero } from './components/shifts/CycleSummaryHero';
import { QuickTemplatesBar } from './components/shifts/QuickTemplatesBar';
import { RepeatShiftSheet } from './components/shifts/RepeatShiftSheet';
import { ShiftFormSheet } from './components/shifts/ShiftFormSheet';
import { ShiftList } from './components/shifts/ShiftList';
import { PrintableReport } from './components/stats/PrintableReport';
import { StatsView } from './components/stats/StatsView';
import { Toast } from './components/ui/Toast';
import { computeCycleAnalytics } from './domain/analytics';
import { filterShiftsByCycle, getCycleByAnchor } from './domain/cycles';
import type { PaymentStatus, ShiftRecord } from './domain/types';
import { useShiftStore } from './store/useShiftStore';

export const App: React.FC = () => {
  const events = useShiftStore((s) => s.events);
  const shifts = useShiftStore((s) => s.shifts);
  const settings = useShiftStore((s) => s.settings);
  const activeCycleAnchor = useShiftStore((s) => s.activeCycleAnchor);

  const [activeTab, setActiveTab] = useState<AppTab>('shifts');
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRecord | null>(null);
  const [initialShiftDate, setInitialShiftDate] = useState<string | undefined>(
    undefined
  );

  const [repeatSheetOpen, setRepeatSheetOpen] = useState(false);
  const [repeatingShift, setRepeatingShift] = useState<ShiftRecord | null>(null);

  const [exportEventId, setExportEventId] = useState<string>('all');
  const [exportPaymentFilter, setExportPaymentFilter] = useState<'all' | PaymentStatus>(
    'all'
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      win.__setTab = (tab: AppTab) => setActiveTab(tab);
      win.__openShiftForm = (open: boolean) => setShiftFormOpen(open);
      win.__shiftStore = useShiftStore;
    }
  }, []);

  const activeCycle = useMemo(
    () =>
      getCycleByAnchor(
        activeCycleAnchor.year,
        activeCycleAnchor.month,
        settings.cycleStartDay
      ),
    [activeCycleAnchor.year, activeCycleAnchor.month, settings.cycleStartDay]
  );

  const cycleShifts = useMemo(
    () => filterShiftsByCycle(shifts, activeCycle),
    [shifts, activeCycle]
  );

  const analytics = useMemo(
    () =>
      computeCycleAnalytics({
        cycle: activeCycle,
        allShifts: shifts,
        events,
        settings,
      }),
    [activeCycle, shifts, events, settings]
  );

  const exportShifts = useMemo(() => {
    return cycleShifts.filter((s) => {
      if (exportEventId !== 'all' && s.eventId !== exportEventId) return false;
      if (exportPaymentFilter !== 'all' && s.paymentStatus !== exportPaymentFilter)
        return false;
      return true;
    });
  }, [cycleShifts, exportEventId, exportPaymentFilter]);

  const exportAnalytics = useMemo(
    () =>
      exportEventId === 'all' && exportPaymentFilter === 'all'
        ? analytics
        : computeCycleAnalytics({
            cycle: activeCycle,
            allShifts: exportShifts,
            events,
            settings,
          }),
    [
      activeCycle,
      analytics,
      events,
      exportEventId,
      exportPaymentFilter,
      exportShifts,
      settings,
    ]
  );

  const handleOpenNewShift = () => {
    setEditingShift(null);
    setInitialShiftDate(undefined);
    setShiftFormOpen(true);
  };

  const handleOpenNewShiftOnDate = (dateStr: string) => {
    setEditingShift(null);
    setInitialShiftDate(dateStr);
    setShiftFormOpen(true);
  };

  const handleEditShift = (shift: ShiftRecord) => {
    setEditingShift(shift);
    setInitialShiftDate(undefined);
    setShiftFormOpen(true);
  };

  const handleRepeatShift = (shift: ShiftRecord) => {
    setRepeatingShift(shift);
    setRepeatSheetOpen(true);
  };

  return (
    <>
      <AppShell
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewShift={handleOpenNewShift}
      >
        {activeTab === 'shifts' && (
          <div className="scroll-container flex-1 min-h-0 flex flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 pb-10">
              <CycleSummaryHero
                analytics={analytics}
                onOpenNewShift={handleOpenNewShift}
              />
              <QuickTemplatesBar />
              <ShiftList
                cycleShifts={cycleShifts}
                events={events}
                onOpenNewShift={handleOpenNewShift}
                onEditShift={handleEditShift}
                onRepeatShift={handleRepeatShift}
              />
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            onAddShiftOnDate={handleOpenNewShiftOnDate}
            onEditShift={handleEditShift}
            onRepeatShift={handleRepeatShift}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView
            analytics={analytics}
            exportAnalytics={exportAnalytics}
            cycleShifts={exportShifts}
            events={events}
            selectedEventId={exportEventId}
            onChangeEventId={setExportEventId}
            paymentFilter={exportPaymentFilter}
            onChangePaymentFilter={setExportPaymentFilter}
          />
        )}

        {activeTab === 'settings' && <SettingsView />}
      </AppShell>

      <ShiftFormSheet
        open={shiftFormOpen}
        onOpenChange={setShiftFormOpen}
        editingShift={editingShift}
        initialDate={initialShiftDate}
      />

      <RepeatShiftSheet
        open={repeatSheetOpen}
        onOpenChange={setRepeatSheetOpen}
        sourceShift={repeatingShift}
      />

      <Toast />

      {/* Informe imprimible para exportación PDF */}
      <PrintableReport analytics={exportAnalytics} cycleShifts={exportShifts} />
    </>
  );
};

export default App;

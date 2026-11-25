import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';
import { PredictionsView } from '../../components/stats/PredictionsView';
import { computeCycleAnalytics } from '../analytics';
import { getCycleForDate } from '../cycles';
import type { WorkEvent } from '../types';
import { useShiftStore } from '../../store/useShiftStore';

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

describe('App UI integration', () => {
  beforeEach(() => {
    useShiftStore.getState().resetStoreForTests({ events: TEST_EVENTS });
  });

  it('starts without mock events and guides user from ShiftFormSheet to Ajustes when empty', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().resetStoreForTests();

    render(<App />);
    expect(useShiftStore.getState().events).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Registrar turno' }));
    expect(
      await screen.findByText(/No tienes eventos activos todavía/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Ir a Ajustes para crear evento/i })
    );
    expect(
      screen.getByText('Eventos y categorías de trabajo')
    ).toBeInTheDocument();
  });

  it('renders compact summary without Edit goal CTA, avoids duplicated totals on 1-shift days, and uses 3 icon-only row actions', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByText('Aún no hay turnos en este ciclo')
    ).toBeInTheDocument();

    // Tap 1-touch quick template (08:00 - 16:30, 30m break = 8h * 12.50 = 100,00 €)
    await user.click(
      screen.getByRole('button', { name: /Eventos y catering · Mañana/i })
    );

    const summarySection = screen.getByRole('region', {
      name: /Resumen del ciclo actual/i,
    });
    expect(within(summarySection).getAllByText('100,00 €').length).toBeGreaterThan(0);
    expect(within(summarySection).getByText(/500,00 €/i)).toBeInTheDocument();
    expect(within(summarySection).getByText('Meta base')).toBeInTheDocument();

    // No duplicate "Registrar turno", no "Editar meta", no "Cobrado / Pendiente"
    expect(
      within(summarySection).queryByRole('button', { name: /Registrar turno/i })
    ).not.toBeInTheDocument();
    expect(
      within(summarySection).queryByRole('button', { name: /Editar meta/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Cobrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pendiente/i)).not.toBeInTheDocument();

    // Single shift on today -> 3 icon-only actions (Repetir, Editar, Eliminar) and no Clonar hoy / Duplicar
    const shiftListSection = screen.getByRole('region', {
      name: /Listado de turnos del ciclo/i,
    });
    expect(
      within(shiftListSection).getAllByText('100,00 €')
    ).toHaveLength(1);
    expect(
      within(shiftListSection).queryByRole('button', { name: /Clonar hoy/i })
    ).not.toBeInTheDocument();
    expect(
      within(shiftListSection).queryByRole('button', { name: /Duplicar/i })
    ).not.toBeInTheDocument();
    expect(
      within(shiftListSection).getByRole('button', { name: 'Repetir turno' })
    ).toBeInTheDocument();
    expect(
      within(shiftListSection).getByRole('button', { name: 'Editar turno' })
    ).toBeInTheDocument();
    expect(
      within(shiftListSection).getByRole('button', { name: 'Eliminar turno' })
    ).toBeInTheDocument();

    // Open RepeatShiftSheet, click "Marcar hoy", confirm repeat -> now 2 shifts on same day show daily subtotal
    await user.click(
      within(shiftListSection).getByRole('button', { name: 'Repetir turno' })
    );
    await user.click(await screen.findByRole('button', { name: 'Marcar hoy' }));
    await user.click(screen.getByRole('button', { name: /Repetir en 1 día/i }));

    expect(within(summarySection).getAllByText('200,00 €').length).toBeGreaterThan(0);
    // Date group header now shows daily subtotal 200,00 € because 2 shifts exist on that day
    expect(within(shiftListSection).getByText('200,00 €')).toBeInTheDocument();

    // Header navigation to previous cycle shows secondary bar "Volver al mes actual"
    await user.click(screen.getByRole('button', { name: 'Ciclo anterior' }));
    const returnBtn = screen.getByRole('button', { name: 'Volver al mes actual' });
    expect(returnBtn).toBeInTheDocument();
    await user.click(returnBtn);
    expect(
      screen.queryByRole('button', { name: 'Volver al mes actual' })
    ).not.toBeInTheDocument();
  });

  it('shows selected day quick bar and full descending list of worked days in Calendario', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().setCycleForDate('2026-11-15');
    useShiftStore.getState().addShift({
      eventId: 'ev-test-1',
      date: '2026-11-05',
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
      note: 'Turno inicial',
    });
    useShiftStore.getState().addShift({
      eventId: 'ev-test-2',
      date: '2026-11-20',
      startTime: '10:00',
      endTime: '18:00',
      breakMinutes: 0,
      note: 'Turno reciente',
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Calendario' }));

    expect(
      screen.getByRole('button', { name: /Añadir turno en este día/i })
    ).toBeInTheDocument();

    const dayCards = document.querySelectorAll('[data-calendar-day]');
    expect(dayCards).toHaveLength(2);
    expect(dayCards[0].getAttribute('data-calendar-day')).toBe('2026-11-20');
    expect(dayCards[1].getAttribute('data-calendar-day')).toBe('2026-11-05');

    const day20Btn = screen.getByRole('button', { name: /Día 20,/i });
    await user.click(day20Btn);
    expect(dayCards[0].getAttribute('data-selected')).toBe('true');
    expect(dayCards[1].getAttribute('data-selected')).toBe('false');

    const day12Btn = screen.getByRole('button', { name: /Día 12,/i });
    await user.click(day12Btn);
    expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-calendar-day]')).toHaveLength(2);
  });

  it('organizes Estadísticas into 3 sub-views with daily/weekly chart and interactive simulator', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().addShiftFromTemplate('ev-test-1', 'tpl-test-1');

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Estadísticas' }));

    expect(
      screen.queryByRole('button', { name: /Exportar Excel \(\.csv\)/i })
    ).not.toBeInTheDocument();

    expect(screen.getByText('Días trabajados / libres')).toBeInTheDocument();
    expect(screen.getByText('Tarifa media neta real')).toBeInTheDocument();
    expect(screen.getByText('Comparativa Bruto vs. Neto')).toBeInTheDocument();

    const byDaysBtn = screen.getByRole('button', { name: 'Por días' });
    await user.click(byDaysBtn);
    expect(byDaysBtn).toHaveAttribute('aria-pressed', 'true');

    const hoursBtn = screen.getByRole('button', { name: 'Horas' });
    await user.click(hoursBtn);
    expect(hoursBtn).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('tab', { name: 'Predicciones' }));
    expect(screen.getByText('Devengado hasta hoy')).toBeInTheDocument();
    expect(screen.getByText('Cierre estimado del ciclo')).toBeInTheDocument();
    expect(screen.getByText('Simulador rápido')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Turnos extra' }));
    const qtyInput = screen.getByLabelText(/Número de turnos extra/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');

    const hoursPerShiftInput = screen.getByLabelText(/Horas por turno/i);
    await user.clear(hoursPerShiftInput);
    await user.type(hoursPerShiftInput, '5');

    const rateSourceSelect = screen.getByLabelText(/Tarifa de referencia/i);
    await user.selectOptions(rateSourceSelect, 'ev-test-2');
    const rateTypeSelect = screen.getByLabelText(/Tipo de jornada/i);
    await user.selectOptions(rateTypeSelect, 'holiday');

    const simSection = screen.getByRole('region', {
      name: /Simulador rápido de horas o turnos extra/i,
    });
    expect(within(simSection).getByText(/\+210,00 €/i)).toBeInTheDocument();
    expect(within(simSection).getByText('310,00 €')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Historial' }));
    expect(
      screen.getByText('Evolución intermensual (últimos 6 ciclos)')
    ).toBeInTheDocument();
  });

  it('shows 0,00 €/h real rate on an empty cycle and accurate last-day-of-cycle messaging in Predicciones', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Estadísticas' }));

    const activitySection = screen.getByRole('region', {
      name: /Actividad y ritmos del mes actual/i,
    });
    expect(within(activitySection).getByText('0,00 €/h')).toBeInTheDocument();
    expect(within(activitySection).getByText('0 turnos registrados')).toBeInTheDocument();
    unmount();

    const state = useShiftStore.getState();
    const lastDayAnalytics = computeCycleAnalytics({
      cycle: getCycleForDate('2026-11-30', 1),
      allShifts: [],
      events: state.events,
      settings: state.settings,
      referenceDate: '2026-11-30',
    });
    render(<PredictionsView analytics={lastDayAnalytics} events={state.events} />);
    expect(screen.getByText('Ciclo en curso')).toBeInTheDocument();
    expect(screen.getAllByText(/Hoy es el último día del ciclo/i)).toHaveLength(2);
    expect(screen.queryByText(/Este ciclo ya ha finalizado/i)).not.toBeInTheDocument();
  });

  it('organizes Ajustes into 3 sub-views, deletes archived events with confirmation, manages per-month goals, and imports legacy JSON', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().addShiftFromTemplate('ev-test-1', 'tpl-test-1');

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));

    // Archive and then delete archived event with 2-step confirmation
    expect(screen.getByText('Eventos y categorías de trabajo')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Archivar Logística y montaje/i })
    );
    expect(
      useShiftStore.getState().events.find((e) => e.id === 'ev-test-2')?.archived
    ).toBe(true);

    await user.click(screen.getByRole('button', { name: /Archivados \(1\)/i }));
    await user.click(
      screen.getByRole('button', { name: /Eliminar Logística y montaje/i })
    );
    await user.click(
      screen.getByRole('button', { name: /Confirmar borrado de Logística y montaje/i })
    );
    expect(
      useShiftStore.getState().events.find((e) => e.id === 'ev-test-2')
    ).toBeUndefined();

    // Sub-view 2: Ciclo y metas
    await user.click(screen.getByRole('tab', { name: 'Ciclo y metas' }));
    const cycleSelect = screen.getByLabelText(/Día de inicio del ciclo mensual/i);
    await user.selectOptions(cycleSelect, '25');
    expect(useShiftStore.getState().settings.cycleStartDay).toBe(25);

    const monthEuros = screen.getByLabelText(/Meta neta de /i);
    await user.clear(monthEuros);
    await user.type(monthEuros, '850');
    await user.click(screen.getByRole('button', { name: /Guardar meta del mes/i }));
    expect(
      screen.getByText(/Meses con meta personalizada \(1\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/850,00 €/i)).toBeInTheDocument();

    // Sub-view 3: Informes y datos
    await user.click(screen.getByRole('tab', { name: 'Informes y datos' }));
    expect(
      screen.getByRole('button', { name: /Exportar Excel \(\.csv\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Copiar resumen al portapapeles/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Filtrar informe por estado de cobro/i)
    ).not.toBeInTheDocument();

    const fileInput = screen.getByLabelText(
      /Seleccionar archivo JSON de copia de seguridad/i
    );
    const badFile = new File(['{"version": 99}'], 'bad.json', {
      type: 'application/json',
    });
    await user.upload(fileInput, badFile);
    expect(
      await screen.findByText(/Importación bloqueada por formato inválido/i)
    ).toBeInTheDocument();

    const currentState = useShiftStore.getState();
    const legacyShift = {
      ...currentState.shifts[0],
      id: 'sh-legacy-import',
      paymentStatus: 'paid',
    };
    const legacyPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      events: currentState.events.map((ev) =>
        ev.id === 'ev-test-1' ? { ...ev, netRate: 20 } : ev
      ),
      shifts: [legacyShift],
      settings: {
        cycleStartDay: 25,
        monthlyGoalNetEuros: 900,
        monthlyGoalHours: 60,
      },
    };
    const goodFile = new File([JSON.stringify(legacyPayload)], 'legacy-backup.json', {
      type: 'application/json',
    });
    await user.upload(fileInput, goodFile);
    await user.click(
      await screen.findByRole('button', { name: /Combinar registros/i })
    );

    expect(
      useShiftStore.getState().events.find((e) => e.id === 'ev-test-1')?.netRate
    ).toBe(20);
    expect(useShiftStore.getState().shifts).toHaveLength(2);
    expect(
      'paymentStatus' in
        (useShiftStore.getState().shifts.find((s) => s.id === 'sh-legacy-import') ?? {})
    ).toBe(false);
  });
});

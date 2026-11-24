import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';
import { PredictionsView } from '../../components/stats/PredictionsView';
import { computeCycleAnalytics } from '../analytics';
import { getCycleForDate } from '../cycles';
import { useShiftStore } from '../../store/useShiftStore';

describe('App UI integration for Feature 02 (AC01 - AC12)', () => {
  beforeEach(() => {
    useShiftStore.getState().resetStoreForTests();
  });

  it('registers shifts, removes payment status & duplicate CTA, and edits per-month goals from Turnos (AC01, AC02, AC03, AC04)', async () => {
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

    // AC04: No "Cobrado / Pendiente" and no duplicate "Registrar turno" button in hero
    expect(
      within(summarySection).queryByRole('button', { name: /Registrar turno/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Cobrado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pendiente/i)).not.toBeInTheDocument();

    // AC03: Open quick goal sheet from Turnos and save custom goal (including non-multiple-of-10 & decimal values)
    await user.click(within(summarySection).getByRole('button', { name: /Editar meta/i }));
    const eurosInput = (await screen.findByLabelText(
      /Meta neta del mes/i
    )) as HTMLInputElement;
    const hoursInput = screen.getByLabelText(/Meta de horas del mes/i) as HTMLInputElement;
    await user.clear(eurosInput);
    await user.type(eurosInput, '425');
    await user.clear(hoursInput);
    await user.type(hoursInput, '37.5');
    expect(eurosInput.checkValidity()).toBe(true);
    expect(hoursInput.checkValidity()).toBe(true);
    await user.click(screen.getByRole('button', { name: /Guardar meta de este mes/i }));

    expect(within(summarySection).getByText('Personalizada')).toBeInTheDocument();
    expect(within(summarySection).getByText(/325,00 €/i)).toBeInTheDocument(); // 425 - 100 = 325

    // Disable goal for this month via quick sheet
    await user.click(within(summarySection).getByRole('button', { name: /Editar meta/i }));
    await user.click(
      await screen.findByRole('button', { name: /Dejar este mes sin meta/i })
    );
    expect(
      within(summarySection).getByRole('button', { name: /Configurar meta del mes/i })
    ).toBeInTheDocument();

    // Restore to base goal via quick sheet
    await user.click(
      within(summarySection).getByRole('button', { name: /Configurar meta del mes/i })
    );
    await user.click(
      await screen.findByRole('button', { name: /Restablecer a meta base/i })
    );
    expect(within(summarySection).getByText('Meta base')).toBeInTheDocument();

    // Clone and duplicate still work
    await user.click(screen.getByRole('button', { name: /Clonar turno en hoy/i }));
    expect(within(summarySection).getAllByText('200,00 €').length).toBeGreaterThan(0);

    const duplicateBtns = screen.getAllByRole('button', { name: /^Duplicar turno$/i });
    await user.click(duplicateBtns[0]);
    expect(within(summarySection).getAllByText('300,00 €').length).toBeGreaterThan(0);
  });

  it('shows selected day quick bar and full descending list of worked days in Calendario (AC05, AC06)', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().setCycleForDate('2026-11-15');
    useShiftStore.getState().addShift({
      eventId: 'ev-default-1',
      date: '2026-11-05',
      startTime: '08:00',
      endTime: '16:00',
      breakMinutes: 0,
      note: 'Turno inicial',
    });
    useShiftStore.getState().addShift({
      eventId: 'ev-default-2',
      date: '2026-11-20',
      startTime: '10:00',
      endTime: '18:00',
      breakMinutes: 0,
      note: 'Turno reciente',
    });

    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Calendario' }));

    // Quick bar with button is visible
    expect(
      screen.getByRole('button', { name: /Añadir turno en este día/i })
    ).toBeInTheDocument();

    // Worked days are listed in descending chronological order (2026-11-20 before 2026-11-05)
    const dayCards = document.querySelectorAll('[data-calendar-day]');
    expect(dayCards).toHaveLength(2);
    expect(dayCards[0].getAttribute('data-calendar-day')).toBe('2026-11-20');
    expect(dayCards[1].getAttribute('data-calendar-day')).toBe('2026-11-05');

    // Clicking day 20 highlights its card
    const day20Btn = screen.getByRole('button', { name: /Día 20,/i });
    await user.click(day20Btn);
    expect(dayCards[0].getAttribute('data-selected')).toBe('true');
    expect(dayCards[1].getAttribute('data-selected')).toBe('false');

    // Clicking empty day 12 updates quick bar to "Sin actividad registrada" while keeping worked days list visible
    const day12Btn = screen.getByRole('button', { name: /Día 12,/i });
    await user.click(day12Btn);
    expect(screen.getByText('Sin actividad registrada')).toBeInTheDocument();
    expect(document.querySelectorAll('[data-calendar-day]')).toHaveLength(2);
  });

  it('organizes Estadísticas into 3 sub-views with daily/weekly chart and interactive simulator (AC07, AC08, AC09, AC10)', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().addShiftFromTemplate('ev-default-1', 'tpl-default-1');

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Estadísticas' }));

    // AC07: ExportReportsCard is NOT in Estadísticas anymore
    expect(
      screen.queryByRole('button', { name: /Exportar Excel \(\.csv\)/i })
    ).not.toBeInTheDocument();

    // Sub-view 1: Mes actual
    expect(screen.getByText('Días trabajados / libres')).toBeInTheDocument();
    expect(screen.getByText('Tarifa media neta real')).toBeInTheDocument();
    expect(screen.getByText('Comparativa Bruto vs. Neto')).toBeInTheDocument();

    // Toggle chart between Por días / Por semanas and Horas / Neto (€)
    const byDaysBtn = screen.getByRole('button', { name: 'Por días' });
    await user.click(byDaysBtn);
    expect(byDaysBtn).toHaveAttribute('aria-pressed', 'true');

    const hoursBtn = screen.getByRole('button', { name: 'Horas' });
    await user.click(hoursBtn);
    expect(hoursBtn).toHaveAttribute('aria-pressed', 'true');

    // Sub-view 2: Predicciones & simulator
    await user.click(screen.getByRole('tab', { name: 'Predicciones' }));
    expect(screen.getByText('Devengado hasta hoy')).toBeInTheDocument();
    expect(screen.getByText('Cierre estimado del ciclo')).toBeInTheDocument();
    expect(screen.getByText('Simulador rápido')).toBeInTheDocument();

    // Switch simulator to Turnos extra and select event + holiday multiplier
    await user.click(screen.getByRole('button', { name: 'Turnos extra' }));
    const qtyInput = screen.getByLabelText(/Número de turnos extra/i);
    await user.clear(qtyInput);
    await user.type(qtyInput, '2');

    const hoursPerShiftInput = screen.getByLabelText(/Horas por turno/i);
    await user.clear(hoursPerShiftInput);
    await user.type(hoursPerShiftInput, '5');

    const rateSourceSelect = screen.getByLabelText(/Tarifa de referencia/i);
    await user.selectOptions(rateSourceSelect, 'ev-default-2'); // 14 €/h
    const rateTypeSelect = screen.getByLabelText(/Tipo de jornada/i);
    await user.selectOptions(rateTypeSelect, 'holiday'); // x1.5 = 21 €/h -> 10h * 21 = +210 €

    const simSection = screen.getByRole('region', {
      name: /Simulador rápido de horas o turnos extra/i,
    });
    expect(within(simSection).getByText(/\+210,00 €/i)).toBeInTheDocument();
    expect(within(simSection).getByText('310,00 €')).toBeInTheDocument(); // 100 + 210

    // Sub-view 3: Historial
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

    // Render PredictionsView on the exact last day of an active cycle (2026-11-30)
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

  it('organizes Ajustes into 3 sub-views with per-month goals manager, clean exports and legacy JSON import (AC01, AC02, AC11, AC12)', async () => {
    const user = userEvent.setup();
    useShiftStore.getState().addShiftFromTemplate('ev-default-1', 'tpl-default-1');

    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));

    // Sub-view 1: Eventos (default)
    expect(screen.getByText('Eventos y categorías de trabajo')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: /Archivar Logística y montaje/i })
    );
    expect(
      useShiftStore.getState().events.find((e) => e.id === 'ev-default-2')?.archived
    ).toBe(true);

    // Sub-view 2: Ciclo y metas
    await user.click(screen.getByRole('tab', { name: 'Ciclo y metas' }));
    const cycleSelect = screen.getByLabelText(/Día de inicio del ciclo mensual/i);
    await user.selectOptions(cycleSelect, '25');
    expect(useShiftStore.getState().settings.cycleStartDay).toBe(25);

    // Configure custom goal for selected month
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
    // No payment filter in exports
    expect(
      screen.queryByLabelText(/Filtrar informe por estado de cobro/i)
    ).not.toBeInTheDocument();

    // Backup import rejects invalid JSON and accepts legacy JSON with paymentStatus
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
        ev.id === 'ev-default-1' ? { ...ev, netRate: 20 } : ev
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
      useShiftStore.getState().events.find((e) => e.id === 'ev-default-1')?.netRate
    ).toBe(20);
    expect(useShiftStore.getState().shifts).toHaveLength(2);
    expect(
      'paymentStatus' in
        (useShiftStore.getState().shifts.find((s) => s.id === 'sh-legacy-import') ?? {})
    ).toBe(false);
  });
});

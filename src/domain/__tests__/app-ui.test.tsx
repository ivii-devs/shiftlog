import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../../App';
import { useShiftStore } from '../../store/useShiftStore';

describe('App UI integration across all 4 tabs (AC1 - AC19)', () => {
  beforeEach(() => {
    useShiftStore.getState().resetStoreForTests();
  });

  it('registers shifts with 1-touch quick template, updates summary & goal pace, toggles payment, and clones (AC5, AC7, AC11, AC12)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Initially empty state is visible
    expect(
      screen.getByText('Aún no hay turnos en este ciclo')
    ).toBeInTheDocument();

    // Tap 1-touch quick template "Eventos y catering · Mañana" (08:00 - 16:30, 30m break = 8h * 12.50 = 100,00 €)
    const quickBtn = screen.getByRole('button', {
      name: /Eventos y catering · Mañana/i,
    });
    await user.click(quickBtn);

    // Cycle summary hero updates to 100,00 €
    const summarySection = screen.getByRole('region', {
      name: /Resumen del ciclo actual/i,
    });
    expect(within(summarySection).getAllByText('100,00 €').length).toBeGreaterThan(0);

    // Goal progress shows remaining 500,00 € (40h al ritmo medio de 12,50 €/h)
    expect(within(summarySection).getByText(/500,00 €/i)).toBeInTheDocument();

    // Toggle individual payment status from Pendiente to Cobrado
    const pendingBtn = screen.getByRole('button', { name: /^Pendiente$/i });
    await user.click(pendingBtn);
    expect(screen.getByRole('button', { name: /^Cobrado$/i })).toBeInTheDocument();

    // Clone shift in today
    const cloneTodayBtn = screen.getByRole('button', {
      name: /Clonar turno en hoy/i,
    });
    await user.click(cloneTodayBtn);

    // Now 2 shifts in today's group = 200,00 €
    expect(within(summarySection).getAllByText('200,00 €').length).toBeGreaterThan(0);

    // Duplicate shift on same date via Duplicar button (AC7)
    const duplicateBtns = screen.getAllByRole('button', {
      name: /^Duplicar turno$/i,
    });
    await user.click(duplicateBtns[0]);
    expect(within(summarySection).getAllByText('300,00 €').length).toBeGreaterThan(0);
  });

  it('navigates across Turnos, Calendario, Estadísticas, and Ajustes tabs and verifies AC2, AC10, AC13, AC14, AC16, AC17', async () => {
    const user = userEvent.setup();
    // Seed a shift today
    useShiftStore.getState().addShiftFromTemplate('ev-default-1', 'tpl-default-1');

    render(<App />);

    // Switch to Calendario tab
    await user.click(screen.getByRole('button', { name: 'Calendario' }));
    expect(
      screen.getByRole('region', { name: /Calendario mensual de turnos/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Añadir turno en este día/i })
    ).toBeInTheDocument();

    // Switch to Estadísticas tab
    await user.click(screen.getByRole('button', { name: 'Estadísticas' }));
    expect(
      screen.getByText('Evolución intermensual (últimos 6 ciclos)')
    ).toBeInTheDocument();
    expect(screen.getByText('Comparativa Bruto vs. Neto')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Exportar Excel \(\.csv\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Copiar resumen al portapapeles/i })
    ).toBeInTheDocument();

    // Switch to Ajustes tab
    await user.click(screen.getByRole('button', { name: 'Ajustes' }));
    expect(
      screen.getByText('Eventos y categorías de trabajo')
    ).toBeInTheDocument();

    // Change cycle start day to 25 (AC10)
    const cycleSelect = screen.getByLabelText(/Día de inicio del ciclo mensual/i);
    await user.selectOptions(cycleSelect, '25');
    expect(useShiftStore.getState().settings.cycleStartDay).toBe(25);

    // Archive an event (AC2)
    const archiveBtn = screen.getByRole('button', {
      name: /Archivar Logística y montaje/i,
    });
    await user.click(archiveBtn);
    expect(
      useShiftStore.getState().events.find((e) => e.id === 'ev-default-2')?.archived
    ).toBe(true);

    // Test Backup JSON import: first invalid file blocked (AC16), then valid file merged (AC17)
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

    // Valid backup with updated event rate, empty shifts (to prove local shift is preserved on merge), and updated goals
    const currentState = useShiftStore.getState();
    const validPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      events: currentState.events.map((ev) =>
        ev.id === 'ev-default-1' ? { ...ev, netRate: 20 } : ev
      ),
      shifts: [],
      settings: {
        cycleStartDay: 25,
        monthlyGoalNetEuros: 900,
        monthlyGoalHours: 60,
      },
    };
    const goodFile = new File([JSON.stringify(validPayload)], 'backup.json', {
      type: 'application/json',
    });
    await user.upload(fileInput, goodFile);
    const mergeBtn = await screen.findByRole('button', {
      name: /Combinar registros/i,
    });
    await user.click(mergeBtn);

    // Event rate updated to 20 €/h, and existing local shift snapshot preserved at 12.50 €/h (100 €)
    expect(
      useShiftStore.getState().events.find((e) => e.id === 'ev-default-1')?.netRate
    ).toBe(20);
    expect(useShiftStore.getState().shifts).toHaveLength(1);
    expect(useShiftStore.getState().shifts[0].snapshot.netRateSnap).toBe(12.5);
    expect(useShiftStore.getState().shifts[0].computed.totalNetAmount).toBe(100);

    // Now test Replace mode to verify SettingsView goal inputs re-sync from incoming backup settings
    const replacePayload = {
      ...validPayload,
      shifts: useShiftStore.getState().shifts,
    };
    const replaceFile = new File(
      [JSON.stringify(replacePayload)],
      'replace-backup.json',
      { type: 'application/json' }
    );
    await user.upload(fileInput, replaceFile);
    const replaceBtn = await screen.findByRole('button', {
      name: /Reemplazar toda la base de datos/i,
    });
    await user.click(replaceBtn);
    expect(screen.getByLabelText(/Meta mensual neta/i)).toHaveValue(900);
  });
});

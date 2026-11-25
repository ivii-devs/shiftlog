/**
 * Automated Mobile UI Screenshot Capture Pipeline for Shift Log
 * Captures the pure application interface at Retina 2x (393x852) without physical device bezels.
 *
 * Usage:
 *   npm run screenshots
 *   node scripts/generate_screenshots.mjs
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

// ============================================================================
// Pipeline Configuration
// ============================================================================
const CONFIG = {
  devPort: parseInt(process.env.APP_PORT || '5173', 10),
  outputDir: path.resolve(process.env.OUTPUT_DIR || 'docs/screenshots'),
  viewportWidth: parseInt(process.env.VIEWPORT_WIDTH || '393', 10),
  viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT || '852', 10),
  deviceScaleFactor: parseFloat(process.env.SCALE || '2'), // Retina 2x
};

// ============================================================================
// Helper Utilities
// ============================================================================
async function isPortOpen(port) {
  try {
    const res = await fetch(`http://localhost:${port}/`).catch(() => null);
    return res !== null;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveChromeExecutable() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

// ============================================================================
// Realistic Seed Data Injector for Shift Log
// ============================================================================
async function seedRealisticShiftLogState(page) {
  await page.evaluate(() => {
    const store = window.__shiftStore;
    if (!store) return;

    const events = [
      {
        id: 'ev-catering',
        name: 'Eventos y catering',
        color: 'emerald',
        netRate: 13.5,
        grossRate: 16.5,
        hasUnpaidBreak: true,
        defaultBreakMinutes: 30,
        minGuaranteedHours: 4,
        roundingMode: 'none',
        multipliers: { normal: 1.0, holiday: 1.5, night: 1.25, overtime: 1.5 },
        quickTemplates: [
          {
            id: 'tpl-cat-1',
            label: 'Mañana',
            startTime: '08:00',
            endTime: '16:30',
            rateType: 'normal',
          },
          {
            id: 'tpl-cat-2',
            label: 'Banquete',
            startTime: '17:00',
            endTime: '01:30',
            rateType: 'night',
          },
        ],
        archived: false,
        createdAt: '2026-05-01T08:00:00.000Z',
      },
      {
        id: 'ev-logistica',
        name: 'Logística y montaje',
        color: 'blue',
        netRate: 15.0,
        grossRate: 18.5,
        hasUnpaidBreak: false,
        defaultBreakMinutes: 0,
        minGuaranteedHours: 0,
        roundingMode: '15m',
        multipliers: { normal: 1.0, holiday: 1.5, night: 1.25, overtime: 1.5 },
        quickTemplates: [
          {
            id: 'tpl-log-1',
            label: 'Turno noche',
            startTime: '22:00',
            endTime: '06:00',
            rateType: 'night',
          },
        ],
        archived: false,
        createdAt: '2026-05-01T08:05:00.000Z',
      },
      {
        id: 'ev-sonido',
        name: 'Técnico de directo',
        color: 'violet',
        netRate: 18.0,
        grossRate: 22.0,
        hasUnpaidBreak: false,
        defaultBreakMinutes: 0,
        minGuaranteedHours: 5,
        roundingMode: '30m',
        multipliers: { normal: 1.0, holiday: 1.5, night: 1.25, overtime: 1.5 },
        quickTemplates: [
          {
            id: 'tpl-son-1',
            label: 'Soundcheck + Show',
            startTime: '16:00',
            endTime: '00:00',
            rateType: 'normal',
          },
        ],
        archived: false,
        createdAt: '2026-05-01T08:10:00.000Z',
      },
    ];

    const settings = {
      cycleStartDay: 1,
      monthlyGoalNetEuros: 1200,
      monthlyGoalHours: 75,
      monthlyGoalOverrides: {
        '2026-11': { netEuros: 1350, hours: 80 },
        '2026-12': { netEuros: 1600, hours: 95 },
      },
    };

    store.getState().resetStoreForTests({ events, shifts: [], settings });
    const api = store.getState();

    const historicalPlan = [
      // June 2026
      { eventId: 'ev-catering', date: '2026-06-05', startTime: '08:00', endTime: '16:30', rateType: 'normal', note: 'Congreso médico' },
      { eventId: 'ev-catering', date: '2026-06-12', startTime: '17:00', endTime: '01:30', rateType: 'night', note: 'Cena gala' },
      { eventId: 'ev-logistica', date: '2026-06-18', startTime: '22:00', endTime: '06:00', rateType: 'night', note: 'Desmontaje escenario' },
      { eventId: 'ev-sonido', date: '2026-06-24', startTime: '16:00', endTime: '00:00', rateType: 'holiday', note: 'Festival San Juan' },
      { eventId: 'ev-catering', date: '2026-06-28', startTime: '09:00', endTime: '17:30', rateType: 'normal', note: 'Cóctel corporativo' },

      // July 2026
      { eventId: 'ev-sonido', date: '2026-07-04', startTime: '16:00', endTime: '01:00', rateType: 'normal', note: 'Escenario principal' },
      { eventId: 'ev-logistica', date: '2026-07-10', startTime: '22:00', endTime: '06:00', rateType: 'night', note: 'Montaje estructuras' },
      { eventId: 'ev-catering', date: '2026-07-15', startTime: '17:00', endTime: '01:30', rateType: 'night', note: 'Finca El Olivar' },
      { eventId: 'ev-sonido', date: '2026-07-19', startTime: '17:00', endTime: '01:00', rateType: 'holiday', note: 'Concierto auditorio' },
      { eventId: 'ev-logistica', date: '2026-07-25', startTime: '08:00', endTime: '16:00', rateType: 'holiday', note: 'Descarga trailers' },

      // August 2026
      { eventId: 'ev-sonido', date: '2026-08-02', startTime: '16:00', endTime: '01:00', rateType: 'holiday', note: 'Ciclo noches verano' },
      { eventId: 'ev-catering', date: '2026-08-08', startTime: '18:00', endTime: '02:30', rateType: 'night', note: 'Boda jardín' },
      { eventId: 'ev-logistica', date: '2026-08-14', startTime: '22:00', endTime: '06:00', rateType: 'night', note: 'Turno nocturno recinto' },
      { eventId: 'ev-sonido', date: '2026-08-15', startTime: '16:00', endTime: '00:30', rateType: 'holiday', note: 'Festivo Asunción' },
      { eventId: 'ev-catering', date: '2026-08-22', startTime: '17:00', endTime: '01:30', rateType: 'night', note: 'Evento privado' },
      { eventId: 'ev-sonido', date: '2026-08-29', startTime: '16:00', endTime: '00:00', rateType: 'normal', note: 'Cierre temporada' },

      // September 2026
      { eventId: 'ev-catering', date: '2026-09-05', startTime: '08:00', endTime: '16:30', rateType: 'normal', note: 'Feria tecnológica' },
      { eventId: 'ev-logistica', date: '2026-09-11', startTime: '22:00', endTime: '06:00', rateType: 'night', note: 'Pabellón 4 IFEMA' },
      { eventId: 'ev-sonido', date: '2026-09-18', startTime: '16:00', endTime: '00:00', rateType: 'normal', note: 'Presentación marca' },
      { eventId: 'ev-catering', date: '2026-09-25', startTime: '17:00', endTime: '01:30', rateType: 'night', note: 'Gala anual' },
      { eventId: 'ev-logistica', date: '2026-09-29', startTime: '08:00', endTime: '16:00', rateType: 'normal', note: 'Refuerzo almacén' },

      // October 2026
      { eventId: 'ev-catering', date: '2026-10-03', startTime: '08:00', endTime: '16:30', rateType: 'normal', note: 'Cumbre financiera' },
      { eventId: 'ev-sonido', date: '2026-10-10', startTime: '16:00', endTime: '00:00', rateType: 'normal', note: 'Teatro municipal' },
      { eventId: 'ev-catering', date: '2026-10-12', startTime: '12:00', endTime: '20:30', rateType: 'holiday', note: 'Recepción festivo' },
      { eventId: 'ev-logistica', date: '2026-10-20', startTime: '22:00', endTime: '06:00', rateType: 'night', note: 'Montaje feria' },
      { eventId: 'ev-sonido', date: '2026-10-28', startTime: '16:00', endTime: '00:00', rateType: 'normal', note: 'Auditorio sala B' },

      // Current Cycle: November 2026 (worked across weeks + 2 upcoming scheduled shifts)
      { eventId: 'ev-sonido', date: '2026-11-01', startTime: '16:00', endTime: '22:00', rateType: 'holiday', fixedBonus: 15, expenseAdjustment: 0, note: 'Festival Todos los Santos' },
      { eventId: 'ev-catering', date: '2026-11-04', startTime: '08:00', endTime: '16:30', rateType: 'normal', fixedBonus: 0, expenseAdjustment: -3.5, note: 'Congreso sala norte' },
      { eventId: 'ev-logistica', date: '2026-11-07', startTime: '22:00', endTime: '05:00', rateType: 'night', fixedBonus: 10, expenseAdjustment: 0, note: 'Desmontaje nocturno nave 2' },
      { eventId: 'ev-catering', date: '2026-11-12', startTime: '09:00', endTime: '14:30', rateType: 'normal', fixedBonus: 0, expenseAdjustment: 0, note: 'Coffee break ejecutivo' },
      { eventId: 'ev-sonido', date: '2026-11-12', startTime: '17:00', endTime: '23:00', rateType: 'normal', fixedBonus: 0, expenseAdjustment: 12, note: 'Sonorización conferencia' },
      { eventId: 'ev-logistica', date: '2026-11-15', startTime: '22:00', endTime: '05:00', rateType: 'night', fixedBonus: 0, expenseAdjustment: -4.0, note: 'Carga equipamiento gira' },
      { eventId: 'ev-catering', date: '2026-11-19', startTime: '17:00', endTime: '00:30', rateType: 'night', fixedBonus: 0, expenseAdjustment: 0, note: 'Cena de empresa' },
      { eventId: 'ev-sonido', date: '2026-11-22', startTime: '16:00', endTime: '22:30', rateType: 'normal', fixedBonus: 10, expenseAdjustment: 0, note: 'Directo auditorio sur' },
      // Scheduled upcoming shifts later in the same cycle
      { eventId: 'ev-catering', date: '2026-11-27', startTime: '17:00', endTime: '00:00', rateType: 'night', fixedBonus: 0, expenseAdjustment: 0, note: 'Cena gala anual' },
      { eventId: 'ev-sonido', date: '2026-11-29', startTime: '16:00', endTime: '22:00', rateType: 'normal', fixedBonus: 0, expenseAdjustment: 0, note: 'Cierre de gira' },
    ];

    for (const item of historicalPlan) {
      api.addShift(item);
    }

    api.setCycleForDate('2026-11-25');
    api.clearToast();
  });
}

// ============================================================================
// Main Execution Pipeline
// ============================================================================
async function main() {
  console.log('🚀 [Showcase] Starting frameless Retina 2x screenshot pipeline...');

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 1. Ensure Vite dev server is running
  const isAppRunning = await isPortOpen(CONFIG.devPort);
  let spawnedDevServer = null;

  if (!isAppRunning) {
    console.log(`📡 Spawning embedded Vite dev server on port ${CONFIG.devPort}...`);
    const { createServer } = await import('vite');
    spawnedDevServer = await createServer({
      server: { port: CONFIG.devPort },
      logLevel: 'error',
    });
    await spawnedDevServer.listen();
    console.log(`✅ Embedded Vite running on http://localhost:${CONFIG.devPort}`);
  } else {
    console.log(`✅ Web application active on http://localhost:${CONFIG.devPort}`);
  }

  // 2. Launch headless Chromium directly against the app
  const executablePath = resolveChromeExecutable();
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=medium',
      '--enable-font-antialiasing',
      '--force-color-profile=srgb',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: CONFIG.viewportWidth,
    height: CONFIG.viewportHeight,
    deviceScaleFactor: CONFIG.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`http://localhost:${CONFIG.devPort}`, { waitUntil: 'networkidle2' });

  await page.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
  });

  // 3. Seed realistic multi-cycle shift data
  await seedRealisticShiftLogState(page);
  await sleep(600);

  // 4. Screens to capture (pure app UI, no bezel)
  const screens = [
    {
      filename: '01-shifts-screen.png',
      description: 'Vista Turnos - Resumen del ciclo, meta personalizada del mes y plantillas rápidas',
      prepare: async (p) => {
        await p.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('shifts');
          }
          const scroller = document.querySelector('.scroll-container');
          if (scroller) scroller.scrollTop = 0;
        });
      },
      waitMs: 500,
    },
    {
      filename: '02-calendar-screen.png',
      description: 'Vista Calendario - Cuadrícula mensual, barra del día seleccionado y agenda descendente',
      prepare: async (p) => {
        await p.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('calendar');
          }
        });
      },
      action: async (p) => {
        await p.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const day12Btn = buttons.find((b) =>
            (b.getAttribute('aria-label') || '').startsWith('Día 12,')
          );
          if (day12Btn) day12Btn.click();
          const scroller = document.querySelector('.scroll-container');
          if (scroller) scroller.scrollTop = 0;
        });
      },
      waitMs: 500,
    },
    {
      filename: '03-stats-screen.png',
      description: 'Vista Estadísticas - Mes actual con actividad y gráfico semanal/diario',
      prepare: async (p) => {
        await p.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('stats');
          }
        });
      },
      action: async (p) => {
        await p.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
          const currentTab = tabs.find((el) => el.textContent?.trim() === 'Mes actual');
          if (currentTab instanceof HTMLElement) currentTab.click();
          const scroller = document.querySelector('.scroll-container');
          if (scroller) scroller.scrollTop = 250;
        });
      },
      waitMs: 500,
    },
    {
      filename: '04-predictions-screen.png',
      description: 'Vista Predicciones - Proyección al cierre del mes y ritmo para metas',
      prepare: async (p) => {
        await p.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('stats');
          }
        });
      },
      action: async (p) => {
        await p.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
          const predTab = tabs.find((el) => el.textContent?.trim() === 'Predicciones');
          if (predTab instanceof HTMLElement) predTab.click();
          const scroller = document.querySelector('.scroll-container');
          if (scroller) scroller.scrollTop = 0;
        });
      },
      waitMs: 500,
    },
  ];

  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    console.log(`📸 [${i + 1}/${screens.length}] Capturing: ${s.description} -> ${s.filename}`);

    if (s.prepare) {
      await s.prepare(page);
    }
    await sleep(s.waitMs || 500);

    if (s.action) {
      await s.action(page);
      await sleep(300);
    }

    const outPath = path.join(CONFIG.outputDir, s.filename);
    await page.screenshot({ path: outPath, type: 'png' });
    const stat = fs.statSync(outPath);
    console.log(`   ✓ Saved ${s.filename} (${Math.round(stat.size / 1024)} KB)`);
  }

  // Quality Verification Gate
  let allValid = true;
  for (const s of screens) {
    const filePath = path.join(CONFIG.outputDir, s.filename);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing screenshot: ${s.filename}`);
      allValid = false;
      continue;
    }
    const stat = fs.statSync(filePath);
    if (stat.size < 40000) {
      console.error(`⚠️ File suspiciously small (${stat.size} bytes): ${s.filename}`);
      allValid = false;
    }
  }

  await browser.close();
  if (spawnedDevServer) await spawnedDevServer.close();

  if (allValid) {
    console.log(`\n🎉 All ${screens.length} frameless UI screenshots generated in ${CONFIG.outputDir}!`);
    process.exit(0);
  } else {
    console.error('\n❌ One or more screenshot files failed validation.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error in screenshot capture pipeline:', err);
  process.exit(1);
});

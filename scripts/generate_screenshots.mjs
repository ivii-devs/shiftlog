/**
 * Automated Device-Framed Screenshot Capture Pipeline for Shift Log
 *
 * Usage:
 *   node scripts/generate_screenshots.mjs
 *   DEVICE=pixel node scripts/generate_screenshots.mjs
 *   DEVICE=galaxy node scripts/generate_screenshots.mjs
 *   DEVICE=ipad node scripts/generate_screenshots.mjs
 */

import puppeteer from 'puppeteer';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);
const { DeviceFrameServer } = require('device-frame-pro');

// ============================================================================
// Pipeline Configuration
// ============================================================================
const rawDevice = (process.env.DEVICE || 'iphone').toLowerCase();

const CONFIG = {
  devPort: parseInt(process.env.APP_PORT || '5173', 10),
  deviceFramePort: parseInt(process.env.FRAME_PORT || '4300', 10),
  deviceType: rawDevice,
  outputDir: path.resolve(process.env.OUTPUT_DIR || 'docs/screenshots'),
  deviceScaleFactor: parseFloat(process.env.SCALE || '2'), // Retina 2x for ultra-sharp typography
};

const DEVICE_MAP = {
  iphone: { id: 'iphone-15-pro', style: 'iphone' },
  ios: { id: 'iphone-15-pro', style: 'iphone' },
  apple: { id: 'iphone-15-pro', style: 'iphone' },
  pixel: { id: 'pixel-8', style: 'pixel' },
  android: { id: 'pixel-8', style: 'pixel' },
  galaxy: { id: 'galaxy-s24', style: 'galaxy' },
  samsung: { id: 'galaxy-s24', style: 'galaxy' },
  s24: { id: 'galaxy-s24', style: 'galaxy' },
  ipad: { id: 'ipad-pro-11', style: 'ipad' },
  tablet: { id: 'ipad-pro-11', style: 'ipad' },
};

// ============================================================================
// Helper Utilities
// ============================================================================
async function isPortOpen(port) {
  try {
    const resHealth = await fetch(`http://localhost:${port}/health`).catch(() => null);
    if (resHealth && resHealth.ok) return true;
    const resRoot = await fetch(`http://localhost:${port}/`).catch(() => null);
    return resRoot !== null;
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
// Device Hardware & Status Bar Injectors
// ============================================================================

/**
 * iPhone 15/16 Pro Titanium Bezel & Dynamic Island
 */
async function applyIPhoneStyling(page) {
  await page.evaluate(() => {
    // 1. Titanium Bezel Geometry (iPhone 15/16 Pro)
    const bezel = document.querySelector('.device-bezel');
    if (bezel) {
      bezel.style.cssText = `
        position: relative !important;
        background: linear-gradient(145deg, #2b2a2f 0%, #161519 50%, #222126 100%) !important;
        border-radius: 54px !important;
        padding: 12px !important;
        width: 417px !important;
        height: 876px !important;
        box-shadow: 0 25px 70px rgba(0,0,0,0.65), inset 0 0 0 1.5px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.3) !important;
        box-sizing: border-box !important;
      `;
    }

    // 2. Active OLED Screen Container (393 x 852 px)
    const screenContainer = document.querySelector('.device-screen-container');
    if (screenContainer) {
      screenContainer.style.cssText = `
        position: relative !important;
        width: 393px !important;
        height: 852px !important;
        border-radius: 44px !important;
        background: #050505 !important;
        overflow: hidden !important;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.6) !important;
      `;
    }

    // 3. Dynamic Island Pill
    let dynamicIsland = document.querySelector('.device-notch');
    if (dynamicIsland) {
      dynamicIsland.className = 'device-notch dynamic-island';
      dynamicIsland.style.cssText = `
        position: absolute !important;
        top: 11px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 124px !important;
        height: 35px !important;
        background: #000000 !important;
        border-radius: 20px !important;
        z-index: 60 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        padding-right: 14px !important;
        box-shadow: 0 0 1px rgba(255,255,255,0.15) !important;
      `;
      const speaker = dynamicIsland.querySelector('.notch-speaker');
      if (speaker) speaker.style.display = 'none';

      const camera = dynamicIsland.querySelector('.notch-camera');
      if (camera) {
        camera.style.cssText = `
          width: 11px !important;
          height: 11px !important;
          border-radius: 50% !important;
          background: radial-gradient(circle at 35% 35%, #182848, #060b13) !important;
          box-shadow: inset 0 0 2px rgba(255,255,255,0.2) !important;
          position: static !important;
        `;
      }
    }

    // 4. Authentic iOS Status Bar (Canonical 9:41 + Vector Icons)
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      statusBar.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 54px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 0 28px 0 32px !important;
        background: transparent !important;
        z-index: 55 !important;
        pointer-events: none !important;
      `;

      statusBar.innerHTML = `
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', Roboto, 'Segoe UI Emoji', sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; letter-spacing: -0.2px;">9:41</span>
        <div style="display: flex; align-items: center; gap: 7px;">
          <!-- iOS Cellular Signal -->
          <svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="8" width="3" height="3" rx="1" fill="white"/>
            <rect x="4.5" y="5.5" width="3" height="5.5" rx="1" fill="white"/>
            <rect x="9" y="3" width="3" height="8" rx="1" fill="white"/>
            <rect x="13.5" y="0" width="3" height="11" rx="1" fill="white"/>
          </svg>
          <!-- iOS Wi-Fi -->
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.5C10.7 1.5 13.1 2.6 14.9 4.4L16 3.2C13.9 1.2 11.1 0 8 0C4.9 0 2.1 1.2 0 3.2L1.1 4.4C2.9 2.6 5.3 1.5 8 1.5ZM8 5C9.7 5 11.3 5.7 12.5 6.9L13.6 5.7C12.1 4.2 10.2 3.3 8 3.3C5.8 3.3 3.9 4.2 2.4 5.7L3.5 6.9C4.7 5.7 6.3 5 8 5ZM8 8.5C9 8.5 9.9 8.9 10.6 9.6L11.7 8.4C10.7 7.5 9.4 6.9 8 6.9C6.6 6.9 5.3 7.5 4.3 8.4L5.4 9.6C6.1 8.9 7 8.5 8 8.5ZM8 10.3C7.3 10.3 6.8 10.8 6.8 11.5C6.8 12.2 7.3 12.7 8 12.7C8.7 12.7 9.2 12.2 9.2 11.5C9.2 10.8 8.7 10.3 8 10.3Z" fill="white"/>
          </svg>
          <!-- iOS Battery -->
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="white" stroke-opacity="0.85"/>
            <rect x="2.5" y="2.5" width="16" height="7" rx="2" fill="white"/>
            <path d="M23 4C23.6 4.3 24 5 24 5.8V6.2C24 7 23.6 7.7 23 8V4Z" fill="white" fill-opacity="0.85"/>
          </svg>
        </div>
      `;
    }

    // Freeze status bar time
    window.getCurrentTime = () => '9:41';
    window.updateStatusBarTime = () => {};

    // 5. Iframe Viewport Alignment
    const iframe = document.querySelector('.device-screen');
    if (iframe && screenContainer) {
      iframe.style.cssText = `
        position: absolute !important;
        top: 48px !important;
        left: 0 !important;
        width: 100% !important;
        height: calc(100% - 48px) !important;
        border: none !important;
        z-index: 10 !important;
      `;
    }

    // 6. Home Indicator Pill
    let homeIndicator = document.querySelector('.home-indicator');
    if (!homeIndicator && screenContainer) {
      homeIndicator = document.createElement('div');
      homeIndicator.className = 'home-indicator';
      screenContainer.appendChild(homeIndicator);
    }
    if (homeIndicator) {
      if (screenContainer && homeIndicator.parentElement !== screenContainer) {
        screenContainer.appendChild(homeIndicator);
      }
      homeIndicator.style.cssText = `
        position: absolute !important;
        bottom: 8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 136px !important;
        height: 5px !important;
        background: rgba(255, 255, 255, 0.55) !important;
        border-radius: 100px !important;
        z-index: 50 !important;
        pointer-events: none !important;
      `;
    }
  });
}

/**
 * Google Pixel 8/9 Matte Bezel & Punch-hole Camera
 */
async function applyPixelStyling(page) {
  await page.evaluate(() => {
    const bezel = document.querySelector('.device-bezel');
    if (bezel) {
      bezel.style.cssText = `
        position: relative !important;
        background: linear-gradient(145deg, #1f2329 0%, #121417 50%, #1c2025 100%) !important;
        border-radius: 42px !important;
        padding: 10px !important;
        width: 432px !important;
        height: 935px !important;
        box-shadow: 0 25px 70px rgba(0,0,0,0.65), inset 0 0 0 1.5px rgba(255,255,255,0.12) !important;
        box-sizing: border-box !important;
      `;
    }

    const screenContainer = document.querySelector('.device-screen-container');
    if (screenContainer) {
      screenContainer.style.cssText = `
        position: relative !important;
        width: 412px !important;
        height: 915px !important;
        border-radius: 32px !important;
        background: #050505 !important;
        overflow: hidden !important;
      `;
    }

    let cameraNotch = document.querySelector('.device-notch');
    if (cameraNotch) {
      cameraNotch.style.cssText = `
        position: absolute !important;
        top: 10px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 13px !important;
        height: 13px !important;
        background: #000000 !important;
        border-radius: 50% !important;
        z-index: 60 !important;
        box-shadow: 0 0 2px rgba(255,255,255,0.2) !important;
      `;
    }

    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      statusBar.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 40px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 0 20px !important;
        background: transparent !important;
        z-index: 55 !important;
        pointer-events: none !important;
      `;
      statusBar.innerHTML = `
        <span style="font-family: Roboto, 'Google Sans', 'Segoe UI Emoji', sans-serif; font-size: 14px; font-weight: 500; color: #ffffff;">10:08</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-family: Roboto, sans-serif; font-size: 12px; font-weight: 700; color: #ffffff;">5G</span>
          <svg width="15" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/></svg>
          <svg width="13" height="15" viewBox="0 0 24 24" fill="white"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
        </div>
      `;
    }

    window.getCurrentTime = () => '10:08';
    window.updateStatusBarTime = () => {};

    const iframe = document.querySelector('.device-screen');
    if (iframe && screenContainer) {
      iframe.style.cssText = `
        position: absolute !important;
        top: 36px !important;
        left: 0 !important;
        width: 100% !important;
        height: calc(100% - 36px) !important;
        border: none !important;
        z-index: 10 !important;
      `;
    }

    let gestureHandle = document.querySelector('.home-indicator');
    if (!gestureHandle && screenContainer) {
      gestureHandle = document.createElement('div');
      gestureHandle.className = 'home-indicator';
      screenContainer.appendChild(gestureHandle);
    }
    if (gestureHandle) {
      gestureHandle.style.cssText = `
        position: absolute !important;
        bottom: 8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 140px !important;
        height: 4px !important;
        background: rgba(255, 255, 255, 0.6) !important;
        border-radius: 100px !important;
        z-index: 50 !important;
      `;
    }
  });
}

/**
 * Samsung Galaxy S24 Dark Aluminum Bezel & One UI Punch-hole
 */
async function applyGalaxyStyling(page) {
  await page.evaluate(() => {
    const bezel = document.querySelector('.device-bezel');
    if (bezel) {
      bezel.style.cssText = `
        position: relative !important;
        background: linear-gradient(145deg, #26292d 0%, #16181b 50%, #202327 100%) !important;
        border-radius: 48px !important;
        padding: 12px !important;
        width: 384px !important;
        height: 804px !important;
        box-shadow: 0 25px 70px rgba(0,0,0,0.65), inset 0 0 0 1.5px rgba(255,255,255,0.14) !important;
        box-sizing: border-box !important;
      `;
    }

    const screenContainer = document.querySelector('.device-screen-container');
    if (screenContainer) {
      screenContainer.style.cssText = `
        position: relative !important;
        width: 360px !important;
        height: 780px !important;
        border-radius: 36px !important;
        background: #050505 !important;
        overflow: hidden !important;
      `;
    }

    let cameraNotch = document.querySelector('.device-notch');
    if (cameraNotch) {
      cameraNotch.style.cssText = `
        position: absolute !important;
        top: 10px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 11px !important;
        height: 11px !important;
        background: #000000 !important;
        border-radius: 50% !important;
        z-index: 60 !important;
        box-shadow: inset 0 0 2px rgba(255,255,255,0.25) !important;
      `;
    }

    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
      statusBar.style.cssText = `
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 38px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 0 18px !important;
        background: transparent !important;
        z-index: 55 !important;
        pointer-events: none !important;
      `;
      statusBar.innerHTML = `
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Segoe UI Emoji', sans-serif; font-size: 13px; font-weight: 600; color: #ffffff; letter-spacing: -0.2px;">12:45</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #ffffff;">5G</span>
          <svg width="15" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/></svg>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
        </div>
      `;
    }

    window.getCurrentTime = () => '12:45';
    window.updateStatusBarTime = () => {};

    const iframe = document.querySelector('.device-screen');
    if (iframe && screenContainer) {
      iframe.style.cssText = `
        position: absolute !important;
        top: 36px !important;
        left: 0 !important;
        width: 100% !important;
        height: calc(100% - 36px) !important;
        border: none !important;
        z-index: 10 !important;
      `;
    }

    let gestureHandle = document.querySelector('.home-indicator');
    if (!gestureHandle && screenContainer) {
      gestureHandle = document.createElement('div');
      gestureHandle.className = 'home-indicator';
      screenContainer.appendChild(gestureHandle);
    }
    if (gestureHandle) {
      gestureHandle.style.cssText = `
        position: absolute !important;
        bottom: 7px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 120px !important;
        height: 4px !important;
        background: rgba(255, 255, 255, 0.6) !important;
        border-radius: 100px !important;
        z-index: 50 !important;
      `;
    }
  });
}

// ============================================================================
// Realistic Seed Data Injector for Shift Log
// ============================================================================
async function seedRealisticShiftLogState(frame) {
  await frame.evaluate(() => {
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
    };

    // Reset with custom events and settings, then add shifts via store.getState().addShift
    store.getState().resetStoreForTests({ events, shifts: [], settings });
    const api = store.getState();

    // Historical shifts across previous 5 months (June - October 2026) for rich 6-cycle chart
    const historicalPlan = [
      // June 2026 (~780 €)
      { eventId: 'ev-catering', date: '2026-06-05', startTime: '08:00', endTime: '16:30', rateType: 'normal', paymentStatus: 'paid', note: 'Congreso médico' },
      { eventId: 'ev-catering', date: '2026-06-12', startTime: '17:00', endTime: '01:30', rateType: 'night', paymentStatus: 'paid', note: 'Cena gala' },
      { eventId: 'ev-logistica', date: '2026-06-18', startTime: '22:00', endTime: '06:00', rateType: 'night', paymentStatus: 'paid', note: 'Desmontaje escenario' },
      { eventId: 'ev-sonido', date: '2026-06-24', startTime: '16:00', endTime: '00:00', rateType: 'holiday', paymentStatus: 'paid', note: 'Festival San Juan' },
      { eventId: 'ev-catering', date: '2026-06-28', startTime: '09:00', endTime: '17:30', rateType: 'normal', paymentStatus: 'paid', note: 'Cóctel corporativo' },

      // July 2026 (~960 €)
      { eventId: 'ev-sonido', date: '2026-07-04', startTime: '16:00', endTime: '01:00', rateType: 'normal', paymentStatus: 'paid', note: 'Escenario principal' },
      { eventId: 'ev-logistica', date: '2026-07-10', startTime: '22:00', endTime: '06:00', rateType: 'night', paymentStatus: 'paid', note: 'Montaje estructuras' },
      { eventId: 'ev-catering', date: '2026-07-15', startTime: '17:00', endTime: '01:30', rateType: 'night', paymentStatus: 'paid', note: 'Finca El Olivar' },
      { eventId: 'ev-sonido', date: '2026-07-19', startTime: '17:00', endTime: '01:00', rateType: 'holiday', paymentStatus: 'paid', note: 'Concierto auditorio' },
      { eventId: 'ev-logistica', date: '2026-07-25', startTime: '08:00', endTime: '16:00', rateType: 'holiday', paymentStatus: 'paid', note: 'Descarga trailers' },

      // August 2026 (~1.120 €)
      { eventId: 'ev-sonido', date: '2026-08-02', startTime: '16:00', endTime: '01:00', rateType: 'holiday', paymentStatus: 'paid', note: 'Ciclo noches verano' },
      { eventId: 'ev-catering', date: '2026-08-08', startTime: '18:00', endTime: '02:30', rateType: 'night', paymentStatus: 'paid', note: 'Boda jardín' },
      { eventId: 'ev-logistica', date: '2026-08-14', startTime: '22:00', endTime: '06:00', rateType: 'night', paymentStatus: 'paid', note: 'Turno nocturno recinto' },
      { eventId: 'ev-sonido', date: '2026-08-15', startTime: '16:00', endTime: '00:30', rateType: 'holiday', paymentStatus: 'paid', note: 'Festivo Asunción' },
      { eventId: 'ev-catering', date: '2026-08-22', startTime: '17:00', endTime: '01:30', rateType: 'night', paymentStatus: 'paid', note: 'Evento privado' },
      { eventId: 'ev-sonido', date: '2026-08-29', startTime: '16:00', endTime: '00:00', rateType: 'normal', paymentStatus: 'paid', note: 'Cierre temporada' },

      // September 2026 (~840 €)
      { eventId: 'ev-catering', date: '2026-09-05', startTime: '08:00', endTime: '16:30', rateType: 'normal', paymentStatus: 'paid', note: 'Feria tecnológica' },
      { eventId: 'ev-logistica', date: '2026-09-11', startTime: '22:00', endTime: '06:00', rateType: 'night', paymentStatus: 'paid', note: 'Pabellón 4 IFEMA' },
      { eventId: 'ev-sonido', date: '2026-09-18', startTime: '16:00', endTime: '00:00', rateType: 'normal', paymentStatus: 'paid', note: 'Presentación marca' },
      { eventId: 'ev-catering', date: '2026-09-25', startTime: '17:00', endTime: '01:30', rateType: 'night', paymentStatus: 'paid', note: 'Gala anual' },
      { eventId: 'ev-logistica', date: '2026-09-29', startTime: '08:00', endTime: '16:00', rateType: 'normal', paymentStatus: 'paid', note: 'Refuerzo almacén' },

      // October 2026 (~890 €)
      { eventId: 'ev-catering', date: '2026-10-03', startTime: '08:00', endTime: '16:30', rateType: 'normal', paymentStatus: 'paid', note: 'Cumbre financiera' },
      { eventId: 'ev-sonido', date: '2026-10-10', startTime: '16:00', endTime: '00:00', rateType: 'normal', paymentStatus: 'paid', note: 'Teatro municipal' },
      { eventId: 'ev-catering', date: '2026-10-12', startTime: '12:00', endTime: '20:30', rateType: 'holiday', paymentStatus: 'paid', note: 'Recepción festivo' },
      { eventId: 'ev-logistica', date: '2026-10-20', startTime: '22:00', endTime: '06:00', rateType: 'night', paymentStatus: 'paid', note: 'Montaje feria' },
      { eventId: 'ev-sonido', date: '2026-10-28', startTime: '16:00', endTime: '00:00', rateType: 'normal', paymentStatus: 'paid', note: 'Auditorio sala B' },

      // Current Cycle: November 2026 (~985,50 € across 8 shifts -> 82% of 1.200 € goal!)
      { eventId: 'ev-sonido', date: '2026-11-01', startTime: '16:00', endTime: '00:00', rateType: 'holiday', fixedBonus: 15, expenseAdjustment: 0, paymentStatus: 'paid', note: 'Festival Todos los Santos' },
      { eventId: 'ev-catering', date: '2026-11-02', startTime: '08:00', endTime: '16:30', rateType: 'normal', fixedBonus: 0, expenseAdjustment: -3.5, paymentStatus: 'paid', note: 'Congreso sala norte' },
      { eventId: 'ev-logistica', date: '2026-11-03', startTime: '22:00', endTime: '06:00', rateType: 'night', fixedBonus: 10, expenseAdjustment: 0, paymentStatus: 'paid', note: 'Desmontaje nocturno nave 2' },
      { eventId: 'ev-catering', date: '2026-11-05', startTime: '09:00', endTime: '14:30', rateType: 'normal', fixedBonus: 0, expenseAdjustment: 0, paymentStatus: 'paid', note: 'Coffee break ejecutivo' },
      { eventId: 'ev-sonido', date: '2026-11-05', startTime: '17:00', endTime: '23:00', rateType: 'normal', fixedBonus: 0, expenseAdjustment: 12, paymentStatus: 'paid', note: 'Sonorización conferencia' },
      { eventId: 'ev-logistica', date: '2026-11-06', startTime: '22:00', endTime: '06:00', rateType: 'night', fixedBonus: 0, expenseAdjustment: -4.0, paymentStatus: 'pending', note: 'Carga equipamiento gira' },
      { eventId: 'ev-sonido', date: '2026-11-07', startTime: '16:00', endTime: '00:30', rateType: 'overtime', fixedBonus: 20, expenseAdjustment: 0, paymentStatus: 'pending', note: 'Directo arena central' },
    ];

    for (const item of historicalPlan) {
      api.addShift(item);
    }

    api.setCycleForDate('2026-11-07');
    api.clearToast();
  });
}

// ============================================================================
// Main Execution Pipeline
// ============================================================================
async function main() {
  console.log('🚀 [Showcase] Starting automated device-framed screenshot pipeline...');

  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 1. Verify target web application is running
  const isAppRunning = await isPortOpen(CONFIG.devPort);
  let spawnedDevServer = null;

  if (!isAppRunning) {
    console.log(`⚠️ No server responding on http://localhost:${CONFIG.devPort}`);
    try {
      const { createServer } = await import('vite');
      console.log(`📡 Spawning embedded Vite dev server on port ${CONFIG.devPort}...`);
      spawnedDevServer = await createServer({
        server: { port: CONFIG.devPort },
        logLevel: 'error',
      });
      await spawnedDevServer.listen();
      console.log(`✅ Embedded Vite running on http://localhost:${CONFIG.devPort}`);
    } catch {
      throw new Error(
        `Application server is not running on port ${CONFIG.devPort}. Please start your dev server first (e.g. npm run dev).`
      );
    }
  } else {
    console.log(`✅ Web application active on http://localhost:${CONFIG.devPort}`);
  }

  // 2. Start DeviceFrameServer
  let dfServer = null;
  const isDfRunning = await isPortOpen(CONFIG.deviceFramePort);
  if (!isDfRunning) {
    console.log(`📱 Launching DeviceFrame Pro server on port ${CONFIG.deviceFramePort}...`);
    dfServer = new DeviceFrameServer({
      port: CONFIG.deviceFramePort,
      targetUrl: `http://localhost:${CONFIG.devPort}`,
      autoOpen: false,
      screenshots: true,
    });
    await dfServer.start();
    console.log(`✅ DeviceFrame Pro ready on http://localhost:${CONFIG.deviceFramePort}`);
  } else {
    console.log(`✅ DeviceFrame Pro already running on http://localhost:${CONFIG.deviceFramePort}`);
  }

  // 3. Launch Headless Browser with Font Antialiasing & Color Profile Flags
  console.log('🌐 Launching headless browser for hardware framing...');
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
    width: 1400,
    height: 1200,
    deviceScaleFactor: CONFIG.deviceScaleFactor,
  });

  // Navigate to DeviceFrame host
  await page.goto(`http://localhost:${CONFIG.deviceFramePort}`, { waitUntil: 'networkidle2' });

  const targetDevice = DEVICE_MAP[CONFIG.deviceType] || DEVICE_MAP.iphone;
  console.log(`📱 Selecting frame profile: ${targetDevice.id} (style: ${targetDevice.style})...`);
  await page.evaluate((devId) => {
    if (typeof window.selectDevice === 'function') {
      window.selectDevice(devId);
    }
    if (typeof window.setZoom === 'function') {
      window.setZoom(1.0);
    }
  }, targetDevice.id);

  await sleep(1500);

  // Apply CSS & SVG styling based on device family
  if (targetDevice.style === 'galaxy') {
    await applyGalaxyStyling(page);
  } else if (targetDevice.style === 'pixel') {
    await applyPixelStyling(page);
  } else {
    await applyIPhoneStyling(page);
  }

  await sleep(1000);

  // Helper to access inner application iframe
  const getIframe = async () => {
    const iframeElement = await page.$('.device-screen');
    if (!iframeElement) throw new Error('.device-screen iframe element not found in DOM');
    const frame = await iframeElement.contentFrame();
    if (!frame) throw new Error('Could not access iframe contentFrame');
    return frame;
  };

  const captureBezel = async (filename, description) => {
    console.log(`📸 Capturing: ${description} -> ${filename}...`);
    const bezel = await page.$('.device-bezel');
    if (!bezel) throw new Error('.device-bezel element not found in DOM');
    const outPath = path.join(CONFIG.outputDir, filename);
    await bezel.screenshot({ path: outPath, type: 'png' });
    const stat = fs.statSync(outPath);
    console.log(`   ✓ Saved ${filename} (${Math.round(stat.size / 1024)} KB)`);
  };

  const initialFrame = await getIframe();

  // Wait for application font rendering & load
  await initialFrame.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
  });

  // Seed realistic multi-cycle shift data once
  await seedRealisticShiftLogState(initialFrame);
  await sleep(800);

  // ==========================================================================
  // SCREENS TO CAPTURE
  // ==========================================================================
  const screens = [
    {
      filename: '01-shifts-screen.png',
      description: 'Vista Turnos - Resumen del ciclo, progreso de meta y plantillas rápidas',
      prepare: async (f) => {
        await f.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('shifts');
          }
        });
      },
      waitMs: 1200,
    },
    {
      filename: '02-calendar-screen.png',
      description: 'Vista Calendario - Mapa mensual de intensidad horaria y multicategoría',
      prepare: async (f) => {
        await f.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('calendar');
          }
        });
      },
      action: async (f) => {
        // Select day 5 (which has 2 shifts in different categories: emerald + violet)
        await f.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const day5Btn = buttons.find((b) =>
            (b.getAttribute('aria-label') || '').startsWith('Día 5,')
          );
          if (day5Btn) day5Btn.click();
        });
      },
      waitMs: 1200,
    },
    {
      filename: '03-stats-screen.png',
      description: 'Vista Estadísticas - Evolución de 6 ciclos y comparativa Bruto vs. Neto',
      prepare: async (f) => {
        await f.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('stats');
          }
        });
      },
      waitMs: 1200,
    },
    {
      filename: '04-settings-screen.png',
      description: 'Vista Ajustes - Catálogo de eventos, reglas tarifarias y cierre de ciclo',
      prepare: async (f) => {
        await f.evaluate(() => {
          if (typeof window.__openShiftForm === 'function') {
            window.__openShiftForm(false);
          }
          if (typeof window.__setTab === 'function') {
            window.__setTab('settings');
          }
        });
      },
      waitMs: 1200,
    },
  ];

  // Capture loop
  for (let i = 0; i < screens.length; i++) {
    const s = screens[i];
    console.log(`\n--- [${i + 1}/${screens.length}] Preparing: ${s.description} ---`);

    const currentFrame = await getIframe();

    if (s.prepare) {
      await s.prepare(currentFrame);
    }
    await sleep(s.waitMs || 1500);

    if (s.action) {
      await s.action(currentFrame);
      await sleep(500);
    }

    await captureBezel(s.filename, s.description);
  }

  // ==========================================================================
  // Post-Execution Quality Verification Gate
  // ==========================================================================
  console.log('\n--- Quality Verification Gate ---');
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
    } else {
      console.log(`✅ ${s.filename} - ${Math.round(stat.size / 1024)} KB (Valid framed PNG)`);
    }
  }

  // Teardown
  console.log('\n🛑 Cleaning up background processes...');
  await browser.close();
  if (dfServer) await dfServer.stop();
  if (spawnedDevServer) await spawnedDevServer.close();
  if (fs.existsSync(path.resolve('screenshots'))) {
    fs.rmSync(path.resolve('screenshots'), { recursive: true, force: true });
  }

  if (allValid) {
    console.log(`\n🎉 All ${screens.length} device-framed screenshots generated in ${CONFIG.outputDir}!\n`);
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

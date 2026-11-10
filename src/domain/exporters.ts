import type { CycleAnalytics } from './analytics';
import {
  formatCurrency,
  formatDecimalEs,
  formatMinutes,
  formatNumericDateEs,
  formatPercentage,
  formatSignedCurrency,
  round2,
} from './formatters';
import { SHIFT_RATE_LABELS, type CycleWindow, type ShiftRecord } from './types';

function escapeCsvCell(value: string): string {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  if (clean.includes(';') || clean.includes('"')) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

export function generateCycleCsv(
  cycle: CycleWindow,
  shifts: ShiftRecord[],
  analytics: CycleAnalytics
): string {
  const BOM = '\uFEFF';
  const headers = [
    'Fecha',
    'Evento',
    'Entrada',
    'Salida',
    'Cruza medianoche',
    'Descanso (min)',
    'Horas computables',
    'Duración',
    'Tipo jornada',
    'Tarifa neta (€/h)',
    'Tarifa bruta (€/h)',
    'Multiplicador',
    'Plus fijo (€)',
    'Gasto o suplido (€)',
    'Total Neto (€)',
    'Total Bruto (€)',
    'Estado cobro',
    'Nota',
  ];

  const rows: string[] = [headers.join(';')];

  const sortedShifts = [...shifts].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  for (const s of sortedShifts) {
    const billableHoursDec = round2(s.computed.billableMinutes / 60);
    const row = [
      formatNumericDateEs(s.date),
      escapeCsvCell(s.snapshot.eventNameSnap),
      s.startTime,
      s.endTime,
      s.computed.crossesMidnight ? 'Sí' : 'No',
      String(s.breakMinutes),
      formatDecimalEs(billableHoursDec, 2),
      formatMinutes(s.computed.billableMinutes),
      SHIFT_RATE_LABELS[s.rateType],
      formatDecimalEs(s.snapshot.netRateSnap, 2),
      formatDecimalEs(s.snapshot.grossRateSnap, 2),
      formatDecimalEs(s.snapshot.multiplierSnap, 2),
      formatDecimalEs(s.fixedBonus, 2),
      formatDecimalEs(s.expenseAdjustment, 2),
      formatDecimalEs(s.computed.totalNetAmount, 2),
      formatDecimalEs(s.computed.totalGrossAmount, 2),
      s.paymentStatus === 'paid' ? 'Cobrado' : 'Pendiente',
      escapeCsvCell(s.note || ''),
    ];
    rows.push(row.join(';'));
  }

  rows.push('');
  rows.push(`Resumen del ciclo;${escapeCsvCell(cycle.label)}`);
  rows.push(`Periodo;${formatNumericDateEs(cycle.startDate)} a ${formatNumericDateEs(cycle.endDate)}`);
  rows.push(`Turnos registrados;${analytics.totalShifts}`);
  rows.push(`Tiempo total computable;${formatMinutes(analytics.totalBillableMinutes)}`);
  rows.push(`Total Neto (€);${formatDecimalEs(analytics.totalNetEarned, 2)}`);
  rows.push(`Total Bruto (€);${formatDecimalEs(analytics.totalGrossEarned, 2)}`);
  rows.push(`Importe Cobrado (€);${formatDecimalEs(analytics.paidNetAmount, 2)}`);
  rows.push(`Importe Pendiente (€);${formatDecimalEs(analytics.pendingNetAmount, 2)}`);

  return BOM + rows.join('\r\n');
}

export function generateCycleTxtReport(
  cycle: CycleWindow,
  shifts: ShiftRecord[],
  analytics: CycleAnalytics
): string {
  const lines: string[] = [];
  lines.push(`INFORME DE TURNOS - SHIFT LOG`);
  lines.push(`Ciclo: ${cycle.label} (${formatNumericDateEs(cycle.startDate)} al ${formatNumericDateEs(cycle.endDate)})`);
  lines.push(`--------------------------------------------------`);
  lines.push(`RESUMEN EJECUTIVO`);
  lines.push(`Total neto ganado:    ${formatCurrency(analytics.totalNetEarned)}`);
  lines.push(`Total bruto estimado: ${formatCurrency(analytics.totalGrossEarned)}`);
  lines.push(`Retención estimada:   ${formatCurrency(analytics.grossNetDifference)} (${formatPercentage(analytics.estimatedWithholdingPct)})`);
  lines.push(`Tiempo computable:    ${formatMinutes(analytics.totalBillableMinutes)} (${analytics.totalShifts} turnos)`);
  lines.push(`Cobrado:              ${formatCurrency(analytics.paidNetAmount)}`);
  lines.push(`Pendiente de cobro:   ${formatCurrency(analytics.pendingNetAmount)}`);

  if (analytics.categoryBreakdown.length > 0) {
    lines.push('');
    lines.push(`DESGLOSE POR CATEGORÍA`);
    for (const cat of analytics.categoryBreakdown) {
      lines.push(
        `- ${cat.eventName}: ${formatCurrency(cat.netAmount)} (${formatMinutes(cat.billableMinutes)}, ${formatPercentage(cat.percentageOfCycleNet)})`
      );
    }
  }

  lines.push('');
  lines.push(`DETALLE DE TURNOS`);
  if (shifts.length === 0) {
    lines.push(`Sin turnos registrados en este ciclo.`);
  } else {
    const sorted = [...shifts].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    });
    for (const s of sorted) {
      const statusLabel = s.paymentStatus === 'paid' ? 'Cobrado' : 'Pendiente';
      const extras: string[] = [];
      if (s.rateType !== 'normal') {
        extras.push(SHIFT_RATE_LABELS[s.rateType]);
      }
      if (s.fixedBonus !== 0) {
        extras.push(`plus ${formatSignedCurrency(s.fixedBonus)}`);
      }
      if (s.expenseAdjustment !== 0) {
        extras.push(`ajuste ${formatSignedCurrency(s.expenseAdjustment)}`);
      }
      const extraStr = extras.length > 0 ? ` [${extras.join(', ')}]` : '';
      const noteStr = s.note ? ` - Nota: ${s.note}` : '';
      lines.push(
        `${formatNumericDateEs(s.date)} | ${s.startTime}-${s.endTime} (${formatMinutes(s.computed.billableMinutes)}) | ${s.snapshot.eventNameSnap}${extraStr} | ${formatCurrency(s.computed.totalNetAmount)} (${statusLabel})${noteStr}`
      );
    }
  }

  return lines.join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

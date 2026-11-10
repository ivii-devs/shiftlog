import React from 'react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  formatCurrency,
  formatMinutes,
  formatNumericDateEs,
  formatPercentage,
} from '../../domain/formatters';
import { SHIFT_RATE_LABELS, type ShiftRecord } from '../../domain/types';

interface PrintableReportProps {
  analytics: CycleAnalytics;
  cycleShifts: ShiftRecord[];
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  analytics,
  cycleShifts,
}) => {
  const sortedShifts = [...cycleShifts].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="only-print hidden p-8 text-black">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">
          Shift Log - Informe de ciclo laboral
        </h1>
        <p className="font-mono tabular-nums mt-1 text-sm">
          Ciclo: {analytics.cycle.label} (
          {formatNumericDateEs(analytics.cycle.startDate)} a{' '}
          {formatNumericDateEs(analytics.cycle.endDate)})
        </p>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4 border-b pb-6">
        <div>
          <div className="text-xs font-medium">Total neto</div>
          <div className="font-mono tabular-nums text-lg font-bold">
            {formatCurrency(analytics.totalNetEarned)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium">Total bruto</div>
          <div className="font-mono tabular-nums text-lg font-bold">
            {formatCurrency(analytics.totalGrossEarned)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium">Horas computables</div>
          <div className="font-mono tabular-nums text-lg font-bold">
            {formatMinutes(analytics.totalBillableMinutes)} ({analytics.totalShifts}{' '}
            turnos)
          </div>
        </div>
        <div>
          <div className="text-xs font-medium">Cobrado / pendiente</div>
          <div className="font-mono tabular-nums text-sm font-semibold">
            {formatCurrency(analytics.paidNetAmount)} /{' '}
            {formatCurrency(analytics.pendingNetAmount)}
          </div>
        </div>
      </div>

      {analytics.categoryBreakdown.length > 0 && (
        <div className="mt-6">
          <h2 className="text-base font-bold">Desglose por evento</h2>
          <table className="mt-2 w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1.5">Evento</th>
                <th className="py-1.5">Turnos</th>
                <th className="py-1.5">Tiempo</th>
                <th className="py-1.5">Importe neto</th>
                <th className="py-1.5">% del ciclo</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {analytics.categoryBreakdown.map((c) => (
                <tr key={c.eventId} className="border-b">
                  <td className="py-1.5 font-sans font-medium">{c.eventName}</td>
                  <td className="py-1.5">{c.shiftsCount}</td>
                  <td className="py-1.5">{formatMinutes(c.billableMinutes)}</td>
                  <td className="py-1.5">{formatCurrency(c.netAmount)}</td>
                  <td className="py-1.5">
                    {formatPercentage(c.percentageOfCycleNet, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-base font-bold">Detalle de turnos del ciclo</h2>
        <table className="mt-2 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b">
              <th className="py-1.5">Fecha</th>
              <th className="py-1.5">Evento</th>
              <th className="py-1.5">Horario</th>
              <th className="py-1.5">Computable</th>
              <th className="py-1.5">Tipo</th>
              <th className="py-1.5">Neto</th>
              <th className="py-1.5">Bruto</th>
              <th className="py-1.5">Estado</th>
              <th className="py-1.5">Nota</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {sortedShifts.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-1.5">{formatNumericDateEs(s.date)}</td>
                <td className="py-1.5 font-sans">{s.snapshot.eventNameSnap}</td>
                <td className="py-1.5">
                  {s.startTime} - {s.endTime}
                </td>
                <td className="py-1.5">{formatMinutes(s.computed.billableMinutes)}</td>
                <td className="py-1.5 font-sans">{SHIFT_RATE_LABELS[s.rateType]}</td>
                <td className="py-1.5">{formatCurrency(s.computed.totalNetAmount)}</td>
                <td className="py-1.5">{formatCurrency(s.computed.totalGrossAmount)}</td>
                <td className="py-1.5 font-sans">
                  {s.paymentStatus === 'paid' ? 'Cobrado' : 'Pendiente'}
                </td>
                <td className="py-1.5 font-sans">{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

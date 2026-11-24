import React from 'react';
import { FileSpreadsheet, Printer, FileText, Copy } from 'lucide-react';
import type { CycleAnalytics } from '../../domain/analytics';
import {
  copyTextToClipboard,
  downloadFile,
  generateCycleCsv,
  generateCycleTxtReport,
} from '../../domain/exporters';
import type { ShiftRecord, WorkEvent } from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';

interface ExportReportsCardProps {
  analytics: CycleAnalytics;
  cycleShifts: ShiftRecord[];
  events?: WorkEvent[];
  selectedEventId?: string;
  onChangeEventId?: (eventId: string) => void;
}

export const ExportReportsCard: React.FC<ExportReportsCardProps> = ({
  analytics,
  cycleShifts,
  events = [],
  selectedEventId = 'all',
  onChangeEventId,
}) => {
  const showToast = useShiftStore((s) => s.showToast);

  const handleExportCsv = () => {
    const csv = generateCycleCsv(analytics.cycle, cycleShifts, analytics);
    downloadFile(
      csv,
      `shiftlog-informe-${analytics.cycle.id}.csv`,
      'text/csv;charset=utf-8'
    );
    showToast('Informe Excel (.csv) descargado');
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const txt = generateCycleTxtReport(analytics.cycle, cycleShifts, analytics);
    downloadFile(
      txt,
      `shiftlog-resumen-${analytics.cycle.id}.txt`,
      'text/plain;charset=utf-8'
    );
    showToast('Resumen en texto (.txt) descargado');
  };

  const handleCopyTxt = async () => {
    const txt = generateCycleTxtReport(analytics.cycle, cycleShifts, analytics);
    const ok = await copyTextToClipboard(txt);
    if (ok) {
      showToast('Resumen copiado al portapapeles');
    } else {
      showToast('No se pudo copiar al portapapeles', 'warning');
    }
  };

  return (
    <section
      aria-label="Exportación de informes del ciclo"
      className="rounded-lg border border-border bg-surface p-4"
    >
      <h2 className="text-base font-semibold tracking-tight text-text">
        Exportar informe del ciclo ({analytics.cycle.label})
      </h2>
      <p className="mt-0.5 text-xs text-text-secondary">
        Descarga el desglose completo o filtrado por categoría en hoja de cálculo Excel, documento PDF o texto plano.
      </p>

      {events.length > 0 && onChangeEventId && (
        <div className="mt-3">
          <label
            htmlFor="export-category-filter"
            className="block text-xs font-medium text-text-secondary"
          >
            Filtrar informe por categoría
          </label>
          <select
            id="export-category-filter"
            aria-label="Filtrar informe por categoría"
            value={selectedEventId}
            onChange={(e) => onChangeEventId(e.target.value)}
            className="mt-1.5 min-h-[44px] w-full rounded-md border border-border bg-surface-muted px-3 text-base text-text focus:border-border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <option value="all">Todas las categorías</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} {ev.archived ? '(Archivado)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <FileSpreadsheet className="h-4 w-4" strokeWidth={2} />
          <span>Exportar Excel (.csv)</span>
        </button>

        <button
          type="button"
          onClick={handleExportPdf}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-muted px-4 text-sm font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Printer className="h-4 w-4" strokeWidth={1.75} />
          <span>Exportar PDF / Imprimir</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadTxt}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <FileText className="h-4 w-4" strokeWidth={1.75} />
          <span>Descargar resumen (.txt)</span>
        </button>

        <button
          type="button"
          onClick={handleCopyTxt}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-md border border-border bg-surface-muted px-4 text-sm font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Copy className="h-4 w-4" strokeWidth={1.75} />
          <span>Copiar resumen al portapapeles</span>
        </button>
      </div>
    </section>
  );
};

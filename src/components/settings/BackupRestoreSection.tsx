import React, { useRef, useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { buildBackupDatabase, validateBackupJson } from '../../domain/backup';
import { downloadFile } from '../../domain/exporters';
import { getTodayIsoLocal } from '../../domain/formatters';
import type { ShiftLogDatabase } from '../../domain/types';
import { useShiftStore } from '../../store/useShiftStore';

function readFileText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

export const BackupRestoreSection: React.FC = () => {
  const events = useShiftStore((s) => s.events);
  const shifts = useShiftStore((s) => s.shifts);
  const settings = useShiftStore((s) => s.settings);
  const importDatabase = useShiftStore((s) => s.importDatabase);
  const showToast = useShiftStore((s) => s.showToast);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<ShiftLogDatabase | null>(null);

  const handleExportJson = () => {
    const db = buildBackupDatabase({ events, shifts, settings });
    const jsonString = JSON.stringify(db, null, 2);
    const filename = `shiftlog-backup-${getTodayIsoLocal()}.json`;
    downloadFile(jsonString, filename, 'application/json;charset=utf-8');
    showToast('Copia de seguridad descargada');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setPendingBackup(null);

    try {
      const text = await readFileText(file);
      const validation = validateBackupJson(text);
      if (!validation.ok) {
        setImportError(validation.error);
      } else {
        setPendingBackup(validation.data);
      }
    } catch {
      setImportError('No se pudo leer el archivo seleccionado.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyImport = (mode: 'replace' | 'merge') => {
    if (!pendingBackup) return;
    importDatabase(pendingBackup, mode);
    setPendingBackup(null);
    showToast(
      mode === 'replace'
        ? 'Base de datos reemplazada correctamente'
        : 'Registros combinados correctamente'
    );
  };

  return (
    <section className="rounded-lg border border-border bg-surface p-4">
      <h2 className="text-base font-semibold tracking-tight text-text">
        Copia de seguridad y soberanía de datos (.json)
      </h2>
      <p className="mt-1 text-sm text-text-secondary">
        Tus datos se almacenan exclusivamente en este dispositivo. Exporta una copia periódica o restaura tus registros cuando cambies de teléfono.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleExportJson}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          <span>Exportar copia (.json)</span>
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-border-strong bg-surface-muted px-4 text-sm font-medium text-text transition-transform duration-150 hover:bg-selected active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Upload className="h-4 w-4" strokeWidth={1.75} />
          <span>Importar archivo (.json)</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          aria-label="Seleccionar archivo JSON de copia de seguridad"
          onChange={handleFileChange}
          className="sr-only"
        />
      </div>

      {importError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-md border border-danger-line bg-danger-quiet p-3.5 text-sm text-red-500"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          <div>
            <div className="font-semibold text-text">
              Importación bloqueada por formato inválido
            </div>
            <div className="mt-0.5 text-red-500">{importError}</div>
            <div className="mt-1 text-xs text-text-secondary">
              Tus datos actuales no han sufrido ningún cambio.
            </div>
          </div>
        </div>
      )}

      {pendingBackup && (
        <div className="mt-4 rounded-md border border-success-line bg-success-quiet p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} />
            <span>Archivo de copia de seguridad verificado</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Contiene{' '}
            <span className="font-mono tabular-nums font-semibold text-text">
              {pendingBackup.events.length}
            </span>{' '}
            eventos y{' '}
            <span className="font-mono tabular-nums font-semibold text-text">
              {pendingBackup.shifts.length}
            </span>{' '}
            turnos. Elige cómo deseas aplicar la restauración:
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => handleApplyImport('merge')}
              className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md bg-action px-3 text-sm font-semibold text-action-ink transition-transform duration-150 hover:bg-action-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Combinar registros
            </button>
            <button
              type="button"
              onClick={() => handleApplyImport('replace')}
              className="inline-flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-md border border-danger-line bg-danger-quiet px-3 text-sm font-medium text-red-500 transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Reemplazar toda la base de datos
            </button>
            <button
              type="button"
              onClick={() => setPendingBackup(null)}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-text-secondary transition-transform duration-150 hover:text-text active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

# Desglose de Tareas: Feature 02 (Metas por Mes, Agenda en Calendario, Estadísticas y Orden de Vistas)

Este documento divide la implementación definida en [`spec.md`](file:///c:/.d/shiftlog/docs/specs/02-goals-calendar-stats-redesign/spec.md) y [`plan.md`](file:///c:/.d/shiftlog/docs/specs/02-goals-calendar-stats-redesign/plan.md) en unidades de trabajo pequeñas, secuenciales y verificables.

---

## Bloque 1: Dominio, Metas por Mes, Retirada de Cobros y Persistencia

### [x] `T-01`: Modelo de datos, metas por ciclo, retirada de `paymentStatus`, Backup JSON y Store
- **Objetivo:** Soportar metas personalizadas por ciclo (`YYYY-MM`) con herencia desde la meta base, retirar `paymentStatus` del modelo y del store garantizando migración transparente sin pérdida de datos desde `localStorage` y copias JSON previas, y evitar reiniciar el ciclo activo al guardar metas.
- **Archivos implicados:**
  - `src/domain/types.ts`
  - `src/domain/cycles.ts`
  - `src/domain/backup.ts`
  - `src/domain/exporters.ts`
  - `src/store/useShiftStore.ts`
  - `src/domain/__tests__/backup.test.ts`
  - `src/domain/__tests__/store.test.ts`
- **Criterios de aceptación relacionados:** `AC01`, `AC02`, `AC03`, `AC04`, `AC12`.
- **Definición de hecho (DoD):**
  - `PaymentStatus` y `paymentStatus` retirados de `ShiftRecord`, payloads y acciones del store; hidratación en `useShiftStore` limpia silenciosamente campos legados de `localStorage` sin perder eventos ni turnos.
  - `MonthlyGoalConfig` y `monthlyGoalOverrides` definidos en `AppSettings`, y `resolveCycleGoals(settings, cycle)` resuelve overrides explícitos (`null` incluido) o hereda la meta base.
  - `validateBackupJson` y `mergeDatabases` aceptan tanto backups antiguos (con `paymentStatus` y sin `monthlyGoalOverrides`) como backups nuevos, rechazando estructuras inválidas.
  - `generateCycleCsv` y `generateCycleTxtReport` omiten estado de cobro e incluyen `Tarifa media neta (€/h)` en el resumen.
  - `setCycleGoalOverride` y `clearCycleGoalOverride` funcionan en `useShiftStore` y `updateSettings` no reinicia `activeCycleAnchor` cuando solo se editan metas.
  - Pruebas unitarias en `backup.test.ts` y `store.test.ts` actualizadas y pasando.

### [x] `T-02`: Motor analítico del mes actual, series diaria/semanal, predicciones y simulador
- **Objetivo:** Retirar las métricas de cobrado/pendiente de `CycleAnalytics` y ampliar `computeCycleAnalytics` con métricas de actividad diaria, series diaria y semanal del ciclo, proyección automática de cierre y función pura para el simulador rápido.
- **Archivos implicados:**
  - `src/domain/cycles.ts`
  - `src/domain/analytics.ts`
  - `src/domain/__tests__/cycles-analytics.test.ts`
- **Criterios de aceptación relacionados:** `AC01`, `AC02`, `AC04`, `AC08`, `AC09`, `AC10`.
- **Definición de hecho (DoD):**
  - Eliminados `paidNetAmount`, `pendingNetAmount`, `paidShiftsCount`, `pendingShiftsCount` y `allPaid` de `CycleAnalytics`.
  - `computeCycleAnalytics` calcula metas del ciclo mediante `resolveCycleGoals`.
  - Calcula `workedDaysCount`, `freeDaysCount`, `avgMinutesPerWorkedDay`, `avgNetPerWorkedDay`, `avgNetPerShift` y `avgMinutesPerShift`.
  - Genera `dailySeries` (todos los días del ciclo) y `weeklySeries` (Semanas 1 a 4/5 del ciclo).
  - Calcula `predictions` distinguiendo ciclos en curso, pasados y futuros, contabilizando turnos futuros ya agendados y calculando el ritmo necesario por día/semana y turnos equivalentes para cumplir las metas.
  - `simulateExtraWork` calcula con precisión el impacto de horas o turnos extra sobre los totales y metas del ciclo.
  - Pruebas unitarias deterministas en `cycles-analytics.test.ts` cubriendo metas por mes, series diaria/semanal, predicciones y simulador pasando al 100 %.

---

## Bloque 2: Pestañas Turnos y Calendario

### [x] `T-03`: Reorganización de Turnos, limpieza de cobros y hoja rápida de meta mensual
- **Objetivo:** Dejar la pestaña `Turnos` limpia y compacta eliminando el bloque «Cobrado / Pendiente», el botón duplicado «Registrar turno» y todos los controles de estado de cobro en filas, filtros y formulario, añadiendo la hoja inferior para personalizar la meta del ciclo activo.
- **Archivos implicados:**
  - `src/components/shifts/CycleSummaryHero.tsx`
  - `src/components/shifts/CycleGoalSheet.tsx`
  - `src/components/shifts/ShiftList.tsx`
  - `src/components/shifts/ShiftRow.tsx`
  - `src/components/shifts/ShiftFormSheet.tsx`
- **Criterios de aceptación relacionados:** `AC01`, `AC02`, `AC03`, `AC04`, `AC12`.
- **Definición de hecho (DoD):**
  - `CycleSummaryHero` no muestra el bloque «Cobrado / Pendiente» ni duplica el botón «Registrar turno» ya presente en `AppShell`.
  - Muestra claramente si la meta activa es «Personalizada» o «Meta base», e incluye botón `>= 44x44px` para editar la meta del mes activo (o configurarla si no hay ninguna).
  - `CycleGoalSheet` permite guardar valores personalizados para el mes activo, desactivar la meta solo para ese mes o restablecer a la meta base por defecto.
  - `ShiftList` elimina el selector `Todos / Pendientes / Cobrados`, `ShiftRow` elimina el botón `Cobrado`/`Pendiente` y `ShiftFormSheet` elimina el campo «Estado de cobro».

### [x] `T-04`: Rediseño de Calendario con barra rápida y lista descendente de días trabajados
- **Objetivo:** Mostrar debajo de la cuadrícula del calendario una barra rápida para el día seleccionado y el listado completo de todos los días trabajados del mes visible en orden cronológico descendente.
- **Archivos implicados:**
  - `src/components/calendar/CalendarView.tsx`
  - `src/components/calendar/DayShiftsPanel.tsx`
- **Criterios de aceptación relacionados:** `AC05`, `AC06`, `AC12`.
- **Definición de hecho (DoD):**
  - Al pulsar cualquier día del calendario, la barra rápida superior muestra esa fecha, su resumen y el botón «Añadir turno en este día» (aunque el día no tenga turnos).
  - Debajo aparece el resumen del mes visible (días trabajados, tiempo y neto total) y todas las tarjetas de días trabajados de ese mes ordenadas de más reciente a más antiguo.
  - La tarjeta del día correspondiente a `selectedDate` se destaca visualmente cuando tiene registros, y cada fila permite editar, clonar, repetir o eliminar el turno.
  - Si el mes visible no tiene ningún turno registrado, se muestra un `EmptyState` accionable.

---

## Bloque 3: Pestañas Estadísticas y Ajustes

### [x] `T-05`: Sub-vista «Mes actual» y gráfico diario/semanal en Estadísticas
- **Objetivo:** Reorganizar `StatsView` con un selector segmentado de 3 sub-vistas (`Mes actual`, `Predicciones`, `Historial`) e implementar los nuevos bloques del mes actual.
- **Archivos implicados:**
  - `src/components/stats/StatsView.tsx`
  - `src/components/stats/MonthActivityCard.tsx`
  - `src/components/stats/CycleTimelineChart.tsx`
- **Criterios de aceptación relacionados:** `AC07`, `AC08`, `AC12`.
- **Definición de hecho (DoD):**
  - `StatsView` presenta un selector segmentado accesible (`>= 44px` de alto) con las 3 sub-vistas: `Mes actual`, `Predicciones` e `Historial`, sin incluir `ExportReportsCard`.
  - `MonthActivityCard` muestra días trabajados frente a libres, media por día trabajado, neto medio por turno y tarifa media neta real en `font-mono tabular-nums`.
  - `CycleTimelineChart` permite alternar entre `Por días` / `Por semanas` y entre `Horas` / `Neto (€)` usando únicamente tokens semánticos de `DESIGN.md`.
  - La sub-vista `Historial` muestra `SixCyclesChart`.

### [x] `T-06`: Sub-vista «Predicciones» con proyección de cierre y simulador rápido
- **Objetivo:** Implementar la sub-vista `Predicciones` con el cierre estimado del ciclo, el ritmo requerido para las metas del mes y el simulador interactivo de horas o turnos extra.
- **Archivos implicados:**
  - `src/components/stats/PredictionsView.tsx`
  - `src/components/stats/StatsView.tsx`
- **Criterios de aceptación relacionados:** `AC07`, `AC09`, `AC10`, `AC12`.
- **Definición de hecho (DoD):**
  - Muestra lo devengado hasta hoy, los turnos futuros ya agendados en el ciclo (si existen) y el total proyectado al cierre.
  - Calcula y muestra el ritmo necesario por día restante, por semana restante y en turnos equivalentes para cumplir las metas del ciclo.
  - El simulador permite elegir modo (`Horas extra` / `Turnos extra`), cantidad y referencia de tarifa (`Tarifa media actual` o cualquier evento activo con selector de multiplicador `Normal`/`Festivo`/`Nocturno`/`Hora extra`), actualizando en vivo las cifras y porcentajes de meta proyectados.

### [x] `T-07`: Reorganización de Ajustes en 3 sub-vistas, gestor mensual de metas e informes limpios
- **Objetivo:** Ordenar `SettingsView` con un selector segmentado (`Eventos`, `Ciclo y metas`, `Informes y datos`), añadir el gestor de metas por mes, trasladar `ExportReportsCard` y limpiar las referencias a estado de cobro en informes e impresión PDF.
- **Archivos implicados:**
  - `src/components/settings/SettingsView.tsx`
  - `src/components/stats/ExportReportsCard.tsx`
  - `src/components/stats/PrintableReport.tsx`
  - `src/App.tsx`
- **Criterios de aceptación relacionados:** `AC01`, `AC02`, `AC04`, `AC11`, `AC12`.
- **Definición de hecho (DoD):**
  - `SettingsView` organiza el contenido en 3 sub-vistas limpias: `Eventos` (`EventsManagerSection`), `Ciclo y metas` (día de inicio, meta base y selector/lista de metas personalizadas por mes) e `Informes y datos` (`ExportReportsCard` + `BackupRestoreSection`).
  - En `Ciclo y metas`, el usuario puede navegar mes a mes (ej. noviembre, diciembre, enero), definir metas propias, desactivar la meta en un mes o restablecerla a la meta base, además de ver un resumen de meses personalizados.
  - `ExportReportsCard` conserva el filtro por categoría y elimina el filtro por estado de cobro; `PrintableReport` muestra `Tarifa media neta (€/h)` en lugar de `Cobrado / pendiente` y elimina la columna `Estado`.
  - `App.tsx` pasa los filtros y métricas de exportación a `SettingsView` manteniendo el funcionamiento íntegro de CSV, TXT, portapapeles e impresión PDF.

---

## Bloque 4: Validación Integral y Auditoría Final

### [x] `T-08`: Pruebas de integración UI, verificación de criterios y auditoría de diseño
- **Objetivo:** Actualizar y ampliar los tests de UI y dominio, comprobar el build de producción y auditar el cumplimiento de `AC01`-`AC12` y las 5 capas de `pwa-frontend-design`.
- **Archivos implicados:**
  - `src/domain/__tests__/app-ui.test.tsx`
  - Todos los módulos modificados en `src/`
- **Criterios de aceptación relacionados:** `AC01` a `AC12`.
- **Definición de hecho (DoD):**
  - `app-ui.test.tsx` verifica la ausencia de «Cobrado / Pendiente», la edición de metas personalizadas por mes, la nueva lista descendente del calendario, las 3 sub-vistas de `Estadísticas` (incluyendo gráfico diario/semanal y simulador) y las 3 sub-vistas de `Ajustes` (incluyendo la exportación movida a `Informes y datos`).
  - `npm test` pasa el 100 % de las pruebas sin errores ni omisiones.
  - `npm run build` compila limpio sin errores de TypeScript ni CSS.
  - Auditoría Anti-AI-Slop verificada: cero clases `dark:`, cero gradientes decorativos, cero emojis en la interfaz, *sentence case* estricto sin rayas largas, `font-mono tabular-nums` en todas las cifras y áreas táctiles `>= 44x44px`.

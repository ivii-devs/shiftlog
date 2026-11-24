# Plan de Implementación: Metas por Mes, Agenda en Calendario, Estadísticas del Ciclo y Reorganización de Vistas (Feature 02)

Este documento describe el **cómo** técnico para implementar los requisitos definidos en [`spec.md`](file:///c:/.d/shiftlog/docs/specs/02-goals-calendar-stats-redesign/spec.md), respetando los principios de [`docs/constitution.md`](file:///c:/.d/shiftlog/docs/constitution.md), las convenciones de [`agents.md`](file:///c:/.d/shiftlog/agents.md) y el sistema de diseño de [`DESIGN.md`](file:///c:/.d/shiftlog/DESIGN.md).

---

## 1. Decisiones Arquitectónicas (KISS y YAGNI)

| Dimensión | Decisión Técnica | Justificación KISS / YAGNI |
|---|---|---|
| **Clave de metas por mes** | Cadena `YYYY-MM` (`anchorYear` + `anchorMonth` de `CycleWindow`) | Permanece estable aunque el usuario cambie `cycleStartDay` entre `1` y `28`, evitando migrar o perder metas ya configuradas. |
| **Herencia de metas** | Meta base (`monthlyGoalNetEuros` / `monthlyGoalHours`) + diccionario opcional `monthlyGoalOverrides` | Mantiene retrocompatibilidad con `ShiftLogDatabase` v1 y permite tanto heredar la base como desactivar la meta en un mes concreto guardando `null`. |
| **Retirada de `paymentStatus`** | Eliminación del tipo `PaymentStatus` y del campo en `ShiftRecord`, con saneamiento silencioso al hidratar `localStorage` y validar backups JSON antiguos | Reduce complejidad y ruido visual en toda la app sin provocar incompatibilidades ni pérdida de datos en dispositivos con registros previos. |
| **Gráficos del mes** | Componentes ligeros en React + Tailwind CSS con tokens de `DESIGN.md` | Cero dependencias externas nuevas; alineación exacta con `JetBrains Mono` (`tabular-nums`) y rendimiento instantáneo en móvil. |
| **Navegación interna** | Controles segmentados locales en `StatsView` y `SettingsView` manteniendo las 4 pestañas principales en `BottomNav` | Evita sobrecargar la barra inferior en móvil (`<= 4` pestañas) y separa responsabilidades con claridad. |
| **Simulador** | Estado local efímero en `PredictionsView` apoyado en función pura `simulateExtraWork` | Permite probar escenarios al instante sin ensuciar el store ni persistir datos ficticios. |

---

## 2. Cambios en el Modelo de Datos (`src/domain/types.ts`)

1. Se elimina `PaymentStatus` y la propiedad `paymentStatus` de `ShiftRecord`.
2. Se añade la interfaz de configuración de meta por ciclo y se amplía `AppSettings` de forma compatible con copias anteriores:

```typescript
export interface MonthlyGoalConfig {
  netEuros: number | null;
  hours: number | null;
}

export interface AppSettings {
  cycleStartDay: number;
  monthlyGoalNetEuros: number | null;
  monthlyGoalHours: number | null;
  monthlyGoalOverrides?: Record<string, MonthlyGoalConfig>;
}
```

---

## 3. Cambios en la Capa de Dominio (`src/domain/`)

### 3.1. `src/domain/cycles.ts`
- Añadir `getCycleGoalKey(cycle: Pick<CycleWindow, 'anchorYear' | 'anchorMonth'>): string` y `formatYearMonthKey(year: number, monthIndexZeroBased: number): string` para obtener la clave `YYYY-MM`.
- Añadir `resolveCycleGoals(settings: AppSettings, cycle: Pick<CycleWindow, 'anchorYear' | 'anchorMonth'>): { netEuros: number | null; hours: number | null; isCustomOverride: boolean; key: string }`.
- Añadir utilidades puras de calendario de ciclo para enumerar las fechas `YYYY-MM-DD` dentro de `[cycle.startDate, cycle.endDate]` y calcular la diferencia en días naturales entre dos fechas ISO locales.

### 3.2. `src/domain/analytics.ts`
- Eliminar de `CycleAnalytics` los campos obsoletos de estado de cobro (`paidNetAmount`, `pendingNetAmount`, `paidShiftsCount`, `pendingShiftsCount`, `allPaid`).
- Ampliar `CycleAnalytics` añadiendo:
  - `isCustomGoalOverride: boolean`
  - `goalKey: string`
  - `cycleDaysTotal: number`
  - `workedDaysCount: number`
  - `freeDaysCount: number`
  - `avgMinutesPerWorkedDay: number`
  - `avgNetPerWorkedDay: number`
  - `avgNetPerShift: number`
  - `avgMinutesPerShift: number`
  - `dailySeries: DailyCyclePoint[]` (`date`, `dayLabel`, `dayNumber`, `totalMinutes`, `totalNetEarned`, `shiftsCount`, `isToday`)
  - `weeklySeries: WeeklyCycleBarItem[]` (`weekIndex`, `label`, `rangeLabel`, `startDate`, `endDate`, `totalMinutes`, `totalNetEarned`, `shiftsCount`)
  - `predictions: CyclePredictions`:
    - `cyclePhase: 'past' | 'current' | 'future'`
    - `elapsedDays: number`
    - `remainingDays: number`
    - `earnedToDateNet: number`
    - `workedToDateMinutes: number`
    - `scheduledFutureNet: number`
    - `scheduledFutureMinutes: number`
    - `scheduledFutureShiftsCount: number`
    - `projectedTotalNet: number`
    - `projectedTotalMinutes: number`
    - `requiredNetPerRemainingDay: number`
    - `requiredNetPerRemainingWeek: number`
    - `requiredMinutesPerRemainingDay: number`
    - `requiredMinutesPerRemainingWeek: number`
    - `estimatedShiftsNeededForNetGoal: number | null`
    - `estimatedShiftsNeededForHoursGoal: number | null`
- Exportar `simulateExtraWork(params)` como función pura que recibe `analytics`, `mode: 'hours' | 'shifts'`, `quantity`, `hourlyNetRate` y `hoursPerShift`, devolviendo `{ addedMinutes, addedNet, totalNet, totalMinutes, netGoalPct, hoursGoalPct }`.
- Nota de testabilidad: `computeCycleAnalytics` acepta `referenceDate?: string` opcional (por defecto `getTodayIsoLocal()`) para que las pruebas unitarias de predicciones sean 100 % deterministas.

### 3.3. `src/domain/backup.ts`
- En `validateBackupJson`:
  - Dejar de exigir `paymentStatus` en cada turno y sanitizar los turnos omitiendo cualquier propiedad legada `paymentStatus` al construir el array `shifts` validado (garantizando compatibilidad total con backups anteriores y nuevos).
  - Si `rawSettings.monthlyGoalOverrides` está presente, validar que sea un objeto plano cuyas claves cumplan `/^\d{4}-(0[1-9]|1[0-2])$/` y cuyos valores tengan `netEuros` (`number > 0` o `null`) y `hours` (`number > 0` o `null`). Si no está presente (backups previos), normalizar a `{}`.
- En `mergeDatabases`:
  - Fusionar `monthlyGoalOverrides` manteniendo las claves existentes del estado actual y añadiendo las claves de `incoming` que no existieran en `current`.

### 3.4. `src/domain/exporters.ts`
- En `generateCycleCsv`:
  - Eliminar la columna `Estado cobro` y las filas resumen `Importe Cobrado (€)` e `Importe Pendiente (€)`.
  - Añadir en el resumen `Tarifa media neta (€/h)`.
- En `generateCycleTxtReport`:
  - Eliminar las líneas `Cobrado` y `Pendiente de cobro` del resumen y el sufijo `(Cobrado)`/`(Pendiente)` de cada turno.
  - Mostrar `Tarifa media neta` (`€/h`) en el resumen ejecutivo.

---

## 4. Cambios en el Store (`src/store/useShiftStore.ts`)

- Eliminar `toggleShiftPaymentStatus`, `setCyclePaymentStatus` y `paymentStatus` de `CreateShiftPayload` y `UpdateShiftPayload`.
- Inicializar `DEFAULT_SETTINGS.monthlyGoalOverrides = {}`.
- Añadir saneamiento ligero en la fusión/hidratación de `persist` (`merge`) para limpiar silenciosamente cualquier campo legado `paymentStatus` en turnos existentes de `localStorage` y asegurar `monthlyGoalOverrides: {}` por defecto, preservando todos los eventos y turnos sin pérdida de datos.
- Añadir acciones:
  - `setCycleGoalOverride(cycleKey: string, goal: MonthlyGoalConfig): void`: guarda la meta personalizada para ese `YYYY-MM` sanitizando valores `<= 0` a `null`.
  - `clearCycleGoalOverride(cycleKey: string): void`: elimina la clave `cycleKey` de `monthlyGoalOverrides` para volver a heredar la meta base.
- Corregir `updateSettings(partial)`:
  - Solo recalcular `activeCycleAnchor` cuando `partial.cycleStartDay !== undefined && partial.cycleStartDay !== state.settings.cycleStartDay`. Al actualizar metas base u overrides, preservar el `activeCycleAnchor` actual.

---

## 5. Arquitectura de Componentes (`src/components/`)

### 5.1. Pestaña `Turnos` (`src/components/shifts/`)
- `CycleSummaryHero.tsx`:
  - Eliminar el bloque «Cobrado vs. Pendiente», el botón masivo «Marcar todo el ciclo como cobrado» y el botón «Registrar turno» duplicado en la esquina superior derecha (se conserva el botón principal de la cabecera en `AppShell.tsx`).
  - Añadir un botón compacto junto al bloque de metas (o un acceso «Configurar meta del mes» si no hay meta activa) que abre `CycleGoalSheet` indicando si el mes usa «Meta base» o «Personalizada».
- `CycleGoalSheet.tsx` (nuevo):
  - Hoja inferior (`BottomSheet`) para editar los objetivos (`€ netos` y `horas`) del ciclo activo (`analytics.cycle.label`), con botones para:
    - Guardar meta personalizada para este mes.
    - Dejar este mes sin meta (override explícito a `null` si existe meta base).
    - Restablecer a la meta base por defecto (si actualmente tiene override).
- `ShiftList.tsx`:
  - Eliminar el filtro segmentado `Todos / Pendientes / Cobrados`, manteniendo el buscador por nota/evento y el selector de categoría.
- `ShiftRow.tsx`:
  - Eliminar el botón individual `Cobrado`/`Pendiente`, conservando las acciones rápidas (clonar hoy, duplicar, repetir en varios días, editar, eliminar).
- `ShiftFormSheet.tsx`:
  - Eliminar el campo selector «Estado de cobro».

### 5.2. Pestaña `Calendario` (`src/components/calendar/`)
- `CalendarView.tsx`:
  - Mantener la cuadrícula mensual de lunes a domingo con selección de día (`selectedDate`), puntos de categorías e intensidad por horas.
  - Calcular la lista de días trabajados dentro del mes natural visible (`calYear`, `calMonth`) ordenada de forma **cronológica descendente** (`b.date.localeCompare(a.date)`), junto con el resumen total del mes visible (días trabajados, tiempo total y neto total).
- `DayShiftsPanel.tsx` (actualizado):
  - Mostrar arriba una barra rápida del día seleccionado (`selectedDate`) con resumen del día y botón «Añadir turno en este día».
  - Mostrar debajo el listado completo de todos los días trabajados del mes visible en orden descendente, cada uno en su tarjeta con fecha, total de horas y neto del día, resaltado si coincide con `selectedDate`, y sus `ShiftRow` editables/repetibles. Si el mes visible no tiene ningún turno registrado, mostrar un `EmptyState` claro con acción para añadir un turno en `selectedDate`.

### 5.3. Pestaña `Estadísticas` (`src/components/stats/`)
- `StatsView.tsx`:
  - Selector segmentado superior con 3 sub-vistas (`Mes actual`, `Predicciones`, `Historial`), con área táctil `>= 44px` y estado accesible `aria-selected` / `role="tablist"`.
  - Eliminar `ExportReportsCard` de `StatsView`.
- Sub-vista **Mes actual**:
  - `MonthActivityCard.tsx` (nuevo): rejilla de 4 métricas clave (`Días trabajados / libres`, `Media por día trabajado`, `Neto medio por turno`, `Tarifa media real €/h`).
  - `CycleTimelineChart.tsx` (nuevo): gráfico de barras del ciclo activo con dos selectores segmentados compactos: agrupación (`Por días` / `Por semanas`) y métrica (`Horas` / `Neto €`). En vista diaria se habilita desplazamiento horizontal limpio manteniendo legibilidad tabular; en vista semanal se muestran `Sem 1`..`Sem 4/5` en rejilla completa.
  - `CategoryBreakdown.tsx` y `GrossVsNetCard.tsx`.
- Sub-vista **Predicciones**:
  - `PredictionsView.tsx` (nuevo):
    - Tarjeta de **Proyección al cierre del ciclo**: muestra fase del ciclo (`En curso`, `Cerrado` o `Próximo`), días transcurridos y restantes, devengado hasta hoy, turnos ya agendados en días futuros del ciclo y cierre estimado (`€` y `horas`).
    - Tarjeta de **Ritmo necesario para metas**: desglosa lo que falta por día restante, por semana restante y turnos equivalentes para cumplir la meta neta y la meta de horas del mes (o confirma si ya están cumplidas).
    - Tarjeta de **Simulador rápido**: selector de modo (`Horas extra` / `Turnos extra`), selector de tarifa (`Tarifa media actual` o cada evento activo + tipo de jornada `Normal`/`Festivo`/`Nocturno`/`Hora extra`), inputs numéricos táctiles y resultado en tiempo real (incremento, nuevo total proyectado y nuevas barras de progreso de meta).
- Sub-vista **Historial**:
  - `SixCyclesChart.tsx`.
- `PrintableReport.tsx`:
  - Sustituir el bloque resumen «Cobrado / pendiente» por «Tarifa media neta» (`€/h`) y retirar la columna «Estado» de la tabla de turnos.

### 5.4. Pestaña `Ajustes` (`src/components/settings/` y `src/App.tsx`)
- `SettingsView.tsx`:
  - Selector segmentado superior con 3 sub-vistas: `Eventos`, `Ciclo y metas`, `Informes y datos`.
  - En `Eventos`: `EventsManagerSection`.
  - En `Ciclo y metas`:
    1. Día de inicio de ciclo laboral (`1..28`).
    2. Formulario de **Meta base por defecto** (`monthlyGoalNetEuros` y `monthlyGoalHours`).
    3. Gestor de **Metas personalizadas por mes**: selector de mes (`<` / `>`) para editar cualquier mes concreto (noviembre, diciembre, enero, etc.), opción de dejar ese mes sin meta o volver a la meta base, y lista resumida de meses que actualmente tienen meta personalizada con acceso rápido para editarlos o restablecerlos.
  - En `Informes y datos`: `ExportReportsCard` (movido desde `StatsView`, conservando el filtro por categoría y eliminando el filtro por estado de cobro) + `BackupRestoreSection`.
- `App.tsx`:
  - Eliminar `exportPaymentFilter` y pasar `exportAnalytics`, `exportShifts`, `events`, `exportEventId` y `onChangeEventId` a `SettingsView` en lugar de `StatsView`, manteniendo `PrintableReport` intacto.

---

## 6. Cumplimiento de `pwa-frontend-design` y `DESIGN.md`

- Todos los nuevos componentes usarán exclusivamente tokens semánticos (`bg-background`, `bg-surface`, `bg-surface-muted`, `border-border`, `text-text`, `text-text-secondary`, `bg-action`, `text-action-ink`, `bg-selected`, `ring-focus`) sin modificadores `dark:` ni colores arbitrarios.
- Todas las cifras (euros, horas, días, porcentajes, ejes y fechas numéricas) usarán `font-mono tabular-nums`.
- Botones, tabs segmentadas y controles de formulario garantizarán un tamaño mínimo de `44x44px` (`min-h-[44px] min-w-[44px]`) e inputs numéricos con `text-base` (`16px`).
- Cero gradientes decorativos, cero tarjetas anidadas con sombra o glassmorphism, cero emojis en la interfaz y textos en español con *sentence case* estricto sin rayas largas.

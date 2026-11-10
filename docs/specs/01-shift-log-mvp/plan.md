# Plan de Implementación: Shift Log (Feature 01 / MVP)

Este documento define el **cómo** técnico para construir el MVP de **Shift Log** a partir de los requisitos establecidos en [`spec.md`](file:///c:/.d/shiftlog/docs/specs/01-shift-log-mvp/spec.md), respetando los principios de [`docs/constitution.md`](file:///c:/.d/shiftlog/docs/constitution.md), las convenciones de [`agents.md`](file:///c:/.d/shiftlog/agents.md) y el sistema de diseño de [`DESIGN.md`](file:///c:/.d/shiftlog/DESIGN.md).

---

## 1. Decisiones Arquitectónicas (KISS y YAGNI)

| Dimensión | Decisión Técnica | Justificación KISS / YAGNI |
|---|---|---|
| **Framework y Build** | **React 19 + TypeScript + Vite** | Arranque instantáneo, tipado estricto extremo a extremo y configuración mínima sin SSR ni servidor innecesario. |
| **PWA y Offline** | **`vite-plugin-pwa`** (Manifest + Service Worker auto-actualizable) | Permite instalar la app en pantalla de inicio en iOS/Android con modo `standalone` y funcionamiento 100 % sin red. |
| **Estilos y Tokens** | **Tailwind CSS v4** + Variables CSS semánticas en `src/index.css` | Mapeo directo de los roles de `DESIGN.md` (`bg-background`, `bg-surface`, `bg-action`, etc.) sin clases `dark:` ni valores mágicos. |
| ** Estado y Persistencia** | **Zustand** con middleware `persist` (`localStorage`, clave `shiftlog-db-v1`) | Cero boilerplate, lectura síncrona inmediata, fácil de testear e ideal para exportar/importar todo el árbol JSON de una vez. |
| **Hojas Inferiores y Modales** | **`vaul`** + primitivas accesibles estilo `shadcn/ui` | Experiencia táctil nativa de cajón deslizable (*bottom sheet*) en móvil para formularios de turnos, eventos y selector multi-día. |
| **Iconografía** | **`lucide-react`** | Iconos vectoriales ligeros con trazo uniforme (`1.75px`/`2px`). |
| **Exportación Excel / TXT / PDF** | Generadores nativos en TypeScript (`Blob` CSV UTF-8 con BOM `;`, `.txt` + `navigator.clipboard`, y hoja de impresión PDF con `@media print`) | Evita añadir megabytes de dependencias pesadas de terceros para hojas de cálculo o motores PDF complejos, garantizando compatibilidad directa con Excel en español y exportación PDF vectorial limpia. |
| **Testing** | **Vitest** | Ejecución ultrarrápida de tests unitarios sobre toda la capa de dominio (`calculations`, `cycles`, `analytics`, `backup`). |

---

## 2. Arquitectura del Proyecto y Estructura de Directorios

El código se divide en tres capas simples y desacopladas:
1. **`src/domain/`**: Lógica de negocio pura (100 % funciones en TypeScript sin dependencia de React ni del DOM).
2. **`src/store/`**: Almacén de estado reactivo y persistencia local.
3. **`src/components/`**: Interfaz de usuario organizada por las 4 vistas principales y componentes base siguiendo `pwa-frontend-design`.

```text
src/
├── domain/
│   ├── types.ts               # Contratos de datos (WorkEvent, ShiftRecord, AppSettings, Database)
│   ├── calculations.ts        # Cálculo puro de turno: rango, medianoche, pausa, redondeo, mínimo e importes
│   ├── cycles.ts              # Cálculo de fechas de ciclo laboral (día X a X-1) y últimos 6 ciclos
│   ├── analytics.ts           # Agregaciones del ciclo, metas/ritmo, bruto vs. neto y desglose por evento
│   ├── backup.ts              # Validación estructural estricta del JSON y fusión/reemplazo de registros
│   ├── exporters.ts           # Generación de CSV/Excel (con BOM), resumen TXT y plantilla imprimible PDF
│   └── formatters.ts          # Formateadores españoles (1.240,50 €, 8h 30m, fechas cortas)
├── store/
│   └── useShiftStore.ts       # Acciones CRUD de eventos, turnos, clonado/repetición, cobros y backups
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx       # Contenedor fijo (Viewport Pinning), áreas seguras y selector de ciclo
│   │   └── BottomNav.tsx      # Barra inferior táctil de 4 pestañas (>=44x44px en Thumb-Zone)
│   ├── shifts/
│   │   ├── CycleSummaryHero.tsx   # Neto ganado en el ciclo, estado de cobro y barra de meta mensual
│   │   ├── QuickTemplatesBar.tsx  # Botones de 1 toque para registrar plantillas de eventos activos
│   │   ├── ShiftList.tsx          # Buscador por notas, filtros y lista de turnos del ciclo
│   │   ├── ShiftRow.tsx           # Fila con números tabulares y acciones rápidas (clonar hoy, repetir, cobrar)
│   │   ├── ShiftFormSheet.tsx     # Bottom sheet para crear/editar turno con previsualización en vivo
│   │   └── RepeatShiftSheet.tsx   # Selector de múltiples días del mes para repetir un turno en bloque
│   ├── calendar/
│   │   ├── CalendarView.tsx       # Cuadrícula mensual (lunes a domingo) con puntos de color e intensidad
│   │   └── DayShiftsPanel.tsx     # Detalle de los turnos del día seleccionado y botón de alta directa
│   ├── stats/
│   │   ├── StatsView.tsx          # Vista de analítica e informes del ciclo
│   │   ├── SixCyclesChart.tsx     # Gráfico de barras CSS/SVG limpio con los últimos 6 ciclos y % variación
│   │   ├── CategoryBreakdown.tsx  # Desglose porcentual e importes por evento/categoría
│   │   ├── GrossVsNetCard.tsx     # Comparativa Bruto facturado vs. Neto limpio y % retención media
│   │   └── ExportReportsCard.tsx  # Acciones de exportación a Excel, PDF, TXT y copiado al portapapeles
│   ├── settings/
│   │   ├── SettingsView.tsx       # Gestión de eventos (activos/archivados), ciclo, metas y Backup JSON
│   │   └── EventFormSheet.tsx     # Bottom sheet de configuración completa de un evento y sus plantillas
│   └── ui/
│       ├── BottomSheet.tsx        # Envoltorio accesible sobre Vaul con límite max-h-[85vh]
│       ├── EmptyState.tsx         # Estado vacío con icono sutil, copy directo y botón de acción
│       └── Skeletons.tsx          # Esqueletos geométricos para estados de carga
├── index.css                  # Tokens CSS de DESIGN.md, reglas de Viewport Pinning y .scroll-container
├── App.tsx                    # Enrutamiento de las 4 pestañas y contenedor de impresión PDF
└── main.tsx                   # Inicialización de React
```

---

## 3. Modelo de Datos Local (`src/domain/types.ts`)

```typescript
export type CategoryColor =
  | 'emerald'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'rose'
  | 'cyan'
  | 'lime';

export type RoundingMode = 'none' | '15m' | '30m';
export type ShiftRateType = 'normal' | 'holiday' | 'night' | 'overtime';
export type PaymentStatus = 'pending' | 'paid';

export interface QuickTemplate {
  id: string;
  label: string;          // Ej. "Mañana", "Cierre"
  startTime: string;      // "08:00"
  endTime: string;        // "16:00"
  breakMinutes?: number;
  rateType?: ShiftRateType;
}

export interface WorkEvent {
  id: string;
  name: string;
  color: CategoryColor;
  netRate: number;               // €/h neto (obligatorio)
  grossRate?: number;            // €/h bruto (opcional; si se omite, computa igual a netRate)
  hasUnpaidBreak: boolean;
  defaultBreakMinutes: number;   // Minutos precargados al crear turno
  minGuaranteedHours: number;    // 0 si no aplica mínimo garantizado
  roundingMode: RoundingMode;
  multipliers: {
    normal: number;              // Siempre 1.0
    holiday: number;             // Por defecto 1.5
    night: number;               // Por defecto 1.25
    overtime: number;            // Por defecto 1.5
  };
  quickTemplates: QuickTemplate[];
  archived: boolean;
  createdAt: string;
}

export interface ShiftHistoricalSnapshot {
  eventNameSnap: string;
  eventColorSnap: CategoryColor;
  netRateSnap: number;
  grossRateSnap: number;
  multiplierSnap: number;
  roundingModeSnap: RoundingMode;
  minGuaranteedHoursSnap: number;
}

export interface ShiftComputedTotals {
  crossesMidnight: boolean;
  rawDurationMinutes: number;
  netWorkedMinutes: number;
  roundedMinutes: number;
  billableMinutes: number;
  totalNetAmount: number;
  totalGrossAmount: number;
}

export interface ShiftRecord {
  id: string;
  eventId: string;
  date: string;                  // "YYYY-MM-DD" (día de inicio del turno)
  startTime: string;             // "HH:MM"
  endTime: string;               // "HH:MM"
  breakMinutes: number;
  rateType: ShiftRateType;
  fixedBonus: number;            // +€ plus fijo de jornada
  expenseAdjustment: number;     // +€ suplido o -€ gasto directo (ej. -3.50)
  note: string;
  paymentStatus: PaymentStatus;
  snapshot: ShiftHistoricalSnapshot;
  computed: ShiftComputedTotals;
  createdAt: string;
}

export interface AppSettings {
  cycleStartDay: number;              // 1..28 (por defecto 1)
  monthlyGoalNetEuros: number | null; // Ej. 500
  monthlyGoalHours: number | null;    // Ej. 40
}

export interface ShiftLogDatabase {
  version: 1;
  exportedAt: string;
  events: WorkEvent[];
  shifts: ShiftRecord[];
  settings: AppSettings;
}
```

---

## 4. Especificación de Algoritmos Críticos de Dominio

### 4.1. Secuencia Exacta de Cálculo de un Turno (`src/domain/calculations.ts`)
Cumpliendo con `AC3`, `AC4`, `AC8` y `AC9`:

1. **Conversión horaria:** `startTime` (`HH:MM`) y `endTime` (`HH:MM`) se convierten a minutos enteros desde las `00:00` (`0` a `1439`).
2. **Detección de cruce de medianoche (`crossesMidnight`):**
   - Si `endMinutes <= startMinutes`, el turno cruza la medianoche:
     $$\text{rawDurationMinutes} = (1440 - \text{startMinutes}) + \text{endMinutes}$$
   - En caso contrario:
     $$\text{rawDurationMinutes} = \text{endMinutes} - \text{startMinutes}$$
3. **Descuento de pausa no remunerada:**
   $$\text{netWorkedMinutes} = \max(0, \text{rawDurationMinutes} - \text{breakMinutes})$$
4. **Redondeo de bloque (`roundingModeSnap`):**
   - `'none'`: $\text{roundedMinutes} = \text{netWorkedMinutes}$
   - `'15m'`: $\text{roundedMinutes} = \text{ Math.round}(\text{netWorkedMinutes} / 15) \times 15$
   - `'30m'`: $\text{roundedMinutes} = \text{ Math.round}(\text{netWorkedMinutes} / 30) \times 30$
5. **Mínimo de horas garantizadas (`minGuaranteedHoursSnap`):**
   - Si $\text{rawDurationMinutes} > 0$:
     $$\text{billableMinutes} = \max(\text{roundedMinutes}, \text{Math.round}(\text{minGuaranteedHoursSnap} \times 60))$$
6. **Cálculo de importes (Neto y Bruto) a 2 decimales:**
   - $\text{billableHours} = \text{billableMinutes} / 60$
   - $\text{baseNet} = \text{billableHours} \times \text{netRateSnap} \times \text{multiplierSnap}$
   - $\text{baseGross} = \text{billableHours} \times \text{grossRateSnap} \times \text{multiplierSnap}$
   - $\text{totalNetAmount} = \text{round2}(\text{baseNet} + \text{fixedBonus} + \text{expenseAdjustment})$
   - $\text{totalGrossAmount} = \text{round2}(\text{baseGross} + \text{fixedBonus} + \text{expenseAdjustment})$

### 4.2. Ventanas de Ciclo Laboral (`src/domain/cycles.ts`)
Cumpliendo con `AC10`:
- El día de inicio `cycleStartDay` se acota entre `1` y `28` para garantizar que todos los meses del año tengan ese día sin ambigüedades en febrero.
- Si `cycleStartDay === 1`: el ciclo de un mes `(año, mes)` abarca desde el día `01` hasta el último día de ese mes (`28/29/30/31`).
- Si `cycleStartDay > 1` (ej. `25`): el ciclo etiquetado por su fecha de inicio `(año, mes, 25)` abarca desde `YYYY-MM-25` (inclusive) hasta el día `24` del mes siguiente (inclusive).
- Cualquier turno cuya propiedad `date` (`YYYY-MM-DD`) esté comprendida en `[startDate, endDate]` pertenece a dicho ciclo.

### 4.3. Progreso de Meta y Horas Restantes al Ritmo Actual (`src/domain/analytics.ts`)
Cumpliendo con `AC12`:
- Se suman `totalNetEarned` y `totalBillableHours` de todos los turnos del ciclo activo.
- **Tarifa media neta real del ciclo (`effectiveHourlyNetRate`):**
  - Si `totalBillableHours > 0` y `totalNetEarned > 0`:
    $$\text{effectiveHourlyNetRate} = \frac{\text{totalNetEarned}}{\text{totalBillableHours}}$$
  - Si aún no hay horas trabajadas en el ciclo: se utiliza la tarifa neta del primer evento activo (o la media de los eventos activos).
- **Horas restantes estimadas para alcanzar la meta en euros:**
  $$\text{remainingEuros} = \max(0, \text{monthlyGoalNetEuros} - \text{totalNetEarned})$$
  $$\text{remainingHoursAtCurrentPace} = \text{effectiveHourlyNetRate} > 0 \ ? \ \frac{\text{remainingEuros}}{\text{effectiveHourlyNetRate}} \ : \ 0$$

### 4.4. Validación de Backup JSON (`src/domain/backup.ts`)
Cumpliendo con `AC16` y `AC17`:
- Antes de modificar el almacén local, el parser verifica:
  1. Que el contenido sea JSON válido.
  2. Que sea un objeto con `version === 1`, arrays `events` y `shifts`, y objeto `settings`.
  3. Que cada elemento de `events` y `shifts` contenga sus campos obligatorios con los tipos correctos (`id`, `name`, `netRate >= 0`, `date` con formato `^\d{4}-\d{2}-\d{2}$`, `startTime` y `endTime` con formato `^\d{2}:\d{2}$`, `snapshot` y `computed` numéricos).
- Si falla cualquier comprobación, devuelve un resultado tipado `{ ok: false, error: 'Mensaje descriptivo en español' }` sin alterar el estado actual.
- Si es válido (`{ ok: true, data }`), el usuario elige entre:
  - **Reemplazar todo:** Sustituye `events`, `shifts` y `settings` por los del archivo.
  - **Combinar registros:** Fusiona `events` y `shifts` por `id` (conservando los existentes y añadiendo/actualizando los del archivo) sin duplicar entradas.

---

## 5. Aplicación del Protocolo de 5 Capas (`pwa-frontend-design`)

1. **Capa 1 (Design Read & Diales):** Herramienta financiera OLED de alta precisión (`DESIGN_VARIANCE: 4`, `MOTION_INTENSITY: Subtle`, `VISUAL_DENSITY: Comfortable`).
2. **Capa 2 (Design System Bridge):** Variables CSS en `src/index.css` fieles a `DESIGN.md` (`#050505` fondo, `#0C0C0E` superficie, `#1F1F24` borde, `#FAFAFA` acción primaria, `#10B981` ingresos/cobrado, `Inter` + `JetBrains Mono` con `tabular-nums`).
3. **Capa 3 (WebKit iOS Ergonomics):**
   - `#root` con `position: fixed; inset: 0; overflow: hidden;`.
   - `<main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">` y contenedores de vista con `flex-1 min-h-0 flex flex-col overflow-y-auto scroll-container` (`touch-action: pan-y !important`).
   - Todos los botones, celdas del calendario y selectores con `min-w-[44px] min-h-[44px]`.
   - Inputs con `text-base` (`16px`) para evitar zoom automático en Safari iOS.
4. **Capa 4 (Matriz de 5 Estados UX):**
   - Estados vacíos accionables en lista de turnos, calendario sin registros y catálogo de eventos.
   - Estados interactivos `active:scale-[0.98]` y `focus-visible:ring-2 focus-visible:ring-focus`.
   - Mensajes de error claros en formularios y en importación de `.json`.
5. **Capa 5 (Filtro Anti-AI-Slop):**
   - Cero gradientes decorativos, cero *blurred blobs*, cero tarjetas anidadas (*card-in-card*), cero emojis en la interfaz y *sentence case* riguroso en todos los textos.

# Desglose de Tareas: Shift Log (Feature 01 / MVP)

Este documento divide la implementación definida en [`spec.md`](file:///c:/.d/shiftlog/docs/specs/01-shift-log-mvp/spec.md) y [`plan.md`](file:///c:/.d/shiftlog/docs/specs/01-shift-log-mvp/plan.md) en unidades de trabajo pequeñas, secuenciales y verificables (estilo tickets), reduciendo la ambigüedad al mínimo.

---

## Bloque 1: Cimientos del Proyecto y Sistema de Diseño (`pwa-frontend-design`)

### [x] `T-01` — Inicialización del proyecto Vite + React + TypeScript + PWA
- **Objetivo:** Crear la estructura base del proyecto con React 19, TypeScript, Tailwind CSS v4, `lucide-react`, `zustand`, `vaul`, `vite-plugin-pwa` y `vitest`.
- **Archivos implicados:**
  - `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `public/manifest.webmanifest`
- **Criterios de aceptación relacionados:** Base técnica para `AC19`.
- **Definición de hecho (DoD):**
  - El comando de build y el comando de tests (`vitest`) se ejecutan sin errores.
  - `index.html` carga las fuentes `Inter` y `JetBrains Mono` y configura las metaetiquetas de iOS PWA (`apple-mobile-web-app-capable`, `black-translucent`, `viewport-fit=cover`).

### [x] `T-02` — Configuración de tokens semánticos OLED e invariantes WebKit en `src/index.css`
- **Objetivo:** Implementar el puente del sistema de diseño ([`DESIGN.md`](file:///c:/.d/shiftlog/DESIGN.md)) y las reglas físicas de WebKit iOS.
- **Archivos implicados:**
  - `src/index.css`
- **Criterios de aceptación relacionados:** `AC19`.
- **Definición de hecho (DoD):**
  - Definidas todas las variables CSS semánticas (`--color-background: #050505`, `--color-surface: #0C0C0E`, `--color-border: #1F1F24`, `--color-action: #FAFAFA`, etc.) y la paleta de 8 colores de categorías.
  - `#root` configurado con *Viewport Pinning* (`position: fixed; inset: 0; overflow: hidden;`), sin `100vh` ni `100dvh`.
  - Clase `.scroll-container` con `touch-action: pan-y !important` y utilidad `tabular-nums` aplicada en números.

---

## Bloque 2: Motor de Dominio Puro y Tests Unitarios

### [x] `T-03` — Contratos de tipos y formateadores regionales en español
- **Objetivo:** Definir las interfaces TypeScript del modelo de datos y las funciones puras de formato de moneda, horas y fechas.
- **Archivos implicados:**
  - `src/domain/types.ts`
  - `src/domain/formatters.ts`
- **Criterios de aceptación relacionados:** `AC1`, `AC8`, `AC19`.
- **Definición de hecho (DoD):**
  - Formateador de euros (`formatCurrency(1240.5)` -> `1.240,50 €`, `formatSignedCurrency(-3.5)` -> `-3,50 €`).
  - Formateador de duración en minutos a texto (`formatMinutes(510)` -> `8h 30m`).
  - Tipado completo de `WorkEvent`, `ShiftRecord`, `ShiftHistoricalSnapshot`, `AppSettings` y `ShiftLogDatabase`.

### [x] `T-04` — Motor de cálculo de turnos e inmutabilidad histórica (`calculations.ts` + tests)
- **Objetivo:** Implementar la función pura que calcula un turno siguiendo el orden exacto de negocio y congela su *snapshot* histórico.
- **Archivos implicados:**
  - `src/domain/calculations.ts`
  - `src/domain/__tests__/calculations.test.ts`
- **Criterios de aceptación relacionados:** `AC3`, `AC4`, `AC8`, `AC9`.
- **Definición de hecho (DoD):**
  - Soporta turnos diurnos y turnos nocturnos que cruzan la medianoche (`endTime <= startTime`, ej. `22:00` a `04:00` = `360 min` en el día de inicio).
  - Aplica en orden: resta de descanso -> redondeo (`none`, `15m`, `30m`) -> mínimo de horas garantizadas -> multiplicador (`normal`, `holiday`, `night`, `overtime`) -> suma de plus fijo y gasto/suplido (`+€` / `-€`).
  - Si el evento no tiene tarifa bruta definida, `grossRateSnap` toma el valor de `netRateSnap`.
  - Suite de tests unitarios en Vitest verificando todos los casos borde (medianoche, pausa mayor que duración, redondeos, mínimo garantizado y gastos negativos).

### [x] `T-05` — Motor de ciclos laborales y analítica (`cycles.ts`, `analytics.ts` + tests)
- **Objetivo:** Implementar el cálculo de ventanas de ciclo mensual personalizable (día `X` a `X-1`), progreso de metas mensuales, comparativa de 6 ciclos y desglose Bruto vs. Neto.
- **Archivos implicados:**
  - `src/domain/cycles.ts`
  - `src/domain/analytics.ts`
  - `src/domain/__tests__/cycles-analytics.test.ts`
- **Criterios de aceptación relacionados:** `AC10`, `AC11`, `AC12`, `AC14`.
- **Definición de hecho (DoD):**
  - Dado un `cycleStartDay` (`1..28`) y una fecha de referencia, calcula con exactitud `startDate`, `endDate`, etiqueta legible del ciclo, ciclo anterior y los últimos 6 ciclos.
  - Calcula total neto, total bruto, importe cobrado vs. pendiente, porcentaje de retención estimado (`(bruto - neto) / bruto * 100`), desglose porcentual por categoría y horas restantes para alcanzar la meta financiera al ritmo actual (`remainingEuros / effectiveHourlyNetRate`).
  - Tests unitarios en Vitest pasando al 100 %.

### [x] `T-06` — Validación de Backup JSON y generadores de exportación (`backup.ts`, `exporters.ts` + tests)
- **Objetivo:** Implementar la exportación/importación validada de `.json` (reemplazo o combinación) y los generadores de informes en Excel (`.csv` UTF-8 con BOM), TXT (descarga + portapapeles) y PDF.
- **Archivos implicados:**
  - `src/domain/backup.ts`
  - `src/domain/exporters.ts`
  - `src/domain/__tests__/backup.test.ts`
- **Criterios de aceptación relacionados:** `AC16`, `AC17`, `AC18`.
- **Definición de hecho (DoD):**
  - `validateBackupJson` rechaza JSON mal formados o con campos faltantes/inválidos devolviendo un mensaje de error claro sin lanzar excepciones no controladas.
  - `mergeDatabases` combina eventos y turnos por `id` sin duplicar registros.
  - Generador CSV incluye BOM UTF-8 (`\uFEFF`) y separador `;` con formato numérico español para apertura directa en Excel.
  - Generador TXT crea un resumen tabulado listo para descargar o copiar al portapapeles.

---

## Bloque 3: Almacén de Estado Local-First (`Zustand`)

### [x] `T-07` — Store reactivo con persistencia local (`useShiftStore.ts`)
- **Objetivo:** Conectar la capa de dominio a un store de Zustand persistido en `localStorage` con todas las operaciones de la aplicación.
- **Archivos implicados:**
  - `src/store/useShiftStore.ts`
- **Criterios de aceptación relacionados:** `AC1` a `AC17`.
- **Definición de hecho (DoD):**
  - Acciones para Eventos: crear, actualizar (sin alterar snapshots de turnos pasados, `AC9`), archivar/desarchivar (`AC2`) y gestionar plantillas rápidas (`AC5`).
  - Acciones para Turnos: crear desde formulario, crear con 1 toque desde plantilla rápida (`AC5`), editar, eliminar, clonar en hoy (`AC7`), duplicar en fecha (`AC7`) y repetir en múltiples días seleccionados (`AC7`).
  - Acciones de Cobro: alternar estado `pending`/`paid` de un turno o marcar todos los turnos de un ciclo como cobrados/pendientes (`AC11`).
  - Acciones de Ajustes y Backup: actualizar `cycleStartDay` y metas mensuales (`AC10`, `AC12`), restaurar backup en modo reemplazo o combinación (`AC16`, `AC17`).

---

## Bloque 4: Estructura Base de UI y Componentes Compartidos

### [x] `T-08` — Layout principal (`AppShell`), selector de ciclo y navegación inferior de 4 pestañas
- **Objetivo:** Construir el armazón físico de la PWA con cabecera de ciclo activo, área desplazable protegida y barra inferior en la *Thumb-Zone*.
- **Archivos implicados:**
  - `src/components/layout/AppShell.tsx`
  - `src/components/layout/BottomNav.tsx`
  - `src/components/ui/BottomSheet.tsx`
  - `src/components/ui/EmptyState.tsx`
  - `src/components/ui/Toast.tsx`
- **Criterios de aceptación relacionados:** `AC10`, `AC19`.
- **Definición de hecho (DoD):**
  - Navegación inferior con 4 pestañas (`Turnos`, `Calendario`, `Estadísticas`, `Ajustes`) con hit targets `>= 44x44px` y respeto a `safe-area-inset-bottom`.
  - Selector superior de ciclo que permite moverse entre el ciclo actual, ciclos anteriores y siguientes mostrando el rango exacto de fechas.

---

## Bloque 5: Vistas y Flujos Principales

### [x] `T-09` — Gestión de Eventos / Categorías y Plantillas Rápidas (`EventFormSheet` y `SettingsView`)
- **Objetivo:** Permitir crear, editar y archivar eventos configurando todas sus reglas económicas y sus plantillas de turnos rápidos.
- **Archivos implicados:**
  - `src/components/settings/EventFormSheet.tsx`
  - `src/components/settings/EventsManagerSection.tsx`
- **Criterios de aceptación relacionados:** `AC1`, `AC2`, `AC5`.
- **Definición de hecho (DoD):**
  - Formulario en *bottom sheet* con: nombre, selector de 8 colores, tarifa neta €/h (obligatoria), tarifa bruta €/h (opcional), switch de descanso no remunerado + minutos por defecto, selector de redondeo (`Sin redondeo`, `15 min`, `30 min`), mínimo de horas garantizadas, multiplicadores (`Festivo`, `Nocturno`, `Hora extra`) y editor de plantillas rápidas (`Etiqueta`, `Entrada`, `Salida`).
  - Pestaña o filtro para ver eventos `Activos` y `Archivados`, permitiendo archivar o restaurar con un toque.

### [x] `T-10` — Vista principal de Turnos: Resumen del ciclo, Meta mensual y Accesos rápidos de 1 toque
- **Objetivo:** Construir la cabecera ejecutiva de la vista `Turnos` con el total neto del ciclo, desglose cobrado/pendiente, barra de progreso de meta (con horas restantes al ritmo actual) y tira de botones de registro rápido (1 toque).
- **Archivos implicados:**
  - `src/components/shifts/CycleSummaryHero.tsx`
  - `src/components/shifts/QuickTemplatesBar.tsx`
- **Criterios de aceptación relacionados:** `AC5`, `AC11`, `AC12`, `AC19`.
- **Definición de hecho (DoD):**
  - Muestra el total neto ganado en tipografía `JetBrains Mono` (`tabular-nums`), importe cobrado vs. pendiente y botón rápido para marcar todo el ciclo como cobrado.
  - Si hay meta mensual configurada (en `€` y/o en `h`), muestra barra de progreso y texto exacto de cuántas horas faltan al ritmo actual.
  - La barra de plantillas rápidas muestra los botones de los eventos activos; al tocar uno, registra el turno en el día actual con confirmación inmediata.

### [x] `T-11` — Formulario de Registro y Edición de Turnos (`ShiftFormSheet`)
- **Objetivo:** Permitir registrar o editar un turno por rango horario con previsualización instantánea de duración e importe neto/bruto.
- **Archivos implicados:**
  - `src/components/shifts/ShiftFormSheet.tsx`
- **Criterios de aceptación relacionados:** `AC3`, `AC4`, `AC6`, `AC8`, `AC9`, `AC15`.
- **Definición de hecho (DoD):**
  - Selector de evento activo (al cambiar de evento, si tiene descanso habilitado, precarga automáticamente sus minutos de descanso por defecto).
  - Inputs de fecha, hora de entrada y hora de salida (indicando visualmente `"Cruza medianoche (+1 día)"` cuando `salida <= entrada`).
  - Selector de tipo de jornada (`Normal`, `Festivo`, `Nocturno`, `Hora extra`), campos opcionales de plus fijo (`+€`), gasto/suplido (`+€` / `-€`), estado de cobro y nota corta.
  - Panel resumen inferior en vivo que muestra las horas computables (aplicando pausa, redondeo y mínimo garantizado) y el importe neto resultante antes de guardar.

### [x] `T-12` — Listado de Turnos, Buscador/Filtros y Repetición Multi-día (`ShiftList`, `ShiftRow`, `RepeatShiftSheet`)
- **Objetivo:** Mostrar los turnos del ciclo agrupados por fecha con buscador por notas, filtros y acciones rápidas para clonar, duplicar o repetir en múltiples días del mes.
- **Archivos implicados:**
  - `src/components/shifts/ShiftList.tsx`
  - `src/components/shifts/ShiftRow.tsx`
  - `src/components/shifts/RepeatShiftSheet.tsx`
- **Criterios de aceptación relacionados:** `AC6`, `AC7`, `AC11`, `AC15`.
- **Definición de hecho (DoD):**
  - Barra de búsqueda instantánea por texto de nota, filtro por categoría/evento y filtro por estado de cobro (`Todos`, `Pendientes`, `Cobrados`).
  - Cada fila (`ShiftRow`) permite marcar como cobrado/pendiente con un toque y abrir acciones rápidas: **Clonar en hoy**, **Duplicar**, **Repetir en varios días del mes**, **Editar** y **Eliminar**.
  - `RepeatShiftSheet` presenta un calendario interactivo del mes donde el usuario selecciona varios días y clona el turno en todos ellos de una sola vez.

### [x] `T-13` — Vista de Calendario Mensual (`CalendarView` y `DayShiftsPanel`)
- **Objetivo:** Construir el calendario mensual con puntos de color por categoría, mapa de intensidad según las horas trabajadas cada día y panel inferior con el desglose del día seleccionado.
- **Archivos implicados:**
  - `src/components/calendar/CalendarView.tsx`
  - `src/components/calendar/DayShiftsPanel.tsx`
- **Criterios de aceptación relacionados:** `AC6`, `AC13`, `AC19`.
- **Definición de hecho (DoD):**
  - Semana comenzando en lunes; celdas táctiles `>= 44x44px` con número en `font-mono tabular-nums`.
  - Cada día con turnos muestra un fondo con intensidad escalonada según el total de horas trabajadas (`<4h`, `4-8h`, `>8h`) y los puntos de color de las categorías de ese día.
  - Al tocar un día, se muestran debajo todos sus turnos, el total de horas y euros del día, y un botón directo `"Añadir turno en este día"`.

### [x] `T-14` — Vista de Estadísticas e Informes (`StatsView`, `SixCyclesChart`, `CategoryBreakdown`, `GrossVsNetCard`, `ExportReportsCard`)
- **Objetivo:** Implementar la pantalla de analítica del ciclo actual e intermensual junto con la exportación de informes en Excel, PDF y TXT.
- **Archivos implicados:**
  - `src/components/stats/StatsView.tsx`
  - `src/components/stats/SixCyclesChart.tsx`
  - `src/components/stats/CategoryBreakdown.tsx`
  - `src/components/stats/GrossVsNetCard.tsx`
  - `src/components/stats/ExportReportsCard.tsx`
  - `src/components/stats/PrintableReport.tsx`
- **Criterios de aceptación relacionados:** `AC14`, `AC18`, `AC19`.
- **Definición de hecho (DoD):**
  - Tarjeta de comparativa intermensual con porcentaje de variación de horas e ingresos netos respecto al ciclo anterior y gráfico de barras de los últimos 6 ciclos.
  - Tarjeta de desglose por categoría/evento con barra proporcional, horas, importe neto y `%` sobre el total del ciclo.
  - Tarjeta **Bruto vs. Neto** con total bruto facturado, total neto limpio, retención total en `€` y porcentaje de descuento estimado medio.
  - Botones de exportación del ciclo activo a **Excel (`.csv`)**, **PDF (informe formateado)**, **TXT (descarga)** y **Copiar resumen al portapapeles** con notificación visual de confirmación.

### [x] `T-15` — Ajustes Globales (Cierre de Ciclo, Meta Mensual) y Backup & Restore `.json` (`SettingsView`)
- **Objetivo:** Completar la vista de Ajustes con la configuración del día de inicio de ciclo, las metas mensuales y el módulo de Copia de Seguridad con validación estricta.
- **Archivos implicados:**
  - `src/components/settings/SettingsView.tsx`
  - `src/components/settings/BackupRestoreSection.tsx`
- **Criterios de aceptación relacionados:** `AC10`, `AC12`, `AC16`, `AC17`.
- **Definición de hecho (DoD):**
  - Selector de día de inicio de ciclo laboral (`Día 1` a `Día 28`) y campos de meta mensual en euros netos y en horas.
  - Botón para exportar toda la base de datos en un archivo `.json` con fecha en el nombre (`shiftlog-backup-YYYY-MM-DD.json`).
  - Selector de archivo `.json` para restaurar: valida el esquema antes de aplicar cambios; si el archivo es inválido, muestra alerta de error detallada sin tocar los datos; si es válido, permite elegir entre **"Reemplazar toda la base de datos"** o **"Combinar con los registros actuales"**.

---

## Bloque 6: Validación Integral y Auditoría Final

### [x] `T-16` — Verificación de los 19 Criterios de Aceptación y Auditoría `pwa-frontend-design`
- **Objetivo:** Ejecutar toda la batería de pruebas automatizadas, verificar el build de producción y auditar el cumplimiento estricto de los 19 criterios de aceptación (`AC1`–`AC19`) y de las 5 capas de diseño.
- **Archivos implicados:**
  - Todos los módulos en `src/`
- **Criterios de aceptación relacionados:** `AC1` a `AC19`.
- **Definición de hecho (DoD):**
  - `npm test` pasa el 100 % de los tests unitarios de dominio.
  - `npm run build` compila sin errores de TypeScript ni advertencias de estilos.
  - Auditoría Anti-AI-Slop verificada: cero clases `dark:`, cero gradientes decorativos, cero emojis en el copy de la interfaz, *sentence case* en todos los textos, `font-mono tabular-nums` en todas las cifras y áreas táctiles `>= 44x44px`.

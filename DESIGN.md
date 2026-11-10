# Sistema de Diseño: Shift Log (`DESIGN.md`)

Este documento es la **fuente de verdad absoluta** para el sistema de diseño de **Shift Log**, cumpliendo con la Capa 2 (*Design System Bridge*) de la skill `pwa-frontend-design`. Todo componente, vista y hoja de estilos debe ceñirse estrictamente a los tokens y reglas aquí definidos.

---

## 1. Design Read y Calibración de Diales

- **Arquetipo de Interfaz:** Herramienta técnica de productividad y control financiero personal (inspirada en **Linear** y **Vercel**).
- **Emoción Buscada:** Precisión, claridad inmediata, velocidad de registro con una mano y confianza en los cálculos.
- **Calibración de Diales:**
  - `DESIGN_VARIANCE`: **4 / 10** (Utilitario refinado; jerarquía limpia por contraste de superficie y tipografía, sin artificios decorativos).
  - `MOTION_INTENSITY`: **Subtle** (Transiciones de `120ms–180ms` en `transform` y `opacity`; apertura fluida de *bottom sheets* con `Vaul`; respeto a `prefers-reduced-motion`).
  - `VISUAL_DENSITY`: **Comfortable** (Rejilla base de `4px`, alta legibilidad numérica, objetivos táctiles de al menos `44x44px`).

---

## 2. Paleta Semántica (Dark Mode OLED Exclusivo)

La aplicación opera exclusivamente en **Dark Mode OLED**. Los componentes utilizan los nombres de rol semántico sin añadir nunca el prefijo `dark:`.

### 2.1. Tokens de Rol Estructural y Acción

| Token de Rol | Clase Tailwind | Valor Hex / CSS | Uso Específico |
|---|---|---|---|
| `color-background` | `bg-background` | `#050505` | Lienzo raíz OLED profundo |
| `color-surface` | `bg-surface` | `#0C0C0E` | Superficie de paneles, filas de turnos, tarjetas de métrica y barra inferior |
| `color-surface-muted` | `bg-surface-muted` | `#141418` | Controles segmentados, cabeceras de tabla, chips y estados hover secundarios |
| `color-border` | `border-border` | `#1F1F24` | Bordes estructurales de `1px` y líneas divisoras |
| `color-border-strong` | `border-border-strong` | `#2E2E36` | Bordes de inputs activos, selectores enfocados y tarjetas destacadas |
| `color-text` | `text-text` | `#FAFAFA` | Texto principal, importes titulares y encabezados |
| `color-text-secondary` | `text-text-secondary` | `#A1A1AA` | Etiquetas de campo, rangos horarios secundarios y subtítulos |
| `color-text-muted` | `text-text-muted` | `#52525B` | Placeholders, textos desactivados y días fuera de mes en calendario |
| `color-action` | `bg-action` | `#FAFAFA` | Acción primaria de alto contraste estilo Vercel (1 por vista/modal) |
| `color-action-hover` | `hover:bg-action-hover` | `#E4E4E7` | Estado hover/pressed del botón de acción primaria |
| `color-action-ink` | `text-action-ink` | `#09090B` | Texto e icono oscuro sobre el botón `bg-action` |
| `color-selected` | `bg-selected` | `#1C1C22` | Día seleccionado en calendario, pestaña o filtro activo |
| `color-focus` | `ring-focus` | `#FAFAFA` | Anillo de foco accesible (`focus-visible:ring-2`) |

### 2.2. Señales Semánticas Financieras y de Estado

Nunca se comunica un estado únicamente con color; siempre se acompaña de texto explícito, signo matemático (`+` / `-`) o icono funcional.

| Rol de Estado | Texto / Icono | Fondo Tenue (`-quiet`) | Borde (`-line`) | Uso en Shift Log |
|---|---|---|---|---|
| **Success (Ingresos / Cobrado)** | `#10B981` (`text-emerald-500`) | `#052E16` | `#065F46` | Importe neto ganado, estado "Cobrado", suplidos positivos (`+€`), meta alcanzada |
| **Warning (Pendiente / Pausa)** | `#F59E0B` (`text-amber-500`) | `#451A03` | `#78350F` | Estado "Pendiente de cobro", aviso de descanso descontado, alerta de backup |
| **Danger (Gasto / Error)** | `#EF4444` (`text-red-500`) | `#450A0A` | `#7F1D1D` | Gastos deducibles (`-€`), acción de eliminar turno, error de validación en JSON |
| **Info (Bruto / Recargo)** | `#3B82F6` (`text-blue-500`) | `#172554` | `#1E40AF` | Importe bruto informativo, insignia de multiplicador (Festivo, Nocturno, Extra) |

### 2.3. Paleta Curada para Eventos / Categorías

Al crear un evento o categoría temporal, el usuario puede elegir entre estos 8 colores de acento medidos (diseñados para contrastar sobre `#050505` y `#0C0C0E` sin saturar la vista):

1. **Esmeralda:** `#10B981`
2. **Azul Técnico:** `#3B82F6`
3. **Índigo Linear:** `#6366F1`
4. **Violeta:** `#8B5CF6`
5. **Ámbar:** `#F59E0B`
6. **Coral / Rosa:** `#F43F5E`
7. **Cian:** `#06B6D4`
8. **Lima:** `#84CC16`

---

## 3. Tipografía y Reglas de Legibilidad Numérica

### 3.1. Familias Tipográficas

- **`font-heading` y `font-body`:** `'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
  - Títulos: peso `600` (SemiBold), tracking `-0.02em`.
  - Cuerpo y controles: peso `400` (Regular) y `500` (Medium).
- **`font-mono` (Obligatoria para datos cuantitativos):** `'JetBrains Mono', ui-monospace, monospace`
  - **Regla Invariable:** Aplicar siempre `font-mono tabular-nums` (`font-variant-numeric: tabular-nums`) en:
    - Importes en euros (`1.420,50 €`, `12,50 €/h`).
    - Horas y duraciones (`8h 30m`, `08:00 – 16:30`).
    - Porcentajes y multiplicadores (`x1.5`, `-15,0 %`, `+12 %`).
    - Números de día en el calendario mensual y contadores de barra de progreso.

### 3.2. Escala Tipográfica (Mínimo 12px)

| Clase | Tamaño | Interlineado | Uso en Shift Log |
|---|---|---|---|
| `text-xs` | `12px` | `16px` | Etiquetas de estado ("Cobrado", "Festivo x1.5"), notas auxiliares, leyenda de calendario |
| `text-sm` | `14px` | `20px` | Controles secundarios, subtítulos de turno, desglose bruto/neto en fila |
| `text-base` | `16px` | `24px` | Nombre del evento en lista, inputs de formulario (evita auto-zoom en iOS Safari) |
| `text-lg` | `18px` | `26px` | Importe neto de cada turno en la lista, títulos de hoja inferior (*bottom sheet*) |
| `text-xl` | `20px` | `28px` | Encabezados de sección y totales parciales |
| `text-2xl` | `24px` | `32px` | Encabezado de pantalla y total de horas del ciclo |
| `text-3xl` | `30px` | `36px` | Cifra principal de ingresos netos estimados del ciclo en el resumen superior |

> **Nota crítica iOS WebKit:** Todos los campos `<input>`, `<select>` y `<textarea>` deben tener al menos `16px` (`text-base`) para impedir que iOS Safari haga zoom involuntario al enfocar el campo.

---

## 4. Geometría, Radios y Elevación

- **Radios de esquina contenidos (Estilo técnico Linear/Vercel):**
  - `radius-sm` (`6px`): Insignias de estado ("Cobrado", "Nocturno"), celdas del calendario y chips.
  - `radius-md` (`8px`): Botones, inputs, selectores y botones de turnos rápidos.
  - `radius-lg` (`12px`): Contenedores de resumen, paneles de categoría y cabeceras de hojas inferiores (*bottom sheets*).
- **Estructura sin anidamiento (*Zero Card-in-Card*):**
  - Las listas de turnos y desgloses utilizan filas separadas por divisores sutiles (`divide-y divide-border`) dentro de un único bloque `bg-surface border border-border rounded-lg`, nunca tarjetas con sombra dentro de otra tarjeta.

---

## 5. Arquitectura de Pantalla y Navegación PWA

1. **Viewport Pinning (`#root`):**
   - `position: fixed; inset: 0; display: flex; flex-direction: column; overflow: hidden; background-color: var(--color-background);`
2. **Barra de Navegación Inferior (Thumb-Zone, 4 pestañas):**
   - Fija en la parte inferior con `pb-[env(safe-area-inset-bottom,0px)]`, borde superior `border-t border-border` y fondo `bg-surface`:
     1. **Turnos:** Resumen del ciclo actual (neto ganado + progreso de meta), botones de acceso rápido (plantillas de 1 toque), botón primario para registrar turno y listado filtrable del ciclo.
     2. **Calendario:** Vista mensual con puntos de color por categoría e intensidad visual según las horas trabajadas, más detalle rápido de los turnos del día seleccionado.
     3. **Estadísticas:** Comparativa con el ciclo anterior, gráfico de barras de los últimos 6 ciclos, desglose porcentual por evento/categoría, comparativa Bruto vs. Neto y exportación de informes (Excel, PDF, TXT).
     4. **Ajustes:** Gestión de Eventos/Categorías (activos y archivados), configuración de cierre de ciclo laboral, definición de meta mensual y Copia de Seguridad (`.json` Backup & Restore).

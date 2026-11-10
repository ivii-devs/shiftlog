# Guía de Agentes y Convenciones del Proyecto (`agents.md`)

Este archivo define las reglas operativas, el flujo de trabajo **SDD (Spec-Driven Development)**, el stack tecnológico y las convenciones de código e interfaz que cualquier agente de IA debe cumplir al trabajar en **Shift Log**.

---

## 1. Metodología de Trabajo: SDD (Nivel Spec-First)

El desarrollo sigue estrictamente el flujo secuencial de 6 fases y organiza la documentación de cada feature dentro de `docs/specs/<feature>/`. No se debe saltar a la implementación sin haber completado y validado los documentos previos:

```text
docs/
├── constitution.md                # Principios innegociables del proyecto
└── specs/
    └── 01-shift-log-mvp/          # Carpeta de la feature (una carpeta por feature)
        ├── spec.md                # Fase 1: Qué construir y criterios de aceptación
        ├── plan.md                # Fase 2: Cómo construirlo (decisiones técnicas)
        └── tasks.md               # Fase 3: Trabajo dividido en tareas pequeñas
```

1. **Fase 0 — Cimientos:**
   - [`docs/constitution.md`](file:///c:/.d/shiftlog/docs/constitution.md): Principios innegociables del producto.
   - [`DESIGN.md`](file:///c:/.d/shiftlog/DESIGN.md): Fuente de verdad del sistema de diseño y tokens semánticos.
   - [`agents.md`](file:///c:/.d/shiftlog/agents.md): Convenciones técnicas y operativas (este documento).
2. **Fase 1 — Especificación ([`docs/specs/01-shift-log-mvp/spec.md`](file:///c:/.d/shiftlog/docs/specs/01-shift-log-mvp/spec.md)):** Qué construir, reglas de negocio, criterios de aceptación y exclusiones de alcance, expresados sin acoplamiento técnico.
3. **Fase 2 — Planificación (`docs/specs/<feature>/plan.md`):** Arquitectura técnica simple, modelo de datos local, estructura de carpetas y estrategia de exportación/almacenamiento.
4. **Fase 3 — Tareas (`docs/specs/<feature>/tasks.md`):** Desglose del trabajo en unidades pequeñas, secuenciales y verificables (estilo tickets).
5. **Fase 4 — Implementación:** Construcción limpia aplicando KISS, YAGNI y el protocolo de 5 capas de `pwa-frontend-design`.
6. **Fase 5 y 6 — Validación e Iteración:** Pruebas automatizadas sobre la lógica de cálculo/validación y revisión directa con el usuario.

---

## 2. Stack Tecnológico y Librerías

- **Arquitectura:** Aplicación SPA / PWA 100 % frontend y local-first.
- **Estilos:** Tailwind CSS utilizando exclusivamente los tokens de rol semántico definidos en `DESIGN.md`.
- **Componentes Base y Accesibilidad:** Componentes estilo `shadcn/ui` + `Vaul` (para hojas inferiores / *bottom sheets* táctiles en móvil).
- **Iconografía:** `lucide-react` (trazo `1.75px` o `2px`, tamaño consistente, siempre con `aria-label` en botones de solo icono).
- **Animaciones:** Transiciones CSS puras de `100ms–200ms` sobre `transform` y `opacity`; `Framer Motion` únicamente cuando sea necesario para transiciones de lista o gestos de deslizamiento (*swipe*).

---

## 3. Reglas de Diseño e Interfaz (`pwa-frontend-design`)

Antes de crear o modificar cualquier componente visual, pantalla o hoja de estilos, el agente **DEBE** aplicar el protocolo de la skill `pwa-frontend-design` y consultar [`DESIGN.md`](file:///c:/.d/shiftlog/DESIGN.md):

1. **Uso estricto de tokens de rol:**
   - Usar clases semánticas (`bg-background`, `bg-surface`, `bg-surface-muted`, `border-border`, `text-text`, `text-text-secondary`, `bg-action`, `text-action-ink`).
   - **Prohibido** usar colores arbitrarios (ej. `bg-[#123456]`) o modificadores `dark:` en los componentes.
2. **Tipografía y Números Tabulares:**
   - Fuente general: `Inter` (`font-sans`).
   - Fuente numérica/técnica: `JetBrains Mono` (`font-mono`) con `tabular-nums` obligatorio en todo importe (`€`), duración (`h` / `min`), rango horario (`08:00 - 16:00`), porcentaje (`%`) y fecha numérica.
3. **Invariantes WebKit iOS y Móvil:**
   - Contenedor raíz `#root` anclado con `position: fixed; inset: 0; overflow: hidden;`. Prohibido `100vh` y `100dvh`.
   - Contenedores desplazables con `flex-1 min-h-0 flex flex-col overflow-y-auto scroll-container` y `touch-action: pan-y !important`.
   - Todos los controles interactivos deben garantizar un área táctil mínima de `44x44px` (`min-w-[44px] min-h-[44px]`).
   - Respetar áreas seguras con `env(safe-area-inset-top)` y `env(safe-area-inset-bottom)`.
4. **Matriz de 5 Estados UX:**
   - Toda vista o flujo debe contemplar: 1) Estado en reposo y pulsado (`active:scale-[0.98]`), 2) Carga con *skeletons* geométricos, 3) Estado vacío con mensaje directo y botón de acción, 4) Estado de error o validación comprensible, y 5) Foco accesible (`focus-visible:ring-2`).
5. **Barrera Anti-AI-Slop:**
   - Cero gradientes decorativos, cero *blurred blobs*, cero *glassmorphism* en tarjetas de datos, cero tarjetas anidadas (*card-in-card*).
   - Cero emojis en el copy de la interfaz.
   - Textos en español (España), usando *sentence case* estricto ("Añadir turno", "Exportar informe") y verbos activos. Prohibido usar la raya larga (`—`).

---

## 4. Convenciones de Dominio y Lógica de Negocio

1. **Lógica pura y desacoplada:**
   - Las fórmulas de cálculo de duración, redondeo de bloques, mínimo de horas garantizadas, cálculo neto/bruto, cierre de ciclo mensual y progreso de metas deben implementarse como funciones puras en módulos de dominio independientes de React, facilitando su testeo unitario directo.
2. **Representación de fechas y horas:**
   - Las fechas de los turnos se guardan en formato ISO local `YYYY-MM-DD` correspondiente al **día de inicio del turno**.
   - Las horas de entrada y salida se guardan en formato `HH:MM` (24 horas) y se operan internamente como minutos totales (`0` a `1439`).
   - Si la hora de salida es menor o igual a la hora de entrada (cruce de medianoche, ej. `22:00` a `04:00`), la duración se calcula como `(1440 - entrada) + salida` y el turno completo computa en el día de inicio.
3. **Inmutabilidad del precio histórico:**
   - Al guardar un turno, el registro copia y persiste los parámetros económicos del evento en ese instante (`netRateSnap`, `grossRateSnap`, `multiplierSnap`, etc.). Los cálculos de listados, calendario y estadísticas leen siempre los valores guardados en el turno, nunca los valores actuales del catálogo de eventos.
4. **Formato regional:**
   - Moneda en formato español: coma para decimales, punto para miles y símbolo `€` pospuesto con espacio de no separación (ej. `1.240,50 €`, `-3,50 €`).
   - Horarios en formato 24 horas (`08:00`, `22:30`) y semana comenzando en **lunes**.

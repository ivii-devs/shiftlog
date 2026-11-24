# Spec: Metas por Mes, Agenda en Calendario, Estadísticas del Ciclo y Reorganización de Vistas (Feature 02)

## Por qué

Tras el uso real del MVP de **Shift Log** ([`01-shift-log-mvp`](file:///c:/.d/shiftlog/docs/specs/01-shift-log-mvp/spec.md)), han surgido cinco necesidades claras de producto y usabilidad que requieren ampliar el dominio, simplificar el flujo y reordenar la interfaz sin perder la simplicidad local-first:

1. **Metas variables según la época del año:** Las metas mensuales (en euros netos y en horas) eran globales e idénticas para todos los meses. En la práctica, un mes de menor actividad como noviembre requiere objetivos distintos a diciembre o enero.
2. **Revisión ágil del calendario:** La pestaña de calendario mostraba únicamente los turnos del día seleccionado, obligando a pulsar día por día en la cuadrícula para consultar el historial trabajado del mes.
3. **Analítica del mes actual y predicciones:** La pestaña de estadísticas se centraba en la evolución intermensual de 6 ciclos, pero faltaban métricas del propio ciclo en curso (días trabajados frente a libres, ritmo diario/semanal) y proyecciones para saber a qué ritmo terminar el mes o simular trabajo extra.
4. **Orden entre pestañas y reducción de ruido:** La exportación de informes estaba mezclada dentro de Estadísticas, Ajustes apilaba secciones heterogéneas en una sola lista vertical y el resumen de Turnos duplicaba el botón de registrar turno que ya existe en la cabecera principal.
5. **Enfoque puro en control horario e ingresos esperados:** El seguimiento de estado «Cobrado» frente a «Pendiente» añade ruido visual y pasos innecesarios en formularios, filas, filtros e informes, ya que la aplicación se utiliza exclusivamente para contabilizar las horas trabajadas y lo que se espera cobrar según dichas horas.

---

## Alcance

1. **Metas personalizadas por mes/ciclo con herencia de meta base:** Configuración de objetivos propios (`€ netos` y `horas`) por cada ciclo mensual (`YYYY-MM`), heredando una meta base opcional por defecto en los meses no personalizados y permitiendo desactivar la meta en un mes concreto.
2. **Edición rápida y gestor mensual de metas:** Acceso directo desde el resumen de `Turnos` mediante hoja inferior (*bottom sheet*) para editar la meta del ciclo activo, además de un gestor completo por meses dentro de `Ajustes > Ciclo y metas`.
3. **Eliminación completa del estado «Cobrado / Pendiente» con migración transparente:** Retirada total del concepto de estado de cobro en toda la aplicación (resumen del ciclo, filas de turnos, formulario de alta/edición, filtros de búsqueda, exportación CSV/PDF/TXT y analítica), garantizando compatibilidad sin pérdida de datos con los registros ya guardados en `localStorage` y con copias de seguridad `.json` anteriores.
4. **Calendario con listado completo de días trabajados:** Barra rápida de acción para el día seleccionado seguida del listado completo de todos los días trabajados del mes visible en orden cronológico descendente (más recientes primero).
5. **Estadísticas del mes actual, predicciones y simulador:**
   - Sub-vista **Mes actual**: tarjeta de actividad y ritmos del ciclo (días trabajados frente a libres, media de horas por día trabajado, ingreso neto medio por turno y tarifa media neta real `€/h`), gráfico interactivo del ciclo alternable entre **Por días** / **Por semanas** y entre **Horas** / **Neto (€)**, desglose por categoría y comparativa Bruto vs. Neto.
   - Sub-vista **Predicciones**: proyección automática al cierre del ciclo (teniendo en cuenta días transcurridos, días restantes y turnos futuros ya agendados), ritmo requerido por día o semana para alcanzar las metas del mes y simulador interactivo rápido por horas o turnos extra eligiendo evento/tarifa o tarifa media actual.
   - Sub-vista **Historial**: evolución intermensual de los últimos 6 ciclos y variación porcentual respecto al ciclo inmediato anterior.
6. **Reorganización y orden estricto en las 4 pestañas:**
   - **Turnos**: resumen ejecutivo compacto (totales neto/bruto/horas/turnos y progreso de metas con botón de edición rápida, sin bloque cobrado/pendiente ni botón duplicado de «Registrar turno»), barra de plantillas rápidas y listado filtrable por texto y categoría.
   - **Calendario**: cuadrícula mensual, barra rápida del día seleccionado y lista descendente de todos los días trabajados del mes visible.
   - **Estadísticas**: selector segmentado superior con 3 sub-vistas (`Mes actual`, `Predicciones`, `Historial`).
   - **Ajustes**: selector segmentado superior con 3 sub-vistas (`Eventos`, `Ciclo y metas`, `Informes y datos`, trasladando aquí la exportación de informes CSV/PDF/TXT junto con las copias de seguridad JSON).

---

## Reglas de negocio

### RN1. Resolución de metas por ciclo (`YYYY-MM`)
- **Identificador estable de ciclo para metas:** Cada ciclo laboral se vincula a su ancla mensual `YYYY-MM` (formada por `anchorYear` y `anchorMonth` de `CycleWindow`, por ejemplo `"2026-11"` para noviembre o para el ciclo que arranca en noviembre). De este modo, si el usuario cambia el día de inicio de ciclo (`cycleStartDay`), no pierde las metas configuradas por mes.
- **Prioridad de resolución:**
  1. Si existe una entrada personalizada para la clave `YYYY-MM` en `monthlyGoalOverrides`, el ciclo utiliza los valores `netEuros` y `hours` de dicha entrada. Si el usuario guarda explícitamente `null` en alguno o ambos campos dentro de esa entrada, ese mes concreto queda sin meta aunque exista una meta base global.
  2. Si no existe entrada personalizada para `YYYY-MM`, el ciclo hereda `monthlyGoalNetEuros` y `monthlyGoalHours` (la meta base por defecto).
- **Restablecimiento:** El usuario puede eliminar la personalización de un mes concreto en cualquier momento para que vuelva a heredar la meta base por defecto.
- **Estabilidad de navegación:** Guardar o modificar metas (base o de un mes concreto) nunca debe reiniciar ni cambiar el ciclo activo que el usuario está consultando en la cabecera.

### RN2. Eliminación completa de «Cobrado / Pendiente» y migración sin pérdida de datos
- **Alcance de retirada:** Se elimina `paymentStatus` y cualquier control asociado en:
  - El resumen principal de `Turnos` (desaparecen las tarjetas «Cobrado» y «Pendiente» y el botón «Marcar todo el ciclo como cobrado», dejando la tarjeta más limpia y compacta).
  - Las filas de turnos en `Turnos` y `Calendario` (desaparece el botón individual `Cobrado`/`Pendiente`).
  - El formulario de crear/editar turno (desaparece el desplegable «Estado de cobro»).
  - Los filtros del listado de turnos (desaparece el selector `Todos / Pendientes / Cobrados`, conservando el buscador por texto y el filtro por categoría).
  - La tarjeta de exportación de informes (desaparece el filtro por estado de cobro, conservando el filtro por categoría) y los informes generados:
    - En **CSV**, se elimina la columna `Estado cobro` y las filas `Importe Cobrado` / `Importe Pendiente`, incluyendo en su lugar `Tarifa media neta (€/h)` en el resumen.
    - En **PDF** y **TXT**, se eliminan la columna/etiqueta de estado de cobro y las líneas `Cobrado` / `Pendiente`, mostrando en el resumen la **Tarifa media neta (`€/h`)** del ciclo.
- **Migración transparente en dispositivo (`localStorage`):** Al cargar registros previamente guardados en `shiftlog-db-v1` que aún contengan el campo legado `paymentStatus`, el store los hidrata conservando intactos todos los eventos y turnos y descartando silenciosamente esa propiedad obsoleta. Ningún turno ni evento existente se pierde.

### RN3. Vista de calendario y agenda mensual de días trabajados
- **Cuadrícula mensual:** Mantiene el diseño de lunes a domingo con intensidad por horas trabajadas y puntos de color por categoría. Al pulsar cualquier celda, se actualiza `selectedDate`.
- **Barra rápida del día seleccionado:** Inmediatamente debajo del calendario se muestra una barra compacta con la fecha seleccionada (`selectedDate`), un resumen rápido (número de turnos, horas y neto si tiene registros, o «Sin actividad registrada» si está vacío) y el botón directo **«Añadir turno en este día»**.
- **Listado completo de días trabajados del mes visible:** Debajo de la barra del día seleccionado se muestran todos los días con al menos un turno dentro del mes natural visible en la cuadrícula (`calYear`, `calMonth`), ordenados de forma **cronológica descendente** (los días trabajados más recientes arriba y los más antiguos abajo).
- **Cabecera resumen y resaltado:** El listado incluye una cabecera resumen del mes visible (total de días trabajados, horas facturables e importe neto) y resalta visualmente la tarjeta del día que coincide con `selectedDate` cuando dicho día tiene registros, manteniendo las acciones de edición, clonado, repetición y borrado de cada turno.

### RN4. Métricas del mes actual y gráfico diario/semanal
- **Conteo de días del ciclo:** Se calculan los días naturales totales de la ventana `[cycle.startDate, cycle.endDate]`. Los `días trabajados` corresponden al número de fechas únicas con al menos un turno dentro del ciclo, y los `días libres` son `totalDays - workedDays`.
- **Indicadores de actividad y ritmos:**
  - **Media de horas por día trabajado:** `totalBillableMinutes / workedDays` (`0` si `workedDays === 0`).
  - **Ingreso neto medio por día trabajado:** `totalNetEarned / workedDays` (`0` si `workedDays === 0`).
  - **Ingreso neto medio por turno:** `totalNetEarned / totalShifts` (`0` si `totalShifts === 0`).
  - **Tarifa media neta real (`€/h`):** `effectiveHourlyNetRate`.
- **Serie diaria del ciclo:** Genera un punto por cada día natural desde `cycle.startDate` hasta `cycle.endDate` con sus minutos computables, importe neto, cantidad de turnos e indicador de si es el día actual.
- **Serie semanal del ciclo:** Agrupa los días del ciclo en bloques semanales ordenados (`Sem 1` a `Sem 4` o `Sem 5`), respetando cortes semanales de lunes a domingo dentro de la ventana del ciclo, acumulando minutos computables, importe neto y turnos de cada semana.
- **Gráfico interactivo del mes:** Permite alternar con controles segmentados entre vista **Por días** / **Por semanas** y entre magnitud **Horas** / **Neto (€)** sobre los mismos datos del ciclo activo.

### RN5. Predicciones del ciclo y simulador interactivo
- **Clasificación temporal del ciclo respecto a hoy (`todayIso`):**
  - **Ciclo en curso** (`cycle.startDate <= todayIso <= cycle.endDate`): se cuentan los `días transcurridos` (desde `cycle.startDate` hasta `todayIso`, inclusive) y los `días restantes` (desde mañana hasta `cycle.endDate`).
  - **Ciclo pasado** (`cycle.endDate < todayIso`): todos los días están transcurridos (`0` días restantes) y los totales finales coinciden con lo ya registrado.
  - **Ciclo futuro** (`cycle.startDate > todayIso`): `0` días transcurridos y todos los días restantes; se contabilizan los turnos ya agendados si existen.
- **Separación entre devengado hasta hoy y ya agendado:**
  - Los turnos del ciclo con fecha `<= todayIso` suman al bloque devengado hasta hoy.
  - Los turnos del ciclo con fecha `> todayIso` suman al bloque ya agendado en el ciclo.
- **Proyección automática al cierre (en ciclos en curso):**
  - Se calcula el ritmo medio diario hasta hoy (`earnedToDate / elapsedDays` y `minutesToDate / elapsedDays`).
  - Para los días restantes se toma como proyección base el mayor entre el ritmo diario proyectado sobre los días restantes y el total de turnos futuros ya agendados, sumado a lo devengado hasta hoy, mostrando de forma transparente lo ya ganado, lo agendado y el cierre estimado.
- **Ritmo necesario para alcanzar las metas:**
  - Si el ciclo tiene meta neta en euros pendiente (`remainingEuros > 0`) o meta de horas pendiente (`remainingGoalMinutes > 0`) y quedan días restantes (`remainingDays > 0`), se calcula cuánto es necesario por cada día restante y por semana restante, además del número aproximado de turnos equivalentes según la duración media del usuario (o `6 h` si aún no hay turnos).
- **Simulador interactivo rápido:**
  - Permite simular trabajo adicional eligiendo el modo (**Horas extra** o **Turnos extra**), la cantidad numérica y la referencia de tarifa (**Tarifa media actual del ciclo** o cualquiera de los eventos activos con selección de tipo de jornada: `Normal`, `Festivo`, `Nocturno`, `Hora extra`).
  - En modo **Turnos extra**, permite ajustar las horas por turno (precargadas con la duración media actual del ciclo, la primera plantilla del evento o `6 h` por defecto).
  - Calcula y muestra al instante el incremento neto (`+€`), incremento de horas (`+h`), el nuevo total proyectado del ciclo y el nuevo porcentaje de cumplimiento de las metas mensuales sin alterar ningún dato guardado.

### RN6. Compatibilidad del formato JSON de copia de seguridad
- El esquema mantiene `version: 1` en `ShiftLogDatabase`.
- El campo `settings.monthlyGoalOverrides` es opcional en la entrada para garantizar compatibilidad total con copias exportadas antes de esta mejora (si falta, se inicializa vacío `{}`).
- Al validar un backup, cada entrada válida de `monthlyGoalOverrides` exige clave `YYYY-MM` y valores `netEuros` y `hours` numéricos positivos o `null`.
- Los turnos importados desde copias antiguas que incluyan `paymentStatus` son aceptados sin error y sanitizados omitiendo ese campo legado; los turnos de copias nuevas no incluyen `paymentStatus`.
- Al combinar bases de datos (`mergeDatabases`), `monthlyGoalOverrides` combina sus claves sin perder personalizaciones existentes (priorizando la configuración actual si la misma clave `YYYY-MM` existe en ambos, o añadiendo las claves nuevas del archivo entrante).

---

## Criterios de aceptación

- [x] **AC01 (Metas personalizadas por mes):** Puedo definir una meta mensual neta (`€`) y/o de horas distinta para cada mes/ciclo (por ejemplo noviembre, diciembre y enero) sin que cambiar la meta de un mes modifique los demás.
- [x] **AC02 (Herencia de meta base y desactivación):** Si un mes no tiene meta personalizada, hereda automáticamente la meta base por defecto; además, puedo desactivar explícitamente la meta de un mes concreto o restablecerlo para que vuelva a usar la meta base.
- [x] **AC03 (Edición rápida de meta desde Turnos):** Desde la tarjeta resumen de la pestaña `Turnos` dispongo de un acceso directo para editar, desactivar o restablecer la meta del ciclo activo en una hoja inferior sin salir de la pestaña, y guardar metas no cambia el ciclo activo seleccionado.
- [x] **AC04 (Orden en Turnos y retirada total de «Cobrado / Pendiente»):** La tarjeta resumen de `Turnos` muestra los totales (neto, tiempo, turnos, bruto) y el progreso de metas de forma compacta sin el bloque «Cobrado / Pendiente» ni el botón duplicado «Registrar turno»; tampoco aparece ningún control ni columna de «Cobrado / Pendiente» en filas de turnos, formulario, filtros ni informes (CSV, PDF y TXT muestran la tarifa media neta `€/h` en el resumen).
- [x] **AC05 (Calendario con barra rápida y agenda completa):** En la pestaña `Calendario`, debajo de la cuadrícula aparece una barra compacta con el día seleccionado y el botón «Añadir turno en este día», seguida de todos los días trabajados del mes visible ordenados cronológicamente de forma descendente (más recientes primero).
- [x] **AC06 (Interacción día seleccionado en Calendario):** Al pulsar un día en el calendario, la barra rápida refleja esa fecha permitiendo crear turnos incluso en días vacíos, y si el día tiene registros, su tarjeta en el listado inferior queda resaltada visualmente.
- [x] **AC07 (Sub-vistas en Estadísticas):** La pestaña `Estadísticas` cuenta con un selector segmentado superior con 3 sub-vistas ordenadas: `Mes actual`, `Predicciones` e `Historial`, sin incluir la tarjeta de exportación de informes.
- [x] **AC08 (Métricas y gráfico del mes actual):** En `Estadísticas > Mes actual` puedo consultar los días trabajados frente a libres, media de horas por día trabajado, ingreso medio por turno y tarifa media real, junto a un gráfico interactivo alternable entre `Por días` / `Por semanas` y `Horas` / `Neto (€)`, el desglose por categoría y la comparativa Bruto vs. Neto.
- [x] **AC09 (Predicciones y ritmo para metas):** En `Estadísticas > Predicciones` veo la proyección automática al cierre del ciclo (separando lo devengado hasta hoy y los turnos ya agendados) y el ritmo necesario por día/semana y turnos equivalentes para cumplir las metas del mes.
- [x] **AC10 (Simulador interactivo):** En `Estadísticas > Predicciones` puedo simular horas extra o turnos extra eligiendo mi tarifa media actual o cualquier evento activo y tipo de jornada, viendo al instante el impacto en ingresos netos, horas totales y porcentaje de metas sin guardar cambios reales.
- [x] **AC11 (Orden en Ajustes y traslado de informes):** La pestaña `Ajustes` se organiza mediante un selector segmentado en 3 sub-vistas (`Eventos`, `Ciclo y metas`, `Informes y datos`), donde `Ciclo y metas` permite configurar la meta base y las metas por mes, e `Informes y datos` reúne la exportación CSV/PDF/TXT (filtrable por categoría y manteniendo la impresión PDF) junto con las copias de seguridad JSON.
- [x] **AC12 (Compatibilidad sin pérdida de datos, pruebas y reglas de diseño):** Los datos ya guardados en `localStorage` y los backups JSON antiguos (con `paymentStatus` y sin `monthlyGoalOverrides`) se cargan e importan sin error ni pérdida de registros; se mantiene `JetBrains Mono` con `tabular-nums`, Dark Mode OLED sin gradientes ni emojis, áreas táctiles `>= 44x44px` y la suite de tests más el build de producción pasan al 100 %.

---

## Fuera de alcance

- Seguimiento de cobros, pagos recibidos, recibos o estados «Cobrado / Pendiente».
- Sincronización en la nube, cuentas de usuario o almacenamiento remoto.
- Modelos estadísticos complejos con estacionalidad anual automática o machine learning.
- Librerías externas de gráficos de gran tamaño: todas las gráficas se renderizan con componentes React + HTML/CSS/SVG ligero sobre los tokens de [`DESIGN.md`](file:///c:/.d/shiftlog/DESIGN.md).
- Cambio de divisas (se mantiene exclusivamente el euro `€`).

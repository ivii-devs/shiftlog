# Spec: Shift Log — Registro de Turnos y Control de Ingresos (Feature 01 / MVP)

## Por qué

Quienes trabajan por turnos o en eventos de duración temporal (hostelería, eventos, logística, guardias, refuerzos o proyectos por horas) suelen combinar distintas categorías de trabajo, cada una con sus propias condiciones: tarifas diferentes, descansos no remunerados que a veces se descuentan y a veces no, recargos por festivo o nocturnidad, mínimos de horas garantizadas por convocatoria o gastos de desplazamiento.

Llevar este control en notas sueltas o en hojas de cálculo manuales hace que sea tedioso apuntar cada jornada desde el móvil y provoca errores frecuentes cuando una tarifa cambia de un mes a otro o cuando el cierre de facturación no coincide con el día 1 del mes.

**Shift Log** nace para resolver este problema mediante una aplicación web instalable (PWA), rápida, sin cuentas ni servidores externos, que permite registrar un turno en segundos y conocer en todo momento cuánto dinero neto se lleva ganado en el ciclo actual, cuánto falta para cumplir el objetivo del mes y qué turnos están pendientes de cobro.

---

## Alcance

1. **Gestión de eventos / categorías de trabajo:** Creación, edición y archivado de eventos con configuración propia de tarifas (neta y bruta), descansos, redondeo, mínimo de horas, multiplicadores y plantillas de turnos rápidos.
2. **Registro ágil de jornadas:** Introducción de turnos por rango horario o mediante botones de acceso rápido (1 toque), permitiendo múltiples turnos en un mismo día y gestión rápida de registros pasados (duplicar, clonar hoy o repetir en varios días del mes).
3. **Motor de cálculo e inmutabilidad histórica:** Cálculo automático de horas e importes (neto y bruto) conservando en cada registro el precio y las reglas exactas vigentes ese día.
4. **Control de ciclos, metas y cobros:** Cierre de ciclo laboral configurable, objetivos mensuales (en euros y/o en horas) con ritmo de progreso, y estado de pago (pendiente o cobrado) por turno o por ciclo completo.
5. **Visualización y analítica clara:** Calendario mensual con indicadores por categoría e intensidad de horas, comparativa intermensual (últimos 6 ciclos), desglose de ingresos por evento, estadística bruto vs. neto y buscador por notas.
6. **Portabilidad y exportación local-first:** Copia de seguridad completa en `.json` (con validación e importación por reemplazo o combinación) y exportación de informes en Excel (`.xlsx`/`.csv`), PDF y TXT (descarga y copiado rápido al portapapeles).

---

## Reglas de negocio

### 1. Eventos y categorías de trabajo
- **Campos de configuración por evento:**
  - **Nombre y color identificativo:** Nombre del trabajo/evento y color elegido de la paleta del sistema.
  - **Tarifas independientes:**
    - **Tarifa neta por hora (`€/h neto`):** Campo obligatorio. Se utiliza para todos los cálculos principales de ganancias y metas.
    - **Tarifa bruta por hora (`€/h bruto`):** Campo opcional. Si se indica, sirve para calcular la estadística de total facturado (bruto) y el porcentaje estimado de retención/descuento:
      $$\text{Descuento estimado (\%)} = \frac{\text{Bruto} - \text{Neto}}{\text{Bruto}} \times 100$$
      Si no se especifica tarifa bruta en un evento, su valor bruto computa igual al neto (`0 %` de diferencia).
  - **Descanso no remunerado:** Interruptor para activar si este evento permite descontar pausas, acompañado de un valor de **minutos de descanso por defecto** (ej. `30 min`) que se precarga automáticamente al registrar un turno de este evento.
  - **Mínimo de horas garantizadas por convocatoria (opcional):** Si se define (ej. `4 h`) y la duración neta trabajada en un turno es inferior a ese mínimo, las horas computables para el cobro se elevan automáticamente a dicho mínimo garantizado.
  - **Redondeo de bloques de tiempo:** Opción por evento entre `Sin redondeo` (por defecto), `Redondeo a 15 min` o `Redondeo a 30 min`.
  - **Multiplicadores de tarifa especial:** Factores configurables en el evento para jornadas marcadas como **Festivo** (por defecto `x1.5`), **Nocturno** (por defecto `x1.25`) u **Hora extra** (por defecto `x1.5`).
  - **Plantillas de turnos rápidos:** Lista de accesos directos vinculados al evento (ej. *"Mañana 08:00 - 16:00"*, *"Noche 22:00 - 06:00"*) para crear el registro con un solo toque.
  - **Estado del evento (`Activo` / `Archivado`):** Los eventos archivados dejan de aparecer en los selectores de creación diaria de turnos, pero mantienen intactos todos sus registros históricos y su presencia en estadísticas de meses pasados.

### 2. Registro de tiempo y turnos
- **Rango horario (modo predefinido):** El usuario indica la fecha, el evento, la hora de entrada (`HH:MM`) y la hora de salida (`HH:MM`).
- **Turnos nocturnos que cruzan la medianoche:** Si la hora de salida es menor o igual que la de entrada (ej. entrada `22:00`, salida `04:00`), el sistema interpreta automáticamente que el turno finaliza al día siguiente (`6 horas` de duración) y **asigna el turno íntegro al día de inicio**.
- **Múltiples turnos por día:** Se permite registrar varios turnos en una misma fecha (ya sean del mismo evento en horario partido o de eventos distintos).
- **Modificadores por jornada:** En cada turno se puede seleccionar el tipo de jornada (`Normal`, `Festivo`, `Nocturno`, `Hora extra`) y, opcionalmente, añadir un **plus fijo de jornada (`+€`)** o un **gasto/suplido asociado (`+€` o `-€`)**, como `-3,50 €` de transporte o `+10,00 €` de dieta.
- **Notas por sesión:** Cada registro admite una nota corta de texto libre para facilitar búsquedas posteriores.
- **Gestión rápida de registros pasados:** Desde cualquier turno registrado (deslizando la fila o abriendo sus acciones rápidas), el usuario puede:
  1. **Clonar en hoy:** Crea una copia exacta del turno con fecha del día actual.
  2. **Duplicar:** Crea una copia en la misma fecha o permite elegir otra fecha puntual.
  3. **Repetir en varios días del mes:** Abre un selector de días del calendario mensual para replicar ese mismo turno de golpe en todos los días seleccionados.

### 3. Orden de cálculo e inmutabilidad histórica
- **Secuencia exacta de cálculo de un turno:**
  1. **Duración bruta del rango:** Diferencia en minutos entre la hora de entrada y la de salida.
  2. **Resta de descanso:** Si el evento tiene descanso habilitado, se restan los minutos de descanso indicados en el turno (nunca pudiendo resultar en una duración menor a `0`).
  3. **Redondeo de bloque:** Si el evento tiene configurado redondeo a `15` o `30` minutos, se aplica al tiempo resultante.
  4. **Mínimo garantizado:** Si las horas resultantes son inferiores al mínimo garantizado del evento, se elevan al mínimo garantizado para el cálculo económico.
  5. **Importe base (Neto y Bruto):**
     $$\text{Importe Base Neto} = \text{Horas Computables} \times \text{Tarifa Neta Histórica} \times \text{Multiplicador Histórico}$$
     $$\text{Importe Base Bruto} = \text{Horas Computables} \times \text{Tarifa Bruta Histórica} \times \text{Multiplicador Histórico}$$
  6. **Ajustes fijos del turno (Pluses y Gastos/Suplidos):** Se suman los pluses fijos y se suman o restan los suplidos/gastos directos del día para obtener el **Total Neto del Turno** y el **Total Bruto del Turno**, redondeados a 2 decimales.
- **Foto histórica inmutable:** Al guardar el turno, quedan grabados dentro del propio registro su tarifa neta, tarifa bruta, multiplicador, reglas aplicadas e importe final. Si días o meses después el usuario edita el evento y sube la tarifa por hora, ningún registro existente cambia su valor a menos que el usuario edite ese registro concreto y elija actualizar su tarifa.

### 4. Ciclo laboral, cobros y metas mensuales
- **Cierre de ciclo global:** En los ajustes generales se define el día de inicio del ciclo mensual (por defecto el día `1`). Si el usuario configura el día `25`, el ciclo va desde el día `25` de un mes hasta el día `24` del mes siguiente, gobernando todas las vistas de resumen, metas y estadísticas mensuales.
- **Estado de cobro (`Pendiente` vs. `Cobrado`):**
  - Cada turno tiene su estado de cobro individual.
  - Existe una acción rápida a nivel de ciclo para **"Marcar todo el ciclo como cobrado"** (o revertirlo a pendiente).
- **Meta mensual y ritmo actual:**
  - El usuario puede fijar un objetivo global para el ciclo en **euros netos** (ej. `500 €`), en **horas** (ej. `40 h`), o ambos.
  - Se muestra una barra de progreso visual con el porcentaje completado.
  - Para objetivos financieros en euros, el sistema calcula automáticamente cuántas horas de trabajo faltan para alcanzar la meta al ritmo actual dividiendo los euros restantes entre la **tarifa media neta por hora real del ciclo en curso** (o, si aún no hay turnos registrados en el ciclo, usando la tarifa neta del evento activo principal).

### 5. Calendario, estadísticas y filtros
- **Calendario mensual:** Muestra los días de la semana (empezando en lunes). Cada día trabajado presenta puntos del color de las categorías registradas ese día y una intensidad visual proporcional al total de horas trabajadas en esa fecha. Al tocar un día se listan sus turnos y el resumen diario.
- **Estadísticas del ciclo e intermensuales:**
  - Indicador de variación porcentual respecto al ciclo inmediato anterior (ej. `+12 % de horas` y `+15 % de ingresos netos respecto al ciclo anterior`).
  - Gráfico de barras limpio con la evolución de los **últimos 6 ciclos**.
  - Desglose por categoría/evento indicando horas, importe neto e importe porcentual sobre el total del ciclo.
  - Bloque **Bruto vs. Neto** mostrando el total facturado bruto, el total limpio neto, la diferencia en euros y el porcentaje de retención/descuento estimado medio.
- **Buscador y filtros:** En la lista de turnos se puede buscar en tiempo real por el texto de las notas, filtrar por evento/categoría y filtrar por estado de cobro (`Todos`, `Pendientes`, `Cobrados`).

### 6. Copia de seguridad e informes
- **Copia de seguridad (`.json`):**
  - **Exportar:** Descarga un archivo `.json` con todos los eventos, turnos, plantillas y ajustes.
  - **Importar:** Valida estrictamente el esquema del archivo antes de tocar los datos locales. Si el archivo es inválido o está corrupto, muestra un error claro sin alterar nada. Si es válido, permite elegir entre **"Reemplazar toda la base de datos"** o **"Combinar registros"** (añadiendo o actualizando por identificador sin duplicar).
- **Exportación de informes (del ciclo o filtro activo):**
  - **Excel (`.xlsx` / `.csv`):** Con codificación UTF-8 con BOM y formato numérico español para que se abra directamente en Excel con columnas separadas y sin errores de tildes ni símbolos.
  - **PDF:** Documento limpio y estructurado listo para guardar, imprimir o compartir con el resumen del ciclo, desglose por categoría y tabla detallada de turnos.
  - **TXT:** Resumen legible en texto plano con dos opciones directas: descargar archivo `.txt` o **"Copiar resumen al portapapeles"** con un toque para pegarlo directamente en WhatsApp, Telegram o correo electrónico.

---

## Criterios de aceptación

### Eventos y configuración
- [x] **AC1:** Puedo crear, editar y archivar eventos/categorías indicando nombre, color, tarifa neta (€/h obligatoria), tarifa bruta (€/h opcional), descanso no remunerado (sí/no + minutos por defecto), redondeo (`Sin redondeo`, `15 min`, `30 min`), mínimo de horas garantizadas, multiplicadores (`Festivo`, `Nocturno`, `Hora extra`) y plantillas de turnos rápidos.
- [x] **AC2:** Al archivar un evento, este deja de mostrarse como opción al registrar nuevos turnos, pero todos sus turnos pasados e importes siguen apareciendo intactos en el historial y en las estadísticas.

### Registro de turnos y productividad
- [x] **AC3:** Al introducir hora de entrada y hora de salida, la duración se calcula al instante; si la hora de salida es anterior o igual a la de entrada (ej. `22:00` a `04:00`), se calcula correctamente como turno nocturno que cruza la medianoche (`6 h`) y queda asignado al día de inicio.
- [x] **AC4:** Si el evento seleccionado tiene habilitado el descanso no remunerado, el campo de minutos de descanso aparece precargado con el valor por defecto del evento y se resta automáticamente de la duración del turno.
- [x] **AC5:** Puedo registrar un turno con un solo toque pulsando cualquiera de los botones de acceso rápido (plantillas) configurados en el evento.
- [x] **AC6:** Puedo registrar más de un turno en el mismo día (del mismo o de distinto evento) y ambos suman correctamente en el día y en el ciclo.
- [x] **AC7:** Desde un registro pasado puedo clonarlo en el día de hoy, duplicarlo en otra fecha o seleccionar múltiples días de un calendario mensual para repetirlo en bloque.

### Tarifas, cálculos e histórico
- [x] **AC8:** Cada turno aplica correctamente el orden de cálculo: `(rango horario - descanso) -> redondeo de bloque -> mínimo de horas garantizadas -> multiplicador de tarifa (Normal/Festivo/Nocturno/Extra) -> suma/resta de plus fijo o gasto/suplido del día`.
- [x] **AC9:** Si modifico la tarifa (€/h neto o bruto) o las reglas de un evento que ya tiene turnos registrados en el pasado, los importes de los turnos anteriores no se modifican en ningún caso.

### Ciclos, cobros y metas
- [x] **AC10:** Puedo cambiar el día de cierre/inicio de ciclo laboral (ej. día `25`) y todas las métricas del ciclo actual, metas y comparativas pasan a agrupar los turnos desde el día `25` hasta el `24` del mes siguiente.
- [x] **AC11:** Puedo marcar o desmarcar como `Cobrado` un turno individual o todos los turnos de un ciclo completo con una sola acción, diferenciándose visualmente el importe ya cobrado del pendiente.
- [x] **AC12:** Si configuro una meta mensual en euros netos y/o en horas, veo una barra de progreso actualizada y el cálculo exacto de cuántas horas me faltan para alcanzar el objetivo en euros según la tarifa media neta por hora real del ciclo.

### Visualización, calendario y estadísticas
- [x] **AC13:** En el calendario mensual, cada día trabajado muestra los puntos de color de las categorías de ese día y una intensidad visual acorde al total de horas trabajadas; al pulsar el día veo el desglose de sus turnos.
- [x] **AC14:** En la vista de estadísticas puedo consultar la variación porcentual respecto al ciclo anterior, un gráfico de barras de los últimos 6 ciclos, el porcentaje de ingresos por categoría y la comparativa Bruto vs. Neto con su porcentaje de descuento estimado.
- [x] **AC15:** Puedo añadir una nota corta a cualquier turno y filtrar el listado de turnos por texto de la nota, por categoría y por estado de cobro (`Pendiente` / `Cobrado`).

### Backup, exportación y calidad PWA
- [x] **AC16:** Puedo exportar toda la base de datos a un archivo `.json` e importarla; si intento importar un `.json` mal formado o con estructura inválida, la aplicación bloquea la importación mostrando un mensaje claro sin corromper ni borrar los datos existentes.
- [x] **AC17:** Al importar un `.json` válido, puedo elegir entre reemplazar toda la base de datos o combinar los registros con los actuales.
- [x] **AC18:** Puedo exportar el informe del ciclo en Excel (`.xlsx`/`.csv`), en PDF y en TXT (incluyendo botón para copiar el resumen en texto directamente al portapapeles).
- [x] **AC19:** Todos los importes, horas, porcentajes y fechas numéricas se visualizan con fuente monoespaciada (`JetBrains Mono`) y números tabulares (`tabular-nums`), sobre diseño Dark Mode OLED y cumpliendo las reglas táctiles (`>= 44x44px`, *Viewport Pinning* y áreas seguras en móvil).

---

## Fuera de alcance

Para preservar la simplicidad del proyecto (**KISS / YAGNI**), queda expresamente excluido del alcance:

- **Cronómetro en vivo (Start / Pause / Stop en tiempo real):** Todo el registro se realiza por rango horario de entrada/salida o mediante plantillas de acceso rápido.
- **Cuentas de usuario, autenticación o sincronización en la nube:** No habrá backend, login ni bases de datos remotas.
- **Subtramos horarios con tarifas mixtas dentro de un único registro:** Un registro tiene un único multiplicador de jornada (si un día tuviera dos tramos con condiciones radicalmente distintas, se registran como dos turnos en el mismo día o se añade un plus fijo en euros).
- **Motor fiscal o contable oficial:** No se calculan tramos progresivos de IRPF estatal, cotizaciones complejas a la Seguridad Social ni bajas médicas; la relación bruto/neto se basa estrictamente en las tarifas bruta y neta introducidas por el usuario en cada evento.
- **Soporte multidivisa:** La aplicación trabaja exclusivamente en euros (`€`).
- **Notificaciones push o alarmas en segundo plano.**

---

## Decisiones cerradas en la fase de definición

Todas las preguntas abiertas iniciales han quedado resueltas y acordadas:

1. **Configuración Bruto vs. Neto:** Dos campos manuales independientes por evento (`€/h neto` obligatorio para el cálculo principal y `€/h bruto` opcional para estadísticas), guardando foto histórica de ambos en cada turno.
2. **Recargos y turnos nocturnos:** Modificador simple aplicable al turno completo (`Normal`, `Festivo`, `Nocturno`, `Hora extra`) más opción de plus/gasto fijo en `€`. Los turnos que cruzan la medianoche se computan íntegros en el día de inicio.
3. **Configuraciones adicionales por evento:** Se incluyen plantillas de turnos rápidos vinculados al evento, minutos de descanso por defecto, estado `Activo / Archivado`, mínimo de horas garantizadas por convocatoria y redondeo de bloques (`Sin redondeo`, `15 min`, `30 min`).
4. **Cierre de ciclo y metas:** Configuración global de inicio de ciclo (por defecto día `1`) y meta mensual global (en `€`, en horas o ambos), calculando las horas restantes para la meta financiera con la tarifa media neta real del ciclo actual.
5. **Exportación y Backup:** Exportación por ciclo/filtro en Excel, PDF y TXT (con botón de copiar al portapapeles), y Backup `.json` validado con modos de reemplazo total o combinación de registros.
6. **Diseño e interfaz:** Tema exclusivo Dark Mode OLED (`#050505` / `#0C0C0E`), acción primaria en blanco de alto contraste (`#FAFAFA`), esmeralda (`#10B981`) para indicadores financieros positivos, tipografía `Inter` + `JetBrains Mono` (`tabular-nums`), radios contenidos (`6px / 8px / 12px`) y navegación inferior de 4 pestañas (`Turnos`, `Calendario`, `Estadísticas`, `Ajustes`).

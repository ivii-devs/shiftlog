# Constitución del Proyecto: Shift Log

Este documento establece los principios innegociables que rigen el diseño, la arquitectura y la evolución de **Shift Log**. Cualquier decisión técnica, de producto o de interfaz debe subordinarse a estas reglas.

---

## 1. Simplicidad Radical (KISS y YAGNI)

1. **Sin sobreingeniería:** La lógica de negocio debe ser directa, predecible y fácil de leer. Se prohíben las abstracciones prematuras, los patrones empresariales innecesarios y las capas de indirección que no resuelvan un problema real inmediato.
2. **Solo lo necesario hoy (YAGNI):** No se implementarán funciones "por si acaso" en el futuro. Todo código escrito debe responder directamente a un criterio de aceptación definido en el `spec.md` de la feature correspondiente (`docs/specs/<feature>/spec.md`).
3. **Mantenibilidad por reducción:** Ante dos soluciones que cumplen el mismo requisito, siempre se elegirá la que requiera menos estado, menos dependencias y menos pasos para el usuario.

---

## 2. Arquitectura 100 % Local-First y Soberanía de Datos

1. **Cero servidores y cero cuentas:** La aplicación funciona íntegramente en el dispositivo del usuario. No existen registros de usuario, inicios de sesión, servidores externos ni bases de datos en la nube.
2. **Privacidad absoluta:** Ningún dato financiero, horario o nota personal abandona el dispositivo salvo cuando el propio usuario exporta voluntariamente un informe o una copia de seguridad.
3. **Resiliencia offline nativa:** Como Progressive Web App (PWA), todas las funciones de consulta, registro, cálculo y exportación deben operar sin conexión a internet.
4. **Portabilidad garantizada:** El usuario siempre podrá exportar la totalidad de su base de datos en un archivo `.json` estándar y restaurarla con validación previa de integridad.

---

## 3. Inmutabilidad Financiera Histórica

1. **Instantánea por registro (*Snapshot*):** Cada turno guardado almacena de forma inmutable los valores económicos con los que se calculó en ese día (tarifa neta €/h, tarifa bruta €/h, multiplicador aplicado, mínimo de horas y reglas de descuento/redondeo).
2. **Blindaje del pasado:** Editar las tarifas o reglas de un evento o categoría solo afecta a los turnos que se creen a partir de ese momento (o a aquellos turnos pasados que el usuario decida recalcular explícitamente uno a uno). Los cierres y estadísticas de meses anteriores jamás se alteran por cambiar la configuración de un evento.

---

## 4. Precisión Numérica y Estética Técnica OLED

1. **Rigor en el cálculo:** Todos los importes monetarios se expresan en euros (`€`) redondeados a dos decimales, y las duraciones se calculan con precisión de minutos enteros para evitar desviaciones de coma flotante.
2. **Alineación tabular obligatoria:** Todo número en pantalla (importes, horas, minutos, porcentajes, fechas y contadores) debe renderizarse con fuente monoespaciada técnica (`JetBrains Mono`) y propiedad `tabular-nums` para que ningún dígito baile ni pierda la alineación vertical en listas o tablas.
3. **Identidad Dark Mode OLED (Estilo Linear / Vercel):** La interfaz adopta exclusivamente un tema oscuro técnico sobre negro profundo (`#050505`), con superficies planas (`#0C0C0E`), bordes de un píxel (`#1F1F24`) y acción primaria en blanco de alto contraste (`#FAFAFA`).

---

## 5. Ergonomía Física en Móvil y WebKit PWA

1. **Anclaje físico del lienzo (*Viewport Pinning*):** El contenedor raíz se fija a los cuatro bordes físicos de la pantalla (`position: fixed; inset: 0`). Queda prohibido el uso de `100vh` o `100dvh` para dimensionar la estructura base de la aplicación.
2. **Ergonomía del pulgar (*Thumb-Zone*):** Las acciones primarias (registrar turno, usar plantillas rápidas, cambiar de vista) se ubican en la zona inferior de la pantalla, respetando siempre los márgenes seguros del dispositivo (`safe-area-inset-top` y `safe-area-inset-bottom`).
3. **Áreas táctiles mínimas:** Todo control interactivo (botones, selectores, celdas de calendario, acciones de fila) debe tener un tamaño físico mínimo de `44x44px`.

---

## 6. Tolerancia Cero al "AI Slop"

1. **Superficies limpias:** Prohibidos los gradientes decorativos, las manchas de color difuminadas en el fondo (*blurred blobs*), el *glassmorphism* en tarjetas de contenido y el anidamiento de tarjetas dentro de tarjetas (*card-in-card*).
2. **Sobriedad visual:** Los iconos se utilizan solo cuando aportan significado funcional o de navegación. Prohibido decorar cada título o botón con iconos redundantes.
3. **Lenguaje claro y directo:** Prohibidos los emojis en el copy de la interfaz, las palabras vacías de marketing y las rayas largas (*em dash*). Todos los títulos y botones utilizan *sentence case* ("Registrar turno", no "Registrar Turno") y verbos de acción concretos.

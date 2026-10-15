# Documentación de Interfaz Profesional, Experiencia de Usuario y Accesibilidad (Fase 4)

Este documento describe la arquitectura de interfaz de usuario, el sistema de diseño visual, los componentes reutilizables y las decisiones de accesibilidad (a11y) y diseño adaptativo (responsive) implementadas en la **CRM & Inventory Management Platform**.

---

## 1. Principios Visuales Aplicados

Para transformar la plataforma en una experiencia coherente y apta para un portafolio profesional de nivel de producción, se reemplazaron los gradientes estridentes y neón heredados por una estética sobria, refinada y consistente basada en las mejores prácticas de SaaS B2B moderno:

- **Paleta de Color Profesional y Semántica:**
  - **Superficies y fondos:** Escala oscura Slate (`slate-950` como lienzo principal, `slate-900/80` para tarjetas y contenedores elevados, `slate-800` para bordes sutiles y divisores).
  - **Acento de marca:** Cian sobrio (`cyan-500` / `cyan-400`) para elementos primarios de navegación y foco.
  - **Colores semánticos de estado:**
    - **Éxito (Success):** Esmeralda (`emerald-500` / `emerald-400`) para pedidos completados, stock óptimo, cobros totales y balances positivos.
    - **Advertencia (Warning):** Ámbar / Amarillo (`amber-500` / `amber-400`) para pedidos pendientes, pagos parciales y niveles de stock bajo.
    - **Peligro (Danger / Error):** Rosa / Carmesí (`rose-500` / `rose-400`) para cancelaciones, saldo pendiente, insumos faltantes en BOM y errores de validación.
    - **Informativo / Proceso:** Púrpura y Cian (`purple-400` / `cyan-400`) para auditorías, ensamblados y métricas secundarias.
- **Jerarquía Visual y Tipografía:**
  - Títulos principales en `text-2xl font-bold text-slate-100` con subtítulos descriptivos en `text-xs text-slate-400`.
  - Tarjetas con radios consistentes (`rounded-2xl` para contenedores de sección, `rounded-xl` para tarjetas internas y campos).
  - Eliminación de elementos decorativos innecesarios que comprometían la legibilidad de datos tabulares y financieros.

---

## 2. Componentes y Patrones Reutilizables Creados

Se centralizaron los patrones repetitivos en componentes modulares situados en `frontend/src/components/`:

### 2.1. `Badge` (`frontend/src/components/Badge.jsx`)

Indicador de estado compacto y consistente:

- **Variantes semánticas:** `success`, `warning`, `danger`, `info`, `cyan`, `purple`, `neutral`.
- **Características:** Soporta iconos opcionales, punto pulsante o estático (`dot`) y tamaño adaptable (`sm` / `md`).
- **Uso:** Estados de pedidos (Completado/Pendiente/Cancelado), estados de pago (Pagado/Parcial/Pendiente), tipos de producto (Materia Prima/Terminado) y badges de proceso.

### 2.2. `MetricCard` (`frontend/src/components/MetricCard.jsx`)

Tarjeta estandarizada para KPIs ejecutivos y comerciales:

- **Contenido:** Icono temático con contenedor tonal, título contextual, valor numérico destacado y subtítulo explicativo.
- **Estado de Carga:** Soporta indicador skeleton animado (`loading={true}`) para evitar saltos de layout (_Cumulative Layout Shift_).

### 2.3. `EmptyState` (`frontend/src/components/EmptyState.jsx`)

Representación visual pedagógica para colecciones sin registros:

- **Composición:** Icono ilustrativo en contenedor estilizado, título claro, descripción explicativa y botón de llamada a la acción (_Call to Action_) opcional.
- **Uso:** Tablas vacías de clientes, productos, pedidos, compras y proformas.

### 2.4. `Modal` Accesible WAI-ARIA (`frontend/src/components/Modal.jsx`)

Diálogo modal que cumple rigurosamente con las especificaciones WAI-ARIA:

- **Atributos:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`.
- **Control por Teclado:** Captura y maneja la tecla `Escape` para cerrar el diálogo.
- **Atrapamiento de Foco (Focus Trap):** Cicla la tecla `Tab` y `Shift+Tab` exclusivamente entre los controles interactivos dentro del diálogo.
- **Restauración de Foco:** Al desmontarse, devuelve automáticamente el foco al elemento interactivo que lo originó.
- **Cierre Accesible:** Botón con `aria-label="Cerrar modal"` y clic en backdrop.

### 2.5. `ToastContext` (`frontend/src/components/ToastContext.jsx`)

Centro de notificaciones contextuales:

- **Accesibilidad:** Región en vivo con `aria-live="polite"` y `role="status"` (o `role="alert"` para notificaciones de error).
- **Botón de descarte:** Incluye `aria-label="Cerrar notificación"` y temporizador de auto-cierre de 4 segundos.

### 2.6. Shell de Navegación y Layout (`frontend/src/App.jsx`)

Estructura semántica unificada para toda la aplicación:

- **Enlace de salto (_Skip Link_):** Enlace invisible para usuarios de teclado que se hace visible al recibir foco (`#main-content`).
- **Cabecera Semántica (`<header>`):** Muestra el contexto de la pantalla activa, el indicador del entorno demo y la acción de cerrar sesión accesible.
- **Contenedor Principal (`<main id="main-content" tabIndex={-1}>`):** Envuelve las 10 rutas funcionales con ancho máximo y espaciado adaptativo.

---

## 3. Decisiones de Accesibilidad (a11y)

1. **Criterios de Color y Contraste (Inspirados en WCAG 2.1 AA):**
   - El sistema prioriza la legibilidad cromática en fondos oscuros Slate-950/Slate-900 mediante textos primarios en `slate-100` y textos secundarios en `slate-300` y `slate-400`.
   - Se validaron labels asociados, foco visible (`:focus-visible`), diálogos modales accesibles con atrapamiento de foco, navegación por teclado y regiones ARIA mediante pruebas automatizadas (Vitest + Testing Library) y revisión manual de interfaz.
2. **Formularios y Controles:**
   - Todos los campos de entrada (`<input>`, `<select>`, `<textarea>`) cuentan con una etiqueta `<label>` asociada explícitamente mediante el atributo `htmlFor` y su respectivo `id`.
   - Cuando la etiqueta visual no es requerida por razones de diseño compacto (como en la barra de búsqueda global), se implementa mediante la clase accesible `.sr-only`.
3. **Botones y Acciones Interactivas:**
   - Todos los botones basados exclusivamente en iconos cuentan con un atributo `aria-label` descriptivo (p. ej., `aria-label="Cerrar modal"`, `aria-label="Abrir menú de navegación"`, `aria-label="Descargar PDF"`).
4. **Foco Visible (_Focus Visible_):**
   - Se configuró la directiva CSS global `:focus-visible` con anillo cian de 2 px y desplazamiento (`outline-offset: 2px`) en enlaces, botones y campos.
5. **No Depender Exclusivamente del Color:**
   - Los estados no se comunican únicamente con colores: se acompañan de texto explícito (p. ej., "Pagado", "Parcial ($X)", "Completado") e iconos semánticos asociados (CheckCircle, AlertTriangle, XCircle).
6. **Estructura Semántica de Tablas:**
   - Todas las tablas incluyen `<caption className="sr-only">` para tecnologías de asistencia y encabezados estructurados con `<th scope="col">`.

---

## 4. Comportamiento Responsive Validado

La interfaz fue diseñada y validada para operar fluidamente tanto en pantallas de escritorio grandes como en dispositivos móviles de ancho estrecho (~375 px):

- **Escritorio (>= 1024 px):**
  - Barra lateral de navegación fija (`w-64`) con accesos directos visibles a los 10 módulos, badge institucional de portafolio y botón de cierre de sesión accesible.
- **Móvil (< 1024 px y 375 px):**
  - La barra lateral se contrae automáticamente y se reemplaza por un botón de menú tipo hamburguesa con atributos `aria-expanded` y `aria-controls`.
  - Al abrirse, despliega un cajón lateral (_drawer_) animado con fondo semitransparente (_backdrop_), bloqueando clics accidentales en el contenido de fondo.
  - El menú móvil se cierra automáticamente al presionar `Escape`, pulsar el botón de cierre, hacer clic fuera del panel o navegar a otra ruta.
- **Adaptabilidad de Tablas:**
  - Las tablas complejas (Pedidos, Compras, Producción, Rentabilidad) se encuentran envueltas en contenedores `overflow-x-auto` con desplazamiento táctil suave, evitando desbordamientos de página (_page horizontal overflow_) y manteniendo la integridad de las columnas monetarias.
- **Tarjetas y Rejillas:**
  - Los tableros de métricas transicionan de 1 columna en móvil (`grid-cols-1`) a 2, 3 o 4 columnas en tabletas y escritorio (`sm:grid-cols-2 lg:grid-cols-4`).

---

## 5. Limitaciones Conocidas

1. **Tablas Financieras en Pantallas Extremadamente Pequeñas (< 360 px):**
   - Tablas que contienen más de 7 columnas (como la tabla de Pedidos con detalle de ítems, totales, estado de entrega, estado de pago y acciones) requieren desplazamiento horizontal horizontal explícito para evitar truncar cifras monetarias críticas.
2. **Gráficos Recharts en Dispositivos Móviles:**
   - Las series temporales de Recharts adaptan su ancho dinámicamente mediante `ResponsiveContainer`; sin embargo, en pantallas de menos de 375 px, las etiquetas del eje X pueden espaciarse o rotarse para evitar solapamientos cuando existen muchos periodos diarios activos.
3. **Persistencia Centralizada de Datos Corporativos:**
   - La configuración corporativa (nombre de empresa, NIT/RUC, teléfono, dirección, correo y sitio web) se persiste en el backend en la tabla relacional `settings` de SQLite mediante los endpoints autenticados `GET /configuracion` y `PUT /configuracion`, asegurando su consistencia tras recargas e inyectándose directamente en el maquetador de proformas PDF sin almacenar datos en el navegador.

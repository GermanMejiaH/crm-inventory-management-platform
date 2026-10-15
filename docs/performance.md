# Rendimiento, Optimización de Bundle y Code-Splitting

Este documento detalla la arquitectura de rendimiento, división de código (_code-splitting_), estrategias de carga diferida y métricas de compilación de la plataforma **CRM & Inventory Management Platform**.

---

## 1. Arquitectura de Optimización del Frontend

Para ofrecer una experiencia fluida, de baja latencia y con tiempos de carga mínimos, la interfaz implementa una estrategia modular en tres niveles:

### 1. Carga Diferida por Rutas (`React.lazy` + `Suspense`)

Las 10 vistas funcionales de la aplicación se desacoplan en fragmentos asíncronos independientes que solo se descargan cuando el usuario navega a su ruta correspondiente:

- `Dashboard.jsx` (`/`)
- `Clientes.jsx` (`/clientes`)
- `Productos.jsx` (`/productos`)
- `Produccion.jsx` (`/produccion`)
- `Compras.jsx` (`/compras`)
- `Pedidos.jsx` (`/pedidos`)
- `Proformas.jsx` (`/proformas`)
- `Reportes.jsx` (`/reportes`)
- `Configuracion.jsx` (`/configuracion`)
- `Login.jsx` (`/login`)

Durante la transición de ruta, se presenta un componente accesible `PageLoadingFallback` con roles WAI-ARIA (`role="status"`, `aria-live="polite"`, `aria-label="Cargando módulo"`).

### 2. Importación Dinámica de Librerías de Exportación

En `Reportes.jsx`, el motor de generación de hojas de cálculo Excel (`write-excel-file/browser`) no se incluye en el bundle principal ni en la carga de la vista de reportes. Se importa de manera asíncrona mediante `import("write-excel-file/browser")` únicamente cuando el usuario hace clic en el botón **"Exportar XLSX"**, ahorrando ancho de banda y memoria.

### 3. Desacoplamiento de Dependencias de Proveedores (_Vendor Chunks_)

En `vite.config.js`, se configuró `manualChunks` en Rollup para agrupar librerías externas en bloques reutilizables y altamente cacheables por el navegador:

- **`vendor-react`**: Núcleo de la aplicación (`react`, `react-dom`, `react-router-dom`).
- **`vendor-recharts`**: Motor de visualización y gráficos estadísticos (`recharts`).
- **`vendor-icons`**: Biblioteca de iconografía SVG vectorial (`lucide-react`).

---

## 2. Métricas y Comparativa de Rendimiento

| Métrica                                | Antes de Optimización                | Después de Optimización                                 | Impacto / Beneficio     |
| :------------------------------------- | :----------------------------------- | :------------------------------------------------------ | :---------------------- |
| **Estrategia de Empaquetado**          | Chunks monolíticos sin división      | Code-splitting + Dynamic imports                        | 22 fragmentos modulares |
| **JavaScript Inicial (sin comprimir)** | 1,053.33 kB (~1.05 MB)               | **~210 kB** (`index` + `vendor-react` + `vendor-icons`) | **-80.0% de reducción** |
| **Transferencia Inicial (gzip)**       | 306.38 kB                            | **~67.8 kB**                                            | **-77.9% de ahorro**    |
| **Advertencia Vite > 500 kB**          | Presente (Warning amarillo en build) | **0 advertencias** (todos los chunks < 400 kB)          | 100% resuelto           |

---

## 3. Desglose de Fragmentos Generados en Producción

Compilación con Vite 6 + Tailwind CSS v4:

- **Shell Principal (`dist/assets/index-[hash].js`)**: ~15.3 kB (gzip: ~5.1 kB) — Shell del layout, navegación y enrutador.
- **Runtime React (`dist/assets/vendor-react-[hash].js`)**: ~181.2 kB (gzip: ~59.7 kB) — React 18 + React Router v7.
- **Iconos Vectoriales (`dist/assets/vendor-icons-[hash].js`)**: ~23.2 kB (gzip: ~5.2 kB) — Lucide React icons.
- **Gráficos Estadísticos (`dist/assets/vendor-recharts-[hash].js`)**: ~377.7 kB (gzip: ~111.1 kB) — Cargado solo en vistas analíticas.
- **Vistas Específicas**: Entre 1.2 kB y 40.8 kB por pantalla, cargadas exclusivamente bajo demanda.

---

## 4. Eficiencia en Tiempo de Ejecución

- **Cero Consultas Redundantes:** Implementación de debounce y control de estados de carga para evitar peticiones concurrentes duplicadas a la API.
- **Estilos Ultra-Rápidos:** Adopción del nuevo motor `@tailwindcss/vite` de Tailwind CSS v4 basado en LightningCSS, reduciendo drásticamente el tiempo de compilación (~4.8 segundos en frío) y el CSS final (~10.2 kB gzipped).

# Guía de Contribución y Estándares de Ingeniería

Gracias por tu interés en contribuir a **CRM & Inventory Management Platform**. Este proyecto está diseñado con altos estándares de calidad, seguridad y reproducibilidad técnica para servir como referencia de ingeniería full-stack.

---

## 1. Requisitos Previos

- **Node.js:** Versión 20.x LTS (especificada en [`.nvmrc`](.nvmrc)).
  Si utilizas `nvm` o `fnm`:
  ```bash
  nvm use
  ```
- **npm:** Versión 10.x o superior.
- **Sistema Operativo:** Windows, macOS o Linux.

---

## 2. Instalación Limpia y Configuración Inicial

El proyecto está dividido en dos aplicaciones independientes (`backend/` y `frontend/`). Para garantizar entornos idénticos y reproducibles, utilice siempre `npm ci`:

```bash
# 1. Instalar dependencias del backend
cd backend
npm ci

# 2. Instalar dependencias del frontend
cd ../frontend
npm ci

# 3. Generar base de datos demostrativa local (idempotente)
cd ../backend
npm run seed:demo
```

---

## 3. Flujo de Desarrollo

Ejecute los servidores de desarrollo en dos terminales independientes:

```bash
# Terminal 1: API Backend (puerto 4000)
cd backend && npm run dev

# Terminal 2: Interfaz Frontend con Vite (puerto 5173)
cd frontend && npm run dev
```

---

## 4. Estándares de Código y Calidad

### Estilo de Código y Formato

- **Módulos:** Se utiliza ECMAScript Modules (`import` / `export`) en todo el proyecto.
- **Formateador:** Prettier con reglas consistentes (2 espacios de indentación, comillas dobles, sin punto y coma redundante).
- **Linter:** ESLint con configuración estricta. Todo cambio debe mantener **cero errores y cero advertencias** (_zero warnings policy_).

### Accesibilidad (a11y) y Frontend

- **Criterios de Accesibilidad:** Diseñado con criterios inspirados en WCAG 2.1 AA (contraste tipográfico sobre fondo oscuro, foco visible con `:focus-visible`, modales con focus trap y etiquetas en controles interactivos).
- Todo diálogo modal debe implementar atrapamiento de foco (_focus trap_), soporte para tecla `Escape` y atributos WAI-ARIA (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
- Todo campo interactivo debe tener etiqueta `<label>` asociada por `id` o mediante `.sr-only`.
- El diseño debe responder fluidamente desde pantallas móviles (375 px) hasta escritorio (>= 1024 px).

### Pruebas Automatizadas

- **Backend:** Pruebas de integración y unitarias usando el ejecutor nativo `node --test` con assertions de `node:assert/strict`.
- **Frontend:** Pruebas de componentes y flujos de usuario con Vitest y `@testing-library/react`.
- **Aislamiento:** Ninguna prueba debe depender de bases de datos persistentes ni de red externa. Las pruebas de backend deben instanciar bases temporales efímeras en `os.tmpdir()` y eliminarlas al finalizar.

---

## 5. Reglas Innegociables de Seguridad de Datos

1. **Prohibición de Datos Reales:**
   - Nunca introduzca nombres de personas reales, razones sociales existentes, números de identificación fiscal, direcciones reales, teléfonos operativos ni correos electrónicos reales.
   - Utilice siempre el dominio reservado `.invalid` (RFC 2606) para correos de prueba (ej. `nombre@portfolio.invalid`).
2. **Prohibición de Secretos:**
   - Nunca confirme archivos `.env` reales, llaves privadas, certificados o tokens al repositorio.
   - Utilice `.env.example` únicamente con variables de ejemplo vacías o explicativas.
3. **Prohibición de Artefactos Persistentes:**
   - No guarde ni confirme bases SQLite (`*.db`, `*.sqlite`, `*-wal`, `*-shm`), exportaciones (`*.pdf`, `*.csv`, `*.xlsx`), volcados de registro (`*.log`) ni carpetas de compilación (`dist/`, `build/`).
   - Verifique que `.gitignore` mantenga bloqueados todos estos patrones.

---

## 6. Lista de Verificación Antes de Proponer Cambios

Antes de enviar cualquier cambio o _Pull Request_, verifique que todos los umbrales de calidad pasen satisfactoriamente:

Consulte la guía detallada de comandos en [**`docs/quality-gates.md`**](docs/quality-gates.md).

# Guía de Ejecución Local y Datos Demostrativos

Esta guía describe el procedimiento paso a paso para que cualquier revisor técnico o evaluador ejecute la plataforma **CRM & Inventory Management Platform** de forma 100% local, utilizando datos de demostración reproducibles, ficticios y seguros.

---

## 1. Requisitos del Sistema

- **Node.js:** Versión 20.x, 22.x LTS o superior (probado en Node v24).
- **npm:** Versión 10.x o superior.
- **Sistema Operativo:** Windows, macOS o Linux.

---

## 2. Instalación de Dependencias

Ejecute la instalación limpia (`npm ci`) en ambos componentes del proyecto:

```bash
# 1. Instalar backend
cd backend
npm ci

# 2. Instalar frontend
cd ../frontend
npm ci
```

---

## 3. Configuración de Variables de Entorno (Opcional en Desarrollo)

El backend cuenta con valores por defecto seguros para desarrollo local. Si desea personalizar la configuración:

1. En la carpeta `backend/`, copie la plantilla de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. **Definir un secreto JWT local:**
   Puede generar una clave aleatoria propia en su terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Y asignar el valor en su archivo `backend/.env`:
   ```env
   JWT_SECRET=su_clave_aleatoria_generada_aqui
   ```
   > **Nota de Seguridad:** Si no define `JWT_SECRET` en desarrollo, el servidor generará automáticamente una clave criptográfica efímera en memoria para la sesión. En producción, la variable `JWT_SECRET` es estrictamente obligatoria.

---

## 4. Generación de Datos de Demostración (Seeder)

Para poblar la base de datos local con datos de prueba estructurados y ficticios:

```bash
cd backend
npm run seed:demo
```

### Ubicación del Archivo de Base de Datos

Por defecto en desarrollo local, el seeder crea la base de datos relacional SQLite en:

```text
backend/storage/data.db
```

_(Junto con los archivos auxiliares temporales `data.db-wal` y `data.db-shm` en modo WAL)._

Esta ruta se encuentra excluida en `.gitignore`. Para reiniciar o limpiar completamente los datos locales en cualquier momento, basta con eliminar la base o la carpeta `storage`:

```bash
# En Linux / macOS:
rm -rf backend/storage

# En Windows (PowerShell):
Remove-Item -Recurse -Force backend\storage
```

### Características del Seeder:

- **Datos 100% Ficticios:** Utiliza nombres simulados (`Alex Demo`, `Aurora Demo S.A.S.`), teléfonos no operativos (`+57 000 000 0001`), correos con dominio reservado (`.invalid`) y productos genéricos.
- **Idempotente:** Puede ejecutarse múltiples veces consecutivas sin duplicar registros ni corromper datos existentes.
- **Protección Antierror:** Requiere la señal explícita (`--confirm` o `SEED_DEMO=true`) y rechaza terminantemente su ejecución si `NODE_ENV=production`.

> [!CAUTION]
> **Advertencia de Seguridad:**
> Nunca habilite `SEED_DEMO=true` ni ejecute scripts de seed en un entorno de producción.

---

## 5. Iniciar la Plataforma Localmente

Abra dos terminales independientes:

### Terminal 1: Servidor Backend API

```bash
cd backend
npm run dev
```

_El servicio iniciará en:_ `http://localhost:4000`

### Terminal 2: Cliente Frontend

```bash
cd frontend
npm run dev
```

_La interfaz iniciará en:_ `http://localhost:5173`

---

## 6. Credenciales de Acceso de Demostración

Una vez inicializada la aplicación con el seeder, ingrese al formulario de inicio de sesión (`http://localhost:5173/login`) con las siguientes credenciales:

| Campo          | Valor Demostrativo             |
| :------------- | :----------------------------- |
| **Email**      | `demo.admin@portfolio.invalid` |
| **Contraseña** | `local-demo-only-change-me`    |

> [!NOTE]
> Estas credenciales son exclusivamente válidas en la base de datos SQLite local generada y no tienen correspondencia con ningún sistema productivo.
>
> **Comportamiento de Sesión en Memoria:**
>
> - El token JWT se conserva **estrictamente en la memoria de la aplicación React** (`useState` / Context) y **no se persiste** en `localStorage` ni en `sessionStorage` para mitigar riesgos de robo de credenciales vía XSS.
> - **Al recargar la página (`F5`), la sesión se pierde intencionalmente** y el usuario debe ingresar nuevamente sus credenciales.
> - El botón de **cierre de sesión elimina el token de la memoria del cliente** (no revoca tokens en el servidor, ya que el backend utiliza JWT sin estado).
> - Las contraseñas se almacenan mediante hashes `bcrypt` (coste 10) y los campos no se precargan automáticamente en el navegador.

---

## 7. Comandos de Verificación y Calidad

Para validar la integridad de la base de código localmente:

```bash
# Pruebas automatizadas (71 tests en backend, 25 tests en frontend)
cd backend && npm test
cd ../frontend && npm test

# Auditoría de linter (ESLint)
cd backend && npm run lint
cd ../frontend && npm run lint

# Verificación de formato (Prettier)
cd backend && npm run format:check
cd ../frontend && npm run format:check

# Compilación de producción del cliente
cd ../frontend && npm run build
```

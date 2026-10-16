# Guía de Despliegue Manual: Demostración Pública Aislada (Render + Vercel)

Esta guía describe el procedimiento paso a paso para que el propietario del proyecto despliegue manualmente una **demostración pública, gratuita y 100% aislada** de la plataforma **CRM & Inventory Management Platform**.

El despliegue utilizará el plan gratuito de **Render** (backend efímero) y **Vercel** (frontend estático).

---

## Tabla de Separación Obligatoria (Aislamiento Absoluto)

Antes de iniciar cualquier acción, ten presente la separación estricta entre la infraestructura operativa real y la demostración de portafolio:

| Elemento | CRM real | Demo pública |
|---|---|---|
| **Repositorio** | Privado/original | Repositorio público de portafolio (`GermanMejiaH/crm-inventory-management-platform`) |
| **Render** | Servicio existente pagado | Servicio nuevo gratuito (*Free Tier*) |
| **Base de datos** | Datos reales y disco persistente montado | Datos sintéticos y almacenamiento temporal (`os.tmpdir()`) |
| **Vercel** | Proyecto existente | Proyecto nuevo independiente |
| **Credenciales** | Secretos reales de producción | Secretos nuevos, aleatorios y exclusivos |
| **Usuarios** | Operación comercial real | Credenciales demostrativas sintéticas |

> [!CAUTION]
> **REGLA DE AISLAMIENTO ESTRICTO:**
> Jamás reutilices secretos (`JWT_SECRET`), variables de entorno, discos persistentes, conexiones a bases de datos, credenciales administrativas ni dominios del CRM productivo real.

---

## Paso 1: Despliegue del Backend Demo en Render

El backend se alojará en un **Web Service nuevo y gratuito** en Render.

### 1.1 Crear el Web Service en Render
1. Inicia sesión en el panel de [Render](https://dashboard.render.com).
2. Haz clic en **New +** y selecciona **Web Service**.
3. Conecta el repositorio público de portafolio: `GermanMejiaH/crm-inventory-management-platform`.
4. Completa la configuración básica del servicio:
   - **Name:** `crm-inventory-backend-demo` (o un nombre identificador exclusivo para demo).
   - **Region:** Selecciona la región geográfica más cercana (ej. *Ohio, US East* o *Frankfurt*).
   - **Branch:** `main`.
   - **Root Directory:** `backend` *(Obligatorio: Render debe situarse en la subcarpeta del backend)*.
   - **Runtime:** `Node`.
   - **Build Command:** `npm install` *(Comando real de instalación de dependencias)*.
   - **Start Command:** `node src/server.js` *(Comando real de ejecución según el script `dev` de `backend/package.json`)*.
   - **Instance Type:** `Free`.

### 1.2 Verificar Almacenamiento (Sin Discos)
- En la sección **Disks / Persistent Disk**, **NO agregues ningún disco**.
- El backend en modo efímero utiliza obligatoriamente el directorio temporal del sistema operativo (`os.tmpdir()`).

### 1.3 Configurar Variables de Entorno del Backend
En la pestaña **Environment** del nuevo servicio, añade las siguientes variables clave-valor:

| Variable | Valor de Ejemplo / Explicación |
|---|---|
| `NODE_ENV` | `production` |
| `DEMO_MODE` | `true` |
| `DEMO_EPHEMERAL` | `true` |
| `ALLOW_DEMO_AUTO_SEED` | `true` |
| `PORT` | `4000` *(o deja que Render asigne su puerto por defecto)* |
| `JWT_SECRET` | *(Genera un secreto nuevo aleatorio exclusivo de la demo; ver comando abajo)* |
| `CORS_ORIGIN` | `http://localhost:5173` *(Valor temporal; se actualizará en el Paso 3 con la URL final de Vercel)* |

> [!TIP]
> **Generar un secreto JWT seguro exclusivo para la demo:**  
> Ejecuta en tu terminal local:  
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`  
> Copia el resultado y pégalo en `JWT_SECRET`. Nunca uses el secreto de producción.

### 1.4 Desplegar y Obtener la URL del Backend
1. Haz clic en **Create Web Service**.
2. Espera a que finalice la compilación y arranque el contenedor (observarás en los logs: `CRM Portfolio backend escuchando en el puerto ...` y `Demo efímera: base temporal vacía detectada, sembrado automático ejecutado.`).
3. Copia la URL pública asignada por Render, visible debajo del nombre del servicio:
   - Ejemplo: `https://crm-inventory-backend-demo.onrender.com`

### 1.5 Verificar Endpoints del Backend
Abre una pestaña en tu navegador o usa `curl` para probar los endpoints públicos:
1. **Endpoint de salud:**
   ```
   https://crm-inventory-backend-demo.onrender.com/health
   ```
   - **Respuesta esperada (HTTP 200):** `{"status":"ok"}`
2. **Endpoint de estado demo:**
   ```
   https://crm-inventory-backend-demo.onrender.com/demo-status
   ```
   - **Respuesta esperada (HTTP 200):** `{"demoMode":true}`

*(Si `demoMode` es `true`, la triple verificación de flags fue exitosa y la base de datos temporal quedó sembrada).*

---

## Paso 2: Despliegue del Frontend Demo en Vercel

El frontend estático compilado con Vite se alojará en un **proyecto nuevo** en Vercel.

### 2.1 Crear el Proyecto en Vercel
1. Inicia sesión en [Vercel](https://vercel.com).
2. Haz clic en **Add New...** > **Project**.
3. Importa el repositorio de GitHub: `GermanMejiaH/crm-inventory-management-platform`.
4. En la configuración del proyecto:
   - **Project Name:** `crm-inventory-frontend-demo` (o el nombre público deseado).
   - **Framework Preset:** `Vite` *(Detectado automáticamente)*.
   - **Root Directory:** Haz clic en *Edit* y selecciona `frontend`.
   - **Build Command:** `npm run build` *(Comando real según `frontend/package.json`)*.
   - **Output Directory:** `dist` *(Directorio de salida generado por Vite)*.
   - **Install Command:** `npm install`.

### 2.2 Configurar Variables de Entorno en Vercel
En la sección **Environment Variables**, añade:

| Variable | Valor |
|---|---|
| `VITE_API_BASE_URL` | La URL de Render obtenida en el Paso 1.4 **sin barra final** (ej. `https://crm-inventory-backend-demo.onrender.com`) |
| `VITE_DEMO_MODE` | `true` |

### 2.3 Desplegar y Obtener la URL del Frontend
1. Haz clic en **Deploy**.
2. Espera a que termine la compilación en Vercel (aproximadamente 1 minuto).
3. Copia la URL pública generada por Vercel:
   - Ejemplo: `https://crm-inventory-frontend-demo.vercel.app`

---

## Paso 3: Completar la Conexión Segura entre Ambos

Para que el frontend pueda comunicarse con el backend sin bloqueos de navegador, debe configurarse la política CORS de Render.

### 3.1 Actualizar CORS en Render
1. Regresa al panel de Render > servicio `crm-inventory-backend-demo` > pestaña **Environment**.
2. Edita la variable `CORS_ORIGIN` y coloca la URL exacta de Vercel **sin barra final**:
   ```
   CORS_ORIGIN=https://crm-inventory-frontend-demo.vercel.app
   ```
3. Guarda los cambios (*Save Changes*).

### 3.2 Desplegar Nuevamente el Backend
1. En Render, haz clic en **Manual Deploy** > **Deploy latest commit** (o *Clear build cache & deploy*).
2. Espera a que el despliegue complete y el servicio esté en estado `Live`.

### 3.3 Verificación End-to-End en el Navegador
Abre la URL de Vercel (`https://crm-inventory-frontend-demo.vercel.app`) y realiza las siguientes comprobaciones:

1. **Banner Demostrativo:**
   - Verifica que en la parte superior aparezca el banner visible:  
     *“Demo pública: los datos se restablecen periódicamente y no representan información real”*.
2. **Inicio de Sesión:**
   - Presiona el botón accesible **Autocompletar credenciales demo** o ingresa manualmente:
     - **Email:** `demo.admin@portfolio.invalid`
     - **Contraseña:** `local-demo-only-change-me`
   - Haz clic en **Iniciar Sesión**. Debes acceder al Dashboard sin errores de red.
3. **Navegación:**
   - Recorre las secciones: Clientes, Productos, Producción, Compras, Pedidos, Proformas, Reportes y Configuración. Los datos sintéticos base (Aurora Demo S.A.S., etc.) deben estar presentes.
4. **Creación de Registro Ficticio:**
   - En la sección **Clientes**, crea un cliente de prueba ficticio (ej. *"Cliente Prueba Demo"*). Debe reflejarse de inmediato en la tabla.
5. **Generación y Descarga de Proforma PDF:**
   - En la sección **Pedidos**, genera una proforma para un pedido existente y haz clic en **Descargar**. El archivo PDF debe generarse y descargarse correctamente.

### 3.4 Comprobar Cero Impacto en el CRM Real
Para certificar que el CRM productivo original no tuvo ninguna interferencia:
1. Accede al panel de Render de tu servicio de producción real y revisa los logs: confirma que no hay peticiones HTTP ni conexiones vinculadas a las pruebas de la demo.
2. Abre la base de datos productiva real: comprueba que no existe ningún registro con los nombres o datos creados durante la prueba demo.
3. Revisa el proyecto productivo en Vercel: confirma que los dominios y deployments productivos permanecen intactos.

---

## Qué Esperar de la Demo Gratuita (Comportamiento Operativo)

1. **Demora al Despertar tras Inactividad (*Cold Start*):**
   - Render suspende las instancias gratuitas tras 15 minutos sin solicitudes entrantes.
   - La primera solicitud tras un periodo de inactividad tardará entre **30 y 60 segundos** mientras la máquina virtual despierta y carga Node.js.
2. **Restablecimiento Periódico de Datos:**
   - La base de datos SQLite se almacena en el directorio temporal del contenedor (`os.tmpdir()`).
   - Al reiniciarse el servicio o tras un nuevo deploy, los datos modificados se restablecen automáticamente a los datos sintéticos iniciales mediante el seeder idempotente.
3. **Autocuración de Proformas PDF:**
   - Si los archivos PDF en el directorio temporal son eliminados por el sistema operativo, el backend los regenerará de manera automática y segura al ser solicitados por el endpoint protegido, siempre que el pedido aún exista.
4. **Sesiones en Memoria:**
   - Los tokens JWT no se guardan en el almacenamiento local del navegador (`localStorage`). Al recargar la página o al reiniciarse el backend, se deberá iniciar sesión nuevamente.
5. **No Ingresar Información Real:**
   - La demo es de acceso público. Cualquier dato que un visitante ingrese podrá ser visualizado por otros usuarios hasta el siguiente reinicio.
6. **No Usar como Herramienta Operativa:**
   - La demo no cuenta con persistencia duradera, respaldos externos ni garantías de disponibilidad; su único propósito es la demostración técnica de portafolio.

---

## Checklist Manual de Verificación y Procedimiento de Reversión

### Checklist de Verificación Pre-Lanzamiento
- [ ] El servicio de Render es completamente nuevo y no tiene ningún disco persistente adjunto.
- [ ] Las variables `DEMO_MODE=true`, `DEMO_EPHEMERAL=true` y `ALLOW_DEMO_AUTO_SEED=true` están configuradas en Render.
- [ ] La variable `JWT_SECRET` en Render es un valor nuevo y aleatorio (no copiado de producción).
- [ ] La variable `CORS_ORIGIN` en Render coincide con la URL del frontend en Vercel (sin barra final).
- [ ] El proyecto de Vercel apunta al directorio `frontend` y tiene configurado `VITE_API_BASE_URL`.
- [ ] El banner de demo pública es visible en toda la interfaz.
- [ ] El endpoint `https://<backend-demo>.onrender.com/demo-status` responde `{"demoMode":true}`.
- [ ] El endpoint `https://<backend-demo>.onrender.com/health` responde `{"status":"ok"}`.
- [ ] El CRM productivo real no muestra tráfico ni registros de la demo en sus logs.

---

### Procedimiento de Reversión (Baja Inmediata)

Si en cualquier momento se desea apagar o desmantelar la demostración pública, la reversión es trivial, segura y no afecta en absoluto a los servicios del CRM real:

1. **Eliminar / Suspender el Frontend en Vercel:**
   - Ingresa a Vercel > proyecto `crm-inventory-frontend-demo` > **Settings** > pestaña **General**.
   - Al final de la página, en la sección *Danger Zone*, haz clic en **Delete Project**.
2. **Eliminar / Suspender el Backend en Render:**
   - Ingresa a Render > servicio `crm-inventory-backend-demo` > pestaña **Settings**.
   - Haz clic en **Suspend Service** (si solo deseas pausarlo temporalmente) o en **Delete Web Service** (para eliminarlo por completo).
3. **Garantía de Aislamiento:**
   - Al eliminar o suspender únicamente los nuevos proyectos demo, los servicios, bases de datos, dominios y respaldos del CRM productivo real continúan operando con total normalidad y sin ninguna alteración.

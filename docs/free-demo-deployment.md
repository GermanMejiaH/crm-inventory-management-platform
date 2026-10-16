# Guía de Despliegue de Demostración Pública Gratuita (Almacenamiento Efímero)

Este documento detalla la arquitectura, configuración, consideraciones operativas y políticas de seguridad para el despliegue de una demostración pública gratuita y 100% aislada de la plataforma **CRM & Inventory Management Platform**.

---

## 1. ¿Qué Significa Almacenamiento Efímero?

En los servicios de alojamiento gratuitos en la nube (como el plan *Free Tier* de Render, Fly.io, Railway, entre otros), los contenedores no disponen de discos de almacenamiento persistente montados de manera permanente. 

Bajo este modelo:
- **Volatilidad del Sistema de Archivos:** Cada vez que el contenedor se reinicia, se actualiza o se despierta tras un periodo de inactividad, su sistema de archivos local vuelve a su estado base limpio.
- **Aislamiento en Directorio Temporal:** En modo de demostración efímera, el backend configura de forma forzada e inmutable la base de datos SQLite y los documentos generados (proformas PDF) bajo el directorio temporal del sistema operativo (`os.tmpdir()`), deshabilitando cualquier persistencia configurada por variables como `DB_PATH` o `STORAGE_DIR`.
- **Siembra Automática al Iniciar:** Si la base de datos temporal no existe o está vacía al encender el servicio, el sistema ejecuta de forma automática e idempotente un seeder con datos sintéticos y ficticios para que los visitantes encuentren siempre un entorno demostrativo funcional.
- **Autocuración de Documentos:** Si una proforma PDF física fue purgada del directorio temporal pero el pedido aún existe en la base de datos de la sesión activa, el endpoint protegido regenera el PDF al vuelo y de forma segura al ser solicitado.

---

## 2. Limitaciones Esperadas del Entorno Gratuito

Al utilizar infraestructura gratuita sin costo para una demostración de portafolio, deben considerarse las siguientes características operativas normales:

1. **Latencia Inicial por Hibernación (*Cold Start*):**
   - Las instancias gratuitas entran en suspensión tras 15 minutos sin recibir solicitudes HTTP entrantes.
   - La primera solicitud tras un periodo de inactividad tardará entre **30 y 60 segundos** mientras la plataforma despierta el contenedor y levanta el proceso Node.js.
2. **Restablecimiento Periódico de Datos:**
   - Todo cambio efectuado por visitantes (creación de clientes, registro de abonos, pedidos o movimientos de inventario) desaparecerá en cuanto el contenedor se reinicie o suspenda.
   - Tras el reinicio, la base se regenerará automáticamente con los registros demostrativos base (Aurora Demo S.A.S., productos de prueba, etc.).
3. **Sesiones Volátiles en Memoria:**
   - La plataforma no almacena credenciales ni tokens JWT en `localStorage` ni `sessionStorage` del navegador.
   - Si el visitante recarga la pestaña o si el servidor reinicia su proceso, la sesión caducará y se solicitará autenticación nuevamente.
4. **Mensaje Permanente de Demostración:**
   - La interfaz muestra de forma visible un banner en la parte superior:  
     *“Demo pública: los datos se restablecen periódicamente y no representan información real”*.

---

## 3. Variables de Entorno del Servicio de Demostración

Para activar el modo efímero seguro, el backend requiere una **triple confirmación explícita**. Las tres variables deben tener el valor exacto `"true"`:

```bash
# --- FLAGS DE MODO DEMO EFÍMERO (Obligatorios los tres) ---
DEMO_MODE=true
DEMO_EPHEMERAL=true
ALLOW_DEMO_AUTO_SEED=true

# --- CONFIGURACIÓN DE EJECUCIÓN ---
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://tu-frontend-demo.vercel.app
JWT_SECRET=un_secreto_aleatorio_y_exclusivo_para_esta_demo_1234567890
```

### Regla de Activación Segura
- Si cualquiera de los tres flags (`DEMO_MODE`, `DEMO_EPHEMERAL`, `ALLOW_DEMO_AUTO_SEED`) falta, contiene un valor distinto a `"true"` (como `"1"`, `"yes"`, `"false"`, o mayúsculas), el modo efímero **NO se activará**.
- En caso de no activarse, el backend operará bajo el modo de producción estándar estricto, exigiendo volúmenes persistentes y rechazando cualquier siembra automática de datos.

### Variables para el Frontend (Vercel)
```bash
VITE_API_BASE_URL=https://tu-backend-demo.onrender.com
VITE_DEMO_MODE=true
```

---

## 4. Política de Aislamiento y No Reutilización

> [!CAUTION]
> **COMPROMISO DE NO CONTAMINACIÓN Y PRIVACIDAD ABSOLUTA:**
> Nunca, bajo ninguna circunstancia, deben mezclarse o reutilizarse recursos, configuraciones o información del CRM productivo original.

1. **Cero Reutilización de Credenciales y Secretos:**
   - El secreto `JWT_SECRET` del servicio demo debe ser generado aleatoriamente y ser completamente diferente al de producción.
   - Las contraseñas del usuario demostrativo (`demo.admin@portfolio.invalid`) son exclusivas para evaluación local y pública.
2. **Cero Reutilización de Discos o Almacenamiento:**
   - Nunca debe apuntarse a discos persistentes, puntos de montaje o carpetas de respaldos del CRM productivo.
   - El almacenamiento de la demo pública es estrictamente temporal y volátil (`os.tmpdir()`).
3. **Cero Conexión de URLs y Dominios:**
   - Los dominios productivos, APIs de correo productivas y orígenes CORS del negocio real jamás deben figurar en la configuración de la demo pública.
4. **Datos 100% Sintéticos:**
   - Toda la información contenida en el seeder y en las pruebas (clientes, teléfonos, correos `@portfolio.invalid`, productos, precios) ha sido generada sintéticamente y no corresponde a ninguna persona, empresa o transacción real.

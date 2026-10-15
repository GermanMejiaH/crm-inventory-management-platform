# Arquitectura de Seguridad y Calidad Profesional

Este documento detalla las directrices, mecanismos y salvaguardas implementadas en la plataforma **CRM & Inventory Management Platform** para garantizar la seguridad de la autenticación, la protección de credenciales y la integridad de la API.

---

## 1. Protección y Almacenamiento de Contraseñas

- **Eliminación Total de Texto Plano:**  
  El sistema no almacena ni verifica contraseñas en texto plano ni mediante esquemas de prefijo heredados (`plain:`).
- **Hashed Criptográfico con Bcrypt:**  
  Todas las contraseñas se almacenan procesadas mediante la librería estándar `bcryptjs`, aplicando un factor de costo computacional profesional de **10 rondas de salt**.
- **Respuestas de Autenticación Genéricas:**  
  Para mitigar ataques de enumeración de usuarios, el endpoint de inicio de sesión (`/auth/login`) responde de forma idéntica (`401 Unauthorized`, con mensaje genérico `"Credenciales inválidas"`) ante usuarios no registrados, contraseñas erróneas o peticiones con formato anómalo.
- **Prevención de Fugas de Información:**  
  Ninguna contraseña, hash de contraseña ni sal criptográfica se incluye en respuestas HTTP, archivos de registro (_logs_) ni volcados de error.

---

## 2. Gestión de Tokens de Autenticación (JWT)

- **Protección Estricta en Producción:**  
  El servidor valida al inicio que `JWT_SECRET` se encuentre definido cuando `NODE_ENV=production`. Si la variable no está presente, el arranque se aborta de inmediato con una excepción explícita.
- **Aislamiento en Desarrollo y Pruebas:**  
  En entornos locales o de pruebas donde no se provee un secreto manual, el sistema genera de forma automática una clave efímera pseudoaleatoria de 32 bytes (64 caracteres hexadecimales) directamente en memoria (`crypto.randomBytes(32)`). No existen secretos fijos ni reutilizables hardcodeados en el código fuente.
- **Expiración Explícita:**  
  Los tokens generados tienen un tiempo de vida finito y controlado (`JWT_EXPIRES_IN`, configurable en entorno, con valor por defecto de `8h`).
- **Validación y Manejo de Errores:**  
  El middleware de autenticación valida la firma, expiración e integridad de cada token:
  - Tokens ausentes: `401 Unauthorized` (`unauthorized`).
  - Tokens vencidos: `401 Unauthorized` (`token_expired`).
  - Tokens malformados o con firma manipulada: `401 Unauthorized` (`invalid_token`).

---

## 3. Reducción de la Superficie de Exposición en el Navegador

- **Sin Persistencia en Disco del Cliente:**  
  Se ha eliminado por completo el almacenamiento de JWT en `localStorage` y `sessionStorage`.
- **Retención Exclusiva en Memoria:**  
  El token de autenticación reside únicamente en la memoria de ejecución de la aplicación React (`useState` / Context) durante la sesión activa.
- **Desconexión y Expiración Inmediata:**  
  El cliente escucha eventos de desautorización (`auth:unauthorized`). Ante cualquier respuesta 401 del backend, la sesión en memoria se invalida inmediatamente y redirige a la vista de acceso.
- **Cierre de Sesión en el Cliente:**  
  La acción de cerrar sesión purga el token de la memoria de la aplicación React y redirige a la pantalla de acceso. Al emplear JWT sin estado (_stateless_), el servidor no mantiene una lista de revocación de tokens ni un almacén central de sesiones en base de datos.
- **Decisión de Experiencia de Usuario (UX):**  
  Al recargar la pestaña del navegador (`F5`), la sesión en memoria se purga intencionalmente y se solicita un nuevo inicio de sesión. Esta conducta es un compromiso de seguridad deliberado para prevenir el secuestro de tokens vía Cross-Site Scripting (XSS).

---

## 4. Endurecimiento de la API (API Hardening)

- **Cabeceras HTTP de Seguridad:**  
  Se implementa `helmet` para configurar defensas estándar del navegador, incluyendo prevención de ataques de clickjacking (`X-Frame-Options: DENY`), desactivación del rastreo MIME (`X-Content-Type-Options: nosniff`) y política de referencia restrictiva (`Referrer-Policy: no-referrer`).
- **Mitigación de Fuerza Bruta (Rate Limiting):**  
  El endpoint `/auth/login` incorpora un limitador de tasa de peticiones que monitoriza intentos fallidos por dirección IP. Múltiples fallos consecutivos activan una respuesta `429 Too Many Requests`. Los inicios de sesión legítimos no acumulan penalización.
- **Límite de Carga Útil JSON:**  
  El analizador de cuerpos HTTP de Express restringe las cargas JSON y formularios a un máximo de `1mb` para prevenir ataques de denegación de servicio (DoS) por agotamiento de memoria.
- **Política de Origen Cruzado (CORS) Restringida:**  
  No se utiliza el comodín permisivo `*`. La API valida los orígenes entrantes contra una lista blanca explícita definida en `CORS_ORIGIN`, admitiendo únicamente orígenes locales controlados en desarrollo.
- **Manejo Centralizado de Excepciones:**  
  El middleware global de errores captura excepciones no controladas. En producción, responde con un mensaje genérico `"Error interno del servidor"` sin exponer trazas de pila (_stack traces_) ni detalles de la infraestructura.

---

## 5. Límites Conocidos de la Versión de Portafolio

1. **Almacén de Tokens Volátil:** Al no emplear cookies seguras de sesión del lado del servidor, refrescar la página exige ingresar credenciales nuevamente.
2. **Contador de Rate Limiting Local:** El contador de intentos fallidos opera en la memoria del proceso Node.js, lo que resulta adecuado para una instancia única o ejecución local, pero requeriría un almacén centralizado en un despliegue horizontal.
3. **Base de Datos Embebida:** La persistencia SQLite local no cifra datos en reposo a nivel de archivo.

---

## 6. Recomendaciones para un Entorno Productivo

Para una puesta en producción empresarial completa, se recomiendan las siguientes mejoras arquitectónicas:

1. **Cookies de Sesión `HttpOnly` y `Secure`:**  
   Migrar el transporte del token JWT a cookies con atributos `HttpOnly`, `Secure` y `SameSite=Strict`, impidiendo el acceso a través de JavaScript y mitigando riesgos XSS.
2. **Almacenamiento Distribuido para Rate Limiting y Bloqueos:**  
   Implementar una capa de almacenamiento en caché en memoria como Redis para coordinar límites de tasa y listas negras de tokens entre réplicas del backend.
3. **Autenticación Multifactor (MFA):**  
   Incorporar verificación en dos pasos (TOTP / WebAuthn) para cuentas con privilegios administrativos.
4. **Rotación Automática de Secretos:**  
   Integrar un gestor de secretos en la nube (AWS Secrets Manager, GCP Secret Manager o HashiCorp Vault) con rotación programada de claves criptográficas.

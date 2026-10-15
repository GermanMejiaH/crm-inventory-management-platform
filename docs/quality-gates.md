# Umbrales de Calidad y Verificación Técnica (Quality Gates)

Este documento define la batería obligatoria de verificaciones automatizadas que todo cambio en la **CRM & Inventory Management Platform** debe superar exitosamente antes de ser integrado o publicado.

El proyecto opera bajo una **política de cero errores y cero advertencias** (_zero warnings, zero errors policy_) en todas las etapas.

---

## Matriz de Umbrales de Calidad

| Etapa              | Componente   | Comando                                            | Criterio de Aprobación                                                                              |
| :----------------- | :----------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **1. Formato**     | Backend      | `cd backend && npm run format:check`               | 100% conforme con reglas de Prettier.                                                               |
| **2. Linter**      | Backend      | `cd backend && npm run lint`                       | 0 errores y 0 advertencias de ESLint.                                                               |
| **3. Pruebas**     | Backend      | `cd backend && npm test`                           | 71 pruebas pasadas (0 fallidas), bases efímeras aisladas.                                           |
| **4. Formato**     | Frontend     | `cd frontend && npm run format:check`              | 100% conforme con reglas de Prettier.                                                               |
| **5. Linter**      | Frontend     | `cd frontend && npm run lint`                      | 0 errores y 0 advertencias de ESLint.                                                               |
| **6. Pruebas**     | Frontend     | `cd frontend && npm test`                          | 25 pruebas pasadas (0 fallidas) en Vitest + Testing Library.                                        |
| **7. Compilación** | Frontend     | `cd frontend && npm run build`                     | Bundle generado sin advertencias de tamaño (> 500 kB).                                              |
| **8. Seguridad**   | Dependencias | Backend & Frontend: `npm audit --audit-level=high` | 0 vulnerabilidades críticas y 0 vulnerabilidades altas en ambos componentes (bloqueante en CI).     |
| **9. Higiene**     | Repositorio  | Inspección de sistema de archivos                  | 0 archivos `.env`, `.db`, `.sqlite`, `-wal`, `-shm`, `.pdf`, `.csv`, `.xlsx`, `dist/` o `storage/`. |

---

## Ejecución Completa de la Batería Local

Para ejecutar manualmente todos los quality gates en una sola secuencia de comandos:

```bash
# 1. Verificación del Backend
cd backend
npm run format:check
npm run lint
npm test

# 2. Verificación del Frontend
cd ../frontend
npm run format:check
npm run lint
npm test
npm run build

# 3. Limpieza de artefactos generados por pruebas locales
cd ..
# En Linux / macOS:
rm -rf frontend/dist backend/storage
# En Windows (PowerShell):
if (Test-Path frontend/dist) { Remove-Item -Recurse -Force frontend/dist }
if (Test-Path backend/storage) { Remove-Item -Recurse -Force backend/storage }
```

---

## Equivalencia en Integración Continua (CI)

La canalización de Integración Continua en GitHub Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) replica con exactitud estos mismos umbrales en entornos limpios basados en Ubuntu Linux con Node.js 20 LTS, garantizando:

1. **Instalación Reproducible:** Empleo estricto de `npm ci` con validación de `package-lock.json`.
2. **Entornos Efímeros:** Pruebas backend ejecutadas con `NODE_ENV=test` y base de datos en memoria/temporal sin estado persistente.
3. **Cero Dependencia de Secretos:** La canalización no requiere secretos ni variables de entorno productivas para compilar o verificar el código.
4. **Auditoría de Seguridad Obligatoria:** Ejecución de `npm audit --audit-level=high` en backend y frontend como pasos bloqueantes (sin `continue-on-error`), garantizando 0 vulnerabilidades altas o críticas.

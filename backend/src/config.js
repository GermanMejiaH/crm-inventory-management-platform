import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import crypto from "crypto"
import dotenv from "dotenv"

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function resolveConfig(env = process.env) {
  const nodeEnv = env.NODE_ENV || "development"
  const isProduction = nodeEnv === "production"
  const isTest = nodeEnv === "test"

  // Modo demostración efímera segura (debe estar explícitamente activado con los 3 flags en "true")
  const demoMode = env.DEMO_MODE === "true"
  const demoEphemeral = env.DEMO_EPHEMERAL === "true"
  const allowDemoAutoSeed = env.ALLOW_DEMO_AUTO_SEED === "true"
  const isEphemeralDemo = demoMode && demoEphemeral && allowDemoAutoSeed

  let dbPath = ""
  let storageRoot = ""
  let proformaDir = ""
  let backupDir = ""

  if (isEphemeralDemo) {
    // En modo efímero, el almacenamiento se aísla obligatoriamente bajo el directorio temporal del SO
    storageRoot = path.join(os.tmpdir(), "crm-portfolio-ephemeral-demo")
    dbPath = path.join(storageRoot, "demo-data.db")
    proformaDir = path.join(storageRoot, "proformas")
    backupDir = path.join(storageRoot, "backups")
  } else {
    const envDbPath = env.DB_PATH && String(env.DB_PATH).trim()
    const envStorageDir = env.STORAGE_DIR && String(env.STORAGE_DIR).trim()

    if (envStorageDir) {
      storageRoot = path.resolve(envStorageDir)
      dbPath = envDbPath ? path.resolve(envDbPath) : path.join(storageRoot, "data.db")
    } else if (envDbPath) {
      dbPath = path.resolve(envDbPath)
      storageRoot = path.dirname(dbPath)
    } else {
      storageRoot = path.join(__dirname, "..", "storage")
      dbPath = path.join(storageRoot, "data.db")
    }

    const envProformaDir = env.PROFORMA_DIR && String(env.PROFORMA_DIR).trim()
    proformaDir = envProformaDir ? path.resolve(envProformaDir) : path.join(storageRoot, "proformas")

    const envBackupDir = env.BACKUP_DIR && String(env.BACKUP_DIR).trim()
    backupDir = envBackupDir ? path.resolve(envBackupDir) : path.join(storageRoot, "backups")
  }

  const port = env.PORT || 4000
  const rawJwtSecret = env.JWT_SECRET && String(env.JWT_SECRET).trim()
  const jwtExpiresIn =
    env.JWT_EXPIRES_IN && String(env.JWT_EXPIRES_IN).trim() ? String(env.JWT_EXPIRES_IN).trim() : "8h"
  const corsOrigin = env.CORS_ORIGIN ? String(env.CORS_ORIGIN).trim() : ""

  let trustProxy = false
  if (env.TRUST_PROXY !== undefined && env.TRUST_PROXY !== "") {
    const rawVal = String(env.TRUST_PROXY).trim().toLowerCase()
    if (rawVal === "true" || rawVal === "1") {
      trustProxy = true
    } else if (rawVal === "false" || rawVal === "0") {
      trustProxy = false
    } else if (!isNaN(Number(rawVal))) {
      trustProxy = Number(rawVal)
    } else {
      trustProxy = String(env.TRUST_PROXY).trim()
    }
  }

  if (isProduction) {
    const missing = []
    if (!corsOrigin) missing.push("CORS_ORIGIN")
    if (!isEphemeralDemo) {
      if (!rawJwtSecret) missing.push("JWT_SECRET")
      if (!env.DB_PATH || !String(env.DB_PATH).trim()) missing.push("DB_PATH")
      if (!env.STORAGE_DIR || !String(env.STORAGE_DIR).trim()) missing.push("STORAGE_DIR")
    }
    if (missing.length > 0) {
      throw new Error(
        `Configuración de producción incompleta. Faltan las variables obligatorias: ${missing.join(", ")}. DB_PATH y STORAGE_DIR deben apuntar a un volumen persistente.`
      )
    }
  }

  // En producción normal se requiere estrictamente rawJwtSecret (validado arriba).
  // En desarrollo, pruebas o modo efímero sin JWT_SECRET explícito, se genera un secreto aleatorio efímero en memoria,
  // eliminando cualquier secreto predecible o estático en código fuente.
  const jwtSecret = rawJwtSecret || (isProduction && !isEphemeralDemo ? "" : crypto.randomBytes(32).toString("hex"))

  return {
    nodeEnv,
    isProduction,
    isTest,
    demoMode,
    demoEphemeral,
    allowDemoAutoSeed,
    isEphemeralDemo,
    port: Number(port),
    jwtSecret,
    jwtExpiresIn,
    corsOrigin,
    trustProxy,
    storageRoot,
    dbPath,
    proformaDir,
    backupDir,
    adminEmail: env.ADMIN_EMAIL || "demo.admin@portfolio.invalid",
    adminPassword: env.ADMIN_PASSWORD || null
  }
}

export const config = resolveConfig()
export default config

import db from "../db.js"
import config from "../config.js"
import { seedDemoData } from "../../scripts/seed-demo.js"

/**
 * Determina si la base de datos se encuentra vacía (sin usuarios, clientes ni productos).
 * En SQLite inicializado, las tablas existen por DDL pero no contienen registros operativos.
 *
 * @param {import("better-sqlite3").Database} [database=db]
 * @returns {boolean}
 */
export function isDatabaseEmpty(database = db) {
  try {
    const usersCount = database.prepare("SELECT COUNT(1) as c FROM users").get()?.c || 0
    const clientsCount = database.prepare("SELECT COUNT(1) as c FROM clients").get()?.c || 0
    const productsCount = database.prepare("SELECT COUNT(1) as c FROM products").get()?.c || 0
    return usersCount === 0 && clientsCount === 0 && productsCount === 0
  } catch {
    return true
  }
}

/**
 * Ejecuta el seeder sintético idempotente de demostración ÚNICAMENTE cuando:
 * 1. El modo efímero está plenamente activo (DEMO_MODE=true, DEMO_EPHEMERAL=true, ALLOW_DEMO_AUTO_SEED=true).
 * 2. La base de datos temporal está vacía al momento de iniciar.
 *
 * Durante la ejecución normal jamás modifica ni borra datos existentes.
 *
 * @param {object} [options={}]
 * @param {object} [options.config=config]
 * @param {import("better-sqlite3").Database} [options.db=db]
 * @returns {{ executed: boolean, reason?: string, results?: object }}
 */
export function autoSeedIfEmpty(options = {}) {
  const currentConfig = options.config || config
  const database = options.db || db

  // Solo se activa si el modo efímero está estrictamente activo con los 3 flags en true
  if (!currentConfig.isEphemeralDemo) {
    return { executed: false, reason: "ephemeral_demo_not_active" }
  }

  // Solo sembrar cuando la base de datos temporal esté vacía
  if (!isDatabaseEmpty(database)) {
    return { executed: false, reason: "database_not_empty" }
  }

  // Ejecución segura del seeder con datos sintéticos para el entorno efímero
  const results = seedDemoData({
    allowEphemeralDemo: true,
    isEphemeralDemo: true,
    nodeEnv: currentConfig.nodeEnv,
    db: database
  })

  return { executed: true, results }
}

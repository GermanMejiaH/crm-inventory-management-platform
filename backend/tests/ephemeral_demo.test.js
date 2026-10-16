import test from "node:test"
import assert from "node:assert/strict"
import path from "path"
import os from "os"
import fs from "fs"
import Database from "better-sqlite3"
import jwt from "jsonwebtoken"
import { resolveConfig } from "../src/config.js"
import { isDatabaseEmpty, autoSeedIfEmpty } from "../src/services/demoSeedService.js"

process.env.NODE_ENV = "test"

test("Fase 11A — Pruebas de Modo Demostración Efímero y Aislado", async (t) => {
  await t.test("Flags incompletos o inválidos NO activan el modo efímero", () => {
    // Caso 1: Ningún flag
    const cfg1 = resolveConfig({ NODE_ENV: "development" })
    assert.equal(cfg1.isEphemeralDemo, false)

    // Caso 2: Solo DEMO_MODE=true
    const cfg2 = resolveConfig({ NODE_ENV: "development", DEMO_MODE: "true" })
    assert.equal(cfg2.isEphemeralDemo, false)

    // Caso 3: DEMO_MODE=true y DEMO_EPHEMERAL=true (falta ALLOW_DEMO_AUTO_SEED)
    const cfg3 = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DEMO_EPHEMERAL: "true"
    })
    assert.equal(cfg3.isEphemeralDemo, false)

    // Caso 4: DEMO_MODE=true y ALLOW_DEMO_AUTO_SEED=true (falta DEMO_EPHEMERAL)
    const cfg4 = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      ALLOW_DEMO_AUTO_SEED: "true"
    })
    assert.equal(cfg4.isEphemeralDemo, false)

    // Caso 5: DEMO_EPHEMERAL=true y ALLOW_DEMO_AUTO_SEED=true (falta DEMO_MODE)
    const cfg5 = resolveConfig({
      NODE_ENV: "development",
      DEMO_EPHEMERAL: "true",
      ALLOW_DEMO_AUTO_SEED: "true"
    })
    assert.equal(cfg5.isEphemeralDemo, false)

    // Caso 6: Valores no estrictamente "true" (ej. "1", "yes", "TRUE")
    const cfg6 = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "1",
      DEMO_EPHEMERAL: "true",
      ALLOW_DEMO_AUTO_SEED: "true"
    })
    assert.equal(cfg6.isEphemeralDemo, false)

    const cfg7 = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DEMO_EPHEMERAL: "TRUE",
      ALLOW_DEMO_AUTO_SEED: "true"
    })
    assert.equal(cfg7.isEphemeralDemo, false)

    const cfg8 = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DEMO_EPHEMERAL: "true",
      ALLOW_DEMO_AUTO_SEED: "yes"
    })
    assert.equal(cfg8.isEphemeralDemo, false)
  })

  await t.test("Activación estricta: los tres flags exactamente en 'true' activan el modo efímero", () => {
    const cfg = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DEMO_EPHEMERAL: "true",
      ALLOW_DEMO_AUTO_SEED: "true"
    })
    assert.equal(cfg.demoMode, true)
    assert.equal(cfg.demoEphemeral, true)
    assert.equal(cfg.allowDemoAutoSeed, true)
    assert.equal(cfg.isEphemeralDemo, true)
  })

  await t.test("La ruta de demo usa exclusivamente el directorio temporal del SO", () => {
    const cfg = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DEMO_EPHEMERAL: "true",
      ALLOW_DEMO_AUTO_SEED: "true"
    })

    const expectedTempRoot = path.join(os.tmpdir(), "crm-portfolio-ephemeral-demo")
    assert.equal(cfg.storageRoot, expectedTempRoot)
    assert.equal(cfg.dbPath, path.join(expectedTempRoot, "demo-data.db"))
    assert.equal(cfg.proformaDir, path.join(expectedTempRoot, "proformas"))
    assert.equal(cfg.backupDir, path.join(expectedTempRoot, "backups"))
    assert.ok(cfg.dbPath.startsWith(os.tmpdir()), "La base debe residir en os.tmpdir()")
  })

  await t.test("En modo efímero, nunca se utilizan rutas persistentes de DB_PATH ni STORAGE_DIR", () => {
    const cfg = resolveConfig({
      NODE_ENV: "development",
      DEMO_MODE: "true",
      DEMO_EPHEMERAL: "true",
      ALLOW_DEMO_AUTO_SEED: "true",
      DB_PATH: "C:\\persistent\\path\\production.db",
      STORAGE_DIR: "C:\\persistent\\storage"
    })

    assert.notEqual(cfg.dbPath, "C:\\persistent\\path\\production.db")
    assert.notEqual(cfg.storageRoot, "C:\\persistent\\storage")
    assert.ok(cfg.dbPath.startsWith(os.tmpdir()), "Debe forzarse os.tmpdir() ignorando rutas externas")
  })

  await t.test("Configuración normal NO ejecuta el seeder automático", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-normal-test-"))
    const tempDbPath = path.join(tempDir, "normal.db")
    const testDb = new Database(tempDbPath)

    testDb.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, passwordHash TEXT, role TEXT, name TEXT);
      CREATE TABLE clients (id INTEGER PRIMARY KEY, nombre TEXT, contacto TEXT, telefono TEXT, email TEXT, direccion TEXT, precioPersonalizado INTEGER, notas TEXT, createdAt INTEGER, active INTEGER);
      CREATE TABLE products (id INTEGER PRIMARY KEY, nombre TEXT, descripcion TEXT, precioMinimo INTEGER, precioMaximo INTEGER, stockActual INTEGER, stockMinimo INTEGER, updatedAt INTEGER, active INTEGER, tipo TEXT, costoUnitario INTEGER, unidadMedida TEXT);
    `)

    try {
      const normalConfig = resolveConfig({
        NODE_ENV: "development",
        DEMO_MODE: "false",
        DEMO_EPHEMERAL: "false",
        ALLOW_DEMO_AUTO_SEED: "false"
      })

      const res = autoSeedIfEmpty({ config: normalConfig, db: testDb })
      assert.equal(res.executed, false)
      assert.equal(res.reason, "ephemeral_demo_not_active")

      const userCount = testDb.prepare("SELECT COUNT(1) as c FROM users").get().c
      const clientCount = testDb.prepare("SELECT COUNT(1) as c FROM clients").get().c
      const productCount = testDb.prepare("SELECT COUNT(1) as c FROM products").get().c

      assert.equal(userCount, 0, "No debe haberse creado ningún usuario")
      assert.equal(clientCount, 0, "No debe haberse creado ningún cliente")
      assert.equal(productCount, 0, "No debe haberse creado ningún producto")
    } finally {
      testDb.close()
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  await t.test("La base demo vacía se siembra automáticamente con datos sintéticos", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-ephemeral-seed-test-"))
    const tempDbPath = path.join(tempDir, "ephemeral-test.db")

    // Establecer entorno para simular modo efímero
    process.env.NODE_ENV = "test"
    process.env.DEMO_MODE = "true"
    process.env.DEMO_EPHEMERAL = "true"
    process.env.ALLOW_DEMO_AUTO_SEED = "true"
    process.env.DB_PATH = tempDbPath
    process.env.STORAGE_DIR = tempDir

    const ephemeralConfig = resolveConfig(process.env)
    assert.equal(ephemeralConfig.isEphemeralDemo, true)

    // Crear base e inicializar esquema con db.js
    const testDb = new Database(tempDbPath)
    testDb.exec(`
      CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, passwordHash TEXT, role TEXT, name TEXT);
      CREATE TABLE clients (id INTEGER PRIMARY KEY, nombre TEXT, contacto TEXT, telefono TEXT, email TEXT, direccion TEXT, precioPersonalizado INTEGER, notas TEXT, createdAt INTEGER, active INTEGER);
      CREATE TABLE products (id INTEGER PRIMARY KEY, nombre TEXT, descripcion TEXT, precioMinimo INTEGER, precioMaximo INTEGER, stockActual INTEGER, stockMinimo INTEGER, updatedAt INTEGER, active INTEGER, tipo TEXT, costoUnitario INTEGER, unidadMedida TEXT);
      CREATE TABLE bom_items (id INTEGER PRIMARY KEY, productoTerminadoId INTEGER, materiaPrimaId INTEGER, cantidadRequerida REAL, createdAt INTEGER);
    `)

    try {
      assert.equal(isDatabaseEmpty(testDb), true, "La base recién creada debe detectarse como vacía")

      const seedResult = autoSeedIfEmpty({ config: ephemeralConfig, db: testDb })
      assert.equal(seedResult.executed, true, "El auto-seeder debe haberse ejecutado")
      assert.ok(seedResult.results, "Debe contener el reporte de siembra")

      // Verificar que los datos sintéticos fueron creados
      const clientCount = testDb.prepare("SELECT COUNT(1) as c FROM clients").get().c
      const productCount = testDb.prepare("SELECT COUNT(1) as c FROM products").get().c
      const user = testDb.prepare("SELECT email FROM users WHERE email = ?").get("demo.admin@portfolio.invalid")

      assert.ok(clientCount > 0, "Debe haber clientes sembrados")
      assert.ok(productCount > 0, "Debe haber productos sembrados")
      assert.ok(user, "El usuario demo.admin@portfolio.invalid debe haberse sembrado")

      // Una segunda llamada NO debe resembrar ni alterar datos existentes
      const secondRun = autoSeedIfEmpty({ config: ephemeralConfig, db: testDb })
      assert.equal(secondRun.executed, false, "No debe ejecutar seeder si la base ya no está vacía")
      assert.equal(secondRun.reason, "database_not_empty")
    } finally {
      testDb.close()
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  await t.test("Endpoint público /health expone estado de salud del servicio", async () => {
    const { app } = await import("../src/server.js")
    const server = app.listen(0)
    const { port } = server.address()
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`)
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.equal(data.status, "ok")
    } finally {
      server.close()
    }
  })

  await t.test("Endpoint público /demo-status expone el estado del modo efímero", async () => {
    const { app } = await import("../src/server.js")
    const server = app.listen(0)
    const { port } = server.address()
    try {
      const res = await fetch(`http://127.0.0.1:${port}/demo-status`)
      assert.equal(res.status, 200)
      const data = await res.json()
      assert.equal(typeof data.demoMode, "boolean")
    } finally {
      server.close()
    }
  })

  await t.test("Proformas: generación, descarga y regeneración segura si el archivo físico fue purgado", async () => {
    const { app } = await import("../src/server.js")
    const store = await import("../src/store.js")
    const config = (await import("../src/config.js")).default
    const server = app.listen(0)
    const { port } = server.address()
    const baseUrl = `http://127.0.0.1:${port}`

    const adminToken = jwt.sign(
      { sub: 1, email: "admin@example.com", role: "Admin", name: "Admin Test" },
      config.jwtSecret,
      { expiresIn: "1h" }
    )

    try {
      // 1. Crear cliente y producto
      const client = store.addClient({
        nombre: "Cliente Proforma Test",
        email: "test.proforma@portfolio.invalid",
        telefono: "123456",
        direccion: "Calle 1"
      })
      const product = store.addProduct({
        nombre: "Producto Proforma Test",
        precioMinimo: 1000,
        precioMaximo: 2000,
        stockActual: 10,
        stockMinimo: 2
      })

      // 2. Crear pedido
      const order = store.addOrder({
        clienteId: client.id,
        productoId: product.id,
        cantidad: 2,
        precioUnitario: 1500,
        total: 3000,
        estado: "Pendiente"
      })

      // 3. Generar proforma
      const genRes = await fetch(`${baseUrl}/pedidos/${order.id}/proforma`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.equal(genRes.status, 200)
      const genData = await genRes.json()
      assert.ok(genData.proformaId)

      // 4. Descargar proforma (archivo existente en disco)
      const dlRes1 = await fetch(`${baseUrl}/proformas/${genData.proformaId}/download`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.equal(dlRes1.status, 200)
      assert.equal(dlRes1.headers.get("content-type"), "application/pdf")

      // 5. Simular eliminación del archivo físico PDF en disco (almacenamiento temporal reiniciado)
      const proforma = store.getProforma(genData.proformaId)
      const fileName = path.basename(proforma.url)
      const filePath = path.resolve(config.proformaDir, fileName)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
      assert.equal(fs.existsSync(filePath), false, "El archivo debe haber sido eliminado del disco")

      // 6. Descargar de nuevo: debe regenerarse automáticamente al vuelo
      const dlRes2 = await fetch(`${baseUrl}/proformas/${genData.proformaId}/download`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.equal(dlRes2.status, 200, "Debe regenerar el PDF y retornar 200")
      assert.equal(dlRes2.headers.get("content-type"), "application/pdf")
      assert.equal(fs.existsSync(filePath), true, "El archivo físico debe haber sido regenerado")

      // 7. Visualización inline de proforma
      const viewRes = await fetch(`${baseUrl}/proformas/${genData.proformaId}/pdf`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      assert.equal(viewRes.status, 200)
      assert.equal(viewRes.headers.get("content-type"), "application/pdf")

      // 8. Verificación de seguridad: un usuario no autenticado es rechazado con 401
      const unauthRes = await fetch(`${baseUrl}/proformas/${genData.proformaId}/download`)
      assert.equal(unauthRes.status, 401)
    } finally {
      server.close()
    }
  })
})

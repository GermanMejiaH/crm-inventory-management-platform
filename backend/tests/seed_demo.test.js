import test from "node:test"
import assert from "node:assert/strict"
import fs from "fs"
import path from "path"
import os from "os"

test("Pruebas del Seeder Demostrativo Seguro e Idempotente", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "crm-portfolio-seed-test-"))
  const tempDbPath = path.join(tempDir, "test-seed.db")

  process.env.NODE_ENV = "test"
  process.env.DB_PATH = tempDbPath
  process.env.STORAGE_DIR = tempDir

  const { seedDemoData, DEMO_CLIENTS, DEMO_PRODUCTS } = await import("../scripts/seed-demo.js")
  const db = (await import("../src/db.js")).default

  t.after(() => {
    try {
      db.close()
      fs.rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  await t.test("Rechaza ejecución en entorno de producción", () => {
    assert.throws(
      () => {
        seedDemoData({ nodeEnv: "production", force: true })
      },
      (err) => err instanceof Error && err.message.includes("PROHIBIDO")
    )
  })

  await t.test("Rechaza ejecución sin señal explícita (SEED_DEMO=true o --confirm)", () => {
    assert.throws(
      () => {
        seedDemoData({ nodeEnv: "test", force: false, seedDemoEnv: "false" })
      },
      (err) => err instanceof Error && err.message.includes("SEÑAL REQUERIDA")
    )
  })

  await t.test("Ejecuta exitosamente con señal explícita y crea datos demo ficticios", () => {
    const res = seedDemoData({ nodeEnv: "test", force: true })
    assert.equal(res.clientsCreated, DEMO_CLIENTS.length)
    assert.equal(res.productsCreated, DEMO_PRODUCTS.length)
    assert.equal(res.bomConfigured, true)

    // Verificar en base de datos
    const clientCount = db.prepare("SELECT COUNT(1) as c FROM clients").get().c
    assert.equal(clientCount, DEMO_CLIENTS.length)

    const productCount = db.prepare("SELECT COUNT(1) as c FROM products").get().c
    assert.equal(productCount, DEMO_PRODUCTS.length)

    const user = db.prepare("SELECT email, passwordHash FROM users WHERE email = ?").get("demo.admin@portfolio.invalid")
    assert.ok(user, "El usuario demo debe existir")
    assert.ok(user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$"))
    assert.ok(!user.passwordHash.startsWith("plain:"), "No debe tener prefijo plain:")
  })

  await t.test("Idempotencia: una segunda ejecución no duplica registros", () => {
    const res2 = seedDemoData({ nodeEnv: "test", force: true })
    assert.equal(res2.clientsCreated, 0)
    assert.equal(res2.clientsExisting, DEMO_CLIENTS.length)
    assert.equal(res2.productsCreated, 0)
    assert.equal(res2.productsExisting, DEMO_PRODUCTS.length)

    // Verificar que los totales siguen siendo los mismos
    const clientCount = db.prepare("SELECT COUNT(1) as c FROM clients").get().c
    assert.equal(clientCount, DEMO_CLIENTS.length)

    const productCount = db.prepare("SELECT COUNT(1) as c FROM products").get().c
    assert.equal(productCount, DEMO_PRODUCTS.length)
  })
})

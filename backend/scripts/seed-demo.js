import bcrypt from "bcryptjs"
import db from "../src/db.js"
import * as clientService from "../src/services/clientService.js"
import * as productService from "../src/services/productService.js"
import * as bomService from "../src/services/bomService.js"
import { fileURLToPath } from "url"

export const DEMO_CLIENTS = [
  {
    nombre: "Aurora Demo S.A.S.",
    contacto: "Alex Demo",
    telefono: "+57 000 000 0001",
    email: "alex.demo@portfolio.invalid",
    direccion: "Avenida Ejemplo 100, Ciudad Demo",
    precioPersonalizado: 42000,
    notas: "Cliente preferencial de demostración"
  },
  {
    nombre: "Taller Vector Ejemplo",
    contacto: "Sam Ejemplo",
    telefono: "+57 000 000 0002",
    email: "sam.ejemplo@portfolio.invalid",
    direccion: "Carrera Muestra 50, Ciudad Demo",
    precioPersonalizado: 38000,
    notas: "Cliente recurrente de pruebas"
  },
  {
    nombre: "Comercial Muestra",
    contacto: "Usuario Portafolio",
    telefono: "+57 000 000 0003",
    email: "usuario.portafolio@portfolio.invalid",
    direccion: "Calle Prueba 12, Ciudad Demo",
    precioPersonalizado: 45000,
    notas: "Facturación demo para portafolio"
  }
]

export const DEMO_PRODUCTS = [
  {
    nombre: "Producto Demo A",
    descripcion: "Dispositivo terminado de demostración",
    precioMinimo: 25000,
    precioMaximo: 45000,
    stockActual: 15,
    stockMinimo: 10,
    tipo: "producto_terminado",
    costoUnitario: 18000,
    unidadMedida: "unidades"
  },
  {
    nombre: "Kit Portafolio",
    descripcion: "Conjunto industrial de prueba",
    precioMinimo: 30000,
    precioMaximo: 50000,
    stockActual: 8,
    stockMinimo: 5,
    tipo: "producto_terminado",
    costoUnitario: 22000,
    unidadMedida: "unidades"
  },
  {
    nombre: "Insumo de Muestra",
    descripcion: "Materia prima básica para ensamblado demo",
    precioMinimo: 5000,
    precioMaximo: 8000,
    stockActual: 50,
    stockMinimo: 20,
    tipo: "materia_prima",
    costoUnitario: 3500,
    unidadMedida: "unidades"
  },
  {
    nombre: "Componente Demo X",
    descripcion: "Componente secundario de prueba",
    precioMinimo: 7000,
    precioMaximo: 12000,
    stockActual: 40,
    stockMinimo: 15,
    tipo: "materia_prima",
    costoUnitario: 4500,
    unidadMedida: "unidades"
  }
]

export function seedDemoData(options = {}) {
  const nodeEnv = (options.nodeEnv || process.env.NODE_ENV || "").toLowerCase()
  if (nodeEnv === "production") {
    throw new Error("PROHIBIDO: No se permite ejecutar el seeder de demostración en entorno de producción.")
  }

  const explicitSignal =
    options.force === true ||
    String(options.seedDemoEnv || process.env.SEED_DEMO || "").toLowerCase() === "true" ||
    process.argv.includes("--confirm")

  if (!explicitSignal) {
    throw new Error(
      "SEÑAL REQUERIDA: El seeder demo requiere la variable SEED_DEMO=true o el parámetro --confirm para ejecutarse."
    )
  }

  const results = {
    user: { created: false, email: "demo.admin@portfolio.invalid" },
    clientsCreated: 0,
    clientsExisting: 0,
    productsCreated: 0,
    productsExisting: 0,
    bomConfigured: false
  }

  // 1. Usuario demostrativo
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get("demo.admin@portfolio.invalid")
  if (!existingUser) {
    const demoPasswordHash = bcrypt.hashSync("local-demo-only-change-me", 10)
    db.prepare("INSERT INTO users (email, passwordHash, role, name) VALUES (?,?,?,?)").run(
      "demo.admin@portfolio.invalid",
      demoPasswordHash,
      "Admin",
      "Administrador Demo"
    )
    results.user.created = true
  }

  // 2. Clientes demostrativos (idempotente)
  for (const client of DEMO_CLIENTS) {
    const existing = db.prepare("SELECT id FROM clients WHERE email = ?").get(client.email)
    if (!existing) {
      clientService.addClient(client)
      results.clientsCreated++
    } else {
      results.clientsExisting++
    }
  }

  // 3. Productos demostrativos (idempotente)
  for (const prod of DEMO_PRODUCTS) {
    const existing = db.prepare("SELECT id FROM products WHERE nombre = ?").get(prod.nombre)
    if (!existing) {
      productService.addProduct(prod)
      results.productsCreated++
    } else {
      results.productsExisting++
    }
  }

  // 4. Receta BOM de demostración (idempotente)
  const ptA = db.prepare("SELECT id FROM products WHERE nombre = ?").get("Producto Demo A")
  const mpInsumo = db.prepare("SELECT id FROM products WHERE nombre = ?").get("Insumo de Muestra")
  const mpComp = db.prepare("SELECT id FROM products WHERE nombre = ?").get("Componente Demo X")

  if (ptA && mpInsumo && mpComp) {
    const existingBom = bomService.getBom(ptA.id)
    if (!existingBom || existingBom.length === 0) {
      bomService.setBom(ptA.id, [
        { materiaPrimaId: mpInsumo.id, cantidadRequerida: 2 },
        { materiaPrimaId: mpComp.id, cantidadRequerida: 1 }
      ])
      results.bomConfigured = true
    }
  }

  return results
}

// Ejecución directa por CLI
const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase()

if (isDirectExecution) {
  try {
    const res = seedDemoData()
    console.log("=== SEEDER DEMOSTRATIVO EJECUTADO EXITOSAMENTE ===")
    console.log(`Usuario demo: ${res.user.created ? "creado" : "ya existente"} (${res.user.email})`)
    console.log(`Clientes demo: ${res.clientsCreated} creados, ${res.clientsExisting} ya existentes`)
    console.log(`Productos demo: ${res.productsCreated} creados, ${res.productsExisting} ya existentes`)
    console.log(`Receta BOM demo: ${res.bomConfigured ? "configurada" : "ya configurada o no requerida"}`)
    console.log("==================================================")
  } catch (err) {
    console.error("Error al ejecutar seeder demo:", err.message)
    process.exit(1)
  }
}

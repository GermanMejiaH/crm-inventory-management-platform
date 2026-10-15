import bcrypt from "bcryptjs"
import db from "./db.js"
import * as clientService from "./services/clientService.js"
import * as productService from "./services/productService.js"
import * as orderService from "./services/orderService.js"
import * as inventoryService from "./services/inventoryService.js"
import * as paymentService from "./services/paymentService.js"
import * as bomService from "./services/bomService.js"
import * as reportService from "./services/reportService.js"
import * as userRepo from "./repositories/userRepository.js"

const payments = ["Efectivo", "Transferencia", "Tarjeta"]
const orderStates = ["Pendiente", "Completado", "Cancelado"]

// Usuario administrativo de demostración para desarrollo local y pruebas (no en producción)
if ((process.env.NODE_ENV || "").toLowerCase() !== "production") {
  const seedUser = db.prepare("SELECT COUNT(1) as c FROM users").get()
  if (seedUser.c === 0) {
    const demoPasswordHash = bcrypt.hashSync("local-demo-only-change-me", 10)
    db.prepare("INSERT INTO users (email, passwordHash, role, name) VALUES (?,?,?,?)").run(
      "demo.admin@portfolio.invalid",
      demoPasswordHash,
      "Admin",
      "Administrador Demo"
    )
  }
}

// User object compatibility
const users = {
  findByEmail(email) {
    return userRepo.findUserByEmail(email)
  }
}

// Delegated exports
export const listClients = clientService.listClients
export const countClients = clientService.countClients
export const addClient = clientService.addClient
export const updateClient = clientService.updateClient
export const getClient = clientService.getClient
export const getClientProductPrices = clientService.getClientProductPrices
export const getClientProductPrice = clientService.getClientProductPrice
export const setClientProductPrice = clientService.setClientProductPrice
export const deleteClientProductPrice = clientService.deleteClientProductPrice
export const getClientResumen360 = clientService.getClientResumen360

export const listProducts = productService.listProducts
export const countProducts = productService.countProducts
export const addProduct = productService.addProduct
export const getProduct = productService.getProduct
export const updateProduct = productService.updateProduct
export const deleteProduct = productService.deleteProduct

export const adjustStock = inventoryService.adjustStock
export const listStockMovements = inventoryService.listStockMovements
export const listStockMovementsDetailed = inventoryService.listStockMovementsDetailed
export const countStockMovements = inventoryService.countStockMovements
export const recordKardexMovement = inventoryService.recordKardexMovement
export const getKardex = inventoryService.getKardex
export const createPurchase = inventoryService.createPurchase
export const getPurchase = inventoryService.getPurchase
export const listPurchases = inventoryService.listPurchases
export const getCapacidadEnsambladoTeorica = inventoryService.getCapacidadEnsambladoTeorica
export const checkAssemblyAvailability = inventoryService.checkAssemblyAvailability
export const executeAssemblyOrder = inventoryService.executeAssemblyOrder
export const listAssemblyOrders = inventoryService.listAssemblyOrders
export const getAlertasStockYReorden = inventoryService.getAlertasStockYReorden

export const listOrders = orderService.listOrders
export const listOrdersWithNames = orderService.listOrdersWithNames
export const getOrder = orderService.getOrder
export const addOrder = orderService.addOrder
export const updateOrder = orderService.updateOrder
export const deleteOrder = orderService.deleteOrder
export const addOrderAuditEntry = orderService.addOrderAuditEntry
export const listOrderAudit = orderService.listOrderAudit
export const countOrderAudit = orderService.countOrderAudit
export const listOrderAuditDetailed = orderService.listOrderAuditDetailed
export const addProforma = orderService.addProforma
export const listProformas = orderService.listProformas
export const getProforma = orderService.getProforma

export const addOrderPayment = paymentService.addOrderPayment
export const getOrderPayments = paymentService.getOrderPayments
export const getOrderPaymentSummary = paymentService.getOrderPaymentSummary

export const getBom = bomService.getBom
export const setBom = bomService.setBom

import * as settingService from "./services/settingService.js"
import { runBackup } from "./backup.js"

export const getCostoManoObraUnitaria = settingService.getCostoManoObraUnitaria
export const setCostoManoObraUnitaria = settingService.setCostoManoObraUnitaria
export const getSetting = settingService.getSetting
export const setSetting = settingService.setSetting
export const getSettings = settingService.getSettings
export const updateSettings = settingService.updateSettings
export const getCompanyInfo = settingService.getCompanyInfo
export const setCompanyInfo = settingService.setCompanyInfo

import * as dashboardService from "./services/dashboardService.js"

export const getExecutiveDashboard = dashboardService.getExecutiveDashboard
export const getOperationalAlerts = dashboardService.getOperationalAlerts
export const getInventoryProjections = dashboardService.getInventoryProjections
export const getClientRankings = dashboardService.getClientRankings
export const getProductRankings = dashboardService.getProductRankings
export const getBusinessHealth = dashboardService.getBusinessHealth
export const getMonthlyClosureData = dashboardService.getMonthlyClosureData

export const listSalesSeries = reportService.listSalesSeries
export const getDashboardStats = reportService.getDashboardStats
export const getReporteRentabilidad = reportService.getReporteRentabilidad
export const getRentabilidadPedidos = reportService.getRentabilidadPedidos
export const getRentabilidadClientes = reportService.getRentabilidadClientes
export const getRentabilidadProductos = reportService.getRentabilidadProductos
export const getFlujoCajaSimple = reportService.getFlujoCajaSimple

export const triggerBackup = runBackup

export const updateUserPasswordByEmail = userRepo.updateUserPasswordByEmail

export { payments, orderStates, users }

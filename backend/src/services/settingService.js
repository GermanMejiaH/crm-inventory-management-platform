import * as settingRepo from "../repositories/settingRepository.js"
import { logActivity } from "../utils/logger.js"

export function getCostoManoObraUnitaria() {
  const val = settingRepo.getSetting("costo_mano_obra_unitaria", "1000")
  return Number(val) || 1000
}

export function setCostoManoObraUnitaria(valor) {
  const num = Number(valor)
  if (isNaN(num) || num < 0) {
    throw new Error("El costo de mano de obra debe ser un número mayor o igual a 0")
  }
  settingRepo.setSetting("costo_mano_obra_unitaria", String(num))
  logActivity("CONFIGURACION_MANO_OBRA_ACTUALIZADA", { nuevoValor: num })
  return num
}

export const DEFAULT_COMPANY_INFO = {
  name: "Aurora Demo S.A.S.",
  tagline: "Plataforma Demostrativa de Portafolio",
  document: "NIT 900.000.000-1",
  address: "Avenida Ejemplo 100, Ciudad Demo",
  phone: "+57 000 000 0001",
  email: "contacto@aurora-demo.invalid",
  website: "https://demo.portfolio.invalid"
}

export function getCompanyInfo() {
  const val = settingRepo.getSetting("company_info", null)
  if (!val) return { ...DEFAULT_COMPANY_INFO }
  try {
    const parsed = JSON.parse(val)
    return {
      name: parsed.name ? String(parsed.name).trim() : DEFAULT_COMPANY_INFO.name,
      tagline: parsed.tagline ? String(parsed.tagline).trim() : DEFAULT_COMPANY_INFO.tagline,
      document: parsed.document ? String(parsed.document).trim() : DEFAULT_COMPANY_INFO.document,
      address: parsed.address ? String(parsed.address).trim() : DEFAULT_COMPANY_INFO.address,
      phone: parsed.phone ? String(parsed.phone).trim() : DEFAULT_COMPANY_INFO.phone,
      email: parsed.email ? String(parsed.email).trim() : DEFAULT_COMPANY_INFO.email,
      website: parsed.website ? String(parsed.website).trim() : DEFAULT_COMPANY_INFO.website
    }
  } catch {
    return { ...DEFAULT_COMPANY_INFO }
  }
}

export function setCompanyInfo(data = {}) {
  const current = getCompanyInfo()
  const updated = {
    name: data.name !== undefined ? String(data.name).trim() : current.name,
    tagline: data.tagline !== undefined ? String(data.tagline).trim() : current.tagline,
    document: data.document !== undefined ? String(data.document).trim() : current.document,
    address: data.address !== undefined ? String(data.address).trim() : current.address,
    phone: data.phone !== undefined ? String(data.phone).trim() : current.phone,
    email: data.email !== undefined ? String(data.email).trim() : current.email,
    website: data.website !== undefined ? String(data.website).trim() : current.website
  }
  settingRepo.setSetting("company_info", JSON.stringify(updated))
  logActivity("CONFIGURACION_DATOS_CORPORATIVOS_ACTUALIZADOS", { name: updated.name })
  return updated
}

export function getSettings() {
  const all = settingRepo.getAllSettings()
  return {
    costoManoObraUnitaria: Number(all.costo_mano_obra_unitaria || 1000),
    companyInfo: getCompanyInfo()
  }
}

export function updateSettings(data = {}) {
  if (data.costoManoObraUnitaria !== undefined && data.costoManoObraUnitaria !== null) {
    setCostoManoObraUnitaria(data.costoManoObraUnitaria)
  }
  if (data.companyInfo && typeof data.companyInfo === "object") {
    setCompanyInfo(data.companyInfo)
  }
  return getSettings()
}

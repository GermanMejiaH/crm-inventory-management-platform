import { useEffect, useState } from "react"
import { Settings, RefreshCw, CreditCard, CheckCircle2, Search, Building2, Save, DollarSign } from "lucide-react"
import { useToast } from "../components/ToastContext"
import { getOptions, getConfiguracion, updateConfiguracion } from "../api/client"
import MetricCard from "../components/MetricCard"
import Badge from "../components/Badge"

export default function Configuracion({ token }) {
  const { addToast } = useToast()
  const [options, setOptions] = useState({ payments: [], orderStates: [] })
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [costoManoObra, setCostoManoObra] = useState(1000)
  const [companyInfo, setCompanyInfo] = useState({
    name: "Aurora Demo S.A.S.",
    tagline: "Plataforma Demostrativa de Portafolio",
    document: "NIT 900.000.000-1",
    address: "Avenida Ejemplo 100, Ciudad Demo",
    phone: "+57 000 000 0001",
    email: "contacto@aurora-demo.invalid",
    website: "https://demo.portfolio.invalid"
  })

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const [optRes, cfgRes] = await Promise.all([getOptions(token), getConfiguracion(token)])
      setOptions(optRes || { payments: [], orderStates: [] })
      if (cfgRes) {
        if (cfgRes.costoManoObraUnitaria != null) {
          setCostoManoObra(cfgRes.costoManoObraUnitaria)
        }
        if (cfgRes.companyInfo) {
          setCompanyInfo((prev) => ({ ...prev, ...cfgRes.companyInfo }))
        }
      }
    } catch {
      addToast("Error al cargar configuración del sistema", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  async function handleSaveConfig(e) {
    e.preventDefault()
    if (!token) return
    setSaving(true)
    try {
      const updated = await updateConfiguracion(token, {
        costoManoObraUnitaria: Number(costoManoObra) || 0,
        companyInfo
      })
      if (updated?.companyInfo) {
        setCompanyInfo(updated.companyInfo)
      }
      if (updated?.costoManoObraUnitaria != null) {
        setCostoManoObra(updated.costoManoObraUnitaria)
      }
      addToast("Configuración guardada y persistida en el sistema exitosamente", "success")
    } catch {
      addToast("Error al persistir la configuración en el servidor", "error")
    } finally {
      setSaving(false)
    }
  }

  const filteredPayments = (options.payments || []).filter((p) => p.toLowerCase().includes(searchTerm.toLowerCase()))
  const filteredStates = (options.orderStates || []).filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Configuración y Parámetros</h1>
              <p className="text-xs text-slate-400">
                Preferencias del sistema, métodos de pago, costeo de mano de obra y plantilla corporativa
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading || saving}
            aria-label="Actualizar configuración"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Métodos de Pago"
          value={options.payments.length}
          icon={CreditCard}
          variant="cyan"
          subtitle="Medios de cobro soportados"
          loading={loading}
        />
        <MetricCard
          title="Estados de Pedido"
          value={options.orderStates.length}
          icon={CheckCircle2}
          variant="purple"
          subtitle="Ciclo de vida de órdenes"
          loading={loading}
        />
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <p className="text-xs font-medium text-slate-400">Filtro Rápido de Opciones</p>
          <div className="relative mt-2">
            <label htmlFor="search-config" className="sr-only">
              Filtrar opciones por nombre
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-config"
              type="text"
              placeholder="Buscar método o estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* System Option Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-slate-200">Métodos de Pago Habilitados</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredPayments.length === 0 ? (
              <span className="text-xs text-slate-500">Sin resultados con el filtro actual</span>
            ) : (
              filteredPayments.map((p) => (
                <Badge key={p} variant="cyan">
                  {p}
                </Badge>
              ))
            )}
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-slate-200">Estados de Pedido del Flujo</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredStates.length === 0 ? (
              <span className="text-xs text-slate-500">Sin resultados con el filtro actual</span>
            ) : (
              filteredStates.map((s) => (
                <Badge key={s} variant="purple">
                  {s}
                </Badge>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Configuration Form (Persisted in SQLite via API) */}
      <form onSubmit={handleSaveConfig} className="space-y-6">
        {/* Costing Parameter Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Parámetros de Costeo y Fabricación</h2>
                <p className="text-xs text-slate-400">
                  Costo de mano de obra aplicado automáticamente en recetas BOM y órdenes de producción
                </p>
              </div>
            </div>
            <Badge variant="cyan">Persistente en Base de Datos</Badge>
          </div>

          <div className="max-w-md">
            <label htmlFor="costo-mano-obra" className="block text-xs font-semibold text-slate-300 mb-1">
              Costo de Mano de Obra Unitaria (COP)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-semibold">$</span>
              <input
                id="costo-mano-obra"
                type="number"
                min="0"
                step="50"
                value={costoManoObra}
                onChange={(e) => setCostoManoObra(Math.max(0, Number(e.target.value) || 0))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Este valor se suma al costo total de materiales durante el ensamblado.
            </p>
          </div>
        </div>

        {/* Corporate Info Card for Proformas */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Datos Corporativos para Proformas PDF</h2>
                <p className="text-xs text-slate-400">
                  Información membretada en los documentos y cotizaciones emitidas
                </p>
              </div>
            </div>
            <Badge variant="cyan">Persistente en Base de Datos</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="company-name" className="block text-xs font-semibold text-slate-300 mb-1">
                Razón Social / Nombre Comercial
              </label>
              <input
                id="company-name"
                type="text"
                value={companyInfo.name}
                onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="company-tagline" className="block text-xs font-semibold text-slate-300 mb-1">
                Eslogan / Subtítulo Institucional
              </label>
              <input
                id="company-tagline"
                type="text"
                value={companyInfo.tagline}
                onChange={(e) => setCompanyInfo({ ...companyInfo, tagline: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="company-doc" className="block text-xs font-semibold text-slate-300 mb-1">
                Identificación Fiscal (NIT / RFC / CIF)
              </label>
              <input
                id="company-doc"
                type="text"
                value={companyInfo.document}
                onChange={(e) => setCompanyInfo({ ...companyInfo, document: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="company-phone" className="block text-xs font-semibold text-slate-300 mb-1">
                Teléfono de Contacto
              </label>
              <input
                id="company-phone"
                type="text"
                value={companyInfo.phone}
                onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="company-email" className="block text-xs font-semibold text-slate-300 mb-1">
                Correo Electrónico de Contacto
              </label>
              <input
                id="company-email"
                type="email"
                value={companyInfo.email}
                onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="company-website" className="block text-xs font-semibold text-slate-300 mb-1">
                Sitio Web
              </label>
              <input
                id="company-website"
                type="text"
                value={companyInfo.website}
                onChange={(e) => setCompanyInfo({ ...companyInfo, website: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="company-address" className="block text-xs font-semibold text-slate-300 mb-1">
                Dirección Comercial / Sede Principal
              </label>
              <input
                id="company-address"
                type="text"
                value={companyInfo.address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className={`w-4 h-4 ${saving ? "animate-spin" : ""}`} />
              <span>{saving ? "Guardando en servidor..." : "Guardar Configuración"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

import { useEffect, useState } from "react"
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  X,
  Filter,
  Download,
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  ShoppingBag,
  AlertTriangle,
  Settings,
  BarChart3
} from "lucide-react"
import Modal from "../components/Modal"
import Badge from "../components/Badge"
import MetricCard from "../components/MetricCard"
import { useToast } from "../components/ToastContext"
import {
  getClientesPaged,
  createCliente,
  updateCliente,
  desactivarCliente,
  getProductos,
  getClientPrices,
  setClientProductPrice,
  deleteClientProductPrice,
  getClienteResumen360
} from "../api/client"

export default function Clientes({ token }) {
  const { addToast } = useToast()
  const [clientes, setClientes] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm, setDebouncedTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [priceEditingId, setPriceEditingId] = useState(null)
  const [priceEditingValue, setPriceEditingValue] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(12)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    minPrecio: "",
    maxPrecio: ""
  })
  const [includeInactive, setIncludeInactive] = useState(false)
  const [hasInactiveRecords, setHasInactiveRecords] = useState(false)

  const [formData, setFormData] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
    direccion: "",
    precioPersonalizado: "",
    notas: ""
  })

  // For custom prices per product
  const [showCustomPrices, setShowCustomPrices] = useState(null)
  const [products, setProducts] = useState([])
  const [clientPrices, setClientPrices] = useState([])
  const [priceEditValues, setPriceEditValues] = useState({})

  // Ficha 360 state
  const [show360, setShow360] = useState(false)
  const [c360Data, setC360Data] = useState(null)
  const [loading360, setLoading360] = useState(false)

  async function openResumen360(cliente) {
    setShow360(true)
    setC360Data(null)
    setLoading360(true)
    try {
      const res = await getClienteResumen360(token, cliente.id)
      setC360Data(res)
    } catch {
      addToast("Error al cargar Ficha 360° del cliente", "error")
    } finally {
      setLoading360(false)
    }
  }

  useEffect(() => {
    if (token) {
      getProductos(token)
        .then(setProducts)
        .catch(() => {})
    }
  }, [token])

  useEffect(() => {
    loadClientes()
  }, [token, page, limit, debouncedTerm, filters.minPrecio, filters.maxPrecio, includeInactive])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  async function loadClientes() {
    if (!token) return
    try {
      const params = {
        q: debouncedTerm,
        page,
        limit,
        minPrecio: filters.minPrecio || undefined,
        maxPrecio: filters.maxPrecio || undefined,
        includeInactive
      }
      const data = await getClientesPaged(token, params)
      const arr = Array.isArray(data) ? data : data.items || []
      const normalized = arr.map((c) => ({
        ...c,
        fechaRegistro: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
        activo: !!c.active
      }))
      setClientes(normalized)
      setTotal(Array.isArray(data) ? normalized.length : Number(data.total || normalized.length))

      if (normalized.length === 0 && !includeInactive) {
        try {
          const inactiveData = await getClientesPaged(token, { includeInactive: true, page: 1, limit: 1 })
          const inactiveTotal = Array.isArray(inactiveData) ? inactiveData.length : Number(inactiveData.total || 0)
          setHasInactiveRecords(inactiveTotal > 0)
        } catch {
          setHasInactiveRecords(false)
        }
      } else {
        setHasInactiveRecords(false)
      }
    } catch {
      addToast("Error al cargar clientes", "error")
    }
  }

  async function handleSubmit() {
    if (!formData.nombre) {
      addToast("El nombre es obligatorio", "error")
      return
    }

    try {
      const payload = {
        nombre: formData.nombre,
        contacto: formData.contacto || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        direccion: formData.direccion || null,
        precioPersonalizado: formData.precioPersonalizado === "" ? null : Number(formData.precioPersonalizado),
        notas: formData.notas || null
      }
      if (editingId) {
        await updateCliente(token, editingId, payload)
        addToast("Cliente actualizado correctamente", "success")
      } else {
        await createCliente(token, payload)
        addToast("Cliente creado exitosamente", "success")
      }
      resetForm()
      loadClientes()
    } catch {
      addToast("Error al guardar cliente", "error")
    }
  }

  function resetForm() {
    setFormData({
      nombre: "",
      contacto: "",
      telefono: "",
      email: "",
      direccion: "",
      precioPersonalizado: "",
      notas: ""
    })
    setShowForm(false)
    setEditingId(null)
  }

  function handleEdit(cliente) {
    setFormData({
      nombre: cliente.nombre,
      contacto: cliente.contacto,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      precioPersonalizado: cliente.precioPersonalizado,
      notas: cliente.notas || ""
    })
    setEditingId(cliente.id)
    setShowForm(true)
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de desactivar este cliente?")) return
    try {
      await desactivarCliente(token, id)
      addToast("Cliente desactivado", "success")
      loadClientes()
    } catch (e) {
      addToast(e.message || "Error al desactivar cliente", "error")
    }
  }

  async function reactivar(id) {
    if (!confirm("¿Estás seguro de reactivar este cliente?")) return
    try {
      await updateCliente(token, id, { active: true })
      addToast("Cliente reactivado", "success")
      loadClientes()
    } catch (e) {
      addToast(e.message || "Error al reactivar cliente", "error")
    }
  }

  function exportToCSV() {
    const headers = ["ID", "Nombre", "Contacto", "Teléfono", "Email", "Dirección", "Precio", "Fecha Registro"]
    const rows = filteredClientes.map((c) => [
      c.id,
      c.nombre,
      c.contacto,
      c.telefono,
      c.email,
      c.direccion,
      c.precioPersonalizado,
      c.fechaRegistro
    ])

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const filteredClientes = clientes

  const formatCurrencyCommas = (value) => {
    const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0 }).format(value)
    return `$ ${n}`
  }

  async function openCustomPrices(client) {
    setShowCustomPrices(client)
    try {
      const prices = await getClientPrices(token, client.id)
      setClientPrices(prices)
      const initialValues = {}
      prices.forEach((p) => {
        initialValues[p.productId] = String(p.price)
      })
      setPriceEditValues(initialValues)
    } catch {
      addToast("Error al cargar precios personalizados", "error")
    }
  }

  async function saveCustomPrice(productId) {
    const value = priceEditValues[productId]
    if (!value || isNaN(Number(value))) {
      addToast("Precio inválido", "warning")
      return
    }
    try {
      await setClientProductPrice(token, showCustomPrices.id, productId, Number(value))
      addToast("Precio actualizado", "success")
      const prices = await getClientPrices(token, showCustomPrices.id)
      setClientPrices(prices)
    } catch {
      addToast("Error al guardar precio", "error")
    }
  }

  async function removeCustomPrice(productId) {
    try {
      await deleteClientProductPrice(token, showCustomPrices.id, productId)
      addToast("Precio eliminado", "success")
      setPriceEditValues({ ...priceEditValues, [productId]: "" })
      const prices = await getClientPrices(token, showCustomPrices.id)
      setClientPrices(prices)
    } catch {
      addToast("Error al eliminar precio", "error")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Users className="w-6 h-6 text-cyan-400" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Gestión de Clientes</h2>
          </div>
          <p className="text-sm text-slate-400">Administra tu cartera de clientes y tarifas personalizadas</p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Download className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-950/50 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Clientes"
          value={clientes.filter((c) => c.activo).length}
          icon={Users}
          variant="cyan"
          subtitle="Clientes activos"
        />
        <MetricCard
          title="Nuevos (Mes)"
          value={
            clientes.filter((c) => {
              const fecha = new Date(c.fechaRegistro)
              const hoy = new Date()
              return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()
            }).length
          }
          icon={Calendar}
          variant="emerald"
          subtitle="Registrados en el ciclo"
        />
        <MetricCard
          title="Precio Promedio"
          value={formatCurrencyCommas(
            Math.round(clientes.reduce((sum, c) => sum + (c.precioPersonalizado || 0), 0) / (clientes.length || 1))
          )}
          icon={DollarSign}
          variant="purple"
          subtitle="Tarifa media personalizada"
        />
        <MetricCard
          title="Con Tarifa Custom"
          value={clientes.filter((c) => c.precioPersonalizado > 0).length}
          icon={DollarSign}
          variant="amber"
          subtitle="Condiciones especiales"
        />
      </div>

      {/* Search, Filters and Actions Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <label htmlFor="search-clientes" className="sr-only">
              Buscar clientes por nombre, email o contacto
            </label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
            <input
              id="search-clientes"
              type="text"
              placeholder="Buscar por nombre, email o contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIncludeInactive(!includeInactive)}
              aria-pressed={includeInactive}
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                includeInactive
                  ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  includeInactive ? "bg-cyan-500 border-cyan-500 text-slate-950" : "border-slate-600 bg-slate-900"
                }`}
                aria-hidden="true"
              >
                {includeInactive && <Check className="w-3 h-3 text-slate-950 stroke-[3]" />}
              </div>
              <span>Mostrar inactivos</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="filters-clientes-panel"
              className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-amber-400 ${
                showFilters || filters.minPrecio || filters.maxPrecio
                  ? "bg-amber-950/60 border-amber-500/50 text-amber-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Filter className="w-4 h-4" aria-hidden="true" />
              <span>Filtros</span>
              {(filters.minPrecio || filters.maxPrecio) && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-label="Filtro activo" />
              )}
            </button>
          </div>
        </div>

        {/* Filters Collapsible Panel */}
        {showFilters && (
          <div
            id="filters-clientes-panel"
            className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div>
              <label htmlFor="filter-min-precio" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Precio Mínimo Personalizado (COP)
              </label>
              <input
                id="filter-min-precio"
                type="number"
                placeholder="Ej: 50000"
                value={filters.minPrecio}
                onChange={(e) => setFilters({ ...filters, minPrecio: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
              />
            </div>

            <div>
              <label htmlFor="filter-max-precio" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Precio Máximo Personalizado (COP)
              </label>
              <input
                id="filter-max-precio"
                type="number"
                placeholder="Ej: 200000"
                value={filters.maxPrecio}
                onChange={(e) => setFilters({ ...filters, maxPrecio: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
              />
            </div>

            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => setFilters({ minPrecio: "", maxPrecio: "" })}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal isOpen={showForm} onClose={resetForm} title={editingId ? "Editar Cliente" : "Nuevo Cliente"}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="cliente-nombre" className="text-slate-300 text-xs font-semibold block">
                Nombre / Razón Social *
              </label>
              <input
                id="cliente-nombre"
                required
                aria-required="true"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="Ej: Moto Repuestos SAS"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cliente-contacto" className="text-slate-300 text-xs font-semibold block">
                Persona de Contacto
              </label>
              <input
                id="cliente-contacto"
                value={formData.contacto}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="Ej: Carlos Rodríguez"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cliente-telefono" className="text-slate-300 text-xs font-semibold block">
                Teléfono
              </label>
              <input
                id="cliente-telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="+57 300 123 4567"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="cliente-email" className="text-slate-300 text-xs font-semibold block">
                Email
              </label>
              <input
                id="cliente-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="ejemplo@correo.com"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="cliente-direccion" className="text-slate-300 text-xs font-semibold block">
                Dirección
              </label>
              <input
                id="cliente-direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="Calle 45 #23-12, Medellín"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="cliente-precio" className="text-slate-300 text-xs font-semibold block">
                Precio Personalizado General (COP)
              </label>
              <input
                id="cliente-precio"
                type="number"
                value={formData.precioPersonalizado}
                onChange={(e) => setFormData({ ...formData, precioPersonalizado: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/30"
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label htmlFor="cliente-notas" className="text-slate-300 text-xs font-semibold block">
                Notas
              </label>
              <textarea
                id="cliente-notas"
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="Información adicional sobre el cliente..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white py-2.5 rounded-xl font-semibold text-sm shadow-md transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {editingId ? "Actualizar Cliente" : "Crear Cliente"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-5 bg-slate-800 text-slate-300 hover:bg-slate-700 py-2.5 rounded-xl font-semibold text-sm transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClientes.length === 0 ? (
          <div className="col-span-full bg-slate-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-12 text-center">
            <Users className="w-16 h-16 text-cyan-400/60 mx-auto mb-4" />
            {hasInactiveRecords && !includeInactive && !searchTerm && !filters.minPrecio && !filters.maxPrecio ? (
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">No hay clientes activos registrados</h3>
                <p className="text-gray-400 text-base mb-6 max-w-md mx-auto">
                  Existen registros de clientes inactivos en el sistema. Puedes visualizar los clientes inactivos
                  activando la opción correspondiente.
                </p>
                <button
                  onClick={() => setIncludeInactive(true)}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-105 inline-flex items-center gap-2"
                >
                  <Filter className="w-5 h-5" />
                  Ver clientes inactivos
                </button>
              </div>
            ) : (
              <p className="text-gray-400 text-lg">
                {searchTerm || filters.minPrecio || filters.maxPrecio
                  ? "No se encontraron clientes con esos criterios"
                  : "No hay clientes registrados"}
              </p>
            )}
          </div>
        ) : (
          filteredClientes.map((cliente) => (
            <div
              key={cliente.id}
              className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 bg-cyan-950/60 border border-cyan-500/30 rounded-xl flex items-center justify-center text-cyan-400 font-bold shrink-0"
                      aria-hidden="true"
                    >
                      {cliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-slate-100 font-semibold text-base truncate">{cliente.nombre}</h3>
                      <p className="text-slate-400 text-xs truncate">{cliente.contacto || "Sin contacto registrado"}</p>
                    </div>
                  </div>
                  {!cliente.activo ? (
                    <Badge variant="danger" size="sm" showDot>
                      Inactivo
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm">
                      Activo
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 mb-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{cliente.email}</span>
                  </div>
                  {cliente.telefono && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                      <span>{cliente.telefono}</span>
                    </div>
                  )}
                  {cliente.direccion && (
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">{cliente.direccion}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>Desde {new Date(cliente.fechaRegistro).toLocaleDateString("es-CO")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>
                      Último pedido:{" "}
                      {cliente.lastOrderDate ? new Date(cliente.lastOrderDate).toLocaleDateString("es-CO") : "N/A"}
                    </span>
                    {cliente.lastOrderDate && Date.now() - cliente.lastOrderDate > 14 * 24 * 60 * 60 * 1000 && (
                      <span
                        className="ml-auto inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
                        title="Sin pedidos recientes (>2 semanas)"
                      >
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        <span>Inactivo &gt;14d</span>
                      </span>
                    )}
                  </div>
                </div>

                {cliente.precioPersonalizado > 0 && (
                  <div className="bg-purple-950/40 border border-purple-500/30 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-purple-300 text-xs font-semibold">Tarifa General</span>
                      {priceEditingId === cliente.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            aria-label="Tarifa personalizada"
                            className="w-24 bg-slate-950 border border-slate-700 rounded-lg p-1 text-slate-100 text-xs"
                            value={priceEditingValue}
                            onChange={(e) => setPriceEditingValue(e.target.value)}
                          />
                          <button
                            type="button"
                            aria-label="Guardar tarifa"
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs"
                            onClick={async () => {
                              const v = parseFloat(priceEditingValue)
                              if (isNaN(v)) {
                                addToast("Precio inválido", "warning")
                                return
                              }
                              try {
                                await updateCliente(token, cliente.id, { precioPersonalizado: v })
                                addToast("Precio actualizado", "success")
                                setPriceEditingId(null)
                                loadClientes()
                              } catch {
                                addToast("Error al actualizar", "error")
                              }
                            }}
                          >
                            <Save className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            aria-label="Cancelar edición"
                            className="p-1 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-md text-xs"
                            onClick={() => setPriceEditingId(null)}
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-purple-300 text-sm font-bold flex items-center gap-1.5 hover:text-purple-200 transition-colors"
                          onClick={() => {
                            setPriceEditingId(cliente.id)
                            setPriceEditingValue(String(cliente.precioPersonalizado || ""))
                          }}
                          aria-label={`Modificar tarifa general de ${cliente.nombre}`}
                        >
                          <span>{formatCurrencyCommas(cliente.precioPersonalizado)}</span>
                          <Edit className="w-3 h-3 text-purple-400" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {cliente.notas && (
                  <div className="bg-slate-950/60 rounded-xl p-3 mb-4 text-xs text-slate-400 italic border border-slate-850">
                    <p>{cliente.notas}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 pt-3 border-t border-slate-800/80">
                {cliente.activo ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEdit(cliente)}
                      aria-label={`Editar cliente ${cliente.nombre}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      <Edit className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCustomPrices(cliente)}
                      aria-label={`Precios por producto para ${cliente.nombre}`}
                      title="Precios personalizados por producto"
                      className="p-2 bg-purple-950/50 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-purple-400"
                    >
                      <Settings className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openResumen360(cliente)}
                      aria-label={`Ficha 360 de ${cliente.nombre}`}
                      title="Ficha 360° del Cliente"
                      className="p-2 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                    >
                      <BarChart3 className="w-4 h-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cliente.id)}
                      aria-label={`Desactivar cliente ${cliente.nombre}`}
                      title="Desactivar cliente"
                      className="p-2 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => reactivar(cliente.id)}
                    aria-label={`Reactivar cliente ${cliente.nombre}`}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400"
                  >
                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reactivar Cliente</span>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <nav
        aria-label="Paginación de clientes"
        className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400"
      >
        <div>
          Mostrando página {page} de {Math.max(1, Math.ceil(total / limit))} ({total} clientes en total)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Página anterior"
            className="p-2 border border-slate-700 bg-slate-900 text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Página siguiente"
            className="p-2 border border-slate-700 bg-slate-900 text-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
            disabled={page >= Math.max(1, Math.ceil(total / limit))}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <label htmlFor="limit-clientes" className="sr-only">
            Clientes por página
          </label>
          <select
            id="limit-clientes"
            aria-label="Clientes por página"
            className="ml-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 px-2.5 py-1.5 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
            value={limit}
            onChange={(e) => {
              setPage(1)
              setLimit(Number(e.target.value))
            }}
          >
            <option value={6}>6 por página</option>
            <option value={12}>12 por página</option>
            <option value={24}>24 por página</option>
          </select>
        </div>
      </nav>

      <Modal
        isOpen={!!showCustomPrices}
        onClose={() => setShowCustomPrices(null)}
        title={`Precios Personalizados - ${showCustomPrices?.nombre}`}
      >
        <div className="max-h-96 overflow-y-auto">
          {products.map((product) => {
            const existingPrice = clientPrices.find((p) => p.productId === product.id)
            const currentValue = priceEditValues[product.id] ?? (existingPrice ? String(existingPrice.price) : "")
            return (
              <div key={product.id} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div>
                  <p className="text-white font-medium">{product.nombre}</p>
                  <p className="text-gray-400 text-sm">
                    Rango: ${product.precioMinimo} - ${product.precioMaximo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Precio personalizado"
                    value={currentValue}
                    onChange={(e) => setPriceEditValues({ ...priceEditValues, [product.id]: e.target.value })}
                    className="bg-slate-900 border border-slate-700 rounded p-2 text-white w-32"
                  />
                  <button
                    onClick={() => saveCustomPrice(product.id)}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold transition-all"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  {existingPrice && (
                    <button
                      onClick={() => removeCustomPrice(product.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-semibold transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={() => setShowCustomPrices(null)}
            className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-semibold hover:bg-slate-600 transition-all"
          >
            Cerrar
          </button>
        </div>
      </Modal>

      {/* Modal Ficha 360° del Cliente */}
      <Modal
        isOpen={show360}
        onClose={() => setShow360(false)}
        title={`Ficha 360° — ${c360Data?.client?.nombre || "Cliente"}`}
      >
        {loading360 ? (
          <p className="text-gray-400 p-4 text-center">Cargando métricas del cliente...</p>
        ) : !c360Data ? (
          <p className="text-gray-400 p-4 text-center">No se pudo cargar la información del cliente.</p>
        ) : (
          <div className="space-y-6">
            {/* Header info */}
            <div className="bg-slate-900/60 border border-slate-700/60 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4 text-sm">
              <div>
                <p className="text-white font-bold text-lg">{c360Data.client.nombre}</p>
                <p className="text-slate-400">{c360Data.client.contacto || "Sin contacto principal"}</p>
              </div>
              <div className="flex gap-4 text-xs">
                {c360Data.client.telefono && <span className="text-green-400">📞 {c360Data.client.telefono}</span>}
                {c360Data.client.email && <span className="text-cyan-400">✉️ {c360Data.client.email}</span>}
              </div>
            </div>

            {/* Key KPI Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900/60 border border-cyan-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Total Comprado</p>
                <p className="text-lg font-bold text-cyan-400">${c360Data.totalComprado.toLocaleString("es-CO")}</p>
                <p className="text-[11px] text-slate-500">{c360Data.totalPedidos} pedidos</p>
              </div>
              <div className="bg-slate-900/60 border border-emerald-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Total Abonado</p>
                <p className="text-lg font-bold text-emerald-400">${c360Data.totalAbonado.toLocaleString("es-CO")}</p>
              </div>
              <div className="bg-slate-900/60 border border-rose-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Saldo Pendiente</p>
                <p className="text-lg font-bold text-rose-400">${c360Data.saldoPendiente.toLocaleString("es-CO")}</p>
              </div>
              <div className="bg-slate-900/60 border border-purple-500/30 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-400">Ticket Promedio</p>
                <p className="text-lg font-bold text-purple-400">${c360Data.ticketPromedio.toLocaleString("es-CO")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Products Purchased */}
              <div className="bg-slate-900/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4" /> Top Productos Más Comprados
                </h4>
                {c360Data.topProducts.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Sin registros de productos comprados.</p>
                ) : (
                  <div className="space-y-2">
                    {c360Data.topProducts.map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-900/80 border border-slate-700/60 rounded p-2 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{p.nombre}</p>
                          <p className="text-slate-400 text-[11px]">{p.totalUnidades} unidades adquiridas</p>
                        </div>
                        <span className="text-cyan-400 font-bold">
                          ${Number(p.totalInvertido || 0).toLocaleString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Orders */}
              <div className="bg-slate-900/40 border border-slate-700/60 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-purple-400 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" /> Historial de Pedidos Recientes
                </h4>
                {c360Data.recentOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">Sin pedidos registrados.</p>
                ) : (
                  <div className="space-y-2">
                    {c360Data.recentOrders.map((o) => {
                      const tot = Number(o.total || 0)
                      const pag = Number(o.totalPagado || 0)
                      const isPaid = pag >= tot && tot > 0
                      return (
                        <div
                          key={o.id}
                          className="bg-slate-900/80 border border-slate-700/60 rounded p-2 flex items-center justify-between text-xs"
                        >
                          <div>
                            <p className="font-semibold text-white">
                              Pedido #{o.id} — {o.estado}
                            </p>
                            <p className="text-slate-400 text-[11px]">
                              {new Date(o.createdAt).toLocaleDateString("es-CO")}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-cyan-400 font-bold">${tot.toLocaleString("es-CO")}</p>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${isPaid ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                            >
                              {isPaid ? "Pagado" : `Pend: $${(tot - pag).toLocaleString("es-CO")}`}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

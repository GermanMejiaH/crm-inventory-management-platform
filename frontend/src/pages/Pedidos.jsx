import { useEffect, useState, useMemo, useRef } from "react"
import {
  ShoppingCart,
  Search,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Trash2,
  DollarSign,
  MessageCircle,
  FileText,
  Clock,
  Edit2
} from "lucide-react"
import { useToast } from "../components/ToastContext"
import Modal from "../components/Modal"
import Badge from "../components/Badge"
import MetricCard from "../components/MetricCard"
import EmptyState from "../components/EmptyState"
import {
  getClientes,
  getProductos,
  getPedidosFiltered,
  createPedido,
  updatePedido,
  deletePedido,
  generateProforma,
  getPedidoAudit,
  getOptions,
  getClientPrices,
  getAbonos,
  crearAbono
} from "../api/client"

export default function Pedidos({ token }) {
  const { addToast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [pedidos, setPedidos] = useState([])
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState({
    clienteId: "",
    metodoPago: "",
    notas: "",
    items: [{ productoId: "", cantidad: 1, precioUnitario: "" }]
  })
  const [clientPrices, setClientPrices] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [estado, setEstado] = useState("")
  const [metodoPago, setMetodoPago] = useState("")
  const [orderStates, setOrderStates] = useState([])
  const [payments, setPayments] = useState([])
  const initFromUrl = useRef(false)
  const [showAudit, setShowAudit] = useState(false)
  const [auditItems, setAuditItems] = useState([])
  const [auditOrder, setAuditOrder] = useState(null)
  const [auditPage, setAuditPage] = useState(1)
  const [auditLimit] = useState(10)
  const [auditTotal, setAuditTotal] = useState(0)
  const [editOrder, setEditOrder] = useState(null)
  const [editMetodoPago, setEditMetodoPago] = useState("")
  const [editCantidad, setEditCantidad] = useState("")

  // Abonos state
  const [showAbonos, setShowAbonos] = useState(false)
  const [abonosOrder, setAbonosOrder] = useState(null)
  const [abonosItems, setAbonosItems] = useState([])
  const [abonosSummary, setAbonosSummary] = useState({
    total: 0,
    totalPagado: 0,
    saldoPendiente: 0,
    estadoPago: "Pendiente"
  })
  const [newAbono, setNewAbono] = useState({ monto: "", metodoPago: "Efectivo", nota: "" })
  const [loadingAbonos, setLoadingAbonos] = useState(false)

  function setToday() {
    const d = new Date()
    const iso = d.toISOString().slice(0, 10)
    setFrom(iso)
    setTo(iso)
  }

  function setThisWeek() {
    const d = new Date()
    const day = d.getDay()
    const diffToMonday = (day + 6) % 7
    const start = new Date(d)
    start.setDate(d.getDate() - diffToMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    setFrom(start.toISOString().slice(0, 10))
    setTo(end.toISOString().slice(0, 10))
  }

  function setThisMonth() {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    setFrom(start.toISOString().slice(0, 10))
    setTo(end.toISOString().slice(0, 10))
  }

  async function openAbonos(order) {
    setAbonosOrder(order)
    setShowAbonos(true)
    setNewAbono({ monto: "", metodoPago: "Efectivo", nota: "" })
    await loadAbonos(order.id)
  }

  async function loadAbonos(id) {
    try {
      setLoadingAbonos(true)
      const data = await getAbonos(token, id)
      setAbonosItems(data.items || [])
      setAbonosSummary({
        total: Number(data.total || 0),
        totalPagado: Number(data.totalPagado || 0),
        saldoPendiente: Number(data.saldoPendiente || 0),
        estadoPago: data.estadoPago || "Pendiente"
      })
    } catch {
      addToast("Error al cargar abonos", "error")
    } finally {
      setLoadingAbonos(false)
    }
  }

  async function handleCrearAbono() {
    if (!newAbono.monto || Number(newAbono.monto) <= 0) {
      addToast("Ingresa un monto válido mayor a 0", "warning")
      return
    }
    try {
      await crearAbono(token, abonosOrder.id, {
        monto: Number(newAbono.monto),
        metodoPago: newAbono.metodoPago,
        nota: newAbono.nota
      })
      addToast("Abono registrado con éxito", "success")
      setNewAbono({ monto: "", metodoPago: "Efectivo", nota: "" })
      await loadAbonos(abonosOrder.id)
      load()
    } catch {
      addToast("Error al registrar abono", "error")
    }
  }

  function openWhatsApp(order) {
    const cliente = clientes.find((c) => c.id === order.clienteId)
    if (!cliente || !cliente.telefono) {
      addToast("El cliente no tiene un número de teléfono registrado", "warning")
      return
    }
    const phoneClean = cliente.telefono.replace(/[^0-9]/g, "")
    if (!phoneClean) {
      addToast("Número de teléfono inválido para WhatsApp", "warning")
      return
    }
    const tot = Number(order.total || 0)
    const pag = Number(order.totalPagado || 0)
    const sal = Math.max(0, tot - pag)
    const msg = `Hola ${cliente.nombre}! Te compartimos el resumen de tu pedido #${order.id} en Aurora Demo:\n- Total: $${tot.toLocaleString("es-CO")} COP\n- Abonado: $${pag.toLocaleString("es-CO")} COP\n- Saldo Pendiente: $${sal.toLocaleString("es-CO")} COP\n\n¡Gracias por tu compra!`
    const url = `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`
    window.open(url, "_blank")
  }

  // Load client prices when client is selected
  useEffect(() => {
    if (token && nuevo.clienteId) {
      getClientPrices(token, Number(nuevo.clienteId))
        .then(setClientPrices)
        .catch(() => setClientPrices([]))
    } else {
      setClientPrices([])
    }
  }, [token, nuevo.clienteId])

  function getItemRecommendedPrice(clienteId, productoId) {
    if (!clienteId || !productoId) return null
    const product = productos.find((p) => p.id === Number(productoId))
    const client = clientes.find((c) => c.id === Number(clienteId))
    if (!product) return null

    const customPrice = clientPrices.find((p) => p.productId === Number(productoId))
    if (customPrice) return customPrice.price

    if (client && client.precioPersonalizado != null) return client.precioPersonalizado

    return product.precioMinimo
  }

  const totalPrice = useMemo(() => {
    return nuevo.items.reduce((sum, item) => {
      const cant = Number(item.cantidad) || 0
      const rec = getItemRecommendedPrice(nuevo.clienteId, item.productoId)
      const unit = item.precioUnitario !== "" && item.precioUnitario != null ? Number(item.precioUnitario) : rec || 0
      return sum + cant * unit
    }, 0)
  }, [nuevo.items, nuevo.clienteId, clientPrices, productos, clientes])

  function handleItemChange(index, field, value) {
    setNuevo((prev) => {
      const updated = [...prev.items]
      updated[index] = { ...updated[index], [field]: value }
      return { ...prev, items: updated }
    })
  }

  function addItemRow() {
    setNuevo((prev) => ({
      ...prev,
      items: [...prev.items, { productoId: "", cantidad: 1, precioUnitario: "" }]
    }))
  }

  function removeItemRow(index) {
    setNuevo((prev) => {
      if (prev.items.length <= 1) return prev
      return { ...prev, items: prev.items.filter((_, i) => i !== index) }
    })
  }

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const [c, p, o, opts] = await Promise.all([
        getClientes(token),
        getProductos(token, { tipo: "producto_terminado" }),
        getPedidosFiltered(token, { from, to, estado, metodoPago }),
        getOptions(token)
      ])
      setClientes(c)
      setProductos(p)
      setPedidos(o)
      setOrderStates(Array.isArray(opts.orderStates) ? opts.orderStates : [])
      setPayments(Array.isArray(opts.payments) ? opts.payments : [])
    } catch {
      addToast("Error al cargar datos", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token, from, to, estado, metodoPago])

  useEffect(() => {
    if (initFromUrl.current) return
    const qs = new URLSearchParams(window.location.search)
    const f = qs.get("from") || ""
    const t = qs.get("to") || ""
    const e = qs.get("estado") || ""
    const mp = qs.get("metodoPago") || ""
    setFrom(f)
    setTo(t)
    setEstado(e)
    setMetodoPago(mp)
    initFromUrl.current = true
  }, [])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (from) qs.set("from", from)
    if (to) qs.set("to", to)
    if (estado) qs.set("estado", estado)
    if (metodoPago) qs.set("metodoPago", metodoPago)
    const url = `${window.location.pathname}?${qs.toString()}`
    window.history.replaceState({}, "", url)
  }, [from, to, estado, metodoPago])

  async function crear() {
    if (!nuevo.clienteId) {
      addToast("Por favor selecciona un cliente", "warning")
      return
    }
    const validItems = nuevo.items.filter((it) => it.productoId && Number(it.cantidad) > 0)
    if (validItems.length === 0) {
      addToast("Por favor agrega al menos un producto válido al pedido", "warning")
      return
    }

    // Check stock overflow before submission
    for (const it of validItems) {
      const prod = productos.find((p) => p.id === Number(it.productoId))
      if (prod) {
        const avail = Number(prod.stockActual || 0)
        const req = Number(it.cantidad || 0)
        if (avail < req) {
          addToast(`Stock insuficiente para ${prod.nombre} (Disponible: ${avail}, Solicitado: ${req})`, "error")
          return
        }
      }
    }

    try {
      const payloadItems = validItems.map((it) => {
        const rec = getItemRecommendedPrice(nuevo.clienteId, it.productoId)
        const unit = it.precioUnitario !== "" && it.precioUnitario != null ? Number(it.precioUnitario) : rec
        return {
          productoId: Number(it.productoId),
          cantidad: Number(it.cantidad),
          precioUnitario: unit != null ? Number(unit) : undefined
        }
      })

      await createPedido(token, {
        clienteId: Number(nuevo.clienteId),
        metodoPago: nuevo.metodoPago || "",
        notas: nuevo.notas || "",
        items: payloadItems
      })
      setNuevo({
        clienteId: "",
        metodoPago: "",
        notas: "",
        items: [{ productoId: "", cantidad: 1, precioUnitario: "" }]
      })
      setShowForm(false)
      load()
      addToast("Pedido creado exitosamente", "success")
    } catch {
      addToast("Error al crear el pedido", "error")
    }
  }

  async function completar(id) {
    try {
      await updatePedido(token, id, { estado: "Completado" })
      load()
      addToast("Pedido completado", "success")
    } catch {
      addToast("Error al completar pedido", "error")
    }
  }

  async function eliminar(id) {
    if (!window.confirm("¿Estás seguro de eliminar este pedido?")) return
    try {
      await deletePedido(token, id)
      load()
      addToast("Pedido eliminado", "success")
    } catch {
      addToast("Error al eliminar pedido", "error")
    }
  }

  async function proforma(id) {
    try {
      const j = await generateProforma(token, id)
      if (j.url) {
        addToast("Proforma generada exitosamente", "success")
      } else {
        addToast("Error al generar proforma", "error")
      }
    } catch {
      addToast("Error al generar proforma", "error")
    }
  }

  async function openAudit(order) {
    setAuditOrder(order)
    setShowAudit(true)
    setAuditPage(1)
    await loadAudit(order.id, 1, auditLimit)
  }

  async function loadAudit(id, pageArg, limitArg) {
    try {
      const data = await getPedidoAudit(token, id, { page: pageArg, limit: limitArg })
      setAuditItems(data.items || [])
      setAuditTotal(Number(data.total || 0))
    } catch {
      addToast("Error al cargar auditoría", "error")
    }
  }

  const filtered = pedidos.filter(
    (p) =>
      String(p.id).includes(searchTerm) ||
      String(p.estado || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
  )
  const completadosCount = pedidos.filter((p) => p.estado === "Completado").length
  const pendientesCount = pedidos.filter((p) => p.estado === "Pendiente").length

  function EstadoBadge({ estado }) {
    if (estado === "Completado") {
      return (
        <Badge variant="success" icon={CheckCircle}>
          Completado
        </Badge>
      )
    }
    if (estado === "Pendiente") {
      return (
        <Badge variant="warning" icon={AlertTriangle}>
          Pendiente
        </Badge>
      )
    }
    return (
      <Badge variant="danger" icon={AlertTriangle}>
        {estado || "Cancelado"}
      </Badge>
    )
  }

  function EstadoPagoBadge({ total, totalPagado }) {
    const pagado = Number(totalPagado || 0)
    const tot = Number(total || 0)
    const saldo = Math.max(0, tot - pagado)
    const isPaid = pagado >= tot && tot > 0
    const isPartial = pagado > 0 && !isPaid

    if (isPaid) {
      return <Badge variant="success">Pagado</Badge>
    }
    if (isPartial) {
      return <Badge variant="warning">Parcial (${saldo.toLocaleString("es-CO")})</Badge>
    }
    return <Badge variant="danger">Pendiente</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Gestión de Pedidos</h1>
              <p className="text-xs text-slate-400">Crea, consulta, rastrea abonos y audita órdenes de venta</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            aria-label="Actualizar pedidos"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Pedidos"
          value={pedidos.length}
          icon={ShoppingCart}
          variant="cyan"
          subtitle="Registrados en el sistema"
          loading={loading}
        />
        <MetricCard
          title="Completados"
          value={completadosCount}
          icon={CheckCircle}
          variant="emerald"
          subtitle="Entregados y despachados"
          loading={loading}
        />
        <MetricCard
          title="Pendientes"
          value={pendientesCount}
          icon={AlertTriangle}
          variant="amber"
          subtitle="En preparación o cobro"
          loading={loading}
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <label htmlFor="search-pedidos" className="sr-only">
              Buscar pedidos
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="search-pedidos"
              type="text"
              placeholder="Buscar por ID de pedido o estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="filter-from" className="block text-xs font-medium text-slate-400 mb-1">
              Desde
            </label>
            <input
              id="filter-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="filter-to" className="block text-xs font-medium text-slate-400 mb-1">
              Hasta
            </label>
            <input
              id="filter-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="filter-estado" className="block text-xs font-medium text-slate-400 mb-1">
              Estado Pedido
            </label>
            <select
              id="filter-estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Todos los estados</option>
              {orderStates.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-metodo" className="block text-xs font-medium text-slate-400 mb-1">
              Método de Pago
            </label>
            <select
              id="filter-metodo"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Todos los métodos</option>
              {payments.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">Filtros rápidos:</span>
            <button
              type="button"
              onClick={setToday}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={setThisWeek}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={setThisMonth}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/40 transition-colors"
            >
              Este mes
            </button>
          </div>
          {(from || to || estado || metodoPago || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setFrom("")
                setTo("")
                setEstado("")
                setMetodoPago("")
                setSearchTerm("")
              }}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Pedidos */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Listado de órdenes de pedido registradas</caption>
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th scope="col" className="p-4">
                  ID
                </th>
                <th scope="col" className="p-4">
                  Cliente
                </th>
                <th scope="col" className="p-4">
                  Ítems
                </th>
                <th scope="col" className="p-4">
                  Cant.
                </th>
                <th scope="col" className="p-4">
                  Total
                </th>
                <th scope="col" className="p-4">
                  Estado Pedido
                </th>
                <th scope="col" className="p-4">
                  Estado Pago
                </th>
                <th scope="col" className="p-4">
                  Método
                </th>
                <th scope="col" className="p-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-6">
                    <EmptyState
                      icon={ShoppingCart}
                      title="No hay pedidos registrados"
                      description="No se encontraron órdenes con los filtros actuales o no hay pedidos en el sistema."
                      actionLabel="Crear Nuevo Pedido"
                      onAction={() => setShowForm(true)}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((x) => {
                  const cliente = clientes.find((c) => c.id === x.clienteId)
                  const producto = productos.find((p) => p.id === x.productoId)
                  const hasItems = Array.isArray(x.items) && x.items.length > 0
                  const itemNames = hasItems
                    ? x.items.map((i) => i.productoNombre || `Producto #${i.productoId}`).join(", ")
                    : producto?.nombre || `Producto #${x.productoId}`
                  const totalQty = hasItems ? x.items.reduce((s, i) => s + Number(i.cantidad || 0), 0) : x.cantidad

                  return (
                    <tr key={x.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-mono text-cyan-400 font-semibold">#{x.id}</td>
                      <td className="p-4 font-medium text-slate-200">{cliente?.nombre || `Cliente #${x.clienteId}`}</td>
                      <td className="p-4 text-slate-300 max-w-xs truncate" title={itemNames}>
                        {itemNames}
                      </td>
                      <td className="p-4 text-slate-200 font-medium">{totalQty}</td>
                      <td className="p-4 font-bold text-emerald-400">${(x.total || 0).toLocaleString("es-CO")}</td>
                      <td className="p-4">
                        <EstadoBadge estado={x.estado} />
                      </td>
                      <td className="p-4">
                        <EstadoPagoBadge total={x.total} totalPagado={x.totalPagado} />
                      </td>
                      <td className="p-4 text-slate-400 text-xs">{x.metodoPago || "Efectivo"}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {x.estado !== "Completado" && x.estado !== "Cancelado" && (
                            <button
                              type="button"
                              onClick={() => completar(x.id)}
                              aria-label={`Completar pedido #${x.id}`}
                              className="px-2 py-1 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-medium transition-colors"
                            >
                              Completar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openAbonos(x)}
                            aria-label={`Gestionar abonos del pedido #${x.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 font-medium transition-colors"
                          >
                            <DollarSign className="w-3 h-3" />
                            Abonos
                          </button>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(x)}
                            aria-label={`Compartir pedido #${x.id} por WhatsApp`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 hover:bg-teal-500/20 font-medium transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => proforma(x.id)}
                            aria-label={`Generar proforma para pedido #${x.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 font-medium transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Proforma
                          </button>
                          <button
                            type="button"
                            onClick={() => openAudit(x)}
                            aria-label={`Ver auditoría del pedido #${x.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 font-medium transition-colors"
                          >
                            <Clock className="w-3 h-3" />
                            Auditoría
                          </button>
                          {x.estado === "Pendiente" && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditOrder(x)
                                setEditMetodoPago(x.metodoPago || "")
                                setEditCantidad(String(x.cantidad || ""))
                              }}
                              aria-label={`Editar pedido #${x.id}`}
                              className="p-1 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => eliminar(x.id)}
                            aria-label={`Eliminar pedido #${x.id}`}
                            className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Nuevo Pedido */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Crear Nuevo Pedido">
        <div className="space-y-4">
          <div>
            <label htmlFor="pedido-cliente" className="block text-xs font-semibold text-slate-300 mb-1">
              Cliente <span className="text-rose-400">*</span>
            </label>
            <select
              id="pedido-cliente"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              value={nuevo.clienteId}
              onChange={(e) => setNuevo({ ...nuevo, clienteId: e.target.value })}
            >
              <option value="">-- Seleccionar Cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="block text-xs font-semibold text-slate-300">
              Productos del Pedido <span className="text-rose-400">*</span>
            </label>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg px-2.5 py-1 hover:bg-cyan-500/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Producto
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {nuevo.items.map((item, idx) => {
              const recPrice = getItemRecommendedPrice(nuevo.clienteId, item.productoId)
              const unit =
                item.precioUnitario !== "" && item.precioUnitario != null ? Number(item.precioUnitario) : recPrice || 0
              const sub = (Number(item.cantidad) || 0) * unit
              return (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-400 font-semibold">Ítem #{idx + 1}</span>
                    {nuevo.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                        aria-label={`Eliminar ítem #${idx + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <label htmlFor={`item-prod-${idx}`} className="block text-xs text-slate-400 mb-1">
                        Producto
                      </label>
                      <select
                        id={`item-prod-${idx}`}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        value={item.productoId}
                        onChange={(e) => handleItemChange(idx, "productoId", e.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {productos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} (Stock: {p.stockActual || 0})
                          </option>
                        ))}
                      </select>
                      {(() => {
                        const selP = productos.find((p) => p.id === Number(item.productoId))
                        if (!selP) return null
                        const avail = Number(selP.stockActual || 0)
                        const req = Number(item.cantidad || 0)
                        const isExceeded = req > avail
                        const isLow = avail <= Number(selP.stockMinimo || 0)
                        if (isExceeded) {
                          return (
                            <p className="text-xs text-rose-400 font-semibold mt-1">¡Insuficiente! Disp: {avail}</p>
                          )
                        }
                        return (
                          <p className="text-xs text-slate-400 mt-1">
                            Disp:{" "}
                            <span className={isLow ? "text-amber-400 font-semibold" : "text-emerald-400 font-semibold"}>
                              {avail} uds
                            </span>{" "}
                            {isLow && "(Stock Bajo)"}
                          </p>
                        )
                      })()}
                    </div>
                    <div>
                      <label htmlFor={`item-cant-${idx}`} className="block text-xs text-slate-400 mb-1">
                        Cantidad
                      </label>
                      <input
                        id={`item-cant-${idx}`}
                        type="number"
                        min="1"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        value={item.cantidad}
                        onChange={(e) => handleItemChange(idx, "cantidad", e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={`item-precio-${idx}`} className="block text-xs text-slate-400 mb-1">
                        Precio Unit. ($)
                      </label>
                      <input
                        id={`item-precio-${idx}`}
                        type="number"
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        placeholder={recPrice ? String(recPrice) : "Precio"}
                        value={item.precioUnitario}
                        onChange={(e) => handleItemChange(idx, "precioUnitario", e.target.value)}
                      />
                    </div>
                  </div>
                  {sub > 0 && (
                    <div className="text-right text-xs text-slate-400">
                      Subtotal: <span className="text-emerald-400 font-semibold">${sub.toLocaleString("es-CO")}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div>
            <label htmlFor="pedido-metodo" className="block text-xs font-semibold text-slate-300 mb-1">
              Método de Pago
            </label>
            <select
              id="pedido-metodo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
              value={nuevo.metodoPago || ""}
              onChange={(e) => setNuevo({ ...nuevo, metodoPago: e.target.value })}
            >
              <option value="">Sin especificar</option>
              {payments.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Total Acumulado del Pedido:</span>
            <span className="text-xl font-bold text-emerald-400">${totalPrice.toLocaleString("es-CO")} COP</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={crear}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Crear Pedido
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Auditoría */}
      <Modal isOpen={showAudit} onClose={() => setShowAudit(false)} title="Auditoría del Pedido">
        <div className="space-y-4">
          <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-semibold text-cyan-400">Pedido #{auditOrder?.id || ""}</span> — Cliente:{" "}
            <span className="text-slate-100 font-medium">
              {clientes.find((c) => c.id === auditOrder?.clienteId)?.nombre || "No especificado"}
            </span>
          </div>
          <div className="relative pl-6 border-l-2 border-cyan-500/30 space-y-3 my-2">
            {auditItems.length === 0 ? (
              <p className="text-slate-400 text-xs">Sin eventos de auditoría registrados para este pedido.</p>
            ) : (
              auditItems.map((a) => {
                const obs = String(a.observation || "").toLowerCase()
                const isCreated = obs.includes("creado")
                const isCompleted = obs.includes("completado")
                const isUpdated = obs.includes("actualizado")

                return (
                  <div key={a.id} className="relative">
                    <div
                      className={`absolute -left-[31px] top-0 w-6 h-6 rounded-full border flex items-center justify-center ${
                        isCompleted
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : isCreated
                            ? "bg-cyan-500/20 border-cyan-500 text-cyan-400"
                            : isUpdated
                              ? "bg-amber-500/20 border-amber-500 text-amber-400"
                              : "bg-purple-500/20 border-purple-500 text-purple-400"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : isCreated ? (
                        <Plus className="w-3.5 h-3.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-white capitalize">{a.observation || "Evento"}</span>
                        <span className="text-slate-400">{new Date(a.date).toLocaleString("es-CO")}</span>
                      </div>
                      <p className="text-xs text-cyan-400">
                        Usuario: <span className="text-slate-300">{a.userName || `ID #${a.userId || "Sistema"}`}</span>
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">
              Página {auditPage} de {Math.max(1, Math.ceil(auditTotal / auditLimit))}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="px-2.5 py-1 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                disabled={auditPage <= 1}
                onClick={async () => {
                  const np = auditPage - 1
                  setAuditPage(np)
                  await loadAudit(auditOrder.id, np, auditLimit)
                }}
              >
                Anterior
              </button>
              <button
                type="button"
                className="px-2.5 py-1 border border-slate-800 text-slate-300 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                disabled={auditPage >= Math.max(1, Math.ceil(auditTotal / auditLimit))}
                onClick={async () => {
                  const np = auditPage + 1
                  setAuditPage(np)
                  await loadAudit(auditOrder.id, np, auditLimit)
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar Pedido (Pendiente) */}
      <Modal isOpen={!!editOrder} onClose={() => setEditOrder(null)} title="Editar Pedido">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-cant" className="block text-xs font-semibold text-slate-300 mb-1">
                Cantidad Total
              </label>
              <input
                id="edit-cant"
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100"
                value={editCantidad}
                onChange={(e) => setEditCantidad(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-metodo" className="block text-xs font-semibold text-slate-300 mb-1">
                Método de Pago
              </label>
              <select
                id="edit-metodo"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100"
                value={editMetodoPago}
                onChange={(e) => setEditMetodoPago(e.target.value)}
              >
                <option value="">Sin especificar</option>
                {payments.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              className="px-3.5 py-2 text-sm text-slate-400 hover:text-white"
              onClick={() => setEditOrder(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold"
              onClick={async () => {
                if (!editOrder) return
                try {
                  const payload = { cantidad: Number(editCantidad), metodoPago: editMetodoPago || "" }
                  await updatePedido(token, editOrder.id, payload)
                  addToast("Pedido actualizado", "success")
                  setEditOrder(null)
                  load()
                } catch {
                  addToast("Error al actualizar pedido", "error")
                }
              }}
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Abonos */}
      <Modal
        isOpen={showAbonos}
        onClose={() => setShowAbonos(false)}
        title={`Abonos — Pedido #${abonosOrder?.id || ""}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400">Total Pedido</p>
              <p className="text-base font-bold text-slate-100">${abonosSummary.total.toLocaleString("es-CO")}</p>
            </div>
            <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-400">Total Abonado</p>
              <p className="text-base font-bold text-emerald-400">
                ${abonosSummary.totalPagado.toLocaleString("es-CO")}
              </p>
            </div>
            <div className="bg-slate-950 border border-rose-500/30 rounded-xl p-3 text-center">
              <p className="text-xs text-rose-400">Saldo Pendiente</p>
              <p className="text-base font-bold text-rose-400">
                ${abonosSummary.saldoPendiente.toLocaleString("es-CO")}
              </p>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <h2 className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="w-3.5 h-3.5" /> Registrar Nuevo Abono
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="abono-monto" className="block text-xs text-slate-300 mb-1">
                  Monto ($)
                </label>
                <input
                  id="abono-monto"
                  type="number"
                  min="1"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Monto"
                  value={newAbono.monto}
                  onChange={(e) => setNewAbono({ ...newAbono, monto: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="abono-metodo" className="block text-xs text-slate-300 mb-1">
                  Método de Pago
                </label>
                <select
                  id="abono-metodo"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  value={newAbono.metodoPago}
                  onChange={(e) => setNewAbono({ ...newAbono, metodoPago: e.target.value })}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Bancolombia">Bancolombia</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label htmlFor="abono-nota" className="block text-xs text-slate-300 mb-1">
                  Nota / Ref
                </label>
                <input
                  id="abono-nota"
                  type="text"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Ej: Recibo #001"
                  value={newAbono.nota}
                  onChange={(e) => setNewAbono({ ...newAbono, nota: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleCrearAbono}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                Guardar Abono
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Historial de Abonos</h2>
            {loadingAbonos ? (
              <p className="text-xs text-slate-400">Cargando abonos...</p>
            ) : abonosItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center border border-dashed border-slate-800 rounded-xl">
                No se han registrado abonos para este pedido.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {abonosItems.map((ab) => (
                  <div
                    key={ab.id}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-emerald-400">
                        ${Number(ab.monto || 0).toLocaleString("es-CO")} ({ab.metodoPago || "Efectivo"})
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {new Date(ab.date).toLocaleString("es-CO")} — {ab.userName || "Sistema"}
                      </p>
                    </div>
                    {ab.nota && (
                      <span className="text-slate-300 bg-slate-900 px-2 py-0.5 rounded text-[11px] border border-slate-800">
                        {ab.nota}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

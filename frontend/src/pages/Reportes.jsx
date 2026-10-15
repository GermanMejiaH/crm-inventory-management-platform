import { useState, useEffect, useRef } from "react"
import {
  FileSpreadsheet,
  RefreshCw,
  BarChart3,
  DollarSign,
  TrendingUp,
  PieChart,
  ShoppingCart,
  CheckCircle,
  CreditCard,
  Download
} from "lucide-react"
import { useToast } from "../components/ToastContext"
import {
  downloadVentasCSV,
  getOptions,
  getReportKpis,
  getPedidosFiltered,
  getClientes,
  getReporteRentabilidad
} from "../api/client"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import MetricCard from "../components/MetricCard"
import Badge from "../components/Badge"

export default function Reportes({ token }) {
  const { addToast } = useToast()
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [estado, setEstado] = useState("")
  const [metodoPago, setMetodoPago] = useState("")
  const [cliente, setCliente] = useState("")
  const [clientes, setClientes] = useState([])
  const [orderStates, setOrderStates] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingXlsx, setLoadingXlsx] = useState(false)
  const [kpis, setKpis] = useState({
    totalVentas: 0,
    pedidos: 0,
    completados: 0,
    ticketPromedio: 0,
    totalesPorMetodoPago: {}
  })
  const [series, setSeries] = useState([])
  const [granularity, setGranularity] = useState("day")
  const [delim, setDelim] = useState("semicolon")
  const initFromUrl = useRef(false)
  const [rentabilidad, setRentabilidad] = useState(null)

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
    const fromIso = start.toISOString().slice(0, 10)
    const toIso = end.toISOString().slice(0, 10)
    setFrom(fromIso)
    setTo(toIso)
  }

  function setThisMonth() {
    const d = new Date()
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const fromIso = start.toISOString().slice(0, 10)
    const toIso = end.toISOString().slice(0, 10)
    setFrom(fromIso)
    setTo(toIso)
  }

  async function descargarCSV() {
    if (!token) return
    try {
      if (from && to && new Date(from) > new Date(to)) {
        addToast("Rango de fechas inválido", "warning")
        return
      }
      setLoading(true)
      const blob = await downloadVentasCSV(token, { from, to, estado, metodoPago, cliente, delim })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ventas${from ? `_${from}` : ""}${to ? `_${to}` : ""}.csv`
      a.click()
      URL.revokeObjectURL(url)
      addToast("Reporte descargado correctamente en CSV", "success")
    } catch {
      addToast("Error al descargar reporte en CSV", "error")
    } finally {
      setLoading(false)
    }
  }

  async function descargarXLSX() {
    if (!token) return
    try {
      if (from && to && new Date(from) > new Date(to)) {
        addToast("Rango de fechas inválido", "warning")
        return
      }
      setLoadingXlsx(true)
      const blob = await downloadVentasCSV(token, { from, to, estado, metodoPago, cliente, delim })
      const text = await blob.text()
      const lines = text
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter(Boolean)
      const sepLine = lines[0].startsWith("sep=") ? lines.shift() : ""
      const detectedDelim = sepLine.startsWith("sep=") ? sepLine.slice(4, 5) : delim === "semicolon" ? ";" : ","
      const rowsParsed = lines.map((line) => line.split(detectedDelim))
      const { default: writeXlsxFile } = await import("write-excel-file/browser")
      const headerRow = (rowsParsed[0] || []).map((cell) => ({
        value: cell,
        fontWeight: "bold"
      }))
      const dataRows = rowsParsed.slice(1).map((row) =>
        row.map((cell, cIndex) => {
          if ([6, 7, 8].includes(cIndex)) {
            const num = Number(cell)
            return {
              type: Number,
              value: isNaN(num) ? 0 : num,
              format: cIndex === 6 ? "#,##0" : "$#,##0"
            }
          }
          return { type: String, value: cell }
        })
      )
      const sheetDetalle = [headerRow, ...dataRows]

      const selClient = clientes.find((c) => c.id === Number(cliente))
      const kpiRows = [
        ["Filtro desde", from || ""],
        ["Filtro hasta", to || ""],
        ["Estado", estado || "Todos"],
        ["Método de pago", metodoPago || "Todos"],
        ["Cliente", selClient ? selClient.nombre : "Todos"],
        ["Total Ventas", kpis.totalVentas],
        ["Pedidos", kpis.pedidos],
        ["Completados", kpis.completados],
        ["Ticket Promedio", kpis.ticketPromedio]
      ]
      const sheetKpis = kpiRows.map(([label, val]) => [
        { value: label, fontWeight: "bold" },
        typeof val === "number"
          ? { type: Number, value: val, format: "#,##0" }
          : { type: String, value: String(val ?? "") }
      ])

      const fileName = `ventas${from ? `_${from}` : ""}${to ? `_${to}` : ""}.xlsx`
      await writeXlsxFile([sheetDetalle, sheetKpis], {
        sheets: ["Detalle", "KPIs"],
        fileName
      })
      addToast("Reporte XLSX generado y descargado", "success")
    } catch {
      addToast("Error al generar archivo XLSX", "error")
    } finally {
      setLoadingXlsx(false)
    }
  }

  async function loadOptions() {
    if (!token) return
    try {
      const [j, c] = await Promise.all([getOptions(token), getClientes(token)])
      setOrderStates(Array.isArray(j.orderStates) ? j.orderStates : [])
      setPayments(Array.isArray(j.payments) ? j.payments : [])
      setClientes(Array.isArray(c) ? c : c.items || [])
    } catch {}
  }

  async function loadKpis() {
    if (!token) return
    try {
      if (from && to && new Date(from) > new Date(to)) return
      const j = await getReportKpis(token, { from, to, estado, metodoPago, cliente })
      setKpis(j)
    } catch {}
  }

  async function loadSeries() {
    if (!token) return
    try {
      if (from && to && new Date(from) > new Date(to)) return
      const orders = await getPedidosFiltered(token, { from, to, estado, metodoPago, cliente })
      const pm =
        Array.isArray(payments) && payments.length > 0
          ? payments
          : Array.from(
              new Set(
                (Array.isArray(orders) ? orders : []).map((o) => {
                  const m = o.metodoPago && String(o.metodoPago).trim() ? String(o.metodoPago).trim() : "Efectivo"
                  return m
                })
              )
            )
      const buckets = new Map()
      const excludeCancelado = !estado
      for (const o of Array.isArray(orders) ? orders : []) {
        if (excludeCancelado && o.estado === "Cancelado") continue
        const d = new Date(Number(o.createdAt))
        const bucket =
          granularity === "month"
            ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
            : d.toISOString().slice(0, 10)
        const metodo = o.metodoPago && String(o.metodoPago).trim() ? String(o.metodoPago).trim() : "Efectivo"
        const cur = buckets.get(bucket) || { bucket, total: 0 }
        cur.total = Number(cur.total || 0) + Number(o.total || 0)
        if (pm && pm.length > 0) {
          cur[metodo] = Number(cur[metodo] || 0) + Number(o.total || 0)
        }
        buckets.set(bucket, cur)
      }
      const normalized = Array.from(buckets.values()).sort((a, b) => a.bucket.localeCompare(b.bucket))
      if ((!payments || payments.length === 0) && pm.length > 0) {
        setPayments(pm)
      }
      setSeries(normalized)
    } catch {}
  }

  async function loadRentabilidad() {
    if (!token) return
    try {
      const res = await getReporteRentabilidad(token, { from, to, clienteId: cliente })
      setRentabilidad(res)
    } catch {
      setRentabilidad(null)
    }
  }

  useEffect(() => {
    loadOptions()
  }, [token])

  useEffect(() => {
    if (initFromUrl.current) return
    const qs = new URLSearchParams(window.location.search)
    const f = qs.get("from") || ""
    const t = qs.get("to") || ""
    const e = qs.get("estado") || ""
    const mp = qs.get("metodoPago") || ""
    const c = qs.get("cliente") || ""
    const g = qs.get("granularity") || "day"
    setFrom(f)
    setTo(t)
    setEstado(e)
    setMetodoPago(mp)
    setCliente(c)
    setGranularity(g === "month" ? "month" : "day")
    initFromUrl.current = true
  }, [])

  useEffect(() => {
    loadKpis()
    loadSeries()
    loadRentabilidad()
  }, [token, from, to, estado, metodoPago, cliente, granularity, payments])

  useEffect(() => {
    if (Number(kpis.totalVentas || 0) > 0 && (!series || series.length === 0)) {
      loadSeries()
    }
  }, [kpis, payments, granularity])

  useEffect(() => {
    const qs = new URLSearchParams()
    if (from) qs.set("from", from)
    if (to) qs.set("to", to)
    if (estado) qs.set("estado", estado)
    if (metodoPago) qs.set("metodoPago", metodoPago)
    if (cliente) qs.set("cliente", cliente)
    if (granularity && granularity !== "day") qs.set("granularity", granularity)
    const url = `${window.location.pathname}?${qs.toString()}`
    window.history.replaceState({}, "", url)
  }, [from, to, estado, metodoPago, cliente, granularity])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Reportes e Inteligencia Comercial</h1>
              <p className="text-xs text-slate-400">
                Exportación de datos, análisis de rentabilidad real BOM y series de ventas
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={descargarCSV}
            disabled={!token || loading}
            aria-label="Descargar reporte en formato CSV"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Download className="w-4 h-4 text-cyan-400" />
            )}
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={descargarXLSX}
            disabled={!token || loadingXlsx}
            aria-label="Descargar reporte en formato XLSX"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {loadingXlsx ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Exportar XLSX</span>
          </button>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Ventas"
          value={`$${Number(kpis.totalVentas || 0).toLocaleString("es-CO")}`}
          icon={DollarSign}
          variant="cyan"
          subtitle="Facturación acumulada"
        />
        <MetricCard
          title="Total Pedidos"
          value={kpis.pedidos || 0}
          icon={ShoppingCart}
          variant="purple"
          subtitle="Órdenes procesadas"
        />
        <MetricCard
          title="Completados"
          value={kpis.completados || 0}
          icon={CheckCircle}
          variant="emerald"
          subtitle="Despachados exitosamente"
        />
        <MetricCard
          title="Ticket Promedio"
          value={`$${Number(kpis.ticketPromedio || 0).toLocaleString("es-CO")}`}
          icon={TrendingUp}
          variant="amber"
          subtitle="Valor medio por orden"
        />
      </div>

      {/* Filter Panel */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Filtros de Análisis</span>
          <span className="text-xs text-slate-500">Parámetros aplicados al reporte y a los gráficos</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="rep-desde" className="block text-xs font-medium text-slate-400 mb-1">
              Desde
            </label>
            <input
              id="rep-desde"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="rep-hasta" className="block text-xs font-medium text-slate-400 mb-1">
              Hasta
            </label>
            <input
              id="rep-hasta"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label htmlFor="rep-estado" className="block text-xs font-medium text-slate-400 mb-1">
              Estado Pedido
            </label>
            <select
              id="rep-estado"
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
            <label htmlFor="rep-metodo" className="block text-xs font-medium text-slate-400 mb-1">
              Método de Pago
            </label>
            <select
              id="rep-metodo"
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="rep-cliente" className="block text-xs font-medium text-slate-400 mb-1">
              Cliente Específico
            </label>
            <select
              id="rep-cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rep-granularity" className="block text-xs font-medium text-slate-400 mb-1">
              Agrupación Temporal
            </label>
            <select
              id="rep-granularity"
              value={granularity}
              onChange={(e) => setGranularity(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="day">Por Día</option>
              <option value="month">Por Mes</option>
            </select>
          </div>
          <div>
            <label htmlFor="rep-delim" className="block text-xs font-medium text-slate-400 mb-1">
              Delimitador de CSV
            </label>
            <select
              id="rep-delim"
              value={delim}
              onChange={(e) => setDelim(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="semicolon">Punto y coma (; - Excel en español)</option>
              <option value="comma">Coma (, - Estándar universal)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 mr-1">Rango rápido:</span>
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
          {(from || to || estado || metodoPago || cliente) && (
            <button
              type="button"
              onClick={() => {
                setFrom("")
                setTo("")
                setEstado("")
                setMetodoPago("")
                setCliente("")
              }}
              className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Serie de Ventas por {granularity === "month" ? "Mes" : "Día"}</span>
          </h2>
          <span className="text-xs text-slate-500">Monto total facturado en COP</span>
        </div>
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="bucket" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)}
              />
              <Tooltip
                contentStyle={{
                  background: "#090d16",
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  color: "#f8fafc",
                  fontSize: "12px"
                }}
                formatter={(value, name) => [
                  new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0
                  }).format(value),
                  name
                ]}
                labelFormatter={(label) => `Fecha: ${label}`}
              />
              {payments && payments.length > 0 ? (
                payments.map((p, idx) => (
                  <Bar
                    key={p}
                    dataKey={p}
                    name={p}
                    stackId="a"
                    fill={
                      p === "Efectivo"
                        ? "#06b6d4"
                        : p === "Transferencia"
                          ? "#a855f7"
                          : p === "Tarjeta"
                            ? "#10b981"
                            : idx === 0
                              ? "#06b6d4"
                              : "#eab308"
                    }
                  />
                ))
              ) : (
                <Bar dataKey="total" name="Total Ventas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              )}
              <Legend wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Totals by Payment Method */}
      {payments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <span>Ventas por Método de Pago</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {payments.map((p) => (
              <div key={p} className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-400">{p}</p>
                <p className="text-xl font-bold text-slate-100 mt-1">
                  ${Number((kpis.totalesPorMetodoPago || {})[p] || 0).toLocaleString("es-CO")} COP
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rentabilidad Real BOM */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Análisis de Rentabilidad Real (Costo BOM / COGS)</h2>
              <p className="text-xs text-slate-400">
                Calculado con la sumatoria exacta del costo de insumos requeridos por producto
              </p>
            </div>
          </div>
          <Badge variant="success">Utilidad Bruta Calculada</Badge>
        </div>

        {rentabilidad?.summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Ventas Totales"
              value={`$${Number(rentabilidad.summary.totalVentas).toLocaleString("es-CO")}`}
              variant="cyan"
              subtitle="Ingresos brutos"
            />
            <MetricCard
              title="Costo de Insumos (COGS)"
              value={`$${Number(rentabilidad.summary.totalCOGS).toLocaleString("es-CO")}`}
              variant="amber"
              subtitle="Consumo de materias primas"
            />
            <MetricCard
              title="Ganancia Bruta Real"
              value={`$${Number(rentabilidad.summary.gananciaBrutaTotal).toLocaleString("es-CO")}`}
              variant="emerald"
              subtitle="Margen monetario neto"
            />
            <MetricCard
              title="Margen Bruto Promedio"
              value={`${rentabilidad.summary.margenPromedioPercent}%`}
              variant="purple"
              subtitle="Porcentaje sobre ventas"
            />
          </div>
        )}

        {/* Tablas de Desglose */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Rentabilidad por Producto */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-xs text-cyan-400 flex items-center gap-2 uppercase tracking-wider">
              <PieChart className="w-3.5 h-3.5" /> Rentabilidad por Producto Terminado
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <caption className="sr-only">Rentabilidad agrupada por producto terminado</caption>
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th scope="col" className="p-2.5">
                      Producto
                    </th>
                    <th scope="col" className="p-2.5 text-center">
                      Unid.
                    </th>
                    <th scope="col" className="p-2.5">
                      Venta Total
                    </th>
                    <th scope="col" className="p-2.5">
                      Costo Insumos
                    </th>
                    <th scope="col" className="p-2.5 text-right">
                      Ganancia ($)
                    </th>
                    <th scope="col" className="p-2.5 text-right">
                      Margen (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(rentabilidad?.porProducto || []).length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center text-slate-500">
                        Sin datos de ventas registrados para el periodo.
                      </td>
                    </tr>
                  ) : (
                    rentabilidad.porProducto.map((p) => (
                      <tr key={p.productoId} className="hover:bg-slate-900/50">
                        <td className="p-2.5 font-medium text-slate-200">{p.productoNombre}</td>
                        <td className="p-2.5 text-center text-slate-300">{p.totalUnidades}</td>
                        <td className="p-2.5 text-slate-300">${p.totalVentas.toLocaleString("es-CO")}</td>
                        <td className="p-2.5 text-amber-400">${p.totalCOGS.toLocaleString("es-CO")}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">
                          ${p.gananciaBruta.toLocaleString("es-CO")}
                        </td>
                        <td className="p-2.5 text-right font-bold text-cyan-400">{p.margenPercent}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rentabilidad por Cliente */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-xs text-purple-400 flex items-center gap-2 uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" /> Rentabilidad por Cliente
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <caption className="sr-only">Rentabilidad agrupada por cliente</caption>
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th scope="col" className="p-2.5">
                      Cliente
                    </th>
                    <th scope="col" className="p-2.5">
                      Ventas
                    </th>
                    <th scope="col" className="p-2.5">
                      Costo Insumos
                    </th>
                    <th scope="col" className="p-2.5 text-right">
                      Ganancia ($)
                    </th>
                    <th scope="col" className="p-2.5 text-right">
                      Margen (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(rentabilidad?.porCliente || []).length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-slate-500">
                        Sin datos de ventas registrados para el periodo.
                      </td>
                    </tr>
                  ) : (
                    rentabilidad.porCliente.map((c) => (
                      <tr key={c.clienteId} className="hover:bg-slate-900/50">
                        <td className="p-2.5 font-medium text-slate-200">{c.clienteNombre}</td>
                        <td className="p-2.5 text-slate-300">${c.totalVentas.toLocaleString("es-CO")}</td>
                        <td className="p-2.5 text-amber-400">${c.totalCOGS.toLocaleString("es-CO")}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">
                          ${c.gananciaBruta.toLocaleString("es-CO")}
                        </td>
                        <td className="p-2.5 text-right font-bold text-cyan-400">{c.margenPercent}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

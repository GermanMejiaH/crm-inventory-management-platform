import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  TrendingUp,
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  Calendar,
  Activity,
  Truck
} from "lucide-react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import MetricCard from "../components/MetricCard"
import EmptyState from "../components/EmptyState"
import { getDashboard, getProductos, getAlertasStock } from "../api/client"

export default function Dashboard({ token = "" }) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalVentas: 0,
    pedidosCompletados: 0,
    clientesNuevos: 0,
    ticketPromedio: 0,
    stockBajo: 0
  })

  const [ventasMensuales, setVentasMensuales] = useState([])
  const [ventasDiarias, setVentasDiarias] = useState([])
  const [topClientes, setTopClientes] = useState([])
  const [metodosPago, setMetodosPago] = useState([])
  const [estadoPedidos, setEstadoPedidos] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [alertasStock, setAlertasStock] = useState({ alertasCount: 0, items: [] })

  useEffect(() => {
    loadDashboardData()
    if (token) {
      getAlertasStock(token)
        .then((res) => setAlertasStock(res || { alertasCount: 0, items: [] }))
        .catch(() => {})
    }
  }, [token])

  async function loadDashboardData() {
    setLoading(true)
    try {
      const data = await getDashboard(token)

      setStats(data.stats || {})
      setVentasMensuales(data.ventasMensuales || [])
      setVentasDiarias(data.ventasDiarias || [])
      setTopClientes(data.topClientes || [])

      try {
        const prods = await getProductos(token)
        const low = (Array.isArray(prods) ? prods : []).filter(
          (p) =>
            (p.stockActual || 0) <= (p.stockMinimo || 0) &&
            (p.active == null || p.active) &&
            (p.tipo === "producto_terminado" || !p.tipo)
        )
        setLowStockProducts(low)
      } catch {}

      const paymentColors = { Efectivo: "#06b6d4", Transferencia: "#a855f7", Crédito: "#f59e0b" }
      const totalPayments = (Array.isArray(data.metodosPago) ? data.metodosPago : []).reduce(
        (s, x) => s + Number(x.value || 0),
        0
      )
      const pItems = (Array.isArray(data.metodosPago) ? data.metodosPago : []).map((m) => ({
        ...m,
        percent: totalPayments > 0 ? Math.round((Number(m.value || 0) / totalPayments) * 100) : 0,
        color: paymentColors[m.name] || "#ec4899"
      }))
      setMetodosPago(pItems)

      const stateColors = { Completado: "#10b981", Pendiente: "#f59e0b", Cancelado: "#f43f5e" }
      const totalStates = (Array.isArray(data.estadoPedidos) ? data.estadoPedidos : []).reduce(
        (s, x) => s + Number(x.value || 0),
        0
      )
      const sItems = (Array.isArray(data.estadoPedidos) ? data.estadoPedidos : []).map((e) => ({
        ...e,
        percent: totalStates > 0 ? Math.round((Number(e.value || 0) / totalStates) * 100) : 0,
        color: stateColors[e.name] || "#94a3b8"
      }))
      setEstadoPedidos(sItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(value || 0)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-md">
          <p className="text-slate-400 text-xs mb-1 font-medium">{label}</p>
          <p className="text-cyan-300 font-bold text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-cyan-400" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Panel Principal</h2>
          </div>
          <p className="text-sm text-slate-400">Resumen ejecutivo y operaciones del CRM en tiempo real</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-300 shadow-sm">
          <Calendar className="w-4 h-4 text-cyan-400" aria-hidden="true" />
          <span className="capitalize">
            {new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Total Ventas"
          value={formatCurrency(stats.totalVentas)}
          icon={DollarSign}
          variant="cyan"
          subtitle="Facturación acumulada"
          loading={loading}
        />
        <MetricCard
          title="Pedidos Completados"
          value={stats.pedidosCompletados}
          icon={ShoppingCart}
          variant="purple"
          subtitle="Entregados exitosamente"
          loading={loading}
        />
        <MetricCard
          title="Clientes Nuevos"
          value={stats.clientesNuevos}
          icon={Users}
          variant="emerald"
          subtitle="Registrados este mes"
          loading={loading}
        />
        <MetricCard
          title="Ticket Promedio"
          value={formatCurrency(stats.ticketPromedio)}
          icon={TrendingUp}
          variant="amber"
          subtitle="Por orden de venta"
          loading={loading}
        />
        <MetricCard
          title="Alertas Stock Bajo"
          value={stats.stockBajo}
          icon={AlertTriangle}
          variant={stats.stockBajo > 0 ? "rose" : "slate"}
          subtitle="Productos críticos"
          loading={loading}
        />
      </div>

      {/* Critical Stock Alert Banner */}
      {lowStockProducts.length > 0 && (
        <div
          role="region"
          aria-label="Productos que requieren reabastecimiento"
          className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-5 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-3 text-rose-300 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" aria-hidden="true" />
            <span>Productos Terminados que Requieren Reabastecimiento Crítico ({lowStockProducts.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-3.5 text-xs flex justify-between items-center"
              >
                <div>
                  <p className="text-slate-200 font-medium">{prod.nombre}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Disponible: <span className="text-rose-400 font-bold">{prod.stockActual}</span> | Mínimo:{" "}
                    {prod.stockMinimo}
                  </p>
                </div>
                <Link
                  to="/produccion"
                  className="bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 px-2.5 py-1.5 rounded-lg border border-rose-500/40 text-[10px] font-bold uppercase transition-colors"
                >
                  Producir
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Charts (Ventas Mensuales y Ventas Diarias) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas Mensuales */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span>Ventas Mensuales</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Histórico acumulado</span>
          </div>

          {ventasMensuales.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin datos de ventas mensuales"
              description="Aún no se han registrado pedidos facturados para generar la serie histórica."
              className="py-12"
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ventasMensuales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="mes" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ fill: "#06b6d4", r: 4 }}
                    activeDot={{ r: 6, fill: "#22d3ee" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Ventas Diarias */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" aria-hidden="true" />
              <span>Ventas por Día</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Últimos días</span>
          </div>

          {ventasDiarias.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Sin transacciones diarias recientes"
              description="No hay pedidos registrados en los días recientes para graficar."
              className="py-12"
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ventasDiarias} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="dia" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ventas" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Grid (Top Clientes, Métodos de Pago, Estado de Pedidos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Clientes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Top 5 Clientes</span>
            </h3>
          </div>

          {topClientes.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sin clientes registrados"
              description="Los clientes con mayor volumen de compra aparecerán aquí."
              className="py-8"
            />
          ) : (
            <div className="space-y-2.5">
              {topClientes.map((cliente, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-emerald-950/80 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-slate-200 text-xs font-medium truncate max-w-[140px]">{cliente.nombre}</span>
                  </div>
                  <span className="text-emerald-400 font-bold text-xs">{formatCurrency(cliente.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Métodos de Pago */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Métodos de Pago</span>
            </h3>
          </div>

          {metodosPago.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Sin datos de pagos"
              description="Registra ventas para analizar la distribución de métodos de pago."
              className="py-8"
            />
          ) : (
            <>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metodosPago}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {metodosPago.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
                {metodosPago.map((metodo, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: metodo.color }}
                      aria-hidden="true"
                    />
                    <span className="text-slate-300 truncate">
                      {metodo.name} ({metodo.percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Estado de Pedidos */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span>Estado de Pedidos</span>
            </h3>
          </div>

          {estadoPedidos.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Sin órdenes creadas"
              description="El desglose de pedidos por estado operativo se mostrará aquí."
              className="py-8"
            />
          ) : (
            <>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={estadoPedidos}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {estadoPedidos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-800">
                {estadoPedidos.map((estado, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: estado.color }}
                        aria-hidden="true"
                      />
                      <span className="text-slate-300 font-medium">{estado.name}</span>
                    </div>
                    <span className="text-slate-400 font-semibold">{estado.percent}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Centro de Alertas de Reordenamiento de Insumos */}
      {alertasStock.alertasCount > 0 && (
        <div
          role="region"
          aria-label="Centro de Alertas de Reordenamiento"
          className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-5 sm:p-6 shadow-md shadow-amber-950/20"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Centro de Alertas & Reordenamiento de Insumos</span>
                  <span className="text-[11px] bg-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full">
                    {alertasStock.alertasCount} en riesgo
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Materias primas con inventario bajo el stock mínimo de seguridad.
                </p>
              </div>
            </div>
            <Link
              to="/compras"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Truck className="w-4 h-4" aria-hidden="true" />
              <span>Registrar Compra / Insumo</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alertasStock.items.map((item) => (
              <div
                key={item.productoId}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-200 text-sm truncate">{item.nombre}</span>
                  <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
                    Materia Prima
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1 border-t border-slate-850">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Stock Actual:</span>
                    <span className="font-mono text-rose-400 font-bold">
                      {item.stockActual} {item.unidadMedida}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Stock Mínimo:</span>
                    <span className="font-mono text-slate-300">
                      {item.stockMinimo} {item.unidadMedida}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-lg text-xs space-y-1 border border-slate-800">
                  <div className="flex justify-between text-slate-300">
                    <span>Sugerencia Reorden:</span>
                    <span className="font-bold text-emerald-400">
                      +{item.sugerenciaReorden} {item.unidadMedida}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Costo Estimado:</span>
                    <span className="font-semibold text-slate-200">
                      ${item.costoEstimadoReorden.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

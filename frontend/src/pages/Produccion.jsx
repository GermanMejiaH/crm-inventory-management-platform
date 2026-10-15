import { useEffect, useState } from "react"
import { Cpu, Package, CheckCircle2, XCircle, Play, History, Layers, RefreshCw, Clock } from "lucide-react"
import { useToast } from "../components/ToastContext"
import {
  getProductos,
  verificarEnsamblado,
  ejecutarEnsamblado,
  getHistorialProduccion,
  getCapacidadTeorica
} from "../api/client"
import Badge from "../components/Badge"
import EmptyState from "../components/EmptyState"

export default function Produccion({ token }) {
  const { addToast } = useToast()

  // State
  const [productosTerminados, setProductosTerminados] = useState([])
  const [selectedProdId, setSelectedProdId] = useState("")
  const [cantidad, setCantidad] = useState("10")
  const [verificacion, setVerificacion] = useState(null)
  const [capacidadTeorica, setCapacidadTeorica] = useState(null)
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [loadingAssembly, setLoadingAssembly] = useState(false)

  // History state
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  useEffect(() => {
    loadFinishedProducts()
    loadHistorial()
  }, [token])

  useEffect(() => {
    if (selectedProdId && token) {
      loadCapacidad(selectedProdId)
    }
  }, [selectedProdId, token])

  async function loadCapacidad(id) {
    try {
      const res = await getCapacidadTeorica(token, id)
      setCapacidadTeorica(res)
    } catch {
      setCapacidadTeorica(null)
    }
  }

  async function loadFinishedProducts() {
    if (!token) return
    try {
      const res = await getProductos(token, { tipo: "producto_terminado" })
      const list = Array.isArray(res) ? res : res.items || []
      setProductosTerminados(list)
      if (list.length > 0 && !selectedProdId) {
        setSelectedProdId(String(list[0].id))
      }
    } catch {
      addToast("Error al cargar productos terminados", "error")
    }
  }

  async function loadHistorial() {
    if (!token) return
    setLoadingHistorial(true)
    try {
      const res = await getHistorialProduccion(token, { limit: 20 })
      setHistorial(Array.isArray(res) ? res : res.items || [])
    } catch {
      addToast("Error al cargar historial de producción", "error")
    } finally {
      setLoadingHistorial(false)
    }
  }

  async function handleVerificar() {
    if (!selectedProdId || !cantidad || Number(cantidad) <= 0) {
      addToast("Selecciona un producto y una cantidad mayor a 0", "warning")
      return
    }
    setLoadingCheck(true)
    try {
      const res = await verificarEnsamblado(token, Number(selectedProdId), Number(cantidad))
      setVerificacion(res)
      if (!res.available) {
        addToast("Advertencia: Stock insuficiente para algunos insumos", "warning")
      } else {
        addToast("Verificación exitosa: Insumos completos para el ensamblado", "success")
      }
    } catch (e) {
      addToast(e.message || "Error al verificar ensamblado", "error")
      setVerificacion(null)
    } finally {
      setLoadingCheck(false)
    }
  }

  async function handleEjecutarEnsamblado() {
    if (!selectedProdId || !cantidad || Number(cantidad) <= 0) return
    if (verificacion && !verificacion.available) {
      addToast("No se puede ensamblar: Stock insuficiente de materias primas", "error")
      return
    }

    setLoadingAssembly(true)
    try {
      const res = await ejecutarEnsamblado(token, Number(selectedProdId), Number(cantidad))
      const count = res.order?.cantidadProducida || cantidad
      addToast(`¡Ensamblado exitoso! Se produjeron ${count} unidades.`, "success")
      setVerificacion(null)
      loadFinishedProducts()
      loadHistorial()
      if (selectedProdId) loadCapacidad(selectedProdId)
    } catch (e) {
      addToast(e.message || "Error al ejecutar orden de ensamblado", "error")
    } finally {
      setLoadingAssembly(false)
    }
  }

  const selectedProdObj = productosTerminados.find((p) => String(p.id) === String(selectedProdId))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Ensamblado y Producción</h1>
              <p className="text-xs text-slate-400">
                Simulador de recetas BOM, verificación de stock e inventario atómico
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assembly Form & Pre-check Simulator */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Orden de Ensamblado</span>
            </h2>
            <Badge variant="cyan">Proceso Atómico</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="prod-terminado" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Producto Terminado a Ensamblar <span className="text-rose-400">*</span>
              </label>
              <select
                id="prod-terminado"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                value={selectedProdId}
                onChange={(e) => {
                  setSelectedProdId(e.target.value)
                  setVerificacion(null)
                }}
              >
                {productosTerminados.length === 0 ? (
                  <option value="">No hay productos terminados creados</option>
                ) : (
                  productosTerminados.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stockActual} unid | Costo BOM: ${p.costoUnitario || 0})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label htmlFor="prod-cantidad" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Cantidad a Fabricar <span className="text-rose-400">*</span>
              </label>
              <input
                id="prod-cantidad"
                type="number"
                min="1"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none transition-colors"
                value={cantidad}
                onChange={(e) => {
                  setCantidad(e.target.value)
                  setVerificacion(null)
                }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleVerificar}
              disabled={loadingCheck || !selectedProdId}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl text-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingCheck ? "animate-spin" : ""}`} />
              <span>Verificar Insumos Requeridos</span>
            </button>

            <button
              type="button"
              onClick={handleEjecutarEnsamblado}
              disabled={loadingAssembly || !verificacion || !verificacion.available}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loadingAssembly ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Ejecutar Ensamblado</span>
            </button>
          </div>

          {/* Verification Simulator Table */}
          {verificacion && (
            <div className="border-t border-slate-800 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">
                  Pre-Chequeo de Receta BOM ({cantidad} unidades)
                </h3>
                {verificacion.available ? (
                  <Badge variant="success" icon={CheckCircle2}>
                    Stock Suficiente
                  </Badge>
                ) : (
                  <Badge variant="danger" icon={XCircle}>
                    Insumos Faltantes
                  </Badge>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <caption className="sr-only">Pre-chequeo de insumos requeridos según receta BOM</caption>
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                    <tr>
                      <th scope="col" className="p-3">
                        Insumo / Materia Prima
                      </th>
                      <th scope="col" className="p-3 text-center">
                        Req. / Unid
                      </th>
                      <th scope="col" className="p-3 text-center">
                        Total Req.
                      </th>
                      <th scope="col" className="p-3 text-center">
                        Stock Actual
                      </th>
                      <th scope="col" className="p-3 text-center">
                        Estado Insumo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {!verificacion.items || verificacion.items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-4 text-center text-slate-500">
                          Este producto no tiene insumos configurados en su Receta BOM. Agrega insumos en el menú
                          Productos.
                        </td>
                      </tr>
                    ) : (
                      verificacion.items.map((d) => (
                        <tr key={d.materiaPrimaId} className="hover:bg-slate-900/50">
                          <td className="p-3 font-medium text-slate-200">{d.materiaPrimaNombre}</td>
                          <td className="p-3 text-center text-slate-300">
                            {d.cantidadRequeridaUnitaria} {d.materiaPrimaUnidadMedida || "unid"}
                          </td>
                          <td className="p-3 text-center text-cyan-300 font-semibold">
                            {d.cantidadTotalRequerida} {d.materiaPrimaUnidadMedida || "unid"}
                          </td>
                          <td className="p-3 text-center text-slate-300">
                            {d.stockActual} {d.materiaPrimaUnidadMedida || "unid"}
                          </td>
                          <td className="p-3 text-center">
                            {d.suficiente ? (
                              <Badge variant="success">OK</Badge>
                            ) : (
                              <Badge variant="danger">
                                Faltan {d.faltante} {d.materiaPrimaUnidadMedida || "unid"}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {verificacion.totalCost > 0 && (
                    <tfoot className="bg-slate-900/60 border-t border-slate-800 font-semibold">
                      <tr>
                        <td colSpan="3" className="p-3 text-right text-slate-300">
                          Costo Estimado de Fabricación:
                        </td>
                        <td colSpan="2" className="p-3 text-center text-emerald-400 font-bold text-sm">
                          ${verificacion.totalCost.toLocaleString("es-CO")} (${verificacion.unitCost}/unid)
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-semibold text-purple-300 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              <span>Modelo de Ensamblado Industrial</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              En esta plataforma los suministros son adquiridos como materias primas y se integran mediante recetas BOM
              en unidades terminadas.
            </p>
            <ul className="text-xs text-slate-400 space-y-2 border-t border-slate-800 pt-4">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">1.</span>
                <span>
                  Define cada componente como <strong>Materia Prima</strong> en la sección Productos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">2.</span>
                <span>
                  Configura la <strong>Receta BOM</strong> con las cantidades requeridas por producto terminado.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">3.</span>
                <span>
                  Ejecuta la <strong>Orden de Ensamblado</strong> para descontar materias primas e incrementar el stock.
                </span>
              </li>
            </ul>
          </div>

          {selectedProdObj && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="text-slate-400 font-medium">Producto Seleccionado</div>
              <div className="text-sm font-bold text-slate-100">{selectedProdObj.nombre}</div>
              <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                <span>Stock Actual:</span>
                <span className="font-semibold text-cyan-400">{selectedProdObj.stockActual} unid</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Costo Unitario BOM:</span>
                <span className="font-semibold text-emerald-400">${selectedProdObj.costoUnitario || 0}</span>
              </div>

              {capacidadTeorica && (
                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">Capacidad Máx. Ensamblado:</span>
                    <span className="font-bold text-emerald-400 text-sm">{capacidadTeorica.capacidadMaxima} unid</span>
                  </div>
                  {capacidadTeorica.cuelloDeBotella ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg text-[11px] text-amber-300">
                      <strong>⚠️ Cuello de botella:</strong> {capacidadTeorica.cuelloDeBotella.materiaPrimaNombre}{" "}
                      (stock: {capacidadTeorica.cuelloDeBotella.stockActual}{" "}
                      {capacidadTeorica.cuelloDeBotella.unidadMedida})
                    </div>
                  ) : capacidadTeorica.capacidadMaxima > 0 ? (
                    <div className="text-[11px] text-emerald-400">
                      ✓ Insumos balanceados para ensamblar hasta {capacidadTeorica.capacidadMaxima} unidades.
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assembly History */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Historial de Órdenes de Producción</span>
          </h2>
          <button
            type="button"
            onClick={loadHistorial}
            aria-label="Recargar historial de producción"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistorial ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <caption className="sr-only">Historial de órdenes de producción ejecutadas</caption>
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
              <tr>
                <th scope="col" className="p-3">
                  N° Orden
                </th>
                <th scope="col" className="p-3">
                  Producto Terminado
                </th>
                <th scope="col" className="p-3 text-center">
                  Cant. Producida
                </th>
                <th scope="col" className="p-3 text-right">
                  Costo Total Producción
                </th>
                <th scope="col" className="p-3">
                  Responsable
                </th>
                <th scope="col" className="p-3">
                  Fecha y Hora
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {historial.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6">
                    <EmptyState
                      icon={History}
                      title="No hay órdenes registradas"
                      description="Aún no se han ejecutado ensamblados en el sistema de producción."
                    />
                  </td>
                </tr>
              ) : (
                historial.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3 font-mono text-cyan-400 font-semibold">#ORD-{h.id}</td>
                    <td className="p-3 font-medium text-slate-200">{h.productoNombre}</td>
                    <td className="p-3 text-center text-cyan-300 font-bold">{h.cantidad}</td>
                    <td className="p-3 text-right text-emerald-400 font-semibold">
                      ${(h.costoTotalProduccion || 0).toLocaleString("es-CO")}
                    </td>
                    <td className="p-3 text-slate-300">{h.usuarioNombre || h.usuarioId || "Sistema"}</td>
                    <td className="p-3 text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(h.fecha).toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

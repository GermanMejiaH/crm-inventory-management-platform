import { useEffect, useState } from "react"
import { Truck, Plus, Eye, DollarSign, Package, FileText, RefreshCw, X } from "lucide-react"
import { getCompras, createCompra, getProductos } from "../api/client"
import { useToast } from "../components/ToastContext"
import Modal from "../components/Modal"
import MetricCard from "../components/MetricCard"
import EmptyState from "../components/EmptyState"

export default function Compras({ token }) {
  const { addToast } = useToast()

  const [compras, setCompras] = useState([])
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal crear compra
  const [modalCreateOpen, setModalCreateOpen] = useState(false)
  const [loadingSubmit, setLoadingSubmit] = useState(false)
  const [proveedor, setProveedor] = useState("")
  const [notas, setNotas] = useState("")
  const [items, setItems] = useState([{ productId: "", cantidad: 1, costoUnitario: 0 }])

  // Modal ver detalle compra
  const [selectedCompra, setSelectedCompra] = useState(null)

  useEffect(() => {
    loadData()
  }, [token])

  async function loadData() {
    if (!token) return
    setLoading(true)
    try {
      const [compRes, prodRes] = await Promise.all([getCompras(token), getProductos(token, { limit: 100 })])
      setCompras(Array.isArray(compRes) ? compRes : [])
      const prodsList = Array.isArray(prodRes) ? prodRes : prodRes.items || []
      setProductos(prodsList)
    } catch {
      addToast("Error al cargar órdenes de compra e insumos", "error")
    } finally {
      setLoading(false)
    }
  }

  function handleAddItem() {
    setItems((prev) => [...prev, { productId: "", cantidad: 1, costoUnitario: 0 }])
  }

  function handleRemoveItem(index) {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleItemChange(index, field, val) {
    setItems((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }

      // Si cambia el producto, auto-asignar su costo unitario si lo tiene
      if (field === "productId") {
        const selectedProd = productos.find((p) => String(p.id) === String(val))
        if (selectedProd && selectedProd.costoUnitario) {
          copy[index].costoUnitario = selectedProd.costoUnitario
        }
      }

      return copy
    })
  }

  const calculatedTotal = items.reduce((sum, item) => {
    const qty = Number(item.cantidad || 0)
    const cost = Number(item.costoUnitario || 0)
    return sum + qty * cost
  }, 0)

  async function handleSubmitCompra(e) {
    e.preventDefault()
    if (!proveedor.trim()) {
      addToast("Indica el nombre del proveedor o importador", "warning")
      return
    }

    const validItems = items.filter((it) => it.productId && Number(it.cantidad) > 0)
    if (validItems.length === 0) {
      addToast("Agrega al menos un insumo/materia prima válido a la compra", "warning")
      return
    }

    setLoadingSubmit(true)
    try {
      const payload = {
        proveedor: proveedor.trim(),
        notas: notas.trim() || null,
        items: validItems.map((it) => ({
          productId: Number(it.productId),
          cantidad: Number(it.cantidad),
          costoUnitario: Number(it.costoUnitario)
        }))
      }

      await createCompra(token, payload)
      addToast("¡Orden de compra / importación registrada exitosamente!", "success")
      setModalCreateOpen(false)
      setProveedor("")
      setNotas("")
      setItems([{ productId: "", cantidad: 1, costoUnitario: 0 }])
      loadData()
    } catch (err) {
      addToast(err.message || "Error al guardar la orden de compra", "error")
    } finally {
      setLoadingSubmit(false)
    }
  }

  const totalInversion = compras.reduce((sum, c) => sum + Number(c.totalCost || 0), 0)
  const materiasPrimasCount = productos.filter((p) => p.tipo === "materia_prima").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Compras e Importaciones</h1>
              <p className="text-xs text-slate-400">
                Abastecimiento de materias primas, insumos y compras a proveedores
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            aria-label="Actualizar compras"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setModalCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Órdenes de Compra"
          value={compras.length}
          icon={FileText}
          variant="cyan"
          subtitle="Ingresos de stock registrados"
          loading={loading}
        />
        <MetricCard
          title="Total Invertido"
          value={`$${totalInversion.toLocaleString("es-CO")}`}
          icon={DollarSign}
          variant="purple"
          subtitle="Sumatoria en moneda local COP"
          loading={loading}
        />
        <MetricCard
          title="Catálogo de Insumos"
          value={`${materiasPrimasCount} Insumos`}
          icon={Package}
          variant="emerald"
          subtitle="Materias primas disponibles"
          loading={loading}
        />
      </div>

      {/* Tabla de Compras */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>Historial de Órdenes de Compra</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">{compras.length} registros</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando compras e insumos...</div>
        ) : compras.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Truck}
              title="No hay compras registradas"
              description="Aún no se han registrado órdenes de compra o importación en el inventario."
              actionLabel="Registrar Primera Compra"
              onAction={() => setModalCreateOpen(true)}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Historial de órdenes de compra e importaciones</caption>
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th scope="col" className="p-4">
                    N° Orden
                  </th>
                  <th scope="col" className="p-4">
                    Proveedor
                  </th>
                  <th scope="col" className="p-4">
                    Insumos
                  </th>
                  <th scope="col" className="p-4">
                    Total Compra
                  </th>
                  <th scope="col" className="p-4">
                    Fecha
                  </th>
                  <th scope="col" className="p-4">
                    Responsable
                  </th>
                  <th scope="col" className="p-4 text-right">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-cyan-400 font-semibold">#CMP-{c.id}</td>
                    <td className="p-4 font-medium text-slate-200">{c.proveedor}</td>
                    <td className="p-4 text-slate-300">{c.totalItems || c.items?.length || 1} insumo(s)</td>
                    <td className="p-4 font-bold text-emerald-400">${Number(c.totalCost).toLocaleString("es-CO")}</td>
                    <td className="p-4 text-slate-400 text-xs">{new Date(c.fecha).toLocaleString("es-CO")}</td>
                    <td className="p-4 text-slate-300 text-xs">{c.userName || "Admin"}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCompra(c)}
                        aria-label={`Ver detalle de compra CMP-${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detalle</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Compra */}
      <Modal
        isOpen={modalCreateOpen}
        title="Registrar Compra / Importación de Insumos"
        onClose={() => setModalCreateOpen(false)}
      >
        <form onSubmit={handleSubmitCompra} className="space-y-4">
          <div>
            <label htmlFor="compra-proveedor" className="block text-xs font-semibold text-slate-300 mb-1">
              Proveedor / Importador <span className="text-rose-400">*</span>
            </label>
            <input
              id="compra-proveedor"
              type="text"
              required
              placeholder="Ej: Proveedor Nacional / Shenzhen Industrial"
              value={proveedor}
              onChange={(e) => setProveedor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Materias Primas e Insumos Comprados <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg px-2.5 py-1 hover:bg-cyan-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Insumo</span>
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const selProd = productos.find((p) => String(p.id) === String(item.productId))
                const unitLabel = selProd?.unidadMedida || "unidades"
                return (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-5">
                        <label htmlFor={`compra-insumo-${idx}`} className="sr-only">
                          Insumo
                        </label>
                        <select
                          id={`compra-insumo-${idx}`}
                          required
                          value={item.productId}
                          onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="">-- Selecciona Insumo --</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} ({p.tipo === "materia_prima" ? "Materia Prima" : "Producto"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-3">
                        <div className="flex items-center gap-1">
                          <label htmlFor={`compra-cant-${idx}`} className="sr-only">
                            Cantidad
                          </label>
                          <input
                            id={`compra-cant-${idx}`}
                            type="number"
                            step="any"
                            min="0.001"
                            required
                            placeholder="Cant."
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(idx, "cantidad", e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                          />
                          <span className="text-[10px] text-cyan-400 font-semibold">{unitLabel}</span>
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        <label htmlFor={`compra-costo-${idx}`} className="sr-only">
                          Costo Unitario
                        </label>
                        <input
                          id={`compra-costo-${idx}`}
                          type="number"
                          step="any"
                          min="0"
                          required
                          placeholder="Costo $/u"
                          value={item.costoUnitario}
                          onChange={(e) => handleItemChange(idx, "costoUnitario", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="md:col-span-1 text-right">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            aria-label={`Eliminar fila ${idx + 1}`}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      Subtotal:{" "}
                      <span className="text-emerald-400 font-semibold">
                        ${(Number(item.cantidad || 0) * Number(item.costoUnitario || 0)).toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3.5 flex justify-between items-center text-sm">
            <span className="text-slate-400 font-medium">Costo Total Estimado:</span>
            <span className="text-xl font-bold text-emerald-400">${calculatedTotal.toLocaleString("es-CO")} COP</span>
          </div>

          <div>
            <label htmlFor="compra-notas" className="block text-xs font-semibold text-slate-300 mb-1">
              Notas / Observaciones
            </label>
            <textarea
              id="compra-notas"
              rows="2"
              placeholder="Ej: Lote #104 con guía de importación..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalCreateOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loadingSubmit}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              {loadingSubmit ? "Guardando..." : "Guardar Compra"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Detalle Compra */}
      {selectedCompra && (
        <Modal
          isOpen={Boolean(selectedCompra)}
          title={`Detalle de Compra #CMP-${selectedCompra.id}`}
          onClose={() => setSelectedCompra(null)}
        >
          <div className="space-y-4 text-sm text-slate-300">
            <div className="grid grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs text-slate-400">Proveedor</p>
                <p className="font-bold text-slate-100">{selectedCompra.proveedor}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fecha de Registro</p>
                <p className="font-bold text-slate-100">{new Date(selectedCompra.fecha).toLocaleString("es-CO")}</p>
              </div>
            </div>

            {selectedCompra.notas && (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 mb-0.5">Observaciones</p>
                <p className="text-slate-200 text-xs italic">{selectedCompra.notas}</p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Insumos Ingresados al Stock:
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-xs">
                  <caption className="sr-only">Insumos ingresados en la orden de compra</caption>
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th scope="col" className="p-3">
                        Insumo
                      </th>
                      <th scope="col" className="p-3">
                        Cantidad
                      </th>
                      <th scope="col" className="p-3">
                        Costo Unit.
                      </th>
                      <th scope="col" className="p-3 text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {(selectedCompra.items || []).map((it) => (
                      <tr key={it.id}>
                        <td className="p-3 font-medium text-slate-200">{it.productoNombre}</td>
                        <td className="p-3 text-cyan-400 font-semibold">
                          {it.cantidad} {it.unidadMedida || "unidades"}
                        </td>
                        <td className="p-3">${Number(it.costoUnitario).toLocaleString("es-CO")}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          ${Number(it.subtotal).toLocaleString("es-CO")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 font-bold text-base border-t border-slate-800">
              <span className="text-slate-300">Total Compra:</span>
              <span className="text-emerald-400">${Number(selectedCompra.totalCost).toLocaleString("es-CO")} COP</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedCompra(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

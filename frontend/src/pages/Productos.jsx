import { useEffect, useState } from "react"
import {
  Package,
  AlertTriangle,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Filter,
  Trash2,
  Edit2,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  Layers,
  Cpu
} from "lucide-react"
import { useToast } from "../components/ToastContext"
import Modal from "../components/Modal"
import Badge from "../components/Badge"
import MetricCard from "../components/MetricCard"
import {
  getProductos,
  getProductosPaged,
  createProducto,
  ajustarStockProducto,
  updateProducto,
  getProductoMovimientos,
  desactivarProducto,
  deleteProducto,
  getBom,
  setBom,
  getKardex
} from "../api/client"

export default function Productos({ token }) {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [nuevo, setNuevo] = useState({
    nombre: "",
    descripcion: "",
    precioMinimo: "",
    precioMaximo: "",
    stockActual: "",
    stockMinimo: "",
    tipo: "producto_terminado",
    costoUnitario: "",
    unidadMedida: "unidades"
  })
  const [filterTipo, setFilterTipo] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm, setDebouncedTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({
    nombre: "",
    descripcion: "",
    precioMinimo: "",
    precioMaximo: "",
    stockMinimo: "",
    tipo: "producto_terminado",
    costoUnitario: "",
    unidadMedida: "unidades"
  })

  // Missing helper & modal states
  const [includeInactive, setIncludeInactive] = useState(false)
  const [hasInactiveProducts, setHasInactiveProducts] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustData, setAdjustData] = useState({ diff: "", motivo: "", referencia: "" })
  const [showMovs, setShowMovs] = useState(false)
  const [movs, setMovs] = useState([])
  const [movPage, setMovPage] = useState(1)
  const [movLimit, setMovLimit] = useState(10)
  const [movTotal, setMovTotal] = useState(0)
  const [movFilterType, setMovFilterType] = useState("")
  const [movFilterText, setMovFilterText] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteProductId, setDeleteProductId] = useState(null)
  const [showPermanentDeleteConfirm, setShowPermanentDeleteConfirm] = useState(false)
  const [permanentDeleteId, setPermanentDeleteId] = useState(null)

  // BOM recipe modal state
  const [showBom, setShowBom] = useState(false)
  const [bomItems, setBomItems] = useState([])
  const [allRawMaterials, setAllRawMaterials] = useState([])
  const [newBomMatId, setNewBomMatId] = useState("")
  const [newBomQty, setNewBomQty] = useState("1")

  async function openBomModal(product) {
    setSelectedProduct(product)
    setShowBom(true)
    try {
      const [recipe, rawList] = await Promise.all([
        getBom(token, product.id),
        getProductos(token, { tipo: "materia_prima" })
      ])
      setBomItems(recipe || [])
      setAllRawMaterials(Array.isArray(rawList) ? rawList : rawList.items || [])
    } catch {
      addToast("Error al cargar receta BOM", "error")
    }
  }

  async function handleAddBomItem() {
    if (!newBomMatId || !newBomQty || Number(newBomQty) <= 0) {
      addToast("Selecciona una materia prima y cantidad mayor a 0", "warning")
      return
    }
    const matId = Number(newBomMatId)
    const qty = Number(newBomQty)
    const existing = bomItems.find((b) => b.materiaPrimaId === matId)
    let updated = []
    if (existing) {
      updated = bomItems.map((b) => (b.materiaPrimaId === matId ? { ...b, cantidadRequerida: qty } : b))
    } else {
      const matObj = allRawMaterials.find((m) => m.id === matId)
      updated = [
        ...bomItems,
        {
          materiaPrimaId: matId,
          materiaPrimaNombre: matObj?.nombre || `Materia #${matId}`,
          cantidadRequerida: qty,
          costoUnitario: matObj?.costoUnitario || 0
        }
      ]
    }
    try {
      const res = await setBom(
        token,
        selectedProduct.id,
        updated.map((u) => ({ materiaPrimaId: u.materiaPrimaId, cantidadRequerida: u.cantidadRequerida }))
      )
      setBomItems(res)
      setNewBomMatId("")
      setNewBomQty("1")
      addToast("Insumo agregado a la receta", "success")
      load()
    } catch {
      addToast("Error al guardar en receta", "error")
    }
  }

  async function handleRemoveBomItem(matId) {
    const updated = bomItems.filter((b) => b.materiaPrimaId !== matId)
    try {
      const res = await setBom(
        token,
        selectedProduct.id,
        updated.map((u) => ({ materiaPrimaId: u.materiaPrimaId, cantidadRequerida: u.cantidadRequerida }))
      )
      setBomItems(res)
      addToast("Insumo eliminado de la receta", "info")
      load()
    } catch {
      addToast("Error al eliminar de receta", "error")
    }
  }

  async function load() {
    if (!token) return
    try {
      const params = { q: debouncedTerm, page, limit, includeInactive, tipo: filterTipo || undefined }
      const data = await getProductosPaged(token, params)
      const list = Array.isArray(data) ? data : data.items || []
      const tot = Array.isArray(data) ? data.length : Number(data.total || 0)
      setItems(list)
      setTotal(tot)

      if (list.length === 0 && !includeInactive) {
        try {
          const inactiveData = await getProductosPaged(token, { includeInactive: true, page: 1, limit: 1 })
          const inactiveTot = Array.isArray(inactiveData) ? inactiveData.length : Number(inactiveData.total || 0)
          setHasInactiveProducts(inactiveTot > 0)
        } catch {
          setHasInactiveProducts(false)
        }
      } else {
        setHasInactiveProducts(false)
      }
    } catch {
      addToast("Error al cargar productos", "error")
    }
  }

  useEffect(() => {
    load()
  }, [token, page, limit, debouncedTerm, includeInactive, filterTipo])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTerm(searchTerm), 300)
    return () => clearTimeout(t)
  }, [searchTerm])

  async function crear() {
    const isMateriaPrima = nuevo.tipo === "materia_prima"
    if (!nuevo.nombre || nuevo.stockActual === "" || nuevo.stockMinimo === "") {
      addToast("Por favor completa los campos requeridos", "warning")
      return
    }

    if (!isMateriaPrima) {
      if (nuevo.precioMinimo === "" || nuevo.precioMaximo === "") {
        addToast("Los productos terminados requieren Precio Mínimo y Máximo de Venta", "warning")
        return
      }
      if (Number(nuevo.precioMinimo) > Number(nuevo.precioMaximo)) {
        addToast("El precio mínimo no puede ser mayor al precio máximo", "warning")
        return
      }
    }

    try {
      await createProducto(token, {
        nombre: nuevo.nombre,
        descripcion: nuevo.descripcion,
        precioMinimo: isMateriaPrima ? 0 : Number(nuevo.precioMinimo || 0),
        precioMaximo: isMateriaPrima ? 0 : Number(nuevo.precioMaximo || 0),
        stockActual: Number(nuevo.stockActual),
        stockMinimo: Number(nuevo.stockMinimo),
        tipo: nuevo.tipo || "producto_terminado",
        costoUnitario: Number(nuevo.costoUnitario || 0),
        unidadMedida: nuevo.unidadMedida || "unidades"
      })
      setNuevo({
        nombre: "",
        descripcion: "",
        precioMinimo: "",
        precioMaximo: "",
        stockActual: "",
        stockMinimo: "",
        tipo: "producto_terminado",
        costoUnitario: "",
        unidadMedida: "unidades"
      })
      setShowForm(false)
      load()
      addToast(isMateriaPrima ? "Materia prima agregada exitosamente" : "Producto creado exitosamente", "success")
    } catch {
      addToast("Error al crear el producto", "error")
    }
  }

  const filteredItems = items

  const getStockStatus = (actual, minimo) => {
    if (actual <= minimo) return "critical"
    if (actual <= minimo * 1.5) return "warning"
    return "good"
  }

  function beginEdit(item) {
    setEditingId(item.id)
    setEditValues({
      nombre: String(item.nombre),
      descripcion: String(item.descripcion || ""),
      precioMinimo: String(item.precioMinimo || 0),
      precioMaximo: String(item.precioMaximo || 0),
      stockMinimo: String(item.stockMinimo || 0),
      tipo: String(item.tipo || "producto_terminado"),
      costoUnitario: String(item.costoUnitario || "0"),
      unidadMedida: String(item.unidadMedida || "unidades")
    })
  }

  async function saveEdit(id) {
    try {
      const payload = {
        nombre: editValues.nombre,
        descripcion: editValues.descripcion,
        precioMinimo: parseFloat(editValues.precioMinimo || 0),
        precioMaximo: parseFloat(editValues.precioMaximo || 0),
        stockMinimo: parseInt(editValues.stockMinimo || 0),
        tipo: editValues.tipo || "producto_terminado",
        costoUnitario: parseFloat(editValues.costoUnitario || 0),
        unidadMedida: editValues.unidadMedida || "unidades"
      }
      await updateProducto(token, id, payload)
      addToast("Producto actualizado", "success")
      setEditingId(null)
      load()
    } catch {
      addToast("Error al actualizar", "error")
    }
  }

  async function desactivar(id) {
    try {
      await desactivarProducto(token, id)
      addToast("Producto desactivado", "success")
      load()
    } catch {
      addToast("Error al desactivar", "error")
    }
  }

  async function reactivar(id) {
    try {
      await updateProducto(token, id, { active: 1 })
      addToast("Producto reactivado", "success")
      load()
    } catch {
      addToast("Error al reactivar", "error")
    }
  }

  function promptDesactivar(id) {
    setDeleteProductId(id)
    setShowDeleteConfirm(true)
  }

  async function confirmDesactivar() {
    if (!deleteProductId) return
    await desactivar(deleteProductId)
    setShowDeleteConfirm(false)
    setDeleteProductId(null)
  }

  function cancelDesactivar() {
    setShowDeleteConfirm(false)
    setDeleteProductId(null)
  }

  function promptEliminarDefinitivamente(id) {
    setPermanentDeleteId(id)
    setShowPermanentDeleteConfirm(true)
  }

  async function confirmEliminarDefinitivamente() {
    if (!permanentDeleteId) return
    try {
      await deleteProducto(token, permanentDeleteId)
      addToast("Producto eliminado definitivamente", "success")
      load()
    } catch (e) {
      addToast(e.message || "Error al eliminar producto", "error")
    } finally {
      setShowPermanentDeleteConfirm(false)
      setPermanentDeleteId(null)
    }
  }

  function cancelEliminarDefinitivamente() {
    setShowPermanentDeleteConfirm(false)
    setPermanentDeleteId(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function openAdjust(item) {
    setSelectedProduct(item)
    setAdjustData({ diff: "", motivo: "", referencia: "" })
    setShowAdjust(true)
  }

  async function openMovs(item) {
    setSelectedProduct(item)
    setShowMovs(true)
    setMovPage(1)
    await loadMovs(item.id, 1, movLimit)
  }

  async function loadMovs(id, pageArg, limitArg) {
    try {
      const data = await getKardex(token, id, { limit: limitArg || 50 })
      const list = Array.isArray(data) ? data : []
      setMovs(list)
      setMovTotal(list.length)
    } catch {
      addToast("Error al cargar movimientos de Kardex", "error")
    }
  }

  async function confirmarAjuste() {
    if (!selectedProduct) return
    const d = parseInt(adjustData.diff)
    if (!d) {
      addToast("Cantidad inválida", "warning")
      return
    }
    try {
      await ajustarStockProducto(token, selectedProduct.id, {
        diff: d,
        motivo: adjustData.motivo || "ajuste",
        referencia: adjustData.referencia || ""
      })
      addToast("Stock ajustado", "success")
      setShowAdjust(false)
      setSelectedProduct(null)
      load()
    } catch {
      addToast("Error al ajustar stock", "error")
    }
  }

  const movsFiltered = movs.filter((m) => {
    const typeOk = movFilterType ? m.type === movFilterType : true
    const text = movFilterText.toLowerCase()
    const textOk = movFilterText
      ? (m.reason || "").toLowerCase().includes(text) || (m.ref || "").toLowerCase().includes(text)
      : true
    return typeOk && textOk
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Package className="w-6 h-6 text-cyan-400" aria-hidden="true" />
            <h2 className="text-2xl font-bold text-slate-100 tracking-tight">Gestión de Productos</h2>
          </div>
          <p className="text-sm text-slate-400">Control de inventario, materias primas y catálogo comercial</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl text-xs font-semibold shadow-md shadow-cyan-950/50 transition-all self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Productos"
          value={items.length}
          icon={Package}
          variant="cyan"
          subtitle="Ítems en catálogo"
        />
        <MetricCard
          title="Stock Bajo"
          value={items.filter((i) => i.stockActual <= i.stockMinimo).length}
          icon={AlertTriangle}
          variant={items.some((i) => i.stockActual <= i.stockMinimo) ? "amber" : "slate"}
          subtitle="Por debajo del mínimo"
        />
        <MetricCard
          title="Stock Total"
          value={items.reduce((sum, i) => sum + i.stockActual, 0)}
          icon={TrendingUp}
          variant="purple"
          subtitle="Unidades acumuladas"
        />
      </div>

      {/* Tipo Filter Tabs */}
      <div role="tablist" aria-label="Filtro por tipo de producto" className="flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={filterTipo === ""}
          onClick={() => {
            setFilterTipo("")
            setPage(1)
          }}
          className={`px-3.5 py-2 rounded-xl font-medium text-xs transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            filterTipo === ""
              ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          Todos ({total})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterTipo === "producto_terminado"}
          onClick={() => {
            setFilterTipo("producto_terminado")
            setPage(1)
          }}
          className={`px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 ${
            filterTipo === "producto_terminado"
              ? "bg-cyan-950/70 text-cyan-300 border border-cyan-500/50 shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          <Package className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Productos Terminados</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterTipo === "materia_prima"}
          onClick={() => {
            setFilterTipo("materia_prima")
            setPage(1)
          }}
          className={`px-3.5 py-2 rounded-xl font-medium text-xs flex items-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-amber-400 ${
            filterTipo === "materia_prima"
              ? "bg-amber-950/70 text-amber-300 border border-amber-500/50 shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Materias Primas / Insumos</span>
        </button>
      </div>

      {/* Search and Toggle Active */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <label htmlFor="search-productos" className="sr-only">
            Buscar producto
          </label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
          <input
            id="search-productos"
            type="text"
            placeholder="Buscar producto por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setIncludeInactive(!includeInactive)}
          aria-pressed={includeInactive}
          className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-cyan-400 ${
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
      </div>

      {/* Create Form */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={nuevo.tipo === "materia_prima" ? "Registrar Materia Prima / Insumo" : "Crear Nuevo Producto Terminado"}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="prod-tipo" className="block text-xs font-semibold text-slate-300">
              Tipo de Ítem
            </label>
            <select
              id="prod-tipo"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
              value={nuevo.tipo}
              onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
            >
              <option value="producto_terminado">Producto Terminado (Venta a clientes)</option>
              <option value="materia_prima">Materia Prima / Insumo (Uso interno / Ensamblado)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="prod-nombre" className="block text-xs font-semibold text-slate-300">
              Nombre del Producto / Insumo *
            </label>
            <input
              id="prod-nombre"
              required
              aria-required="true"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
              placeholder={
                nuevo.tipo === "materia_prima" ? "Ej: Cable de Cobre 2mm, Estaño 60/40" : "Ej: Módulo XR-2000"
              }
              value={nuevo.nombre}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            />
          </div>

          {nuevo.tipo === "materia_prima" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="prod-unidad" className="block text-xs font-semibold text-slate-300">
                  Unidad de Medida
                </label>
                <select
                  id="prod-unidad"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  value={nuevo.unidadMedida}
                  onChange={(e) => setNuevo({ ...nuevo, unidadMedida: e.target.value })}
                >
                  <option value="unidades">Unidades (unid)</option>
                  <option value="metros">Metros (m)</option>
                  <option value="gramos">Gramos (g)</option>
                  <option value="kilogramos">Kilogramos (kg)</option>
                  <option value="litros">Litros (L)</option>
                  <option value="mililitros">Mililitros (mL)</option>
                  <option value="rollos">Rollos</option>
                  <option value="paquetes">Paquetes</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="prod-costo" className="block text-xs font-semibold text-slate-300">
                  Costo Unitario ($ / {nuevo.unidadMedida || "unidad"})
                </label>
                <input
                  id="prod-costo"
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  placeholder="0"
                  value={nuevo.costoUnitario}
                  onChange={(e) => setNuevo({ ...nuevo, costoUnitario: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="prod-precio-min" className="block text-xs font-semibold text-slate-300">
                  Precio Mínimo de Venta ($)
                </label>
                <input
                  id="prod-precio-min"
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  placeholder="0"
                  value={nuevo.precioMinimo}
                  onChange={(e) => setNuevo({ ...nuevo, precioMinimo: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="prod-precio-max" className="block text-xs font-semibold text-slate-300">
                  Precio Máximo de Venta ($)
                </label>
                <input
                  id="prod-precio-max"
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                  placeholder="0"
                  value={nuevo.precioMaximo}
                  onChange={(e) => setNuevo({ ...nuevo, precioMaximo: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="prod-stock-actual" className="block text-xs font-semibold text-slate-300">
                Stock Actual ({nuevo.tipo === "materia_prima" ? nuevo.unidadMedida || "unid" : "unid"})
              </label>
              <input
                id="prod-stock-actual"
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="0"
                value={nuevo.stockActual}
                onChange={(e) => setNuevo({ ...nuevo, stockActual: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="prod-stock-min" className="block text-xs font-semibold text-slate-300">
                Stock Mínimo ({nuevo.tipo === "materia_prima" ? nuevo.unidadMedida || "unid" : "unid"})
              </label>
              <input
                id="prod-stock-min"
                type="number"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                placeholder="0"
                value={nuevo.stockMinimo}
                onChange={(e) => setNuevo({ ...nuevo, stockMinimo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={crear}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-semibold rounded-xl shadow-md transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {nuevo.tipo === "materia_prima" ? "Guardar Materia Prima" : "Crear Producto Terminado"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Products Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-4">
                  Producto
                </th>
                <th scope="col" className="p-4">
                  Tipo
                </th>
                <th scope="col" className="p-4">
                  Costo / Margen
                </th>
                <th scope="col" className="p-4">
                  Precio Rango
                </th>
                <th scope="col" className="p-4">
                  Stock Actual
                </th>
                <th scope="col" className="p-4">
                  Stock Mínimo
                </th>
                <th scope="col" className="p-4">
                  Estado
                </th>
                <th scope="col" className="p-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-10 text-slate-400">
                    {hasInactiveProducts && !includeInactive && !searchTerm ? (
                      <div className="py-4">
                        <Package className="w-12 h-12 text-cyan-400/60 mx-auto mb-3" aria-hidden="true" />
                        <h3 className="text-lg font-semibold text-slate-100 mb-1">
                          No hay productos activos registrados
                        </h3>
                        <p className="text-slate-400 text-sm mb-4 max-w-md mx-auto">
                          Existen productos inactivos en el inventario. Puedes visualizar los productos inactivos para
                          consultarlos o reactivarlos.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIncludeInactive(true)}
                          className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-cyan-400"
                        >
                          <Filter className="w-4 h-4" aria-hidden="true" />
                          <span>Ver productos inactivos</span>
                        </button>
                      </div>
                    ) : searchTerm ? (
                      <span>No se encontraron productos con esos criterios</span>
                    ) : (
                      <span>No hay productos registrados</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const status = getStockStatus(item.stockActual, item.stockMinimo)
                  const isMateriaPrima = item.tipo === "materia_prima"
                  const costo = item.costoUnitario || 0
                  const margenMin = !isMateriaPrima && item.precioMinimo ? item.precioMinimo - costo : null

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isMateriaPrima
                                ? "bg-amber-950/60 text-amber-400 border border-amber-500/30"
                                : "bg-cyan-950/60 text-cyan-400 border border-cyan-500/30"
                            }`}
                            aria-hidden="true"
                          >
                            {isMateriaPrima ? <Cpu className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>
                          {editingId === item.id ? (
                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                              <input
                                aria-label="Nombre del producto"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs focus:border-cyan-500"
                                value={editValues.nombre}
                                onChange={(e) => setEditValues({ ...editValues, nombre: e.target.value })}
                              />
                              <input
                                aria-label="Descripción del producto"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 text-xs focus:border-cyan-500"
                                placeholder="Descripción"
                                value={editValues.descripcion}
                                onChange={(e) => setEditValues({ ...editValues, descripcion: e.target.value })}
                              />
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <div className="text-slate-200 font-semibold text-sm flex items-center gap-2">
                                <span className="truncate">{item.nombre}</span>
                                {item.active === 0 && (
                                  <Badge variant="danger" size="sm">
                                    Inactivo
                                  </Badge>
                                )}
                              </div>
                              {item.descripcion && (
                                <p className="text-slate-400 text-xs truncate max-w-xs">{item.descripcion}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Tipo Badge */}
                      <td className="p-4 whitespace-nowrap">
                        {editingId === item.id ? (
                          <select
                            aria-label="Tipo de ítem"
                            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 text-xs"
                            value={editValues.tipo}
                            onChange={(e) => setEditValues({ ...editValues, tipo: e.target.value })}
                          >
                            <option value="producto_terminado">Producto Terminado</option>
                            <option value="materia_prima">Materia Prima</option>
                          </select>
                        ) : isMateriaPrima ? (
                          <Badge variant="amber" size="sm" icon={Cpu}>
                            Materia Prima
                          </Badge>
                        ) : (
                          <Badge variant="info" size="sm" icon={Package}>
                            Terminado
                          </Badge>
                        )}
                      </td>

                      {/* Costo / Margen */}
                      <td className="p-4 whitespace-nowrap text-xs text-slate-300">
                        {editingId === item.id ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="number"
                              aria-label="Costo unitario"
                              className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs"
                              placeholder="Costo"
                              value={editValues.costoUnitario}
                              onChange={(e) => setEditValues({ ...editValues, costoUnitario: e.target.value })}
                            />
                            {editValues.tipo === "materia_prima" && (
                              <select
                                aria-label="Unidad de medida"
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs"
                                value={editValues.unidadMedida}
                                onChange={(e) => setEditValues({ ...editValues, unidadMedida: e.target.value })}
                              >
                                <option value="unidades">unid</option>
                                <option value="metros">m</option>
                                <option value="gramos">g</option>
                                <option value="kilogramos">kg</option>
                                <option value="litros">L</option>
                                <option value="mililitros">mL</option>
                                <option value="rollos">rollos</option>
                                <option value="paquetes">paquetes</option>
                              </select>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-200">
                              ${costo.toLocaleString("es-CO")} / {item.unidadMedida || "unid"}
                            </span>
                            {margenMin !== null && (
                              <span
                                className={`text-[11px] font-semibold ${
                                  margenMin >= 0 ? "text-emerald-400" : "text-rose-400"
                                }`}
                              >
                                Margen: ${margenMin.toLocaleString("es-CO")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Precio Rango */}
                      <td className="p-4 whitespace-nowrap text-xs text-slate-300">
                        {editingId === item.id ? (
                          editValues.tipo === "materia_prima" ? (
                            <span className="text-slate-500 italic">No aplica</span>
                          ) : (
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                aria-label="Precio mínimo"
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs"
                                value={editValues.precioMinimo}
                                onChange={(e) => setEditValues({ ...editValues, precioMinimo: e.target.value })}
                              />
                              <input
                                type="number"
                                aria-label="Precio máximo"
                                className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs"
                                value={editValues.precioMaximo}
                                onChange={(e) => setEditValues({ ...editValues, precioMaximo: e.target.value })}
                              />
                            </div>
                          )
                        ) : isMateriaPrima ? (
                          <span className="text-slate-500 italic text-[11px]">Uso interno</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-slate-200 font-medium">
                              ${(item.precioMinimo || 0).toLocaleString("es-CO")}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              hasta ${(item.precioMaximo || 0).toLocaleString("es-CO")}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Stock Actual */}
                      <td className="p-4 whitespace-nowrap">
                        <span className="text-slate-100 font-bold text-base">{item.stockActual}</span>{" "}
                        <span className="text-xs text-slate-400">{item.unidadMedida || "unid"}</span>
                      </td>

                      {/* Stock Mínimo */}
                      <td className="p-4 whitespace-nowrap text-xs text-slate-300">
                        {editingId === item.id ? (
                          <input
                            type="number"
                            aria-label="Stock mínimo"
                            className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 text-xs"
                            value={editValues.stockMinimo}
                            onChange={(e) => setEditValues({ ...editValues, stockMinimo: e.target.value })}
                          />
                        ) : (
                          `${item.stockMinimo} ${item.unidadMedida || "unid"}`
                        )}
                      </td>

                      {/* Estado */}
                      <td className="p-4 whitespace-nowrap">
                        {status === "critical" && (
                          <Badge variant="danger" size="sm" showDot icon={AlertTriangle}>
                            Crítico
                          </Badge>
                        )}
                        {status === "warning" && (
                          <Badge variant="warning" size="sm" showDot icon={TrendingDown}>
                            Bajo
                          </Badge>
                        )}
                        {status === "good" && (
                          <Badge variant="success" size="sm" icon={TrendingUp}>
                            Óptimo
                          </Badge>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="p-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {editingId === item.id ? (
                            <>
                              <button
                                type="button"
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                                onClick={() => saveEdit(item.id)}
                                aria-label="Guardar cambios"
                              >
                                <Save className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Guardar</span>
                              </button>
                              <button
                                type="button"
                                className="px-2.5 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                                onClick={cancelEdit}
                                aria-label="Cancelar edición"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Cancelar</span>
                              </button>
                            </>
                          ) : (
                            <>
                              {item.active === 0 ? (
                                <>
                                  <button
                                    type="button"
                                    className="px-2.5 py-1.5 border border-emerald-500/40 text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                                    onClick={() => reactivar(item.id)}
                                    aria-label={`Reactivar ${item.nombre}`}
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Reactivar</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2.5 py-1.5 border border-rose-500/40 text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                                    onClick={() => promptEliminarDefinitivamente(item.id)}
                                    aria-label={`Eliminar definitivamente ${item.nombre}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Eliminar</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  {!isMateriaPrima && (
                                    <button
                                      type="button"
                                      className="p-1.5 border border-cyan-500/30 text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/60 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                                      onClick={() => openBomModal(item)}
                                      aria-label={`Receta BOM de ${item.nombre}`}
                                      title="Configurar Receta BOM de Ensamblado"
                                    >
                                      <Layers className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="p-1.5 border border-slate-700 text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                                    onClick={() => beginEdit(item)}
                                    aria-label={`Editar ${item.nombre}`}
                                    title="Editar datos"
                                  >
                                    <Edit2 className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2 py-1.5 border border-purple-500/30 text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-purple-400"
                                    onClick={() => openAdjust(item)}
                                    aria-label={`Ajustar stock de ${item.nombre}`}
                                  >
                                    Ajustar
                                  </button>
                                  <button
                                    type="button"
                                    className="px-2 py-1.5 border border-amber-500/30 text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-amber-400"
                                    onClick={() => openMovs(item)}
                                    aria-label={`Ver movimientos de ${item.nombre}`}
                                  >
                                    Kardex
                                  </button>
                                  <button
                                    type="button"
                                    className="p-1.5 border border-rose-500/30 text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
                                    onClick={() => promptDesactivar(item.id)}
                                    aria-label={`Desactivar producto ${item.nombre}`}
                                    title="Desactivar producto"
                                  >
                                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
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

      <Modal isOpen={showDeleteConfirm} onClose={cancelDesactivar} title="Desactivar producto">
        <div className="space-y-4">
          <div className="text-gray-300">El producto se ocultará de los listados, pero no se eliminará.</div>
          <div className="flex justify-end gap-3">
            <button className="px-3 py-2 text-slate-400" onClick={cancelDesactivar}>
              Cancelar
            </button>
            <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={confirmDesactivar}>
              Desactivar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showPermanentDeleteConfirm}
        onClose={cancelEliminarDefinitivamente}
        title="Eliminar producto definitivamente"
      >
        <div className="space-y-4">
          <div className="text-gray-300">
            ¿Estás seguro de que deseas eliminar este producto permanentemente? Esta acción no se puede deshacer.
          </div>
          <div className="flex justify-end gap-3">
            <button className="px-3 py-2 text-slate-400" onClick={cancelEliminarDefinitivamente}>
              Cancelar
            </button>
            <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={confirmEliminarDefinitivamente}>
              Eliminar Definitivamente
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex items-center justify-between mt-4">
        <div className="text-gray-400">
          Página {page} de {Math.max(1, Math.ceil(total / limit))}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border border-slate-600 text-gray-300 rounded disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="px-3 py-1 border border-slate-600 text-gray-300 rounded disabled:opacity-50"
            disabled={page >= Math.max(1, Math.ceil(total / limit))}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <select
            className="ml-2 bg-slate-800 border border-slate-700 rounded text-white p-1"
            value={limit}
            onChange={(e) => {
              setPage(1)
              setLimit(Number(e.target.value))
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="Ajustar Stock">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cantidad</label>
              <input
                type="number"
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                value={adjustData.diff}
                onChange={(e) => setAdjustData({ ...adjustData, diff: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Motivo</label>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                value={adjustData.motivo}
                onChange={(e) => setAdjustData({ ...adjustData, motivo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Referencia</label>
              <input
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white"
                value={adjustData.referencia}
                onChange={(e) => setAdjustData({ ...adjustData, referencia: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="px-4 py-2 bg-slate-700 text-white rounded" onClick={() => setShowAdjust(false)}>
              Cancelar
            </button>
            <button
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 text-white rounded"
              onClick={confirmarAjuste}
            >
              Confirmar
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showMovs} onClose={() => setShowMovs(false)} title="Historial de Movimientos">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <select
                className="bg-slate-800 border border-slate-700 rounded text-white p-1"
                value={movFilterType}
                onChange={(e) => setMovFilterType(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
              <input
                className="bg-slate-800 border border-slate-700 rounded text-white p-1"
                placeholder="Filtrar por motivo/ref"
                value={movFilterText}
                onChange={(e) => setMovFilterText(e.target.value)}
              />
              <button
                className="px-2 py-1 border border-slate-600 text-gray-300 rounded"
                onClick={() => {
                  setMovFilterType("")
                  setMovFilterText("")
                }}
              >
                Limpiar
              </button>
            </div>
            <button
              className="px-3 py-1 border border-green-500 text-green-400 rounded"
              onClick={async () => {
                if (!selectedProduct) return
                try {
                  const data = await getProductoMovimientos(token, selectedProduct.id, { page: 1, limit: 1000 })
                  const rows = (data.items || [])
                    .filter((m) => {
                      const typeOk = movFilterType ? m.type === movFilterType : true
                      const t = movFilterText.toLowerCase()
                      const textOk = movFilterText
                        ? (m.reason || "").toLowerCase().includes(t) || (m.ref || "").toLowerCase().includes(t)
                        : true
                      return typeOk && textOk
                    })
                    .map((m) => [
                      new Date(m.date).toISOString(),
                      m.type,
                      m.diff,
                      m.reason || "",
                      m.ref || "",
                      m.userName || m.userId || ""
                    ])
                  const csv = ["fecha,type,diff,motivo,referencia,usuario", ...rows.map((r) => r.join(","))].join("\n")
                  const blob = new Blob([csv], { type: "text/csv" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `movimientos_${selectedProduct.nombre}_${new Date().toISOString().split("T")[0]}.csv`
                  a.click()
                } catch {
                  addToast("Error al exportar", "error")
                }
              }}
            >
              Exportar CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-400 text-xs">
                  <th className="p-2.5 text-left">Fecha</th>
                  <th className="p-2.5 text-left">Movimiento</th>
                  <th className="p-2.5 text-left">Cantidad</th>
                  <th className="p-2.5 text-left">Stock Resultante</th>
                  <th className="p-2.5 text-left">Referencia</th>
                  <th className="p-2.5 text-left">Observación / Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-xs">
                {movsFiltered.length === 0 ? (
                  <tr>
                    <td className="p-4 text-center text-slate-500" colSpan="6">
                      Sin movimientos de Kardex registrados
                    </td>
                  </tr>
                ) : (
                  movsFiltered.map((m) => {
                    const tipo = m.tipoMovimiento || m.type || "AJUSTE"
                    const isPositive = Number(m.cantidad || m.diff || 0) > 0
                    const unit = m.unidadMedida || selectedProduct?.unidadMedida || "unid"
                    let badgeClass = "bg-slate-700/40 text-slate-300 border-slate-600"
                    if (tipo === "COMPRA") badgeClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    else if (tipo === "ENSAMBLADO_CONSUMO")
                      badgeClass = "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    else if (tipo === "ENSAMBLADO_PRODUCCION")
                      badgeClass = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                    else if (tipo === "VENTA") badgeClass = "bg-purple-500/20 text-purple-300 border-purple-500/30"

                    return (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-300">{new Date(m.fecha || m.date).toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${badgeClass}`}>
                            {tipo}
                          </span>
                        </td>
                        <td className={`p-2.5 font-bold ${isPositive ? "text-emerald-400" : "text-amber-400"}`}>
                          {isPositive ? `+${m.cantidad || m.diff}` : `${m.cantidad || m.diff}`} {unit}
                        </td>
                        <td className="p-2.5 font-semibold text-cyan-300">
                          {m.stockResultante != null ? `${m.stockResultante} ${unit}` : "-"}
                        </td>
                        <td className="p-2.5 font-mono text-slate-400">{m.referenciaId || m.ref || "-"}</td>
                        <td className="p-2.5 text-slate-300">
                          {m.notas || m.reason || ""}{" "}
                          <span className="text-slate-500 text-[10px]">({m.userName || "Admin"})</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="text-gray-400">
              Página {movPage} de {Math.max(1, Math.ceil(movTotal / movLimit))}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 border border-slate-600 text-gray-300 rounded disabled:opacity-50"
                disabled={movPage <= 1}
                onClick={async () => {
                  const np = movPage - 1
                  setMovPage(np)
                  await loadMovs(selectedProduct.id, np, movLimit)
                }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="px-3 py-1 border border-slate-600 text-gray-300 rounded disabled:opacity-50"
                disabled={movPage >= Math.max(1, Math.ceil(movTotal / movLimit))}
                onClick={async () => {
                  const np = movPage + 1
                  setMovPage(np)
                  await loadMovs(selectedProduct.id, np, movLimit)
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <select
                className="ml-2 bg-slate-800 border border-slate-700 rounded text-white p-1"
                value={movLimit}
                onChange={async (e) => {
                  const nl = Number(e.target.value)
                  setMovLimit(nl)
                  setMovPage(1)
                  await loadMovs(selectedProduct.id, 1, nl)
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>

      {/* BOM Recipe Modal */}
      <Modal isOpen={showBom} onClose={() => setShowBom(false)} title={`Receta BOM - ${selectedProduct?.nombre || ""}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Define los insumos y cantidades de materia prima requeridos para ensamblar 1 unidad de{" "}
            <span className="text-cyan-400 font-semibold">{selectedProduct?.nombre}</span>.
          </p>

          {/* Current Recipe Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-left">Materia Prima / Insumo</th>
                  <th className="p-3 text-center">Cant. Req.</th>
                  <th className="p-3 text-right">Costo Unit.</th>
                  <th className="p-3 text-right">Subtotal</th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-500">
                      Esta receta aún no tiene insumos configurados.
                    </td>
                  </tr>
                ) : (
                  bomItems.map((b) => {
                    const subtotal = (b.cantidadRequerida || 0) * (b.costoUnitario || 0)
                    return (
                      <tr key={b.materiaPrimaId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-white">{b.materiaPrimaNombre}</td>
                        <td className="p-3 text-center text-cyan-300 font-semibold">
                          {b.cantidadRequerida} {b.materiaPrimaUnidadMedida || b.unidadMedida || "unid"}
                        </td>
                        <td className="p-3 text-right text-slate-400">
                          ${(b.costoUnitario || 0).toLocaleString()} /{" "}
                          {b.materiaPrimaUnidadMedida || b.unidadMedida || "unid"}
                        </td>
                        <td className="p-3 text-right text-green-400 font-semibold">${subtotal.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveBomItem(b.materiaPrimaId)}
                            className="text-red-400 hover:text-red-300 p-1 rounded"
                            title="Eliminar de receta"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
              {bomItems.length > 0 && (
                <tfoot className="bg-slate-950/80 border-t border-slate-800 font-semibold">
                  <tr>
                    <td colSpan="3" className="p-3 text-right text-slate-300">
                      Costo Total Receta BOM (1 Unid):
                    </td>
                    <td className="p-3 text-right text-cyan-400 font-bold text-base">
                      $
                      {bomItems
                        .reduce((acc, b) => acc + (b.cantidadRequerida || 0) * (b.costoUnitario || 0), 0)
                        .toLocaleString()}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Add Insumo Form */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/50 rounded-lg space-y-3">
            <h4 className="text-sm font-semibold text-cyan-400">Agregar o Modificar Insumo en Receta</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Materia Prima / Insumo</label>
                <select
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  value={newBomMatId}
                  onChange={(e) => setNewBomMatId(e.target.value)}
                >
                  <option value="">-- Selecciona Materia Prima --</option>
                  {allRawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Stock: {m.stockActual} {m.unidadMedida || "unid"} | Costo: ${m.costoUnitario || 0}/
                      {m.unidadMedida || "unid"})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cantidad por Unidad</label>
                <input
                  type="number"
                  min="1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  value={newBomQty}
                  onChange={(e) => setNewBomQty(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={handleAddBomItem}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Guardar Insumo en Receta
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              onClick={() => setShowBom(false)}
              className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
            >
              Cerrar Receta
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

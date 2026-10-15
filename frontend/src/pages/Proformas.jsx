import { useEffect, useState } from "react"
import { FileText, Search, RefreshCw, Download, DollarSign, Clock } from "lucide-react"
import { useToast } from "../components/ToastContext"
import { getProformas, downloadProformaPDF } from "../api/client"
import MetricCard from "../components/MetricCard"
import EmptyState from "../components/EmptyState"

export default function Proformas({ token }) {
  const { addToast } = useToast()
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)

  async function handleDownload(proformaId, pedidoId) {
    try {
      setDownloadingId(proformaId)
      const blob = await downloadProformaPDF(token, proformaId)
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = blobUrl
      link.download = `proforma-pedido-${pedidoId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      addToast("Proforma descargada exitosamente", "success")
    } catch (err) {
      addToast(err.message || "Error al descargar la proforma", "error")
    } finally {
      setDownloadingId(null)
    }
  }

  async function load() {
    if (!token) return
    setLoading(true)
    try {
      const j = await getProformas(token)
      setItems(Array.isArray(j) ? j : [])
    } catch {
      addToast("Error al cargar las proformas", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [token])

  const filtered = items.filter((p) => String(p.id).includes(searchTerm) || String(p.pedidoId).includes(searchTerm))
  const totalMonto = items.reduce((sum, p) => sum + (p.total || 0), 0)
  const lastProforma = items.length > 0 ? `PRF-${String(items[items.length - 1].id).padStart(4, "0")}` : "N/A"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Proformas y Cotizaciones</h1>
              <p className="text-xs text-slate-400">Listado de proformas emitidas y descarga de comprobantes en PDF</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            aria-label="Actualizar proformas"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Total Proformas"
          value={items.length}
          icon={FileText}
          variant="cyan"
          subtitle="Documentos generados"
          loading={loading}
        />
        <MetricCard
          title="Monto Proformado"
          value={`$${totalMonto.toLocaleString("es-CO")}`}
          icon={DollarSign}
          variant="purple"
          subtitle="Total cotizado en pedidos"
          loading={loading}
        />
        <MetricCard
          title="Última Proforma"
          value={lastProforma}
          icon={Clock}
          variant="emerald"
          subtitle="Último folio expedido"
          loading={loading}
        />
      </div>

      {/* Search Input */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <label htmlFor="search-proformas" className="sr-only">
            Buscar proformas
          </label>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-proformas"
            type="text"
            placeholder="Buscar por ID de proforma o N° de pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <caption className="sr-only">Listado de proformas emitidas</caption>
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th scope="col" className="p-4">
                  Folio Proforma
                </th>
                <th scope="col" className="p-4">
                  Pedido Asociado
                </th>
                <th scope="col" className="p-4">
                  Monto Total
                </th>
                <th scope="col" className="p-4 text-right">
                  Descarga
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-6">
                    <EmptyState
                      icon={FileText}
                      title="No hay proformas registradas"
                      description="Puedes generar una proforma desde la pantalla de Gestión de Pedidos."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-mono text-cyan-400 font-semibold">PRF-{String(p.id).padStart(4, "0")}</td>
                    <td className="p-4 font-medium text-slate-200">Pedido #{p.pedidoId}</td>
                    <td className="p-4 font-bold text-emerald-400">
                      ${Number(p.total || 0).toLocaleString("es-CO")} COP
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(p.id, p.pedidoId)}
                        disabled={downloadingId === p.id}
                        aria-label={`Descargar proforma en PDF para el pedido #${p.pedidoId}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingId === p.id ? "Descargando..." : "Descargar PDF"}</span>
                      </button>
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

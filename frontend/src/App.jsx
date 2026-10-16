import { useEffect, useState, lazy, Suspense } from "react"
import { Routes, Route, NavLink, Link, Navigate, useLocation } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  Package,
  Cpu,
  Truck,
  ShoppingCart,
  FileText,
  Settings as SettingsIcon,
  FileSpreadsheet,
  LogIn,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Info
} from "lucide-react"
import { ToastProvider } from "./components/ToastContext"
import { getDemoStatus } from "./api/client"

const Login = lazy(() => import("./pages/Login.jsx"))
const Dashboard = lazy(() => import("./pages/Dashboard.jsx"))
const Clientes = lazy(() => import("./pages/Clientes.jsx"))
const Productos = lazy(() => import("./pages/Productos.jsx"))
const Produccion = lazy(() => import("./pages/Produccion.jsx"))
const Compras = lazy(() => import("./pages/Compras.jsx"))
const Pedidos = lazy(() => import("./pages/Pedidos.jsx"))
const Proformas = lazy(() => import("./pages/Proformas.jsx"))
const Configuracion = lazy(() => import("./pages/Configuracion.jsx"))
const Reportes = lazy(() => import("./pages/Reportes.jsx"))

export function PageLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Cargando módulo"
      className="flex flex-col items-center justify-center min-h-[360px] w-full p-8 space-y-4"
    >
      <div className="relative flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-slate-800 border-t-cyan-400 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-300 tracking-wide">Cargando módulo...</p>
        <p className="text-xs text-slate-500 mt-1">Optimizando recursos y preparando vista</p>
      </div>
      <span className="sr-only">Cargando sección de la plataforma...</span>
    </div>
  )
}

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/clientes", label: "Clientes", icon: Users },
  { path: "/productos", label: "Productos", icon: Package },
  { path: "/produccion", label: "Producción", icon: Cpu },
  { path: "/compras", label: "Compras", icon: Truck },
  { path: "/pedidos", label: "Pedidos", icon: ShoppingCart },
  { path: "/proformas", label: "Proformas", icon: FileText },
  { path: "/reportes", label: "Reportes", icon: FileSpreadsheet },
  { path: "/configuracion", label: "Configuración", icon: SettingsIcon }
]

export default function App({ initialToken = "" }) {
  const [token, setToken] = useState(() => initialToken || "")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return import.meta.env.VITE_DEMO_MODE === "true" || import.meta.env.VITE_DEMO_EPHEMERAL === "true"
  })
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    getDemoStatus().then((active) => {
      if (mounted && active) {
        setIsDemoMode(true)
      }
    })
    return () => {
      mounted = false
    }
  }, [])

  function handleLogout() {
    setToken("")
  }

  function handleSetToken(newToken) {
    setToken(newToken || "")
  }

  useEffect(() => {
    function handleUnauthorized() {
      handleLogout()
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized)
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileMenuOpen])

  function RequireAuth({ children }) {
    if (!token) return <Navigate to="/login" replace />
    return children
  }

  // Active page title helper
  const currentNav = navItems.find((item) =>
    item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
  )
  const pageTitle = currentNav ? currentNav.label : "CRM & Inventory Platform"

  return (
    <ToastProvider>
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-cyan-500 focus:text-slate-950 focus:font-bold focus:rounded-lg focus:shadow-xl focus:ring-2 focus:ring-white"
      >
        Saltar al contenido principal
      </a>

      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Banner de Demostración Pública */}
        {isDemoMode && (
          <aside
            role="status"
            aria-label="Aviso de demostración pública"
            className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs font-medium text-amber-300 text-center flex items-center justify-center gap-2 z-50 shrink-0"
          >
            <Info className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>Demo pública: los datos se restablecen periódicamente y no representan información real</span>
          </aside>
        )}

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Mobile Backdrop */}
          {token && mobileMenuOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
          {token && (
            <aside
              id="sidebar-navigation"
              aria-label="Navegación principal"
              className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
                mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
              }`}
            >
              {/* Brand Header */}
              <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group focus-visible:rounded-lg">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-cyan-950/50 group-hover:scale-105 transition-transform">
                    C
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-slate-100 tracking-tight">CRM Portfolio</span>
                    <span className="text-[10px] text-slate-400 font-medium">Gestión & Inventario</span>
                  </div>
                </Link>

                {/* Close Button on Mobile Drawer */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Cerrar menú de navegación"
                  className="lg:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar" aria-label="Secciones del CRM">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>

              {/* User Session Footer in Sidebar */}
              <div className="p-3 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div
                      className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-cyan-400 shrink-0"
                      aria-hidden="true"
                    >
                      DA
                    </div>
                    <div className="truncate text-xs">
                      <p className="font-medium text-slate-200 truncate">demo.admin</p>
                      <p className="text-[10px] text-slate-400 truncate">portfolio.invalid</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </aside>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top Header Bar */}
            <header className="h-16 px-4 sm:px-6 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Hamburger Toggle on Mobile */}
                {token && (
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="sidebar-navigation"
                    aria-label="Abrir menú de navegación"
                    className="lg:hidden p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <Menu className="w-5 h-5" aria-hidden="true" />
                  </button>
                )}

                {/* Context / Breadcrumb */}
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">{pageTitle}</h1>
                </div>
              </div>

              {/* Right Header Status & Actions */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Entorno Demo Protegido</span>
                </div>

                {!token ? (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 rounded-lg hover:bg-cyan-950/70 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
                  >
                    <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Iniciar Sesión</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Cerrar sesión"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 border border-slate-800 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">Cerrar Sesión</span>
                  </button>
                )}
              </div>
            </header>

            {/* Page Viewport */}
            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto outline-none"
            >
              <Suspense fallback={<PageLoadingFallback />}>
                <Routes>
                  <Route path="/login" element={<Login onToken={handleSetToken} onLogin={handleSetToken} />} />
                  <Route
                    path="/"
                    element={
                      <RequireAuth>
                        <Dashboard token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/clientes"
                    element={
                      <RequireAuth>
                        <Clientes token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/productos"
                    element={
                      <RequireAuth>
                        <Productos token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/produccion"
                    element={
                      <RequireAuth>
                        <Produccion token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/compras"
                    element={
                      <RequireAuth>
                        <Compras token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/pedidos"
                    element={
                      <RequireAuth>
                        <Pedidos token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/proformas"
                    element={
                      <RequireAuth>
                        <Proformas token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/configuracion"
                    element={
                      <RequireAuth>
                        <Configuracion token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="/reportes"
                    element={
                      <RequireAuth>
                        <Reportes token={token} />
                      </RequireAuth>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </div>
    </ToastProvider>
  )
}

import { createContext, useContext, useState, useCallback } from "react"
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from "lucide-react"

const ToastContext = createContext(null)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within a ToastProvider")
  return context
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message, type = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      setToasts((prev) => [...prev, { id, message, type }])

      // Auto remove after 3.5 seconds
      setTimeout(() => {
        removeToast(id)
      }, 3500)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
        role="region"
        aria-label="Notificaciones del sistema"
      >
        <div aria-live="polite" aria-atomic="false" className="flex flex-col gap-2.5 w-full">
          {toasts.map((toast) => {
            const isError = toast.type === "error"
            const isSuccess = toast.type === "success"
            const isWarning = toast.type === "warning"

            const themeStyles = isSuccess
              ? "bg-slate-900/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/40"
              : isError
                ? "bg-slate-900/95 border-rose-500/40 text-rose-200 shadow-rose-950/40"
                : isWarning
                  ? "bg-slate-900/95 border-amber-500/40 text-amber-200 shadow-amber-950/40"
                  : "bg-slate-900/95 border-cyan-500/40 text-cyan-200 shadow-cyan-950/40"

            return (
              <div
                key={toast.id}
                role={isError ? "alert" : "status"}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md transition-all duration-200 ${themeStyles}`}
              >
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />}
                {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />}
                {!isSuccess && !isError && !isWarning && (
                  <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
                )}

                <p className="flex-1 text-sm font-medium leading-snug text-slate-100">{toast.message}</p>

                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Cerrar notificación"
                  className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-cyan-400"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

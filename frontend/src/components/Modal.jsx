import { useEffect, useRef } from "react"
import { X } from "lucide-react"

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    previousActiveElement.current = document.activeElement

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length === 0) return

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Initial focus on first focusable element or modal container
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length > 0) {
          focusable[0].focus()
        } else {
          modalRef.current.focus()
        }
      }
    }, 50)

    // Prevent body scrolling while modal is open
    document.body.style.overflow = "hidden"

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
      clearTimeout(timer)
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative w-full ${maxWidth} bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/80 my-8 overflow-hidden transition-all duration-200 outline-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800 bg-slate-900/90">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-100 tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[calc(85vh-8rem)] overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  )
}

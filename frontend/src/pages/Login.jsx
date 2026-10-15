import { useState } from "react"
import { Lock, Mail, Loader2, Sparkles, ShieldCheck, AlertCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { login as apiLogin } from "../api/client"

export default function Login({ onToken, onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const DEMO_EMAIL = "demo.admin@portfolio.invalid"
  const DEMO_PASSWORD = "local-demo-only-change-me"

  function handleFillDemoCredentials() {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    setError("")
  }

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError("Por favor ingresa tanto el correo como la contraseña.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const j = await apiLogin(email, password)
      if (onToken) onToken(j.token)
      if (onLogin) onLogin(j.token)
      navigate("/")
    } catch (err) {
      setError(String(err.message || "Credenciales inválidas"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header / Brand */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl mx-auto flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-cyan-950/60">
            C
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Acceso a la Plataforma</h1>
          <p className="text-sm text-slate-400">Demostración interactiva de portafolio Full-Stack</p>
        </div>

        {/* Demo Credentials Helper Card */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4.5 shadow-sm space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-200">Entorno de Demostración Seguro</p>
              <p className="text-slate-400 leading-relaxed">
                Este sistema utiliza datos de prueba sintéticos. Puedes acceder con la cuenta de administrador
                demostrativo:
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-slate-300 space-y-1">
            <p className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="text-cyan-300 font-medium select-all">{DEMO_EMAIL}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-500">Contraseña:</span>
              <span className="text-cyan-300 font-medium select-all">{DEMO_PASSWORD}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={handleFillDemoCredentials}
            className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Autocompletar credenciales demo</span>
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <form onSubmit={submit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-xs font-semibold text-slate-300">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@portfolio.invalid"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-300">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500/30"
                />
              </div>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-lg shadow-cyan-950/50 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend = null,
  trendLabel = "",
  variant = "cyan",
  subtitle = "",
  loading = false,
  className = ""
}) {
  const accentStyles = {
    cyan: {
      border: "border-cyan-500/20 hover:border-cyan-500/40",
      iconBg: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
      valueColor: "text-cyan-300"
    },
    emerald: {
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
      valueColor: "text-emerald-300"
    },
    purple: {
      border: "border-purple-500/20 hover:border-purple-500/40",
      iconBg: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      valueColor: "text-purple-300"
    },
    amber: {
      border: "border-amber-500/20 hover:border-amber-500/40",
      iconBg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      valueColor: "text-amber-300"
    },
    rose: {
      border: "border-rose-500/20 hover:border-rose-500/40",
      iconBg: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      valueColor: "text-rose-300"
    },
    slate: {
      border: "border-slate-700/60 hover:border-slate-600",
      iconBg: "bg-slate-800 text-slate-300 border border-slate-700",
      valueColor: "text-slate-100"
    }
  }

  const style = accentStyles[variant] || accentStyles.slate

  if (loading) {
    return (
      <div
        className={`bg-slate-900/80 border border-slate-800 rounded-xl p-5 animate-pulse ${className}`}
        aria-busy="true"
        aria-label={`Cargando ${title}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
          <div className="w-10 h-10 bg-slate-800 rounded-lg"></div>
        </div>
        <div className="h-8 w-32 bg-slate-800 rounded mb-2"></div>
        <div className="h-3 w-20 bg-slate-800 rounded"></div>
      </div>
    )
  }

  return (
    <div
      className={`bg-slate-900/80 backdrop-blur-sm border rounded-xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${style.border} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${style.valueColor}`}>{value}</p>
        {trend && <span className="text-xs font-semibold text-emerald-400">{trend}</span>}
      </div>

      {(subtitle || trendLabel) && (
        <p className="mt-1.5 text-xs text-slate-400 flex items-center gap-1.5">
          {trendLabel && <span className="text-slate-300 font-medium">{trendLabel}</span>}
          {subtitle && <span>{subtitle}</span>}
        </p>
      )}
    </div>
  )
}

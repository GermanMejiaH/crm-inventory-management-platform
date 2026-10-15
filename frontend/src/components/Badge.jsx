export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  showDot = false,
  icon: Icon = null
}) {
  const variantStyles = {
    success: "bg-emerald-950/70 text-emerald-300 border-emerald-500/40",
    warning: "bg-amber-950/70 text-amber-300 border-amber-500/40",
    danger: "bg-rose-950/70 text-rose-300 border-rose-500/40",
    info: "bg-cyan-950/70 text-cyan-300 border-cyan-500/40",
    purple: "bg-purple-950/70 text-purple-300 border-purple-500/40",
    neutral: "bg-slate-800/80 text-slate-300 border-slate-700"
  }

  const dotStyles = {
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-rose-400",
    info: "bg-cyan-400",
    purple: "bg-purple-400",
    neutral: "bg-slate-400"
  }

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs font-medium gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3 py-1.5 text-sm font-semibold gap-2"
  }

  const selectedVariant = variantStyles[variant] || variantStyles.neutral
  const selectedDot = dotStyles[variant] || dotStyles.neutral
  const selectedSize = sizeStyles[size] || sizeStyles.md

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-wide transition-colors ${selectedVariant} ${selectedSize} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${selectedDot} animate-pulse`} aria-hidden="true" />}
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  )
}

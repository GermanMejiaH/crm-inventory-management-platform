export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionText = "",
  onAction = null,
  actionIcon: ActionIcon = null,
  className = ""
}) {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-xl p-8 sm:p-12 text-center flex flex-col items-center justify-center ${className}`}
      role="region"
      aria-label={title}
    >
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-4 text-cyan-400">
          <Icon className="w-7 h-7" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-100 mb-1.5">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-md mx-auto mb-6 leading-relaxed">{description}</p>}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold rounded-lg shadow-md shadow-cyan-950/50 transition-all focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" aria-hidden="true" />}
          <span>{actionText}</span>
        </button>
      )}
    </div>
  )
}

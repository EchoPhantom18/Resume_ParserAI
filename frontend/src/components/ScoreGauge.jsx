export default function ScoreGauge({ score = 0, label = "Score", size = "large" }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)))
  const color = safeScore >= 75 ? "#10b981" : safeScore >= 45 ? "#d97706" : "#dc2626"
  const outerSize = size === "small" ? "h-16 w-16" : "h-28 w-28"
  const innerSize = size === "small" ? "h-11 w-11 text-sm" : "h-20 w-20 text-2xl"

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`${outerSize} rounded-full p-1.5`}
        style={{ background: `conic-gradient(${color} ${safeScore}%, var(--gauge-track) ${safeScore}% 100%)` }}
        aria-label={`${label}: ${safeScore} out of 100`}
      >
        <div className={`flex ${innerSize} items-center justify-center rounded-full bg-white font-semibold text-slate-950 dark:bg-slate-900 dark:text-slate-50`}>
          {safeScore}
        </div>
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}

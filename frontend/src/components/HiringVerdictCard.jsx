import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Gauge } from "lucide-react"
import { useEffect, useState } from "react"
import { getHiringVerdict } from "../services/api.js"

export default function HiringVerdictCard({ candidateId, verdict }) {
  const [loadedVerdict, setLoadedVerdict] = useState(verdict || null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (verdict) {
      setLoadedVerdict(verdict)
      return
    }
    if (!candidateId) return

    async function loadVerdict() {
      try {
        setError("")
        const data = await getHiringVerdict(candidateId)
        setLoadedVerdict(data.hiring_verdict)
      } catch {
        setError("Unable to load hiring verdict.")
      }
    }

    loadVerdict()
  }, [candidateId, verdict])

  if (error) {
    return <div className="card p-5 text-sm text-red-700 dark:text-red-300">{error}</div>
  }

  if (!loadedVerdict) {
    return (
      <section className="card p-5">
        <div className="flex items-center justify-between">
          <div className="h-4 w-44 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="h-7 w-24 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-36 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </section>
    )
  }

  const normalized = normalizeVerdict(loadedVerdict)
  const tone = getTone(normalized.verdict)
  const confidenceLabel = getConfidenceLabel(normalized.confidence_score)

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-title">Hiring Verdict Engine</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rule-based hiring signal from resume quality, skills, projects, and role fit.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${tone.badge}`}>
          {normalized.verdict}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Confidence Score</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                {normalized.confidence_score}%
              </p>
            </div>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
              <Gauge size={19} />
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${normalized.confidence_score}%` }} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">
            {normalized.recommendation_note}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
              <BriefcaseBusiness size={19} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hiring Decision Summary</p>
              <h3 className="mt-2 text-lg font-semibold leading-6 text-slate-950 dark:text-slate-50">
                Recommended for {normalized.recommended_role}
              </h3>
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Confidence: <span className={tone.text}>{confidenceLabel}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="ATS Score" value={formatPercent(normalized.ats_score)} />
        <Metric label="Match Score" value={normalized.match_score === null ? "Pending" : formatPercent(normalized.match_score)} muted={normalized.match_score === null} />
        <Metric label="Projects" value={normalized.projects_count} />
        <Metric label="Certifications" value={normalized.certifications_count} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListBlock title="Why this candidate" items={normalized.reasons} icon={CheckCircle2} tone="success" />
        <ListBlock title="Possible concerns" items={normalized.risks} icon={AlertTriangle} tone="warning" />
      </div>
    </section>
  )
}

function Metric({ label, value, muted = false }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/70">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${muted ? "text-slate-400 dark:text-slate-500" : "text-slate-950 dark:text-slate-50"}`}>
        {value}
      </p>
    </div>
  )
}

function ListBlock({ title, items, icon: Icon, tone }) {
  const color = tone === "success" ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"
  const dot = tone === "success" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-amber-500 dark:bg-amber-400"

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
        <Icon size={16} className={color} /> {title}
      </h3>
      <ul className="mt-3 space-y-2">
        {(items.length ? items : ["None"]).map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function normalizeVerdict(verdict) {
  const label = verdict.verdict || verdict.label || "Needs Review"
  const projectsCount = Number(verdict.projects_count ?? verdict.project_count ?? 0)
  let reasons = verdict.reasons || []
  let risks = verdict.risks || []

  if (projectsCount > 0) {
    risks = risks.filter((risk) => !/project (experience|count)/i.test(risk))
    if (!reasons.some((reason) => /project experience/i.test(reason))) {
      reasons = [...reasons, "Relevant project experience detected"]
    }
  }

  return {
    verdict: label,
    confidence_score: Math.max(0, Math.min(100, Math.round(Number(verdict.confidence_score ?? verdict.confidence ?? 0)))),
    reasons,
    risks,
    recommendation_note: verdict.recommendation_note || "Review this candidate against the open role.",
    recommended_role: verdict.recommended_role || "Software Developer Intern",
    ats_score: Number(verdict.ats_score ?? 0),
    match_score: verdict.match_score ?? verdict.job_match_score ?? null,
    projects_count: projectsCount,
    certifications_count: Number(verdict.certifications_count ?? 0),
  }
}

function getConfidenceLabel(score) {
  if (score >= 80) return "High"
  if (score >= 60) return "Medium"
  return "Low"
}

function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`
}

function getTone(verdict) {
  if (verdict === "Strong Hire") {
    return {
      badge: "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-950",
      bar: "bg-emerald-500 dark:bg-emerald-400",
      icon: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
      text: "text-emerald-700 dark:text-emerald-300",
    }
  }
  if (verdict === "Consider") {
    return {
      badge: "bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-950",
      bar: "bg-amber-500 dark:bg-amber-400",
      icon: "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
      text: "text-amber-700 dark:text-amber-300",
    }
  }
  return {
    badge: "bg-red-500 text-white dark:bg-red-400 dark:text-slate-950",
    bar: "bg-red-500 dark:bg-red-400",
    icon: "bg-red-50 text-red-700 ring-1 ring-red-100 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20",
    text: "text-red-700 dark:text-red-300",
  }
}

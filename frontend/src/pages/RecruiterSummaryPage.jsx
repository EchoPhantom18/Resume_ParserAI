import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Download, FileText, Sparkles, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import HiringVerdictCard from "../components/HiringVerdictCard.jsx"
import SkillBadge from "../components/SkillBadge.jsx"
import { downloadCandidateJson, getCandidate, getRecruiterSummary } from "../services/api.js"

export default function RecruiterSummaryPage() {
  const { id } = useParams()
  const [candidate, setCandidate] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadSummary() {
      try {
        setLoading(true)
        setError("")
        const summaryData = await getRecruiterSummary(id)
        const candidateData = await getCandidate(id)
        setCandidate(candidateData)
        setSummary(summaryData.summary)
      } catch (requestError) {
        setError(
          requestError.message === "candidate-not-found"
            ? "Candidate not found. Please go back to dashboard."
            : "Unable to load recruiter summary.",
        )
      } finally {
        setLoading(false)
      }
    }

    loadSummary()
  }, [id])

  async function handleDownloadJson() {
    try {
      setError("")
      await downloadCandidateJson(candidate.id)
    } catch {
      setError("Unable to download candidate JSON.")
    }
  }

  if (loading) {
    return (
      <main className="page">
        <div className="flex min-h-72 items-center justify-center">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 dark:border-slate-800 dark:border-t-emerald-400" />
        </div>
      </main>
    )
  }

  if (error || !candidate || !summary) {
    return (
      <main className="page">
        <div className="card p-5">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">
            {error || "Unable to load recruiter summary."}
          </p>
          <Link to="/dashboard" className="btn-secondary mt-4">
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page space-y-5">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-heading">Recruiter Summary</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Rule-based hiring notes generated from parsed resume signals.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={`/candidate/${candidate.id}`} className="btn-secondary">View profile</Link>
          <Link to={`/candidate/${candidate.id}/report`} className="btn-secondary">
            <FileText size={17} /> Generate Report
          </Link>
          <button type="button" onClick={handleDownloadJson} className="btn-primary">
            <Download size={17} /> Download JSON
          </button>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
              <UserRound size={22} />
            </span>
            <div className="min-w-0">
              <p className="section-title">Candidate profile</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{candidate.name}</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{candidate.email || "Email not found"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(candidate.skills || []).slice(0, 6).map((skill) => (
                  <SkillBadge key={skill}>{skill}</SkillBadge>
                ))}
              </div>
            </div>
          </div>
          <RecommendationBadge recommendation={summary.hiring_recommendation} />
        </div>
      </section>

      <HiringVerdictCard candidateId={candidate.id} verdict={summary.hiring_verdict} />

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <Sparkles size={17} /> Headline
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
          {summary.headline}
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-700 dark:text-slate-300">
          {summary.short_summary}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <InsightCard
          icon={CheckCircle2}
          title="Strengths"
          items={summary.strengths || []}
          tone="success"
        />
        <InsightCard
          icon={AlertTriangle}
          title="Concerns"
          items={summary.concerns || []}
          tone="warning"
        />
      </section>

      <section className="card p-5">
        <div className="flex items-center gap-2">
          <BriefcaseBusiness size={18} className="text-emerald-600 dark:text-emerald-300" />
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Recommended roles</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(summary.recommended_roles || []).map((role) => (
            <span
              key={role}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
            >
              {role}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}

function RecommendationBadge({ recommendation }) {
  const tone = recommendation === "Strong Hire"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
    : recommendation === "Consider"
      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300"
      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"

  return (
    <span className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-semibold ${tone}`}>
      {recommendation}
    </span>
  )
}

function InsightCard({ icon: Icon, title, items, tone }) {
  const iconTone = tone === "success"
    ? "text-emerald-600 dark:text-emerald-300"
    : "text-amber-600 dark:text-amber-300"

  return (
    <article className="card p-5">
      <div className="flex items-center gap-2">
        <Icon size={18} className={iconTone} />
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
      </div>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${tone === "success" ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

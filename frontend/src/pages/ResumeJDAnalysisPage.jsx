import { ArrowLeft, CheckCircle2, SearchCheck, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import SkillBadge from "../components/SkillBadge.jsx"
import { analyzeResumeJD, getCandidate } from "../services/api.js"

const filters = [
  { key: "all", label: "All" },
  { key: "matched", label: "Matched" },
  { key: "missing", label: "Missing" },
  { key: "required", label: "Required only" },
]

export default function ResumeJDAnalysisPage() {
  const { id } = useParams()
  const [candidate, setCandidate] = useState(null)
  const [jobDescription, setJobDescription] = useState("")
  const [analysis, setAnalysis] = useState(null)
  const [activeFilter, setActiveFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadCandidate() {
      try {
        setLoading(true)
        setError("")
        const data = await getCandidate(id)
        setCandidate(data)
        setJobDescription(data.job_description || "")
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadCandidate()
  }, [id])

  async function handleAnalyze() {
    if (!jobDescription.trim()) {
      setError("Job description is required for JD analysis.")
      return
    }

    try {
      setError("")
      setAnalyzing(true)
      const result = await analyzeResumeJD(id, jobDescription)
      setAnalysis(result.analysis)
      setActiveFilter("all")
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const filteredRequirements = useMemo(() => {
    const requirements = analysis?.required_skills || []
    if (activeFilter === "matched") return requirements.filter((item) => item.status === "matched")
    if (activeFilter === "missing") return requirements.filter((item) => item.status === "missing")
    if (activeFilter === "required") return requirements.filter((item) => item.jd_importance === "required")
    return requirements
  }, [activeFilter, analysis])

  if (loading) {
    return (
      <main className="page">
        <div className="flex min-h-72 items-center justify-center">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 dark:border-slate-800 dark:border-t-emerald-400" />
        </div>
      </main>
    )
  }

  if (!candidate) {
    return (
      <main className="page">
        <div className="card p-5 text-sm text-red-700 dark:text-red-300">
          {error || "Candidate not found. Please go back to dashboard."}
        </div>
      </main>
    )
  }

  return (
    <main className="page space-y-5">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-heading">Resume vs JD Analysis</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Compare job requirements with candidate resume evidence.
          </p>
        </div>
        <Link to={`/candidate/${candidate.id}`} className="btn-secondary">
          <ArrowLeft size={17} /> Back to Profile
        </Link>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="card p-5">
          <p className="section-title">Candidate</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">{candidate.name}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{candidate.email || "Email not found"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(candidate.skills || []).slice(0, 8).map((skill) => (
              <SkillBadge key={skill} tone="neutral">{skill}</SkillBadge>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Job Description</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Paste the JD to map requirements against resume evidence.
              </p>
            </div>
            <button type="button" onClick={handleAnalyze} disabled={analyzing} className="btn-primary shrink-0">
              <SearchCheck size={17} className={analyzing ? "animate-pulse" : ""} />
              {analyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="input mt-4 min-h-44 resize-y leading-6"
            placeholder="Paste the full job description here..."
          />
        </div>
      </section>

      {analysis && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <SummaryCard label="Overall Match" value={`${analysis.overall_match_score}%`} tone="success" />
            <SummaryCard label="Matched Skills" value={analysis.matched_skills?.length || 0} tone="success" />
            <SummaryCard label="Missing Skills" value={analysis.missing_skills?.length || 0} tone="warning" />
          </section>

          <section className="card p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Requirement Evidence Map</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  JD skills compared against parsed skills, project tech stack, and resume text.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => setActiveFilter(filter.key)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      activeFilter === filter.key
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
                        : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-emerald-400/30 dark:hover:text-emerald-300"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
              <table className="w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">JD Requirement</th>
                    <th className="px-4 py-3">Resume Evidence</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Importance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filteredRequirements.map((item) => (
                    <RequirementRow key={`${item.skill}-${item.status}`} item={item} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 space-y-3 md:hidden">
              {filteredRequirements.map((item) => (
                <RequirementCard key={`${item.skill}-${item.status}`} item={item} />
              ))}
            </div>

            {!filteredRequirements.length && (
              <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                No requirements match this filter.
              </p>
            )}
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <InsightCard title="Candidate Strengths" items={analysis.strengths || []} tone="success" />
            <InsightCard title="Skill Gaps" items={analysis.gaps || []} tone="warning" />
            <div className="card p-5">
              <p className="section-title">Final Recommendation</p>
              <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {analysis.recommendation}
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function SummaryCard({ label, value, tone }) {
  const color = tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function RequirementRow({ item }) {
  const rowClass = item.status === "matched"
    ? "border-l-4 border-l-emerald-400"
    : "border-l-4 border-l-amber-400"

  return (
    <tr className={rowClass}>
      <td className="px-4 py-4 font-semibold text-slate-900 dark:text-slate-100">{item.skill}</td>
      <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.resume_evidence}</td>
      <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
      <td className="px-4 py-4"><ImportanceBadge importance={item.jd_importance} /></td>
    </tr>
  )
}

function RequirementCard({ item }) {
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
      item.status === "matched"
        ? "border-emerald-200 dark:border-emerald-400/20"
        : "border-amber-200 dark:border-amber-400/20"
    }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-slate-950 dark:text-slate-50">{item.skill}</h3>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.resume_evidence}</p>
      <div className="mt-3">
        <ImportanceBadge importance={item.jd_importance} />
      </div>
    </article>
  )
}

function StatusBadge({ status }) {
  const matched = status === "matched"
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
      matched
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
    }`}
    >
      {matched ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {matched ? "Matched" : "Missing"}
    </span>
  )
}

function ImportanceBadge({ importance }) {
  const required = importance === "required"
  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
      required
        ? "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300"
    }`}
    >
      {required ? "Required" : "Preferred"}
    </span>
  )
}

function InsightCard({ title, items, tone }) {
  const dotClass = tone === "warning" ? "bg-amber-500" : "bg-emerald-500"
  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

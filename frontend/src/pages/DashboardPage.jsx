import { Search, UploadCloud, UsersRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import CandidateCard from "../components/CandidateCard.jsx"
import { getCandidates } from "../services/api.js"

const scoreFilters = [
  { value: "all", label: "All scores" },
  { value: "ats-80", label: "ATS 80+" },
  { value: "match-70", label: "Match 70+" },
  { value: "needs-review", label: "Needs review" },
]

export default function DashboardPage() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [scoreFilter, setScoreFilter] = useState("all")

  useEffect(() => {
    async function loadCandidates() {
      try {
        setLoading(true)
        setCandidates(await getCandidates())
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [])

  const filteredCandidates = useMemo(() => {
    const value = query.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const searchable = [
        candidate.name,
        candidate.email,
        candidate.phone,
        ...(candidate.skills || []),
      ]
        .join(" ")
        .toLowerCase()
      return (!value || searchable.includes(value)) && filterByScore(candidate, scoreFilter)
    })
  }, [candidates, query, scoreFilter])

  const averageAts = candidates.length
    ? Math.round(candidates.reduce((total, candidate) => total + Number(candidate.ats_score || 0), 0) / candidates.length)
    : 0
  const candidatesWithMatch = candidates.filter(
    (candidate) => candidate.match_score !== null
      && candidate.match_score !== undefined
      && candidate.job_skills?.length
      && Number(candidate.match_score) > 0,
  )
  const bestMatch = candidatesWithMatch.length
    ? `${Math.max(...candidatesWithMatch.map((candidate) => Math.round(candidate.match_score)))}%`
    : "Pending"

  if (loading) {
    return (
      <main className="page">
        <div className="flex min-h-72 items-center justify-center">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 dark:border-slate-800 dark:border-t-emerald-400" />
        </div>
      </main>
    )
  }

  return (
    <main className="page space-y-5">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="page-heading">Candidates</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Review parsed resumes and shortlist faster.</p>
        </div>
        <Link to="/upload" className="btn-primary">
          <UploadCloud size={17} /> Upload resume
        </Link>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        <Metric label="Saved candidates" value={candidates.length} />
        <Metric label="Average ATS" value={`${averageAts}%`} />
        <Metric label="Best match" value={bestMatch} />
      </section>

      <section className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
            <Search size={18} className="text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Search by name, email, or skill..."
            />
          </label>
          <select
            value={scoreFilter}
            onChange={(event) => setScoreFilter(event.target.value)}
            className="input py-2.5"
            aria-label="Filter candidates by score"
          >
            {scoreFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {filteredCandidates.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCandidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </section>
      ) : (
        <section className="card flex min-h-56 flex-col items-center justify-center p-6 text-center">
          <UsersRound size={36} className="text-emerald-600 dark:text-emerald-300" />
          <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-slate-50">No candidates found</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
            Adjust your search or upload a resume to add a candidate.
          </p>
          <Link to="/upload" className="btn-primary mt-4">
            Upload resume
          </Link>
        </section>
      )}
    </main>
  )
}

function filterByScore(candidate, filter) {
  const ats = Number(candidate.ats_score || 0)
  const match = Number(candidate.match_score || 0)

  if (filter === "ats-80") return ats >= 80
  if (filter === "match-70") return match >= 70
  if (filter === "needs-review") return ats < 60 || (candidate.match_score !== null && candidate.match_score !== undefined && match < 50)
  return true
}

function Metric({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{value}</p>
    </div>
  )
}

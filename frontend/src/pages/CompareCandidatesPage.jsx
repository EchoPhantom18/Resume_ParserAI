import { ArrowRightLeft, Crown, SearchCheck } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import SkillBadge from "../components/SkillBadge.jsx"
import { compareCandidates, getCandidates } from "../services/api.js"

export default function CompareCandidatesPage() {
  const [candidates, setCandidates] = useState([])
  const [candidate1Id, setCandidate1Id] = useState("")
  const [candidate2Id, setCandidate2Id] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadCandidates() {
      try {
        setLoading(true)
        const data = await getCandidates()
        setCandidates(data)
        setCandidate1Id(data[0]?.id ? String(data[0].id) : "")
        setCandidate2Id(data[1]?.id ? String(data[1].id) : "")
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadCandidates()
  }, [])

  const selectedCandidates = useMemo(() => {
    const first = candidates.find((candidate) => String(candidate.id) === String(candidate1Id))
    const second = candidates.find((candidate) => String(candidate.id) === String(candidate2Id))
    return { first, second }
  }, [candidate1Id, candidate2Id, candidates])

  async function handleCompare(event) {
    event.preventDefault()
    if (!candidate1Id || !candidate2Id) {
      setError("Select two candidates to compare.")
      return
    }
    if (String(candidate1Id) === String(candidate2Id)) {
      setError("Select two different candidates.")
      return
    }

    try {
      setError("")
      setComparing(true)
      setResult(await compareCandidates(candidate1Id, candidate2Id, jobDescription))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setComparing(false)
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

  return (
    <main className="page space-y-5">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-heading">Compare Candidates</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Compare two parsed resumes and identify the stronger fit.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
          <ArrowRightLeft size={14} /> Weighted hiring signal
        </span>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleCompare} className="card p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <CandidateSelect
            label="Candidate 1"
            value={candidate1Id}
            candidates={candidates}
            onChange={setCandidate1Id}
          />
          <CandidateSelect
            label="Candidate 2"
            value={candidate2Id}
            candidates={candidates}
            onChange={setCandidate2Id}
          />
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Optional job description</span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="input mt-2 min-h-32 resize-y leading-6"
            placeholder="Paste a JD to compare job-match compatibility..."
          />
          <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">
            Without a JD, comparison uses ATS score, skill count, projects, and certifications.
          </span>
        </label>

        <button type="submit" disabled={comparing || candidates.length < 2} className="btn-primary mt-4 w-full sm:w-auto">
          {comparing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-slate-950/30 dark:border-t-slate-950" />
          ) : (
            <SearchCheck size={17} />
          )}
          {comparing ? "Comparing..." : "Compare candidates"}
        </button>
      </form>

      {candidates.length < 2 && (
        <section className="card p-5 text-sm text-slate-600 dark:text-slate-400">
          Upload at least two resumes before using candidate comparison.
        </section>
      )}

      {result && (
        <ComparisonResult result={result} selectedCandidates={selectedCandidates} />
      )}
    </main>
  )
}

function CandidateSelect({ label, value, candidates, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="input mt-2"
      >
        <option value="">Select candidate</option>
        {candidates.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name} - {candidate.email || "No email"}
          </option>
        ))}
      </select>
    </label>
  )
}

function ComparisonResult({ result }) {
  const { candidate_1: candidate1, candidate_2: candidate2, comparison } = result
  const sharedSkills = comparison.matched_skills?.shared || []
  const candidate1Unique = comparison.matched_skills?.candidate_1_unique || []
  const candidate2Unique = comparison.matched_skills?.candidate_2_unique || []

  return (
    <section className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <MiniCandidateCard candidate={candidate1} label="Candidate 1" weightedScore={comparison.weighted_score?.candidate_1} />
        <MiniCandidateCard candidate={candidate2} label="Candidate 2" weightedScore={comparison.weighted_score?.candidate_2} />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Score comparison</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">Metric</th>
                <th className="px-5 py-3">{candidate1.name}</th>
                <th className="px-5 py-3">{candidate2.name}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <ScoreRow label="ATS score" first={`${round(comparison.ats_score?.candidate_1)}%`} second={`${round(comparison.ats_score?.candidate_2)}%`} />
              <ScoreRow label="Job match score" first={formatScore(comparison.job_match_score?.candidate_1)} second={formatScore(comparison.job_match_score?.candidate_2)} />
              <ScoreRow label="Detected skills" first={comparison.skills_count?.candidate_1} second={comparison.skills_count?.candidate_2} />
              <ScoreRow label="Projects" first={comparison.projects_count?.candidate_1} second={comparison.projects_count?.candidate_2} />
              <ScoreRow label="Certifications" first={comparison.certifications_count?.candidate_1} second={comparison.certifications_count?.candidate_2} />
              <ScoreRow label="Weighted score" first={round(comparison.weighted_score?.candidate_1)} second={round(comparison.weighted_score?.candidate_2)} highlight />
            </tbody>
          </table>
        </div>
        {comparison.job_match_score?.message && (
          <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {comparison.job_match_score.message}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SkillPanel title={`Shared skills (${sharedSkills.length})`} skills={sharedSkills} tone="success" />
        <SkillPanel title={`${candidate1.name} unique (${candidate1Unique.length})`} skills={candidate1Unique} />
        <SkillPanel title={`${candidate2.name} unique (${candidate2Unique.length})`} skills={candidate2Unique} />
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-400/20 dark:bg-emerald-400/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              <Crown size={17} /> Recommended stronger fit
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {comparison.winner}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700 dark:text-slate-300">
              {comparison.reason}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniCandidateCard({ candidate, label, weightedScore }) {
  return (
    <article className="card p-5">
      <p className="section-title">{label}</p>
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-slate-950 dark:text-slate-50">{candidate.name}</h2>
          <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{candidate.email || "Email not found"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs text-slate-500 dark:text-slate-400">Weighted</p>
          <p className="text-lg font-semibold text-slate-950 dark:text-slate-50">{round(weightedScore)}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(candidate.skills || []).slice(0, 5).map((skill) => (
          <SkillBadge key={skill}>{skill}</SkillBadge>
        ))}
      </div>
    </article>
  )
}

function ScoreRow({ label, first, second, highlight = false }) {
  return (
    <tr className={highlight ? "bg-emerald-50/50 dark:bg-emerald-400/5" : ""}>
      <td className="px-5 py-3 font-medium text-slate-700 dark:text-slate-300">{label}</td>
      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{first ?? "Pending"}</td>
      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{second ?? "Pending"}</td>
    </tr>
  )
}

function SkillPanel({ title, skills, tone = "neutral" }) {
  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length ? (
          skills.map((skill) => <SkillBadge key={skill} tone={tone}>{skill}</SkillBadge>)
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No skills in this group.</p>
        )}
      </div>
    </div>
  )
}

function formatScore(score) {
  return score === null || score === undefined ? "Pending" : `${round(score)}%`
}

function round(value) {
  return Math.round(Number(value || 0))
}

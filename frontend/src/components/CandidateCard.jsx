import { ArrowRight, FileText, Mail, SearchCheck, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"
import SkillBadge from "./SkillBadge.jsx"

export default function CandidateCard({ candidate }) {
  const topSkills = candidate.skills?.slice(0, 4) || []
  const hasMatchScore = candidate.match_score !== null
    && candidate.match_score !== undefined
    && candidate.job_skills?.length
    && Number(candidate.match_score) > 0

  return (
    <article className="card p-4 transition hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg dark:hover:border-emerald-400/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-950 dark:text-slate-50">{candidate.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-500 dark:text-slate-400">
            <Mail size={14} /> {candidate.email || "Email not found"}
          </p>
        </div>
        <Link
          to={`/candidate/${candidate.id}`}
          className="shrink-0 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:text-slate-300 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
        >
          View Details
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {topSkills.length ? (
          topSkills.map((skill) => (
            <SkillBadge key={skill} tone="neutral">
              {skill}
            </SkillBadge>
          ))
        ) : (
          <span className="text-sm text-slate-500 dark:text-slate-400">No skills detected</span>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Metric label="ATS Score" value={`${Math.round(candidate.ats_score || 0)}%`} />
        <Metric label="Match Score" value={hasMatchScore ? `${Math.round(candidate.match_score)}%` : "Pending"} muted={!hasMatchScore} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link to={`/candidate/${candidate.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
          Open profile <ArrowRight size={15} />
        </Link>
        <Link to={`/candidate/${candidate.id}/summary`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100">
          Summary <Sparkles size={15} />
        </Link>
        <Link to={`/candidate/${candidate.id}/report`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100">
          Report <FileText size={15} />
        </Link>
        <Link to={`/candidate/${candidate.id}/jd-analysis`} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100">
          JD Analysis <SearchCheck size={15} />
        </Link>
      </div>
    </article>
  )
}

function Metric({ label, value, muted = false }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${muted ? "text-slate-400 dark:text-slate-500" : "text-slate-950 dark:text-slate-50"}`}>{value}</p>
    </div>
  )
}

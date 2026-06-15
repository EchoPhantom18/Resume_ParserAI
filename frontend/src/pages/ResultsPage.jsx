import { AlertCircle, Download, FileText, Mail, Phone, SearchCheck, Sparkles, UserRound } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import CertificationCards from "../components/CertificationCards.jsx"
import EducationTable from "../components/EducationTable.jsx"
import HiringVerdictCard from "../components/HiringVerdictCard.jsx"
import ProjectCards, { getNormalizedProjectCount } from "../components/ProjectCards.jsx"
import SkillBadge from "../components/SkillBadge.jsx"
import { downloadCandidateJson, getCandidate } from "../services/api.js"

const NO_JD_MESSAGE = "Add a Job Description to calculate match score."

const tabs = [
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certifications" },
  { key: "raw_text", label: "Raw Text Preview" },
]

export default function ResultsPage() {
  const { id } = useParams()
  const location = useLocation()
  const [candidate, setCandidate] = useState(location.state?.candidate || null)
  const [activeTab, setActiveTab] = useState("education")
  const [loading, setLoading] = useState(!location.state?.candidate)
  const [error, setError] = useState("")

  useEffect(() => {
    if (candidate) return

    async function loadCandidate() {
      try {
        setLoading(true)
        setCandidate(await getCandidate(id))
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadCandidate()
  }, [candidate, id])

  async function handleDownloadJson() {
    try {
      setError("")
      await downloadCandidateJson(candidate.id)
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const matchState = useMemo(() => {
    if (!candidate) return { hasRecognizedSkills: false, hasPositiveScore: false, message: NO_JD_MESSAGE }

    const hasJd = Boolean(candidate.job_description?.trim())
    const hasRecognizedSkills = Boolean(hasJd && candidate.job_skills?.length && candidate.match_score !== null && candidate.match_score !== undefined)
    const hasPositiveScore = Boolean(hasRecognizedSkills && Number(candidate.match_score) > 0)
    const message = !hasJd
      ? NO_JD_MESSAGE
      : !candidate.job_skills?.length
        ? candidate.match_message || "No recognizable skills found in Job Description."
        : !hasPositiveScore
          ? "No overlapping skills found between this resume and the Job Description."
          : ""

    return { hasRecognizedSkills, hasPositiveScore, message }
  }, [candidate])

  if (loading) return <LoadingMessage text="Loading parsed results..." />

  if (!candidate) {
    return (
      <main className="page">
        <div className="card p-5 text-sm text-red-700 dark:text-red-300">{error || "Candidate result not found."}</div>
      </main>
    )
  }

  return (
    <main className="page space-y-5">
      <section className="card mx-auto w-full max-w-6xl p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
              <UserRound size={22} />
            </span>
            <div className="min-w-0">
              <p className="section-title">Candidate profile</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{candidate.name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={15} /> {candidate.email || "Email not found"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={15} /> {candidate.phone || "Phone not found"}
                </span>
                <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                  <FileText size={15} className="shrink-0" />
                  <span className="truncate">{candidate.file_name}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Link to={`/candidate/${candidate.id}/summary`} className="btn-secondary w-full shrink-0 sm:w-auto">
              <Sparkles size={17} /> Recruiter Summary
            </Link>
            <Link to={`/candidate/${candidate.id}/report`} className="btn-secondary w-full shrink-0 sm:w-auto">
              <FileText size={17} /> View Recruiter Report
            </Link>
            <Link to={`/candidate/${candidate.id}/jd-analysis`} className="btn-secondary w-full shrink-0 sm:w-auto">
              <SearchCheck size={17} /> Resume vs JD Analysis
            </Link>
            <button type="button" onClick={handleDownloadJson} className="btn-primary w-full shrink-0 sm:w-auto">
              <Download size={17} /> Download JSON
            </button>
          </div>
        </div>
      </section>

      <HiringVerdictCard candidateId={candidate.id} />

      <section className="grid gap-4 md:grid-cols-2">
        <ScoreCard title="ATS Score" label="Resume quality" score={candidate.ats_score} />
        <ScoreCard
          title="Job Match Score"
          label="JD compatibility"
          score={matchState.hasPositiveScore ? candidate.match_score : null}
          message={matchState.message || "Calculated from recognized JD skills."}
        />
      </section>

      <section className="card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Match Analysis</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Matched and missing skills from the job description.
            </p>
          </div>
          {matchState.hasRecognizedSkills && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              {candidate.job_skills.length} JD skills found
            </span>
          )}
        </div>

        {!matchState.hasRecognizedSkills ? (
          <Notice message={matchState.message} />
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SkillGroup title={`Matched Skills (${candidate.matched_skills.length})`} skills={candidate.matched_skills} tone="success" emptyText="No matched skills found." />
            <SkillGroup title={`Missing Skills (${candidate.missing_skills.length})`} skills={candidate.missing_skills} tone="warning" emptyText="No missing skills found." />
          </div>
        )}
      </section>

      <section className="card p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Detected Skills ({candidate.skills?.length || 0})</h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">Extracted from resume text</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {candidate.skills?.length ? (
            candidate.skills.map((skill) => <SkillBadge key={skill}>{skill}</SkillBadge>)
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No skills detected.</p>
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-slate-50">Parsed Information</h2>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                "whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition",
                activeTab === tab.key
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              ].join(" ")}
            >
              {tab.key === "projects" ? `Projects (${getNormalizedProjectCount(candidate.projects || [])})` : tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          <TabContent candidate={candidate} activeTab={activeTab} />
        </div>
      </section>
    </main>
  )
}

function ScoreCard({ title, label, score, message }) {
  const hasScore = score !== null && score !== undefined
  const safeScore = hasScore ? Math.max(0, Math.min(100, Math.round(Number(score) || 0))) : null

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
        <div className="text-right">
          {hasScore ? (
            <p className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{safeScore}%</p>
          ) : (
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending</p>
          )}
        </div>
      </div>
      {hasScore ? (
        <ProgressBar value={safeScore} className="mt-4" />
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">{message}</p>
      )}
    </article>
  )
}

function SkillGroup({ title, skills, tone, emptyText }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length ? (
          skills.map((skill) => <SkillBadge key={skill} tone={tone}>{skill}</SkillBadge>)
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
        )}
      </div>
    </div>
  )
}

function Notice({ message }) {
  return (
    <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function ProgressBar({ value, className = "" }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}>
      <div className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400" style={{ width: `${safeValue}%` }} />
    </div>
  )
}

function TabContent({ candidate, activeTab }) {
  if (activeTab === "raw_text") {
    return (
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
        {candidate.raw_text || "No raw text found."}
      </pre>
    )
  }

  if (activeTab === "projects") {
    return <ProjectCards projects={candidate.projects || []} />
  }

  if (activeTab === "education") {
    return <EducationTable education={candidate.education || []} />
  }

  if (activeTab === "certifications") {
    return <CertificationCards certifications={candidate.certifications || []} />
  }

  const items = candidate[activeTab] || []
  if (!items.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        Not found in the resume.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${activeTab}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          {item}
        </li>
      ))}
    </ul>
  )
}

function LoadingMessage({ text }) {
  return (
    <main className="page">
      <div className="flex min-h-80 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600 dark:text-slate-400">
          <span className="h-9 w-9 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600 dark:border-slate-800 dark:border-t-emerald-400" />
          <p className="text-sm font-medium">{text}</p>
        </div>
      </div>
    </main>
  )
}

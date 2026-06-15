import { AlertCircle, Download, FileText, Mail, Phone, RefreshCcw, SearchCheck, Sparkles, UserRound } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import CertificationCards from "../components/CertificationCards.jsx"
import EducationTable from "../components/EducationTable.jsx"
import HiringVerdictCard from "../components/HiringVerdictCard.jsx"
import ProjectCards, { getNormalizedProjectCount } from "../components/ProjectCards.jsx"
import SkillBadge from "../components/SkillBadge.jsx"
import { downloadCandidateJson, getCandidate, matchScore } from "../services/api.js"

const EMPTY_JOB_DESCRIPTION_WARNING = "Add a Job Description to calculate match score."

const tabs = [
  { key: "education", label: "Education" },
  { key: "experience", label: "Experience" },
  { key: "projects", label: "Projects" },
  { key: "certifications", label: "Certifications" },
  { key: "raw_text", label: "Raw Text Preview" },
]

export default function CandidateDetailPage() {
  const { id } = useParams()
  const [candidate, setCandidate] = useState(null)
  const [activeTab, setActiveTab] = useState("education")
  const [jobDescription, setJobDescription] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadCandidate() {
      try {
        setLoading(true)
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

  async function handleRescore() {
    if (!jobDescription.trim()) {
      setError(EMPTY_JOB_DESCRIPTION_WARNING)
      return
    }

    try {
      setError("")
      setSaving(true)
      const result = await matchScore(id, jobDescription)
      setCandidate((current) => ({
        ...current,
        job_description: jobDescription,
        job_skills: result.job_skills,
        job_match_score: result.match_score || 0,
        match_score: result.match_score,
        matched_skills: result.matched_skills,
        missing_skills: result.missing_skills,
        match_message: result.message,
      }))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDownloadJson() {
    try {
      setError("")
      await downloadCandidateJson(candidate.id)
    } catch (requestError) {
      setError(requestError.message)
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

  if (!candidate) {
    return (
      <main className="page">
        <div className="card p-5 text-sm text-red-700 dark:text-red-300">{error || "Candidate not found."}</div>
      </main>
    )
  }

  const hasRecognizedJobSkills = candidate.match_score !== null && candidate.match_score !== undefined && candidate.job_skills?.length
  const hasPositiveMatchScore = hasRecognizedJobSkills && Number(candidate.match_score) > 0
  const matchMessage = !candidate.job_description?.trim()
    ? EMPTY_JOB_DESCRIPTION_WARNING
    : candidate.match_message || (hasRecognizedJobSkills && !hasPositiveMatchScore ? "No overlapping skills found between this resume and the Job Description." : "")

  return (
    <main className="page space-y-5">
      <section className="card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
              <UserRound size={22} />
            </span>
            <div>
              <p className="section-title">Candidate profile</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{candidate.name}</h1>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-400">
                {candidate.email && <span className="inline-flex items-center gap-1.5"><Mail size={15} />{candidate.email}</span>}
                {candidate.phone && <span className="inline-flex items-center gap-1.5"><Phone size={15} />{candidate.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link to={`/results/${candidate.id}`} className="btn-secondary">View results</Link>
            <Link to={`/candidate/${candidate.id}/summary`} className="btn-secondary">
              <Sparkles size={17} /> Recruiter Summary
            </Link>
            <Link to={`/candidate/${candidate.id}/report`} className="btn-secondary">
              <FileText size={17} /> View Recruiter Report
            </Link>
            <Link to={`/candidate/${candidate.id}/jd-analysis`} className="btn-secondary">
              <SearchCheck size={17} /> Resume vs JD Analysis
            </Link>
            <button type="button" onClick={handleDownloadJson} className="btn-primary">
              <Download size={17} /> Download JSON
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
          {error}
        </div>
      )}

      <HiringVerdictCard candidateId={candidate.id} />

      <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="grid grid-cols-2 gap-3">
              <ScoreMetric label="ATS Score" value={`${Math.round(candidate.ats_score || 0)}%`} />
              <ScoreMetric label="Match Score" value={hasPositiveMatchScore ? `${Math.round(candidate.match_score)}%` : "Pending"} muted={!hasPositiveMatchScore} />
            </div>
            {!hasPositiveMatchScore && (
              <div className="mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span>{matchMessage || "Add a Job Description to calculate match score."}</span>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Detected Skills ({candidate.skills?.length || 0})</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.skills?.length ? (
                candidate.skills.map((skill) => <SkillBadge key={skill}>{skill}</SkillBadge>)
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">No skills detected.</p>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Update Job Match</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paste a JD to rescore this candidate.</p>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              className="input mt-4 min-h-32 resize-y leading-6"
              placeholder="Paste a job description..."
            />
            <button type="button" onClick={handleRescore} disabled={saving} className="btn-primary mt-3 w-full">
              <RefreshCcw className={saving ? "animate-spin" : ""} size={17} />
              {saving ? "Scoring..." : "Update score"}
            </button>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Match Analysis</h2>
            {!hasRecognizedJobSkills ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                {matchMessage || EMPTY_JOB_DESCRIPTION_WARNING}
              </p>
            ) : (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <SkillBlock title={`Matched Skills (${candidate.matched_skills.length})`} skills={candidate.matched_skills} tone="success" />
                <SkillBlock title={`Missing Skills (${candidate.missing_skills.length})`} skills={candidate.missing_skills} tone="warning" />
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Parsed Information</h2>
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
          </div>
        </section>
      </section>
    </main>
  )
}

function ScoreMetric({ label, value, muted = false }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${muted ? "text-slate-400 dark:text-slate-500" : "text-slate-950 dark:text-slate-50"}`}>{value}</p>
    </div>
  )
}

function SkillBlock({ title, skills, tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/70">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {skills.length ? (
          skills.map((skill) => <SkillBadge key={skill} tone={tone}>{skill}</SkillBadge>)
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">None found.</p>
        )}
      </div>
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

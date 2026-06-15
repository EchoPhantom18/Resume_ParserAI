import { ArrowLeft, Download, Printer } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import CertificationCards from "../components/CertificationCards.jsx"
import EducationTable from "../components/EducationTable.jsx"
import HiringVerdictCard from "../components/HiringVerdictCard.jsx"
import ProjectCards, { getNormalizedProjectCount } from "../components/ProjectCards.jsx"
import SkillBadge from "../components/SkillBadge.jsx"
import { downloadRecruiterReport, getRecruiterReport } from "../services/api.js"

export default function RecruiterReportPage() {
  const { id } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadReport() {
      try {
        setLoading(true)
        setError("")
        setReport(await getRecruiterReport(id))
      } catch (requestError) {
        setError(requestError.message)
      } finally {
        setLoading(false)
      }
    }

    loadReport()
  }, [id])

  async function handleDownloadReport() {
    try {
      setError("")
      await downloadRecruiterReport(id)
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

  if (error || !report) {
    return (
      <main className="page">
        <div className="card p-5 text-sm text-red-700 dark:text-red-300">
          {error || "Unable to load recruiter report."}
        </div>
      </main>
    )
  }

  const profile = report.candidate_profile || {}

  return (
    <main className="page space-y-5 print-page">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="page-heading">Recruiter One-Click Report</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Clean hiring snapshot generated from parsed resume data.
          </p>
        </div>
        <div className="no-print flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => window.print()} className="btn-secondary">
            <Printer size={17} /> Print Report
          </button>
          <button type="button" onClick={handleDownloadReport} className="btn-primary">
            <Download size={17} /> Download Report
          </button>
          <Link to="/dashboard" className="btn-secondary">
            <ArrowLeft size={17} /> Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="card p-5">
        <p className="section-title">Candidate profile</p>
        <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_280px]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{profile.name}</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {profile.email || "Email not found"} {profile.phone ? `| ${profile.phone}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.top_skills || []).map((skill) => (
                <SkillBadge key={skill}>{skill}</SkillBadge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Score label="ATS Score" value={profile.ats_score} />
            <Score label="Job Match" value={profile.job_match_score} />
          </div>
        </div>
      </section>

      <HiringVerdictCard verdict={report.hiring_verdict} />

      <section className="card p-5">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Recruiter Summary</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
          {report.recruiter_summary?.short_summary}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <ListCard title="Strengths" items={report.strengths || []} />
        <ListCard title="Concerns" items={report.concerns || []} warning />
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Recommended Roles</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(report.recommended_roles || []).map((role) => (
            <span key={role} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              {role}
            </span>
          ))}
        </div>
      </section>

      <ReportSection title={`Projects (${getNormalizedProjectCount(report.projects || [])})`}>
        <ProjectCards projects={report.projects || []} />
      </ReportSection>
      <ReportSection title="Education">
        <EducationTable education={report.education || []} />
      </ReportSection>
      <ReportSection title="Certifications">
        <CertificationCards certifications={report.certifications || []} />
      </ReportSection>
      <ListCard title="Experience" items={report.experience || []} />
    </main>
  )
}

function Score({ label, value }) {
  const safeValue = Math.round(Number(value || 0))
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{safeValue}%</p>
    </div>
  )
}

function ReportSection({ title, children }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
      {children}
    </section>
  )
}

function ListCard({ title, items, warning = false }) {
  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
      <ul className="mt-3 space-y-2">
        {(items.length ? items : ["Not found"]).map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
            <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${warning ? "bg-amber-500" : "bg-emerald-500"}`} />
            <span>{typeof item === "string" ? item : JSON.stringify(item)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

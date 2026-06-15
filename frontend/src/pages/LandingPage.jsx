import { ArrowRight, BriefcaseBusiness, Check, ChevronDown, ChevronUp, FileText, Gauge, SearchCheck, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"

const ANALYSIS_PREVIEW_COLLAPSED_KEY = "resume_jd_preview_collapsed"

const features = [
  {
    icon: FileText,
    title: "Resume Parsing",
    text: "Extract structured candidate data from resumes without manual screening.",
    tags: ["Name, email, phone", "Skills and sections", "PDF and DOCX"],
    details: [
      "Extracts name, email, phone, skills, education, experience, projects, and certifications.",
      "Supports PDF and DOCX uploads for a smoother recruiter workflow.",
      "Turns raw resume text into structured candidate profiles.",
    ],
  },
  {
    icon: Gauge,
    title: "ATS Scoring",
    text: "Measure resume quality and quickly spot incomplete candidate profiles.",
    tags: ["Completeness check", "Missing sections", "Quality score"],
    details: [
      "Checks resume completeness across key hiring sections.",
      "Detects missing sections like skills, education, projects, and experience.",
      "Gives a resume quality score so recruiters can quickly identify strong profiles.",
    ],
  },
  {
    icon: SearchCheck,
    title: "Job Matching",
    text: "Compare candidate skills against job requirements with clear match insights.",
    tags: ["Matched skills", "Missing skills", "Match percentage"],
    details: [
      "Compares resume skills with the provided job description.",
      "Shows matched skills, missing skills, and match percentage.",
      "Helps recruiters understand candidate fit before manual review.",
    ],
  },
]

const analysisRows = [
  { skill: "Python", resume: true, jd: true, status: "Match" },
  { skill: "Flask", resume: true, jd: true, status: "Match" },
  { skill: "Docker", resume: false, jd: true, status: "Missing" },
  { skill: "TensorFlow", resume: false, jd: true, status: "Missing" },
  { skill: "Git", resume: true, jd: true, status: "Match" },
]

export default function LandingPage() {
  const [activeCard, setActiveCard] = useState(null)
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(
    () => localStorage.getItem(ANALYSIS_PREVIEW_COLLAPSED_KEY) === "true",
  )
  const previewCandidateId = getPreviewCandidateId()
  const jdAnalysisPath = previewCandidateId ? `/candidate/${previewCandidateId}/jd-analysis` : "/dashboard"

  function togglePreview() {
    setIsPreviewCollapsed((current) => {
      const nextValue = !current
      localStorage.setItem(ANALYSIS_PREVIEW_COLLAPSED_KEY, String(nextValue))
      return nextValue
    })
  }

  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(20,184,166,0.14),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.10),transparent_28%)]" />
      <div className="page">
        <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 dark:text-slate-50 sm:text-5xl lg:text-6xl">
              Your AI Recruiting Assistant.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
              Automate resume screening, evaluate candidate fit, and identify top talent faster with AI-powered insights.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/upload" className="btn-primary">
                Upload Resume <ArrowRight size={18} />
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                View Dashboard
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-xl shadow-slate-200/60 backdrop-blur transition-all duration-300 hover:shadow-emerald-500/10 sm:p-6 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-black/30 dark:hover:shadow-emerald-950/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="break-words text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">
                  Resume vs JD Analysis
                </p>
                <p className="mt-1 break-words text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {isPreviewCollapsed
                    ? "Compare resumes with job descriptions instantly."
                    : "Instantly compare candidate qualifications against job requirements."}
                </p>
              </div>
              <button
                type="button"
                onClick={togglePreview}
                className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-300"
              >
                {isPreviewCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                {isPreviewCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>

            {!isPreviewCollapsed && (
              <>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <PreviewPill to="/upload" icon={FileText} label="Candidate Resume" />
                  <PreviewPill to={jdAnalysisPath} icon={BriefcaseBusiness} label="Job Description" />
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="hidden grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr] gap-2 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:grid">
                    <span>Skill</span>
                    <span>Resume</span>
                    <span>JD</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {analysisRows.map((row) => (
                      <div
                        key={row.skill}
                        className="grid grid-cols-1 gap-3 px-4 py-3 text-sm transition-colors hover:bg-white sm:grid-cols-[1.2fr_0.7fr_0.7fr_0.9fr] sm:items-center sm:gap-2 dark:hover:bg-slate-950"
                      >
                        <span className="min-w-0 break-words font-semibold text-slate-900 dark:text-slate-100">{row.skill}</span>
                        <LabeledPresence label="Resume" present={row.resume} />
                        <LabeledPresence label="JD" present={row.jd} />
                        <div className="flex items-center justify-between gap-2 sm:block">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:hidden dark:text-slate-400">Status</span>
                          <StatusBadge status={row.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Match Score</p>
                    <span className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">82%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="h-full w-[82%] rounded-full bg-emerald-500 transition-[width] duration-700 ease-out dark:bg-emerald-400" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SummaryMetric label="Matched Skills" value="3" tone="match" />
                    <SummaryMetric label="Missing Skills" value="2" tone="missing" />
                  </div>
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100">
                    Strong fit with a few skill gaps.
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon
              const isExpanded = activeCard === feature.title
              return (
                <button
                  type="button"
                  key={feature.title}
                  onClick={() => setActiveCard(isExpanded ? null : feature.title)}
                  aria-expanded={isExpanded}
                  className="card flex w-full min-w-0 flex-col items-start gap-4 self-start overflow-hidden break-words rounded-3xl border p-6 text-left shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-white sm:p-7 dark:hover:border-emerald-400/30 dark:hover:shadow-emerald-950/20 dark:focus:ring-emerald-400 dark:focus:ring-offset-slate-950"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
                    <Icon size={21} />
                  </span>

                  <h3 className="block text-xl font-bold leading-tight text-slate-950 dark:text-slate-50">{feature.title}</h3>
                  <p className="block max-w-full break-words text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-400">{feature.text}</p>

                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <span
                        key={tag}
                        className="max-w-full rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 sm:text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {isExpanded && (
                    <div className="overflow-hidden transition-all duration-300 ease-in-out">
                      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {feature.details.map((detail) => (
                          <li key={detail} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <span className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {isExpanded ? "Show less" : "Learn more"}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}

function PreviewPill({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/60 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-400/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      <ArrowRight size={15} className="shrink-0 text-slate-400 dark:text-slate-500" />
    </Link>
  )
}

function LabeledPresence({ label, present }) {
  return (
    <div className="flex items-center justify-between gap-2 sm:block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:hidden dark:text-slate-400">{label}</span>
      <PresenceIcon present={present} />
    </div>
  )
}

function PresenceIcon({ present }) {
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full border ${
      present
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
        : "border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300"
    }`}
    >
      {present ? <Check size={15} /> : <X size={15} />}
    </span>
  )
}

function StatusBadge({ status }) {
  const matched = status === "Match"
  return (
    <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${
      matched
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
    }`}
    >
      {status}
    </span>
  )
}

function SummaryMetric({ label, value, tone }) {
  const color = tone === "match"
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-amber-700 dark:text-amber-300"

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>{value}</p>
    </div>
  )
}

function getPreviewCandidateId() {
  const directId = localStorage.getItem("last_candidate_id")
    || localStorage.getItem("candidate_id")
    || localStorage.getItem("resume_parser_ai_last_candidate_id")

  if (directId) return directId

  try {
    const storedCandidate = JSON.parse(localStorage.getItem("last_candidate") || "null")
    return storedCandidate?.id || ""
  } catch {
    return ""
  }
}

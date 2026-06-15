import { ExternalLink, Github } from "lucide-react"
import SkillBadge from "./SkillBadge.jsx"

export default function ProjectCards({ projects = [] }) {
  const project_count = getNormalizedProjectCount(projects)
  console.log("Projects:", projects)
  console.log("Correct Project Count:", project_count)
  const normalizedProjects = normalizeProjects(projects)

  if (!normalizedProjects.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        Not found in the resume.
      </p>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {normalizedProjects.map((project, index) => (
        <ProjectCard key={`${project.title}-${index}`} project={project} />
      ))}
    </div>
  )
}

function ProjectCard({ project }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/80 dark:hover:border-emerald-400/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-6 text-slate-950 dark:text-slate-50">
            {project.title}
          </h3>
          {(project.duration || project.year) && (
            <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {project.duration || project.year}
            </span>
          )}
        </div>

        {(project.live_url || project.github_url) && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {project.live_url && (
              <a
                href={project.live_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:hover:bg-emerald-400/15"
              >
                <ExternalLink size={13} />
                Live Demo
              </a>
            )}
            {project.github_url && (
              <a
                href={project.github_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Github size={13} />
                GitHub
              </a>
            )}
          </div>
        )}
      </div>

      {project.tech_stack.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tech_stack.map((technology) => (
            <SkillBadge key={technology}>{technology}</SkillBadge>
          ))}
        </div>
      )}

      {project.description.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {project.description.map((line, index) => (
            <li key={`${project.title}-description-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="min-w-0 break-words">{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Project details detected, but no description bullets were found.
        </p>
      )}
    </article>
  )
}

export function getNormalizedProjectCount(projects = []) {
  if (!Array.isArray(projects)) return 0

  if (projects.every((project) => typeof project === "string")) {
    return projects.filter((line) => isCountableProjectTitle(String(line || "").trim())).length
  }

  return projects.filter((project) => isValidProjectObject(project)).length
}

function normalizeProjects(projects) {
  if (!Array.isArray(projects)) return []

  if (projects.every((project) => typeof project === "string")) {
    return normalizeStringProjects(projects)
  }

  return projects
    .filter(Boolean)
    .filter((project) => (typeof project === "string" ? isValidProjectTitle(project) : isValidProjectObject(project)))
    .map((project, index) => normalizeProjectObject(project, index))
}

function normalizeStringProjects(projects) {
  const lines = projects.map((line) => String(line || "").trim()).filter(Boolean)
  if (!lines.length) return []

  const grouped = []
  let current = null

  lines.forEach((line, index) => {
    const shouldStartProject = !current || (index > 0 && isProjectTitleLine(line) && hasProjectDetails(current))

    if (shouldStartProject) {
      if (current) grouped.push(current)
      current = createProject(line)
      return
    }

    addLineToProject(current, line)
  })

  if (current) grouped.push(current)
  return grouped.map((project, index) => normalizeProjectObject(project, index))
}

function normalizeProjectObject(project, index) {
  if (typeof project === "string") {
    return createProject(project || `Project ${index + 1}`)
  }

  const techStack = project.tech_stack || project.techStack || project.technologies || []
  const description = project.description || []

  return {
    title: project.title || `Project ${index + 1}`,
    year: project.year || "",
    duration: project.duration || "",
    live_url: project.live_url || project.liveUrl || "",
    github_url: project.github_url || project.githubUrl || "",
    tech_stack: Array.isArray(techStack) ? techStack : [techStack].filter(Boolean),
    description: Array.isArray(description) ? description : [description].filter(Boolean),
  }
}

function createProject(title) {
  return {
    title: cleanTitle(title),
    year: getYear(title),
    duration: "",
    live_url: "",
    github_url: "",
    tech_stack: [],
    description: [],
  }
}

function addLineToProject(project, line) {
  if (!project) return

  if (isYearOnly(line)) {
    project.year = project.year || line
    return
  }

  if (isDuration(line)) {
    project.duration = normalizeDuration(line)
    return
  }

  const url = getUrl(line)
  if (url) {
    if (/github\.com|github|git hub|repository|repo/i.test(line)) {
      project.github_url = url
    } else if (/live\s*:|demo\s*:|website\s*:|app\s*:/i.test(line) || !project.live_url) {
      project.live_url = url
    }
    return
  }

  if (line.includes("|")) {
    project.tech_stack = uniqueValues([...project.tech_stack, ...parseTechStack(line)])
    return
  }

  project.description = uniqueValues([...project.description, line])
}

function isProjectTitleLine(line) {
  if (isYearOnly(line) || isDuration(line) || getUrl(line) || line.includes("|") || startsWithActionVerb(line)) return false
  if (/^(live|demo|website|app|github|repo|repository)\s*:/i.test(line)) return false
  if (line.endsWith(".")) return false
  if (/[—–]/.test(line) || /\s-\s/.test(line) || /\s\?\s/.test(line)) return true
  if (line.includes(":")) return line.split(":", 1)[0].trim().split(/\s+/).length <= 8
  return looksTitleLike(line)
}

function isCountableProjectTitle(line) {
  if (!isValidProjectTitle(line)) return false
  return /[—–]/.test(line) || /\s-\s/.test(line) || /\s\?\s/.test(line)
}

function isValidProjectObject(project) {
  return Boolean(project && typeof project === "object" && isValidProjectTitle(String(project.title || "")))
}

function isValidProjectTitle(title) {
  const cleaned = title.trim()
  const lowered = cleaned.toLowerCase()
  if (!cleaned) return false
  if (lowered === "project" || lowered === "project details detected, but no description bullets were found.") return false
  if (/^(?:(?:19|20)\d{2}\s+)?\(?\s*(in development|under development|in progress|ongoing|current|working)\s*\)?(?:\s+(?:19|20)\d{2})?$/i.test(cleaned)) return false
  if (/^(live|demo|website|app|github|repo|repository|tech stack|technologies|technology|tools|stack)\s*:/i.test(cleaned)) return false
  if (getUrl(cleaned) || cleaned.includes("|") || isYearOnly(cleaned)) return false
  if (/^[•*\-]/.test(cleaned)) return false
  return true
}

function hasProjectDetails(project) {
  return Boolean(
    project.year
      || project.duration
      || project.live_url
      || project.github_url
      || project.tech_stack.length
      || project.description.length,
  )
}

function cleanTitle(value) {
  let title = String(value || "").replace(/\b(?:19|20)\d{2}\b/g, "").trim()
  while (title.endsWith("-") || title.endsWith(":") || title.endsWith("|")) {
    title = title.slice(0, -1).trim()
  }
  return title || "Project"
}

function parseTechStack(line) {
  return line
    .replace(/^(tech stack|technologies|technology|tools|stack|built with)\s*:/i, "")
    .split(/\s*(?:\||,|•|·| \/ )\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function startsWithActionVerb(line) {
  return /^(added|automated|built|collaborated|created|deployed|designed|developed|engineered|enhanced|implemented|improved|integrated|led|managed|optimized|reduced|tested|trained|used)\b/i.test(line)
}

function looksTitleLike(line) {
  const words = line.match(/[A-Za-z0-9][A-Za-z0-9+#./'-]*/g) || []
  if (!words.length || words.length > 10) return false
  const titleWords = words.filter((word) => /^[A-Z0-9]/.test(word) || word === word.toUpperCase())
  return titleWords.length >= Math.min(2, words.length)
}

function getUrl(line) {
  return line.match(/https?:\/\/[^\s)>\]]+/i)?.[0]?.replace(/[.,;]$/, "") || ""
}

function getYear(line) {
  return line.match(/\b(?:19|20)\d{2}\b/)?.[0] || ""
}

function isYearOnly(line) {
  return /^(?:19|20)\d{2}$/.test(line)
}

function isDuration(line) {
  return /^(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}\s*(?:-|–|—|\?|to)\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+)?(?:19|20)\d{2}$/i.test(line)
}

function normalizeDuration(line) {
  return line.replace(/\s*(?:\?|-|–|—|to)\s*/i, " – ").trim()
}

function uniqueValues(values) {
  const seen = new Set()
  return values.filter((value) => {
    const key = String(value).toLowerCase()
    if (!value || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

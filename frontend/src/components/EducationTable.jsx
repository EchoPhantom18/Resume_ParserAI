export default function EducationTable({ education = [] }) {
  const rows = normalizeEducation(education)

  if (!rows.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        Not found in the resume.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-white text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Board / University</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row, index) => (
              <tr key={`${row.level}-${index}`}>
                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{row.level}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.board_university}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.year}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 p-3 md:hidden">
        {rows.map((row, index) => (
          <article key={`${row.level}-mobile-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-semibold text-slate-950 dark:text-slate-50">{row.level}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{row.board_university}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {row.year && <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">{row.year}</span>}
              {row.result && <span className="rounded-full border border-slate-200 px-2 py-1 dark:border-slate-700">{row.result}</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function normalizeEducation(education) {
  if (!Array.isArray(education)) return []

  return education
    .map((item) => {
      if (item && typeof item === "object") {
        return {
          level: item.level || "",
          board_university: item.board_university || item.boardUniversity || "",
          year: item.year || "",
          result: item.result || "",
        }
      }

      return parseEducationString(String(item || ""))
    })
    .filter((row) => row.level || row.board_university || row.year || row.result)
}

function parseEducationString(value) {
  const levels = ["High School", "Intermediate", "Graduation", "Post Graduation", "Diploma"]
  const level = levels.find((candidate) => value.toLowerCase().startsWith(candidate.toLowerCase())) || ""
  if (!level) {
    return { level: value, board_university: "", year: "", result: "" }
  }

  const parts = value.slice(level.length).trim().split(/\s+/)
  if (parts.length < 3) {
    return { level, board_university: parts.join(" "), year: "", result: "" }
  }

  return {
    level,
    board_university: parts.slice(0, -2).join(" "),
    year: parts.at(-2) || "",
    result: parts.at(-1) || "",
  }
}

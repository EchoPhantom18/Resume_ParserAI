export default function CertificationCards({ certifications = [] }) {
  const items = normalizeCertifications(certifications)

  if (!items.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        Not found in the resume.
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item, index) => (
        <article key={`${item.name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-slate-50">{item.name}</h3>
          {item.date && (
            <p className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              {item.date}
            </p>
          )}
        </article>
      ))}
    </div>
  )
}

function normalizeCertifications(certifications) {
  if (!Array.isArray(certifications)) return []

  return certifications
    .map((item) => {
      if (item && typeof item === "object") {
        return {
          name: item.name || "",
          date: item.date || "",
        }
      }

      const value = String(item || "").trim()
      const date = value.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(?:19|20)\d{2}\b/i)?.[0] || ""
      return {
        name: date ? trimTrailingSeparators(value.replace(date, "").trim()) : value,
        date,
      }
    })
    .filter((item) => item.name)
}

function trimTrailingSeparators(value) {
  let text = value
  while (text.endsWith("-") || text.endsWith(":") || text.endsWith("|")) {
    text = text.slice(0, -1).trim()
  }
  return text
}

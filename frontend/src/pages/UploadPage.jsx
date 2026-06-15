import { Loader2, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import FileUpload from "../components/FileUpload.jsx"
import { uploadResume } from "../services/api.js"

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [jobDescription, setJobDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    if (!file) {
      setError("Please choose a PDF or DOCX resume.")
      return
    }

    if (!["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type) && !/\.(pdf|docx)$/i.test(file.name)) {
      setError("Only PDF and DOCX files are supported.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be 5 MB or less.")
      return
    }

    try {
      setLoading(true)
      const candidate = await uploadResume(file, jobDescription)
      navigate(`/results/${candidate.id}`, { state: { candidate } })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="section-title text-emerald-600 dark:text-emerald-300">Upload</p>
        <h1 className="page-heading mt-2">Parse a resume</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Upload a resume to extract candidate data. Job description matching is optional.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Resume file</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">PDF/DOCX up to 5MB</p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
              Required
            </span>
          </div>
          <div className="mt-4">
            <FileUpload file={file} onFileSelect={setFile} />
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Job description</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Paste a job description to calculate job match score.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              Optional
            </span>
          </div>

          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="input mt-4 min-h-64 resize-y leading-6"
            placeholder="Example: Looking for React, Python, FastAPI, SQL, Docker, AWS..."
          />
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-300" />
            Resume parsing works even when this field is empty.
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-5 w-full">
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Parsing resume...
              </>
            ) : (
              "Parse Resume"
            )}
          </button>
        </section>
      </form>
    </main>
  )
}

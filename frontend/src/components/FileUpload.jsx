import { FileText, UploadCloud, X } from "lucide-react"
import { useState } from "react"

export default function FileUpload({ file, onFileSelect }) {
  const [isDragging, setIsDragging] = useState(false)

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      onFileSelect(droppedFile)
    }
  }

  return (
    <div>
      <label
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 text-center transition",
          isDragging
            ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-400/10"
            : "border-slate-300 bg-white hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50/60 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-emerald-400/70 dark:hover:bg-emerald-400/5",
        ].join(" ")}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
          <UploadCloud size={24} />
        </span>
        <span className="mt-4 text-base font-semibold text-slate-950 dark:text-slate-50">
          Drop your resume here
        </span>
        <span className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          PDF/DOCX up to 5MB
        </span>
        <input
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(event) => onFileSelect(event.target.files?.[0] || null)}
        />
      </label>

      {file && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <FileText size={18} className="text-emerald-600 dark:text-emerald-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300"
            aria-label="Remove selected file"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  )
}

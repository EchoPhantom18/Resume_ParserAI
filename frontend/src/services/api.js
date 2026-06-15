import { getToken, logout } from "./auth.js"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers),
  })
  const contentType = response.headers.get("content-type") || ""
  const data = contentType.includes("application/json") ? await response.json() : null

  if (!response.ok) {
    if (response.status === 401) logout()
    const detail = data?.detail || "Request failed. Please try again."
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail)
  }

  return data
}

export function uploadResume(file, jobDescription) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("job_description", jobDescription)

  return request("/upload-resume", {
    method: "POST",
    body: formData,
  })
}

export function matchScore(candidateId, jobDescription) {
  return request("/match-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidate_id: Number(candidateId),
      job_description: jobDescription,
    }),
  })
}

export function getCandidates() {
  return request("/candidates")
}

export function getCandidate(candidateId) {
  return request(`/candidate/${candidateId}`)
}

export function compareCandidates(candidate1Id, candidate2Id, jobDescription = "") {
  return request("/compare-candidates", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidate_1_id: Number(candidate1Id),
      candidate_2_id: Number(candidate2Id),
      job_description: jobDescription,
    }),
  })
}

export function getRecruiterSummary(candidateId) {
  return request(`/candidate/${candidateId}/recruiter-summary`)
}

export function getHiringVerdict(candidateId) {
  return request(`/candidate/${candidateId}/hiring-verdict`)
}

export function getRecruiterReport(candidateId) {
  return request(`/candidate/${candidateId}/recruiter-report`)
}

export function analyzeResumeJD(candidateId, jobDescription) {
  return request(`/candidate/${candidateId}/jd-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job_description: jobDescription,
    }),
  })
}

export function getDownloadUrl(candidateId) {
  return `${API_BASE_URL}/candidate/${candidateId}/download`
}

export function getRecruiterReportDownloadUrl(candidateId) {
  return `${API_BASE_URL}/candidate/${candidateId}/recruiter-report/download`
}

export function downloadCandidateJson(candidateId) {
  return downloadFile(`/candidate/${candidateId}/download`, `candidate_${candidateId}.json`)
}

export function downloadRecruiterReport(candidateId) {
  return downloadFile(`/candidate/${candidateId}/recruiter-report/download`, `candidate_${candidateId}_recruiter_report.html`)
}

function buildHeaders(headers = {}) {
  const token = getToken()
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function downloadFile(path, fallbackFileName) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: buildHeaders(),
  })

  if (!response.ok) {
    if (response.status === 401) logout()
    throw new Error("Download failed. Please try again.")
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = getFileName(response.headers.get("content-disposition")) || fallbackFileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function getFileName(contentDisposition) {
  return contentDisposition?.match(/filename="?([^"]+)"?/i)?.[1] || ""
}

export { API_BASE_URL }

import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import Navbar from "./components/Navbar.jsx"
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import CandidateDetailPage from "./pages/CandidateDetailPage.jsx"
import CompareCandidatesPage from "./pages/CompareCandidatesPage.jsx"
import DashboardPage from "./pages/DashboardPage.jsx"
import LandingPage from "./pages/LandingPage.jsx"
import LoginPage from "./pages/LoginPage.jsx"
import RecruiterReportPage from "./pages/RecruiterReportPage.jsx"
import RecruiterSummaryPage from "./pages/RecruiterSummaryPage.jsx"
import ResumeJDAnalysisPage from "./pages/ResumeJDAnalysisPage.jsx"
import ResultsPage from "./pages/ResultsPage.jsx"
import SignupPage from "./pages/SignupPage.jsx"
import UploadPage from "./pages/UploadPage.jsx"

export default function App() {
  const location = useLocation()
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup"

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-50">
      {!isAuthPage && <Navbar />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/results/:id" element={<ResultsPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/compare" element={<CompareCandidatesPage />} />
          <Route path="/candidate/:id" element={<CandidateDetailPage />} />
          <Route path="/candidate/:id/jd-analysis" element={<ResumeJDAnalysisPage />} />
          <Route path="/candidate/:id/summary" element={<RecruiterSummaryPage />} />
          <Route path="/candidate/:id/report" element={<RecruiterReportPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

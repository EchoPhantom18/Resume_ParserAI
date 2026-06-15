import { FileSearch } from "lucide-react"
import { useState } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import ThemeToggle from "../components/ThemeToggle.jsx"
import { isAuthenticated, login } from "../services/auth.js"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (isAuthenticated()) {
    return <Navigate to={location.state?.from?.pathname || "/"} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setError("")
      setLoading(true)
      await login(email, password)
      navigate(location.state?.from?.pathname || "/", { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to access your hiring dashboard."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthError message={error} />}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Logging in..." : "Login"}
        </button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
            Sign up
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex max-w-6xl justify-end">
        <ThemeToggle />
      </div>
      <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
            <FileSearch size={18} /> Resume Parser AI
          </div>
          <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-tight tracking-tight">
            Hire Smarter. Faster.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-400">
            Parse resumes, match candidates, and generate recruiter insights in seconds.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="card p-6 shadow-xl shadow-slate-200/60 dark:shadow-black/30 sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 dark:bg-emerald-400 dark:text-slate-950">
                <FileSearch size={20} />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">Resume Parser AI</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Recruiter Workspace</p>
              </div>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </section>
    </main>
  )
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        className="input mt-2"
      />
    </label>
  )
}

function AuthError({ message }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300">
      {message}
    </div>
  )
}

export { AuthError, AuthShell, Field }

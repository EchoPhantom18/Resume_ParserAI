import { useState } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { AuthError, AuthShell, Field } from "./LoginPage.jsx"
import { isAuthenticated, signup } from "../services/auth.js"

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (isAuthenticated()) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setError("")
      setLoading(true)
      await signup(name, email, password)
      navigate("/", { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create Account"
      subtitle="Start screening candidates smarter."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AuthError message={error} />}
        <Field
          label="Name"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Your name"
        />
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
          placeholder="Create a password"
        />
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200">
            Login
          </Link>
        </p>
      </form>
    </AuthShell>
  )
}

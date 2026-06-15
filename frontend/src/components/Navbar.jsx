import { ArrowRightLeft, FileSearch, LayoutDashboard, UploadCloud } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, NavLink } from "react-router-dom"
import { getMe, getStoredUser, isAuthenticated, logout } from "../services/auth.js"
import ThemeToggle from "./ThemeToggle.jsx"

const navItems = [
  { to: "/upload", label: "Upload", icon: UploadCloud },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/compare", label: "Compare", icon: ArrowRightLeft },
]

export default function Navbar() {
  const [user, setUser] = useState(getStoredUser())
  const loggedIn = isAuthenticated()

  useEffect(() => {
    function syncUser() {
      setUser(getStoredUser())
    }

    window.addEventListener("auth-changed", syncUser)
    if (isAuthenticated() && !getStoredUser()) {
      getMe().then(setUser)
    }

    return () => window.removeEventListener("auth-changed", syncUser)
  }, [])

  function handleLogout() {
    logout()
    window.location.href = "/login"
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 dark:bg-emerald-400 dark:text-slate-950">
            <FileSearch size={17} />
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-950 dark:text-slate-50 sm:text-base">
            Resume Parser AI
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {loggedIn && (
            <nav className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/70 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition",
                        isActive
                          ? "bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-400/10 dark:text-emerald-300"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                      ].join(" ")
                    }
                  >
                    <Icon size={15} />
                    <span className="hidden md:inline">{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          )}
          {loggedIn && (
            <div className="hidden max-w-44 truncate rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 md:block">
              {user?.name || user?.email || "Recruiter"}
            </div>
          )}
          {loggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 bg-white/70 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-red-400/30 dark:hover:bg-red-400/10 dark:hover:text-red-300"
            >
              Logout
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

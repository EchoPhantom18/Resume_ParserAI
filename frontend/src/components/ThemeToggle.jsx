import { Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"

const THEME_STORAGE_KEY = "resume-parser-theme"

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme
  return getSystemTheme()
}

function applyTheme(theme) {
  const isDark = theme === "dark"
  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.style.colorScheme = theme
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => getInitialTheme())
  const isDark = theme === "dark"

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  function handleToggle() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark"
      applyTheme(nextTheme)
      return nextTheme
    })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-400/40 dark:hover:text-emerald-300"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

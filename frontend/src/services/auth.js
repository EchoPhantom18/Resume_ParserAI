const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
const TOKEN_KEY = "auth_token"
const USER_KEY = "auth_user"

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null")
  } catch {
    return null
  }
}

export function isAuthenticated() {
  return Boolean(getToken())
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event("auth-changed"))
}

export async function login(email, password) {
  return authRequest("/auth/login", { email, password })
}

export async function signup(name, email, password) {
  return authRequest("/auth/signup", { name, email, password })
}

export async function getMe() {
  const token = getToken()
  if (!token) return null

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    logout()
    return null
  }

  const user = await response.json()
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  window.dispatchEvent(new Event("auth-changed"))
  return user
}

async function authRequest(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()

  if (!response.ok) {
    const detail = data?.detail || "Authentication failed. Please try again."
    throw new Error(Array.isArray(detail) ? detail.map((item) => item.msg).join(", ") : detail)
  }

  localStorage.setItem(TOKEN_KEY, data.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
  window.dispatchEvent(new Event("auth-changed"))
  return data
}

export { API_BASE_URL }

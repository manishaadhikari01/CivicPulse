import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type User } from '../lib/api'

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string, captchaToken: string) => Promise<void>
  signup: (name: string, email: string, password: string, captchaToken: string) => Promise<void>
  demoOfficial: () => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    api.me()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('token')
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const persistToken = (accessToken: string) => {
    localStorage.setItem('token', accessToken)
    setToken(accessToken)
  }

  const refreshUser = async () => {
    try {
      const fresh = await api.me()
      setUser(fresh)
    } catch {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    }
  }

  const login = async (email: string, password: string, captchaToken: string) => {
    const res = await api.login({ email, password, captcha_token: captchaToken })
    persistToken(res.access_token)
    await refreshUser()
  }

  const signup = async (name: string, email: string, password: string, captchaToken: string) => {
    const res = await api.signup({ name, email, password, captcha_token: captchaToken })
    persistToken(res.access_token)
    await refreshUser()
  }

  const demoOfficial = async () => {
    const res = await api.demoOfficial()
    persistToken(res.access_token)
    await refreshUser()
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, demoOfficial, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

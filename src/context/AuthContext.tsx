import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { checkAuth, logout as logoutFn } from "@/src/lib/auth"

type AuthContextType = {
  isLoggedIn: boolean
  isLoading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = async () => {
    try {
      const result = await checkAuth()
      setIsLoggedIn(result.isLoggedIn)
    } catch {
      setIsLoggedIn(false)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await logoutFn()
    setIsLoggedIn(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}

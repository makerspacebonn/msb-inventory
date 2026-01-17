import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import { useSession, signOut } from "@/src/lib/auth-client"
import type { User } from "@/src/drizzle/schema"

type AuthContextType = {
  isLoggedIn: boolean
  isLoading: boolean
  user: User | null
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending, refetch } = useSession()

  const isLoggedIn = !!session?.user
  const user = session?.user as User | null

  const logout = async () => {
    await signOut()
    await refetch()
  }

  const refresh = async () => {
    await refetch()
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading: isPending,
        user,
        logout,
        refresh,
      }}
    >
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

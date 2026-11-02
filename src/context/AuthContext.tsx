import { createContext, type ReactNode, useContext } from "react"
import type { User } from "@/src/drizzle/schema"
import { signOut, useSession } from "@/src/lib/auth-client"
import { isAdmin } from "@/src/lib/roles"

type AuthContextType = {
  isLoggedIn: boolean
  isAdmin: boolean
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
  const isAdminUser = isAdmin(user)

  const logout = async () => {
    // signOut reports failures (e.g. a rejected origin) instead of throwing
    const { error } = await signOut()
    if (error) {
      throw new Error(error.message ?? "Abmelden fehlgeschlagen")
    }
    await refetch()
  }

  const refresh = async () => {
    await refetch()
  }

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAdmin: isAdminUser,
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

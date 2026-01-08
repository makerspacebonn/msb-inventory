import { Button } from "@components/ui/button"
import { Toaster } from "@components/ui/sonner"
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router"
import { LogInIcon, LogOutIcon } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { AuthProvider, useAuth } from "@/src/context/AuthContext"
import { checkAuth, getCurrentUser } from "@/src/lib/auth"
import type { User } from "@/src/drizzle/schema"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
  beforeLoad: async () => {
    const { isLoggedIn } = await checkAuth()
    return { isLoggedIn }
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "MSB Inventar",
      },
      {
        name: "theme-color",
        content: "#0a0a0a",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        href: "/img/makerspace-bonn-signet.png",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
})

function RootComponent() {
  return (
    <AuthProvider>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </AuthProvider>
  )
}

function AuthButtons() {
  const { isLoggedIn, isLoading, logout } = useAuth()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      getCurrentUser().then(setUser)
    } else {
      setUser(null)
    }
  }, [isLoggedIn, isLoading])

  if (isLoading) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
    await router.invalidate()
  }

  if (isLoggedIn && user) {
    return (
      <div className="flex items-center gap-2">
        {user.discordAvatar && (
          <img
            src={user.discordAvatar}
            alt={user.discordName}
            className="w-8 h-8 rounded-full"
            title={user.discordName}
          />
        )}
        <span className="text-sm hidden sm:inline">{user.discordName}</span>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOutIcon className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  if (isLoggedIn) {
    return (
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOutIcon className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/login">
        <LogInIcon className="w-4 h-4" />
      </Link>
    </Button>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <head>
        <HeadContent />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="dark">
        <Toaster richColors position="top-center" expand={true} />
        <div className="flex flex-col min-h-screen">
          <header className=" py-2 px-4 shadow">
            <nav className="flex flex-row justify-between items-center content-center gap-2  border-b border-gray-800">
              <ul>
                <li className="logo w-10">
                  <a href="/">
                    <img
                      src="/img/makerspace-bonn-signet.png"
                      alt="MakerSpace Bonn e.V."
                    />
                  </a>
                </li>
              </ul>
              <ul className="hidden">
                <li>MakerSpace Bonn e.V.</li>
              </ul>
              <ul className="flex flex-row justify-between items-center p-4 mx-4 gap-2">
                <li>
                  <a href="/">Home</a>
                </li>
                <li>
                  <Link to="/items">Items</Link>
                </li>
                <li>
                  <Link to="/locations">Locations</Link>
                </li>
                <li>
                  <AuthButtons />
                </li>
              </ul>
            </nav>
          </header>
          <main className="flex-grow p-4">
            <Outlet />
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  )
}

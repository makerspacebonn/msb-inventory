import { Button } from "@components/ui/button"
import { Toaster } from "@components/ui/sonner"
import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useRouter,
} from "@tanstack/react-router"
import { LogInIcon, LogOutIcon } from "lucide-react"
import type { ReactNode } from "react"
import { getAuthContext } from "@/src/actions/authActions"
import { AuthProvider, useAuth } from "@/src/context/AuthContext"
import appCss from "../styles.css?url"

// Define the router context type
type RouterContext = {
  isLoggedIn: boolean
  userId: string | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  // beforeLoad fetches auth and provides context to child routes
  beforeLoad: async () => {
    const authContext = await getAuthContext()
    return authContext
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
  const { isLoggedIn, isLoading, user, logout } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return null
  }

  const handleLogout = async () => {
    await logout()
    await router.invalidate()
  }

  if (isLoggedIn && user) {
    return (
      <div className="flex items-center gap-2">
        {user.image && (
          <img
            src={user.image}
            alt={user.name || "User"}
            className="w-8 h-8 rounded-full"
            title={user.name || undefined}
          />
        )}
        <span className="text-sm hidden sm:inline">
          {user.name || user.email}
        </span>
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
              <ul className="flex items-center gap-1">
                <li className="logo w-10">
                  <a href="/">
                    <img
                      src="/img/makerspace-bonn-signet.png"
                      alt="MakerSpace Bonn e.V."
                    />
                  </a>
                </li>
                <li>
                  <span className="text-[10px] text-gray-500">
                    v{__APP_VERSION__}
                  </span>
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

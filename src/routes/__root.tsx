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
import { LogInIcon, LogOutIcon, MenuIcon, XIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
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

function AuthButtons({ onAction }: { onAction?: () => void }) {
  const { isLoggedIn, isLoading, user, logout } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return null
  }

  const handleLogout = async () => {
    onAction?.()
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
        <span className="text-sm">{user.name || user.email}</span>
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
      <Link to="/login" onClick={onAction}>
        <LogInIcon className="w-4 h-4" />
      </Link>
    </Button>
  )
}

function NavLinks({ onClick }: { onClick?: () => void }) {
  return (
    <>
      <Link
        to="/"
        className="hover:text-gray-300 transition-colors"
        onClick={onClick}
      >
        Home
      </Link>
      <Link
        to="/items"
        className="hover:text-gray-300 transition-colors"
        onClick={onClick}
      >
        Items
      </Link>
      <Link
        to="/locations"
        className="hover:text-gray-300 transition-colors"
        onClick={onClick}
      >
        Locations
      </Link>
      <Link
        to="/changelog"
        className="hover:text-gray-300 transition-colors"
        onClick={onClick}
      >
        Changelog
      </Link>
    </>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <html lang="de">
      <head>
        <HeadContent />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="dark">
        <Toaster richColors position="top-center" expand={true} />
        <div className="flex flex-col min-h-screen">
          <header className="py-2 px-4 shadow border-b border-gray-800">
            <nav className="flex flex-row justify-between items-center gap-2">
              {/* Logo and version */}
              <div className="flex items-center gap-2">
                <a href="/" className="w-10">
                  <img
                    src="/img/makerspace-bonn-signet.png"
                    alt="MakerSpace Bonn e.V."
                  />
                </a>
                <span className="text-[10px] text-gray-500">
                  v{__APP_VERSION__}
                </span>
              </div>

              {/* Desktop navigation */}
              <div className="hidden md:flex items-center gap-6">
                <NavLinks />
                <AuthButtons />
              </div>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? (
                  <XIcon className="w-5 h-5" />
                ) : (
                  <MenuIcon className="w-5 h-5" />
                )}
              </Button>
            </nav>
          </header>

          {/* Mobile navigation overlay */}
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <button
                type="button"
                className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden cursor-default"
                onClick={() => setMobileMenuOpen(false)}
                onKeyDown={(e) =>
                  e.key === "Escape" && setMobileMenuOpen(false)
                }
                aria-label="Close menu"
              />
              {/* Menu panel */}
              <div className="fixed top-0 right-0 h-full w-64 bg-black z-50 md:hidden shadow-xl">
                <div className="flex justify-end p-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close menu"
                  >
                    <XIcon className="w-5 h-5" />
                  </Button>
                </div>
                <div className="flex flex-col gap-4 px-6 py-4">
                  <NavLinks onClick={() => setMobileMenuOpen(false)} />
                  <div className="pt-4 mt-4 border-t border-gray-700">
                    <AuthButtons onAction={() => setMobileMenuOpen(false)} />
                  </div>
                </div>
              </div>
            </>
          )}
          <main className="flex-grow p-4">
            <Outlet />
          </main>
        </div>
        <Scripts />
      </body>
    </html>
  )
}

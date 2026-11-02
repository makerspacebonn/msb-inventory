import { HeaderSearch } from "@components/header/HeaderSearch"
import { SiteMenu } from "@components/header/SiteMenu"
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
import { LogInIcon, LogOutIcon, PlusIcon } from "lucide-react"
import type { ReactNode } from "react"
import { getAuthContext } from "@/src/actions/authActions"
import { AuthProvider, useAuth } from "@/src/context/AuthContext"
import appCss from "../styles.css?url"

// Define the router context type
type RouterContext = {
  isLoggedIn: boolean
  isAdmin: boolean
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
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Abmelden"
        >
          <LogOutIcon className="w-4 h-4" />
        </Button>
      </div>
    )
  }

  if (isLoggedIn) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        aria-label="Abmelden"
      >
        <LogOutIcon className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to="/login" onClick={onAction} aria-label="Anmelden">
        <LogInIcon className="w-4 h-4" />
      </Link>
    </Button>
  )
}

function MainLinks() {
  return (
    <>
      <Link to="/items" className="hover:text-gray-300 transition-colors">
        Items
      </Link>
      <Link to="/locations" className="hover:text-gray-300 transition-colors">
        Locations
      </Link>
    </>
  )
}

// Add-item shortcut, only for users who may add items
function AddItemButton() {
  const { isLoggedIn } = useAuth()
  if (!isLoggedIn) return null
  return (
    <Button variant="secondary" size="sm" asChild>
      <Link
        to="/items/add"
        aria-label="Item hinzufügen"
        title="Item hinzufügen"
      >
        <PlusIcon className="w-4 h-4" />
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
          <header className="py-2 px-4 shadow border-b border-gray-800">
            <div className="flex flex-row items-center gap-2 md:gap-4">
              <Link to="/" className="w-10 flex-shrink-0">
                <img
                  src="/img/makerspace-bonn-signet.png"
                  alt="MakerSpace Bonn e.V."
                />
              </Link>
              <nav
                aria-label="Hauptnavigation"
                className="hidden md:flex items-center gap-6"
              >
                <MainLinks />
              </nav>
              {/* Search fills the space between the pages and the actions */}
              <HeaderSearch />
              <div className="flex flex-shrink-0 items-center justify-end gap-2 md:gap-4">
                <AddItemButton />
                <div className="hidden md:block">
                  <AuthButtons />
                </div>
                <SiteMenu
                  account={(close) => <AuthButtons onAction={close} />}
                />
              </div>
            </div>
          </header>
          <main className="flex-grow p-4">{children}</main>
          <footer className="py-4 px-4 border-t border-gray-800 text-center text-xs text-gray-500">
            MSB Inventar v{__APP_VERSION__}
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  )
}

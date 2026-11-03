import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@components/ui/dialog"
import { Link } from "@tanstack/react-router"
import { MenuIcon } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useAuth } from "@/src/context/AuthContext"

const linkClass = "py-1 hover:text-gray-300 transition-colors"

// Menu behind the hamburger icon, on every screen size. Holds the rarely
// used pages; on small screens also the main pages and the account, which
// don't fit into the header there.
export function SiteMenu({
  account,
}: {
  account: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { isLoggedIn, isAdmin } = useAuth()
  const close = () => setOpen(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Menü öffnen">
          <MenuIcon className="w-5 h-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="top-0 right-0 left-auto h-full w-64 max-w-64 sm:max-w-64 translate-x-0 translate-y-0 content-start rounded-none border-y-0 border-r-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right">
        <DialogTitle>Menü</DialogTitle>
        <DialogDescription className="sr-only">
          Weitere Seiten und Konto
        </DialogDescription>
        <nav aria-label="Menü" className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 md:hidden">
            <Link to="/items" className={linkClass} onClick={close}>
              Items
            </Link>
            <Link to="/locations" className={linkClass} onClick={close}>
              Locations
            </Link>
          </div>
          {isLoggedIn && (
            <Link to="/labels" className={linkClass} onClick={close}>
              Etiketten drucken
            </Link>
          )}
          {isLoggedIn && (
            <Link to="/printers" className={linkClass} onClick={close}>
              Drucker
            </Link>
          )}
          <Link
            to="/changelog"
            search={{ page: 1 }}
            className={linkClass}
            onClick={close}
          >
            Changelog
          </Link>
          {isAdmin && (
            <Link to="/backup" className={linkClass} onClick={close}>
              Backup
            </Link>
          )}
        </nav>
        <div className="md:hidden pt-4 mt-2 border-t border-gray-700">
          {account(close)}
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { AppError } from "./errors"

type Access = { isLoggedIn: boolean; isAdmin?: boolean }

/**
 * Access checks shared by the server function middleware and the routes'
 * beforeLoad, so both fail with the same codes and messages
 */
export function requireLogin(access: Access): void {
  if (!access.isLoggedIn) {
    throw new AppError("UNAUTHORIZED", "Dafür musst du angemeldet sein.")
  }
}

export function requireAdmin(access: Access): void {
  requireLogin(access)
  if (!access.isAdmin) {
    throw new AppError("FORBIDDEN", "Dafür brauchst du Admin-Rechte.")
  }
}

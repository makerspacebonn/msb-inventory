// Roles are synced from Kanidm group membership on every login
// (see syncKanidmRole in auth.ts). Safe to use on client and server.
export function isAdmin(user: { role?: string | null } | null | undefined) {
  return user?.role === "admin"
}

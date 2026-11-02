// src/router.tsx
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  return createRouter({
    routeTree,
    // Filled by the root route's beforeLoad on every navigation
    context: { isLoggedIn: false, isAdmin: false, userId: null },
    scrollRestoration: true,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultErrorComponent: ({ error }) => (
      <div>Error {error instanceof Error ? error.message : String(error)}</div>
    ),
  })
}

// src/router.tsx
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    defaultNotFoundComponent: () => <div>Not Found</div>,
    defaultErrorComponent: ({ error }) => (
      <div>Error {error instanceof Error ? error.message : String(error)}</div>
    ),
  })
}

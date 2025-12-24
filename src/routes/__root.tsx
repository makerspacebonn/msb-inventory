// src/routes/__root.tsx
/// <reference types="vite/client" />

import { Toaster } from "@components/ui/sonner"
import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
} from "@tanstack/react-router"
import type { ReactNode } from "react"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
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
        title: "TanStack Start Starter",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => <div>Not Found</div>,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
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
              <ul className="flex flex-row justify-between p-4 mx-4 gap-2">
                <li>
                  <a href="/">Home</a>
                </li>
                <li>
                  <Link to="/items">Items</Link>
                </li>
                <li>
                  <Link to="/locations">Locations</Link>
                </li>
                <li>Search</li>
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

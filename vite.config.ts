import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"
import pkg from "./package.json"

const config = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    exclude: ["e2e/**", "node_modules/**"],
  },
  optimizeDeps: {
    exclude: [
      "@tanstack/start-server-core",
      "@tanstack/start-client-core",
      "@tanstack/react-start",
    ],
  },
  plugins: [
    // Console piping echoes server logs into the browser and browser logs back
    // into the server, which loops and grew logs/dev.log to 20+ GB
    devtools({ consolePiping: { enabled: false } }),
    // Scoped to this project's tsconfig so the plugin does NOT crawl the
    // filesystem for tsconfig files (that crawl walks into ~/Library and
    // crashes Bun on macOS with EINTR). Enables the "@/" path aliases.
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  server: {
    port: 80,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port: 80,
    host: "0.0.0.0",
    allowedHosts: true,
  },
})

export default config

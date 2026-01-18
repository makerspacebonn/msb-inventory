import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsConfigPaths from "vite-tsconfig-paths"
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
    devtools(),
    tsConfigPaths(),
    // this is the plugin tha t enables path aliases
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

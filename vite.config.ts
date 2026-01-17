import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tsConfigPaths from "vite-tsconfig-paths"

const config = defineConfig({
  test: {
    // Exclude e2e tests - they use Playwright, not Vitest
    exclude: ["e2e/**", "node_modules/**"],
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

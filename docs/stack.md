# Stack: "for X, use Y"

Add a row **in the same commit** that adds the dependency. When something is replaced, update its row (don't leave both). Versions live in `package.json`; this file records the choice and why.
Last reviewed: 2026-11-12

| For… | Use | Not | Why | Since |
|---|---|---|---|---|
| runtime / package manager | Bun (`oven/bun:*-alpine`, digest-pinned) | npm, npx, pnpm, yarn | one tool; lockfile parity with Docker | |
| app framework | TanStack Start (React 19, file routes, `createServerFn`), Vite | bun-react-tailwind / Elysia (the starting point) | type-safe RPC, SSR | |
| forms | @tanstack/react-form | | | |
| UI | Tailwind v4, shadcn/ui (Radix), lucide-react, sonner (toasts), next-themes | | shadcn MCP in `.mcp.json` | |
| DB | PostgreSQL + Drizzle ORM / drizzle-kit, `pg` driver | | | |
| auth | better-auth with Kanidm via generic OIDC | the earlier Discord OAuth / hand-made JWT cookies | sessions, RBAC (admin plugin), account linking; see [runtime-traps](runtime-traps.md#better-auth-and-oidc-kanidm) | 2026-01-17 |
| validation | zod 4 | | | |
| errors | `AppError` (`src/lib/errors.ts`), shown with `showError` / `errorMessage` | raw `error.message` in the UI | | |
| AI item description | Google Gemini (`@google/generative-ai`) | | | |
| image upload | `browser-image-compression` + `react-easy-crop` on the client, sent as base64; `sharp` on the server | | | |
| labels / QR | `qrcode`, `qrcode.react`, `jspdf`; MQTT (`mqtt`) to the label printer | | | |
| backup archives | `yazl` / `yauzl` | | | |
| server templates | `eta` | | | |
| lint + format | Biome 2 (`biome.json`) | eslint, prettier | one fast tool | |
| unit tests | vitest (`bun run test`) | `bun test` (Bun's runner conflicts with Playwright) | | |
| e2e | Playwright in Docker (`bun run test:e2e`, `docker-compose.e2e.yml`) | local browsers | hermetic, same as CI | |
| security scan | Trivy on the production image + `bun audit` (`bun run security:scan`), results in [SecurityScans.md](SecurityScans.md) | | | |
| dependency updates | Renovate (`renovate.json`), `audit.yml` workflow | | | |
| CI / registry | GitHub Actions → Docker Hub | GHCR | see [DECISIONS.md D3](DECISIONS.md) | |

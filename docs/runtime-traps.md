# Runtime traps

A checklist in the form **When you do X → check Y → why**. Every entry names its source and the library version it applies to. Mark superseded entries with ~~strikethrough~~ and a pointer to the replacement; don't delete them.
Cross-project traps also go into the playbook: `ai-development-skill/docs/lessons-learned.md`.

Moved here from the CLAUDE.md "Session Learnings" log on 2026-11-12. Where the original note named no version, the column shows the version in `package.json` on that move date (marked "≤"), meaning "seen at or before this version".

## Database (Drizzle, better-auth schema)

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| run `drizzle-kit push` from a script or agent | use `bun db:push --force` (dev only) | interactive prompts don't accept piped input | drizzle-kit ≤0.31.11 · 2026-01-17 |
| change `src/drizzle/schema.ts` | run `bun db:generate` and commit the migration; production applies migrations only (`scripts/migrate.ts`) | production ran `push --force` until 0.3.0, and the old migration chain could no longer build a fresh db (`searchable_text` typed `tsvector`, a file missing from the journal), so it was replaced by `0000_baseline.sql` | drizzle-kit 0.31.11 · 2026-11-12 |
| generate a migration non-interactively | `drizzle-kit generate` stops with "Interactive prompts require a TTY" when it must ask about a rename; run it in a real terminal | migration switch | drizzle-kit 0.31.11 · 2026-11-12 |
| change the auth schema | better-auth needs 4 tables: `users`, `sessions`, `accounts`, `verifications`, with its column names | better-auth migration | better-auth ≤1.7.18 · 2026-01-17 |
| delete users | sessions and accounts FK to users with `ON DELETE CASCADE`; no manual cleanup | better-auth migration | better-auth ≤1.7.18 · 2026-01-17 |
| touch the users table | keep `role`, `banned`, `banReason`, `banExpires` (admin plugin, RBAC, AUTH-005) | better-auth migration | better-auth ≤1.7.18 · 2026-01-17 |
| remove a schema column | grep for it across repositories and inline types; derive types from the schema instead of writing them inline | `discordName` was removed from UserTable, but `ChangelogRepository` still selected it and broke `/changelog` | drizzle-orm ≤0.45.4 · 2026-01-17 |

## TanStack Start: routes and the server/client boundary

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| add an API route | use `createFileRoute` with `server.handlers`, exported as `Route` (not `createAPIFileRoute` / `APIRoute`); `/api/auth/*` is served by `src/routes/api/auth/$.ts` via `auth.handler(request)` | better-auth implementation | @tanstack/react-start ≤1.169.4 · 2026-01-17 |
| need the request in a server fn | it's `getRequest()` from `@tanstack/react-start/server`, not `getWebRequest()`; older docs are wrong | auth context | @tanstack/react-start ≥1.150 · 2026-01-17 |
| import server-only code (anything reading `process.env`, e.g. `src/lib/auth.ts`) from a client component or route file | wrap it in a `createServerFn` handler with a dynamic `await import()` (pattern below) | route files are bundled for client and server; a static import gives "Buffer is not defined" | @tanstack/react-start ≤1.169.4 · 2026-01-17 |
| provide auth state to child routes | the root route uses `createRootRouteWithContext<RouterContext>()` with `beforeLoad` calling a server fn | auth context | @tanstack/react-start ≤1.169.4 · 2026-01-17 |

```typescript
const getAuthContext = createServerFn().handler(async () => {
  const { getRequest } = await import("@tanstack/react-start/server")
  const { auth } = await import("@/src/lib/auth")
  const session = await auth.api.getSession({ headers: getRequest().headers })
  return { isLoggedIn: !!session?.user, userId: session?.user?.id ?? null }
})
```

## better-auth and OIDC (Kanidm)

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| add or reorder better-auth plugins | `tanstackStartCookies()` must be the **last** plugin | cookie handling breaks otherwise | better-auth ≤1.7.18 · 2026-01-17 |
| make a plugin optional | add it conditionally from env: `plugins: kanidmConfigured ? [genericOAuth({...})] : []` | better-auth implementation | better-auth ≤1.7.18 · 2026-01-17 |
| start a generic OAuth sign-in | providers are registered as social providers: `signIn.social({ provider: "<providerId>" })`; `genericOAuthClient()` / `signIn.oauth2()` no longer exist | upgrade to 1.7 | better-auth ≥1.7 · 2026 |
| configure the OAuth provider | whitelist `/api/auth/callback/{providerId}` exactly (was `/api/auth/oauth2/callback/{providerId}` before 1.7) | redirect mismatch | better-auth ≥1.7 · 2026 |
| read the session on the client | `useSession()` returns `{ data, isPending, refetch }`; no manual JWT/cookie code | better-auth implementation | better-auth ≤1.7.18 · 2026-01-17 |
| configure OIDC endpoints | `discoveryUrl` reads `.well-known/openid-configuration`; don't hard-code endpoints | better-auth implementation | better-auth ≤1.7.18 · 2026-01-17 |
| map OIDC claims to user fields | `mapProfileToUser` gets the full profile with custom claims; use `overrideUserInfo: true` to update on every login. To debug, temporarily log the profile (remove before commit, it contains personal data) | role mapping | better-auth ≤1.7.18 · 2026-01-18 |
| change a role at the provider | with `session.cookieCache.enabled: true` it may take 2 logins to apply ([better-auth#5772](https://github.com/better-auth/better-auth/issues/5772)) | role mapping | better-auth ≤1.7.18 · 2026-01-18 |
| link OAuth to existing email users | `account.accountLinking.enabled: true` and `trustedProviders: ["kanidm"]` | role mapping | better-auth ≤1.7.18 · 2026-01-18 |

## Tests

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| run unit tests | `bun run test` (vitest), never `bun test`: that is Bun's native runner, which conflicts with Playwright | E2E setup | Bun ≤1.4.4, vitest ≤5.1.0 · 2026-01-17 |
| fake a session cookie in e2e | the token must be signed: `{token}.{base64(HMAC-SHA256(token, BETTER_AUTH_SECRET))}`, URL-encoded, `secure: false` over HTTP | better-auth validates the signature | better-auth ≤1.7.18 · 2026-01-17 |
| need a logged-in e2e user | pre-seed user + session in `scripts/seed-e2e-data.ts`, set the cookie in the Playwright fixture; much faster than UI login | E2E setup | @playwright/test ≤1.64.1 · 2026-01-17 |
| create users in e2e | use timestamped emails (`test-${Date.now()}@example.com`) so runs don't collide | E2E setup | 2026-01-17 |
| debug the e2e app from the host | add `ports: "3001:3000"` to `docker-compose.e2e.yml` | E2E setup | 2026-01-17 |
| check auth state in e2e | look for the user's name in the header (or the login button), not a feature button that may be missing on some pages or visible to everyone | UX-003 | 2026-02-05 |
| add a UI element shown on every page | existing e2e selectors may now match twice; make them more specific (`.first()` only as a last resort, see `e2e/README.md`) | UX-003 navbar button | 2026-02-05 |

## Client state (localStorage)

| When you… | Check… | Why / source | Version · date |
|---|---|---|---|
| use localStorage | put the helper in `lib/` with an SSR guard (`typeof window === "undefined"`); load it in `useEffect` with an `isLoaded` flag to avoid hydration mismatches | UX-002 recent locations | React ≤19.3.1 · 2026-02-05 |
| select from cached data (e.g. recent locations) | validate the entry still exists (`fetchLocationById`); if not, drop it from the cache and show a toast | UX-002 | 2026-02-05 |
| cache a location path | compute it at save time: `locationPath.map(l => l.name).join(" → ")` | UX-002 | 2026-02-05 |
| add a prop to a shared component | make it optional with a default (`showRecentLocations = false`) so existing callers keep working | UX-002 | 2026-02-05 |

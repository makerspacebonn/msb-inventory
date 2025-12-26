# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MSB Inventory is a full-stack TypeScript inventory management system for Makerspace Bonn. It tracks items, locations (hierarchical), and projects with features like image upload, AI-powered item description (via Google Gemini), and Discord OAuth.

## Development Commands

```bash
bun dev          # Start app + postgres in Docker with hot reload (http://localhost:3000)
bun dev:stop     # Stop Docker containers
bun dev:tests    # Run tests in watch mode
bun test         # Run tests once
bun build        # Production build
bun db:generate  # Generate Drizzle migrations
bun db:migrate   # Run database migrations
```

Requires Docker. Create `.env` from `.env_example` before running.

## Architecture

**Runtime:** Bun with TanStack Start (React 19 + file-based routing)

**Key Patterns:**

1. **Server Functions** - Type-safe RPC via `createServerFn()` from `@tanstack/react-start`
   ```typescript
   export const fetchItem = createServerFn()
     .inputValidator((itemId: number) => itemId)
     .handler(async ({ data: itemId }) => {
       return new ItemRepository().findById(itemId)
     })
   ```

2. **Repository Pattern** - Data access layer in `/src/repositories/`
   - `ItemRepository` - Item CRUD
   - `LocationRepository` - Location hierarchy management

3. **File-based Routing** - Routes in `/src/routes/`, auto-generated to `routeTree.gen.ts`

**Directory Structure:**
- `src/routes/` - TanStack Router pages
- `src/actions/` - Server functions (itemActions, locationActions, aiActions)
- `src/repositories/` - Database access layer
- `src/drizzle/` - Database schema and migrations
- `components/` - Shared React components (shadcn/ui based)
- `components/ui/` - Base UI primitives

**Database:** PostgreSQL with Drizzle ORM
- `ItemTable` - Inventory items with location references
- `LocationTable` - Hierarchical locations (self-referencing parentId)
- `UserTable` - Discord OAuth users
- `ProjectsTable` - Project management

**Image Handling:** Client-side compression (`browser-image-compression`) + cropping (`react-easy-crop`) before upload as base64.

## Commit Messages

Use conventional commits format: `type(scope): description`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`

**Rules:**
- Use imperative mood ("add" not "added")
- Keep first line under 72 characters
- Scope is optional but recommended
- Do not include Claude Code mentions, attribution, or "Generated with" footers

**Examples:**
- `feat(items): add image upload functionality`
- `fix(locations): correct sorting order`
- `chore(deps): update dependencies`
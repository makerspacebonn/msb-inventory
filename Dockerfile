# Stage 1: Dependencies
FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS deps
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

# Stage 3: Production
FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS production
WORKDIR /app

# Security fixes newer than the base image (zlib: CVE-2026-4738)
RUN apk upgrade --no-cache zlib

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production

# Copy built assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Copy necessary config files
COPY drizzle.config.ts ./
COPY tsconfig.json ./
COPY vite.config.ts ./
COPY server.ts ./
COPY run.sh ./
RUN chmod +x run.sh

# Copy drizzle migrations if they exist
COPY src/drizzle ./src/drizzle

# One-off data tasks, run by run.sh at startup
COPY src/db.ts ./src/db.ts
COPY src/lib/maintenance.ts ./src/lib/maintenance.ts
COPY scripts/maintenance.ts ./scripts/maintenance.ts

EXPOSE 80

CMD ["run.sh"]
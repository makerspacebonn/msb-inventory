# Stage 1: Dependencies
FROM oven/bun:alpine AS deps
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=production
RUN bun run build

# Stage 3: Production
FROM oven/bun:alpine AS production
WORKDIR /app

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

# Copy drizzle migrations if they exist
COPY src/drizzle ./src/drizzle

EXPOSE 80

CMD ["bun", "run", "server.ts"]
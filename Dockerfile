# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS base
WORKDIR /usr/

COPY bunfig.toml .
COPY tsconfig.json .
COPY package.json .
COPY bun.lock .
RUN bun install

# [optional] tests & build
ENV NODE_ENV=development
#RUN bun run build
# Set the timezone

COPY public public
COPY lib lib
COPY drizzle.config.ts .
COPY vite.config.ts .
COPY components.json .
COPY components components
COPY src src

# run the app
EXPOSE 80/tcp
ENTRYPOINT [ "bun", "dev" ]


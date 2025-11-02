# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS base
WORKDIR /usr/

COPY tsconfig.json .
COPY package.json .
COPY bun.lock .
RUN bun install

# [optional] tests & build
ENV NODE_ENV=development
#RUN bun run build
# Set the timezone

COPY public public
COPY drizzle.config.ts .
COPY src src

# run the app
USER bun
EXPOSE 80/tcp
ENTRYPOINT [ "bun", "--watch", "src/app/index.tsx" ]


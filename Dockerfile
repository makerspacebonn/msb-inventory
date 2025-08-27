# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS base
WORKDIR /usr/src/app


RUN apk add --update --no-cache tzdata
RUN ln -s /usr/share/zoneinfo/Europe/Brussels /etc/localtime

# Install required packages for locale support
RUN apk add --no-cache \
    icu-data-full \
    icu-libs

# Set the timezone
ENV TZ=Europe/Berlin

# Set up locale environment variables
ENV LANG=de_DE.UTF-8 \
    LANGUAGE=de_DE:de \
    LC_ALL=de_DE.UTF-8

# Optional: Install additional locale packages if needed
RUN apk add --no-cache \
    musl-locales \
    musl-locales-lang

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
#COPY package.json bun.lock /temp/dev/
COPY package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
#COPY package.json bun.lock /temp/prod/
COPY package.json /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
#RUN bun test
#RUN bun run build
# Set the timezone

# copy production dependencies and source code into final image
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/ .
COPY --from=prerelease /usr/src/app/package.json .

# run the app
USER bun
EXPOSE 80/tcp
ENTRYPOINT [ "bun", "run", "src/index.js" ]


# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:alpine AS base
WORKDIR /usr/


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

COPY package.json .
#COPY package.json bun.lock /temp/prod/
RUN bun install

# [optional] tests & build
ENV NODE_ENV=production
#RUN bun run build
# Set the timezone

COPY public public
COPY drizzle.config.ts .
COPY src src


# run the app
USER bun
EXPOSE 80/tcp
ENTRYPOINT [ "bun", "run", "--watch", "src/app/index.tsx" ]


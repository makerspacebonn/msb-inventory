
# Development infos
## running the app
you will need to have [Docker](https://www.docker.com/) installed on your system.

The runtime used is [Bun](https://bun.sh/). But it will be run in a container, so you shoukd not have to install it. (Although you do, because i wrote all the commands to be run by bun. or you copy them from the [package.jscon](../package.json))

To run the app and postgres in a container run this:
```bash
bun dev
```
Bun will run the app in watch mode, so it will restart on file changes. The app also runs a migration on startup, so the db will be updated if needed.

you can load the app in a local browser at http://localhost:3000

You will need to create a file called ```.env``` in the root directory of the project. You can use [.env_example](../.env_example) as a template.

The database will be stored in a volume, so it will persist even if the container is removed. To remove the database, you can remove the volume with:
```bash
docker volume rm msb-inventory_postgres-data
```

You can run the tests with:
```bash
bun dev:tests
```
They will run in watch mode, so they will restart on file changes.

To stop the app and postgres run this:
```bash
bun dev:stop
```

## used tools
- [Bun](https://bun.sh/) - to run the app built in typescript
- [Docker](https://www.docker.com/) - to run the app in a container
- [drizzle](https://drizzle.team/) - the database connector
- [elysia](https://elysiajs.com/) - as a web framework
- [biome](https://biomejs.dev) - linter und formatter
- [alpine.js](https://alpinejs.dev)

- https://github.com/dhruvasagar/react-native-image-draw

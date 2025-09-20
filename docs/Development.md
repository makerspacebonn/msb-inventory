
# Development infos
## running the app
you will need to have [Docker](https://www.docker.com/) installed on your system.

The runtime used is [Bun](https://bun.sh/). But it will be run in a container, so you shoukd not have to install it.

To run the app and postgres in a container run this:
```bash
bun run dev
```
Bun will run the app in watch mode, so it will restart on file changes. The app also runs a migration on startup, so the db will be updated if needed.

you can load the app in a local browser at http://localhost:3000

You will need to create a file called ```.env``` in the root directory of the project. You can use [.env_example](../.env_example) as a template.

The database will be stored in a volume, so it will persist even if the container is removed. To remove the database, you can remove the volume with:
```bash
docker volume rm msb-inventory_postgres-data
```

## used tools
- [Bun](https://bun.sh/) - to run the app built in typescript
- [Docker](https://www.docker.com/) - to run the app in a container
- [drizzle](https://drizzle.team/) - the database connector
- [elysia](https://elysiajs.com/) - as a web framework

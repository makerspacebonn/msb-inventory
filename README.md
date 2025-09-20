# Makerspace Inventory

Diese App soll Inventarverwaltung machen, damit man Zeug auch finden kann und vielleicht auch mal weiss, was wir alles haben.

Gegebenenfalls auch mal Ausleihe darüber machen

Und dann auch noch so Tasks und Projekte verwalten, damit man mal sieht, was wir alles gerade so laufen haben, wer mitmacht, und wie der stand ist und wo man weitere infos findet.


## Dev Usage

### running the app 
This will run the app and postgres in a container. Bun will run the app in watch mode, so it will restart on file changes. The app also runs a migration on startup, so the db will be updated if needed.
```bash
docker compose up --build && docker compose logs -f -n 100 -t
```
you can load the app in a local browser at http://localhost:3000

You will need to create a file called ```.env``` in the root directory of the project. You can use ```.env_example``` as a template.

The database will be stored in a volume, so it will persist even if the container is removed. To remove the database, you can remove the volume with:
```bash
docker volume rm msb-inventory_postgres-data
```

## ToDos

- auf ein makerspace docker repo bauen
- instanz auf eine makerspace gehostete Umgebung bringen

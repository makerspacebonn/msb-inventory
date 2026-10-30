import * as fs from "node:fs"
import { ItemDetail } from "@components/ItemDetail"
import { staticPlugin } from "@elysiajs/static"
import { bold, cyan, green } from "ansis"
import { Elysia, t } from "elysia"
import { ItemRepository } from "@/src/repositories/ItemRepository"
import { LocationRepository } from "@/src/repositories/LocationRepository"
import { ItemAdd } from "../pages/ItemAdd"
import { ItemEdit } from "../pages/ItemEdit"
import index from "../pages/index.html"
import { Layout } from "../pages/layout/Layout"
import { discordAuthRoutes } from "./routes/discordAuthRoutes"
import { inventorySearchRoutes } from "./routes/inventorySearchRoutes"
import { projectRoutes } from "./routes/projectRoutes"
import type { Item, Location } from "./types"

const startTime = performance.now()
const ELYSIA_VERSION = import.meta.require("elysia/package.json").version

//await migrateDB()

export const ZeugApp = new Elysia()
  .use(
    await staticPlugin({
      prefix: "/",
      assets: "./public",
    }),
  )

  .decorate("itemRepository", new ItemRepository())
  .decorate("locationRepository", new LocationRepository())

  .group("/auth", (app) => app.use(discordAuthRoutes))
  .get("/login", () => `<a href="/auth/discord/login">Login with Discord</a>`)
  .mount("/search", inventorySearchRoutes)
  .mount("/projects", projectRoutes)
  .get("i", index)
  .get(
    "/i/:id/",
    async ({ params: { id }, itemRepository, locationRepository }) => {
      const item = await itemRepository.findById(id)
      let locations: Location[] | undefined
      if (!item) {
        return <Layout title={`Item ${id}`}>Sorry, nothing to find.</Layout>
      }
      if (item.locationId !== null) {
        locations = await locationRepository.findById(item.locationId)
        console.log(locations, locations)
      }
      return (
        <Layout title={`Item ${id}`}>
          <ItemDetail item={item} locations={locations} />
        </Layout>
      )
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .get("/i/add", () => {
    return (
      <Layout title="Add Item">
        <ItemEdit />
      </Layout>
    )
  })
  .get(
    "/i/:id/edit",
    async ({ params: { id }, itemRepository, locationRepository }) => {
      const item = await itemRepository.findById(id)
      let locations: Location[] | undefined
      if (!item) {
        return <Layout title={`Item ${id}`}>Sorry, nothing to edit.</Layout>
      }
      if (item.locationId !== null) {
        locations = await locationRepository.findById(item.locationId)
      }

      return (
        <Layout title={`Item ${id}`}>
          <ItemEdit item={item} locations={locations} />
        </Layout>
      )
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .get("testadd", () => {
    return (
      <Layout title="Add Item">
        <ItemAdd />
      </Layout>
    )
  })
  .post(
    "/i/change",
    async ({ body, itemRepository }) => {
      const file = body.image
      if (file && file instanceof File) {
        const filePath = `/usr/img/items/${file.name}`
        const fileStream = fs.createWriteStream(filePath)
        fileStream.write(Buffer.from(await file.arrayBuffer()))
        fileStream.end()
      }

      const editItem: Partial<Item> = {
        id: body.id,
        name: body.name,
        description: body.description,
        imagePath: file && file?.name !== "" ? file.name : undefined,
      }
      console.log(editItem)
      const item = await itemRepository.upsert(editItem)
      console.log(item)
      return item
    },
    {
      body: t.Object({
        id: t.Optional(t.Number()),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        image: t.Optional(t.File({ format: "image/*" })),
      }),
    },
  )
  .get(
    "/api/item/:id",
    async ({ params: { id }, itemRepository }) => {
      return await itemRepository.findById(id)
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .listen(
    {
      port: process.env.PORT || 3005,
      development: {
        hmr: true,
        console: true,
      },
    },
    (server) => {
      const duration = performance.now() - startTime
      console.log(
        `🦊 ${green(`${bold("Elysia")} v${ELYSIA_VERSION}`)} started in ${bold(duration.toFixed(2))} ms\n`,
        `${green` ➜ `} ${bold`Server`}:   ${cyan(server.url)}\n`,
        `${green(" ➜ ")} ${bold("Database")}: ${cyan(process.env.DATABASE_URL)}\n`,
        `${green(" ➜ ")} ${bold("Development")}: ${cyan(server.development)}\n`,
      )
    },
  )

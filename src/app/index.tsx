import { html } from "@elysiajs/html"
import { staticPlugin } from "@elysiajs/static"
import { bold, cyan, green } from "ansis"
import { Elysia, t } from "elysia"
import { migrateDB } from "./migrateDB"
import { ItemRepository } from "./repositories/ItemRepository"
import { discordAuthRoutes } from "./routes/discordAuthRoutes"
import { inventorySearchRoutes } from "./routes/inventorySearchRoutes"
import { projectRoutes } from "./routes/projectRoutes"

const startTime = performance.now()
const ELYSIA_VERSION = import.meta.require("elysia/package.json").version

try {
  await migrateDB()
} catch (e) {
  console.error(e)
}

import { Homepage } from "../pages/Homepage"
import { ItemDetail } from "../pages/ItemDetail"
import { ItemEdit } from "../pages/ItemEdit"
import { Layout } from "../pages/layout/Layout"

export const ZeugApp = new Elysia({})
  .use(html())
  .use(
    staticPlugin({
      prefix: "",
    }),
  )
  .decorate("itemRepository", new ItemRepository())
  .get("/", () => (
    <Layout title="Home">
      <Homepage />
    </Layout>
  ))
  .group("/auth", (app) => app.use(discordAuthRoutes))
  .get("/login", () => `<a href="/auth/discord/login">Login with Discord</a>`)
  .mount("/search", inventorySearchRoutes)
  .mount("/projects", projectRoutes)
  .get(
    "/i/:id/",
    async ({ params: { id }, itemRepository }) => {
      const item = await itemRepository.findById(id)
      if (!item) {
        return <Layout title={`Item ${id}`}>Sorry, nothing to find.</Layout>
      }
      return (
        <Layout title={`Item ${id}`}>
          <ItemDetail item={item} />
        </Layout>
      )
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .get(
    "/i/:id/edit",
    async ({ params: { id }, itemRepository }) => {
      const item = await itemRepository.findById(id)
      if (!item) {
        return <Layout title={`Item ${id}`}>Sorry, nothing to edit.</Layout>
      }
      return (
        <Layout title={`Item ${id}`}>
          <ItemEdit item={item} />
        </Layout>
      )
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    },
  )
  .listen(process.env.PORT || 3000, (server) => {
    const duration = performance.now() - startTime
    console.log(
      `🦊 ${green(`${bold("Elysia")} v${ELYSIA_VERSION}`)} started in ${bold(duration.toFixed(2))} ms\n`,
      `${green` ➜ `} ${bold`Server`}:   ${cyan(server.url)}\n`,
      `${green(" ➜ ")} ${bold("Database")}: ${cyan(process.env.DATABASE_URL)}\n`,
      `${green(" ➜ ")} ${bold("Development")}: ${cyan(server.development)}\n`,
    )
  })

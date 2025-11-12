import { Elysia, t } from "elysia";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { discordAuthRoutes } from "./routes/discordAuthRoutes";
import { inventorySearchRoutes } from "./routes/inventorySearchRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { migrateDB } from "./migrateDB";
import React from "react";
import { db } from "../db";

try {
  await migrateDB();
} catch (e) {
  console.log(e);
}

import { Layout } from "../pages/layout/Layout";
import { Homepage } from "../pages/Homepage";
import { ItemDetail } from "../pages/ItemDetail";
import { ItemTable } from "../drizzle/schema";

export const ZeugApp = new Elysia()
  .use(html())
  .use(staticPlugin({
    prefix: ""
  }))
  .get("/", () => <Layout title="Home"><Homepage /></Layout>)
  .group("/auth", (app) => app.use(discordAuthRoutes))
  .get("/login", () => `<a href="/auth/discord/login">Login with Discord</a>`)
  .mount("/search", inventorySearchRoutes)
  .mount("/projects", projectRoutes)
  .get("/i/:id/", async ({ params: { id } }) => {
    const item = await db.query.ItemTable.findFirst({
      where: (items, { eq }) => eq(items.id, id)
    });
    if (!item) {
      return <Layout title={`Item ${id}`}>Soory, nothing to find.</Layout>;
    }
    return <Layout title={`Item ${id}`}><ItemDetail item={item}/></Layout>;
  }, {
    params: t.Object({
      id: t.Number()
    })
  })
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${ZeugApp.server?.hostname}:${ZeugApp.server?.port}`,
);

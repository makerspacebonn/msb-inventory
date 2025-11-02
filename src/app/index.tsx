import { Elysia } from "elysia";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";
import { discordAuthRoutes } from "./routes/discordAuthRoutes";
import { inventorySearchRoutes } from "./routes/inventorySearchRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { migrateDB } from "./migrateDB";
import React from "react";

try {
  await migrateDB();
} catch (e) {
  console.log(e);
}

import { Homepage } from "../pages/Homepage";
import { Layout } from "../pages/layout/Layout";

export const ZeugApp = new Elysia()
  .use(html())
  .use(staticPlugin({
    prefix: ""
  }))
  .group("/auth", (app) => app.use(discordAuthRoutes))
  .get("/login", () => `<a href="/auth/discord/login">Login with Discord</a>`)
  .mount("/search", inventorySearchRoutes)
  .mount("/projects", projectRoutes)
  .get("/", () => <Layout title="MakerSpace Bonn e.V."><Homepage /></Layout>)
  .get("/i/1250/", () => Bun.file(__dirname + "/../pages/1250.html"))
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${ZeugApp.server?.hostname}:${ZeugApp.server?.port}`,
);

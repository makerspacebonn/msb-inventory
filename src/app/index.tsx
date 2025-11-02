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

import { Layout } from "../pages/layout/Layout";
import { Homepage } from "../pages/Homepage";
import { Item1250 } from "../pages/1250";

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
  .get("/i/1250/", () => <Layout title="1250"><Item1250 /></Layout>)
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Elysia is running at ${ZeugApp.server?.hostname}:${ZeugApp.server?.port}`,
);

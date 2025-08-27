import {Elysia} from 'elysia'
import {discordAuthRoutes} from "./routes/discordAuthRoutes";
import {html, Html} from "@elysiajs/html";
import {staticPlugin} from '@elysiajs/static'
import {inventorySearchRoutes} from "./routes/inventorySearchRoutes";
import {projectRoutes} from "./routes/projectRoutes";
import {migrateDB} from "./migrateDB";


try {
    await migrateDB();
} catch (e) {
    console.log(e)
}

import {Home} from "../pages/Home";
import {Page} from "../pages/Page";

const app = new Elysia()
    .use(html())
    .use(staticPlugin())
    .group('/auth', app => app.use(discordAuthRoutes))
    .get('/login', () => `<a href="/auth/discord/login">Login with Discord</a>`)
    .mount('/', inventorySearchRoutes)
    .mount('/projects', projectRoutes)
    .get('/test',  () => {
        return (
            <Page title="Zugland">
                <Home fruit={['🍎', '🍊', '🍇', '🍉', '🍌']} />
            </Page>
        );
    })
    .listen(process.env.PORT || 3000)

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
)



